<!--
name: 'Skill: Run Electron desktop GUI app example'
description: Run app 技能的示例文件，展示如何在 xvfb 下启动 Electron 桌面应用并通过 Playwright REPL 驱动程序来驱动它
ccVersion: 2.1.145
-->
# 示例：Electron / 桌面 GUI 应用

Electron 应用有窗口。在无头容器中的未来 Agent
无法看到窗口。所以你的交付物不是一份写着
"`npm start` 打开一个窗口"的 Markdown 文件——而是一个**驱动程序脚本**，
它在 xvfb 下启动应用，暴露一个 REPL 命令集（click、type、
screenshot），让 Agent 通过发送文本行来操作 UI。

技能的 `SKILL.md` 则成为该驱动程序的简短手册。

## 你要构建的东西

```
apps/desktop/
  .claude/skills/run-desktop/
    SKILL.md               ← 简短。"运行驱动程序，以下是命令"
    driver.mjs             ← REPL：stdin 命令 → Playwright 操作
```

驱动程序本身就是产品。没有它，技能只是描述了一个 Agent
永远无法触及的 GUI。

**演进路径：** 如果驱动程序增长出项目的
真实端到端测试套件想要共享的启动辅助工具，将其移至 `e2e-playwright/driver.mjs`
（或 `scripts/drive.mjs`）并更新技能的路径。技能保留在
`.claude/skills/run-desktop/`；驱动程序找到更好的归宿。

## 步骤 1 — 让应用在 xvfb 下至少能启动

这通常是最困难的部分，会产生最多的坑点。
README 可能会说"仅支持 macOS/Windows"。忽略它。安装 xvfb +
Chromium 共享库，找到 Electron 二进制文件，然后启动它：

```bash
apt-get install -y xvfb libnss3 libgbm1 libasound2t64 libgtk-3-0 \
  libxss1 libxkbcommon0 libatk-bridge2.0-0 libcups2 libdrm2

# 先构建应用。通常"dev"脚本是 electron-forge，
# 它会先做 Vite/webpack 构建，然后启动。你只需要构建：
npm install
npx electron-forge start &   # 构建到 .vite/build/ 或 dist/
sleep 20 && kill %1          # 构建完成后杀掉它——你将自行启动

# 现在尝试原始启动
xvfb-run -a node -e "
  const { _electron } = require('playwright-core');
  _electron.launch({
    executablePath: './node_modules/electron/dist/electron',
    args: ['--no-sandbox', '.'],
    timeout: 30000,
  }).then(app => {
    console.log('launched, windows:', app.windows().map(w => w.url()));
    return app.close();
  });
"
```

迭代直到它能启动。每缺少一个 `.so` → 多一个 `apt-get`
包 → 多一行先决条件。每次启动超时 → 检查
`nodeCliInspect` 熔断没有被禁用，检查构建输出是否存在。

**`--no-sandbox` 在容器中几乎总是必需的。** Electron 的
沙箱需要 CAP_SYS_ADMIN 或用户命名空间。默认两者都没有。

## 步骤 2 — 构建 REPL 驱动程序

一旦你能启动它，就把那个一次性脚本变成 REPL。从
最小化开始——你会按需添加命令。**REPL 是正确的形态**，
因为 Agent 可以在 tmux 中运行它，在每次交互时迭代
而无需重新启动（缓慢的）应用。

```javascript
// .claude/skills/run-<unit>/driver.mjs
// <app> 的 REPL 驱动程序。在无头 Linux 的 xvfb 下运行。
// 为 Agent 设计：封装在 tmux 中，send-keys 命令，capture-pane 输出。
import { _electron as electron } from 'playwright-core';
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';

const APP_DIR = path.resolve(import.meta.dirname, '../../..');
const SHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

let app = null;
let page = null;   // 你实际交互的窗口/页面

const electronBin = process.platform === 'darwin'
  ? path.join(APP_DIR, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
  : path.join(APP_DIR, 'node_modules/electron/dist/electron');

const COMMANDS = {
  async launch() {
    if (app) return console.log('already launched');
    app = await electron.launch({
      executablePath: electronBin,
      args: ['--no-sandbox', APP_DIR],
      env: { ...process.env, DISPLAY: process.env.DISPLAY || ':99' },
      timeout: 30_000,
    });
    // Electron 没有干净的"已加载"信号——这个 sleep 是盲猜。
    // 一旦你知道这个应用的就绪标志是什么，替换为轮询：
    // 等待 windows() 包含预期的 URL，或在 firstWindow() 上 waitForSelector。
    await new Promise(r => setTimeout(r, 8_000));
    // 找到真正的 UI 页面。通常不是 firstWindow()——可能是
    // 闪屏，或者真正的内容在 BrowserView 覆盖层中。
    page = app.windows().find(w => !w.url().startsWith('devtools://'))
        ?? await app.firstWindow();
    console.log('launched.', app.windows().length, 'windows:');
    for (const w of app.windows()) console.log(' ', w.url());
  },

  async ss(name) {
    if (!page) return console.log('ERROR: launch first');
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png');
    await page.screenshot({ path: f });
    console.log('screenshot:', f);
  },

  // 通过 evaluate() 点击，而非 locator.click()。如果内容存在于
  // 覆盖在主窗口上的 BrowserView 中，Playwright 的坐标
  // 计算会命中错误的图层。DOM .click() 始终有效。
  async click(sel) {
    if (!page) return console.log('ERROR: launch first');
    const r = await page.evaluate(s => {
      const el = document.querySelector(s);
      if (!el) return 'NOT_FOUND';
      el.click(); return 'OK';
    }, sel);
    console.log('click', sel, '→', r);
  },

  async 'click-text'(text) {
    if (!page) return console.log('ERROR: launch first');
    const r = await page.evaluate(t => {
      const els = [...document.querySelectorAll('button, a, [role="button"]')];
      const el = els.find(e => e.textContent?.trim() === t)
              ?? els.find(e => e.textContent?.includes(t));
      if (!el) return 'NOT_FOUND';
      el.click(); return 'OK: ' + el.tagName;
    }, text);
    console.log('click-text', JSON.stringify(text), '→', r);
  },

  async type(text)  { if (page) await page.keyboard.type(text, { delay: 30 }); },
  async press(key)  { if (page) await page.keyboard.press(key); },

  async wait(sel) {
    if (!page) return console.log('ERROR: launch first');
    try { await page.waitForSelector(sel, { timeout: 10_000 }); console.log('found:', sel); }
    catch { console.log('TIMEOUT:', sel); }
  },

  async eval(expr) {
    if (!page) return console.log('ERROR: launch first');
    try { console.log(JSON.stringify(await page.evaluate(expr))); }
    catch (e) { console.log('ERROR:', e.message); }
  },

  async text(sel) {
    if (!page) return console.log('ERROR: launch first');
    console.log(await page.evaluate(
      s => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)',
      sel || null));
  },

  // 内省：对于弄清楚哪个窗口/webContents
  // 实际包含 UI 至关重要。Electron 应用通常会产生多个。
  async windows() {
    if (!app) return console.log('ERROR: launch first');
    for (const w of app.windows()) console.log(' ', w.url());
    const wcs = await app.evaluate(({ webContents }) =>
      webContents.getAllWebContents().map(w => ({ id: w.id, type: w.getType(), url: w.getURL() })));
    console.log('webContents:');
    for (const w of wcs) console.log(` [${w.id}] ${w.type}: ${w.url}`);
  },

  async quit() { if (app) await app.close().catch(()=>{}); app = null; page = null; },
  help() { console.log('commands:', Object.keys(COMMANDS).join(', ')); },
};

// 阻止 Electron 抢占 stdin——使用原始 fd。
const stdin = fs.createReadStream(null, { fd: fs.openSync('/dev/stdin', 'r') });
const rl = readline.createInterface({ input: stdin, output: process.stdout, prompt: 'driver> ' });

rl.on('line', async line => {
  const [cmd, ...rest] = line.trim().split(/\s+/);
  if (!cmd) return rl.prompt();
  const fn = COMMANDS[cmd];
  if (!fn) { console.log('unknown:', cmd, '— try: help'); return rl.prompt(); }
  try { await fn(rest.join(' ')); } catch (e) { console.log('ERROR:', e.message); }
  if (cmd === 'quit') { rl.close(); process.exit(0); }
  rl.prompt();
});
rl.on('close', async () => { await COMMANDS.quit(); process.exit(0); });

console.log('<app> driver — "help" for commands, "launch" to start');
rl.prompt();
```

**这是一个起始骨架。** 当你尝试触及应用的有趣部分时，
你会添加应用特定的命令：导航到特定视图、
聚焦奇怪的输入类型、绕过认证门、等等。这些
命令编码了来之不易的知识——保留它们。

## 步骤 3 — 亲自使用它，通过 tmux

以下一个 Agent 将使用的方式运行驱动程序：

```bash
tmux new-session -d -s app -x 200 -y 50
tmux send-keys -t app 'cd /workspace/apps/desktop && xvfb-run -a node .claude/skills/run-desktop/driver.mjs' Enter
timeout 20 bash -c 'until tmux capture-pane -t app -p | grep -q "driver>"; do sleep 0.2; done'
tmux send-keys -t app 'launch' Enter
timeout 60 bash -c 'until tmux capture-pane -t app -p | grep -q "launched"; do sleep 0.2; done'
tmux send-keys -t app 'ss 01-landing' Enter
timeout 10 bash -c 'until tmux capture-pane -t app -p | grep -q "screenshot:"; do sleep 0.2; done'
tmux send-keys -t app 'windows' Enter    # 哪个页面包含真正的 UI？
tmux capture-pane -t app -p
```

然后实际打开 `/tmp/shots/01-landing.png`。是应用吗？是
空白的吗？是登录界面吗？每种情况都告诉你下一步该做什么。

继续——点击进入主要功能、填写表单、看到结果显示、
截屏。驱动程序会增长你需要的任何命令
（`focus-input`、`goto-settings`、`login-as-test-user`…）。当一条真实的
流程能端到端工作时，你就完成了构建，准备好编写文档。

## 步骤 4 — 编写 SKILL.md

保持简短。驱动程序是实质内容；`SKILL.md` 是手册。
有效的结构：

> ---
> name: run-desktop
> description: 构建、运行并驱动 <app> Electron 桌面应用。当被要求启动桌面应用、截取屏幕截图、构建它或与其 UI 交互时使用。
> ---
>
> <App> 是一个 Electron 桌面应用。对于 Agent/自动化使用，在 xvfb 下
> 通过 `.claude/skills/run-desktop/driver.mjs` 的 Playwright REPL 来驱动它。
> 启动较慢（约 10 秒），且有趣的 UI 存在于
> BrowserView 而非主窗口中——驱动程序会处理这两点。
>
> 所有路径相对于 `apps/desktop/`。
>
> ## 先决条件
>
> ```bash
> apt-get install -y xvfb libnss3 libgbm1 libasound2t64 libgtk-3-0 \
>   libxss1 libxkbcommon0 libatk-bridge2.0-0 libcups2 libdrm2
> ```
>
> ## 构建
>
> ```bash
> npm install
> npx electron-forge start   # 构建到 .vite/build/——构建完成后 Ctrl-C
> # <你不得不应用的任何补丁：sed 修改功能开关等>
> ```
>
> ## 运行（Agent 路径）
>
> ```bash
> cd apps/desktop
> xvfb-run -a node .claude/skills/run-desktop/driver.mjs
> ```
>
> 封装在 tmux 中以供交互使用：
>
> ```bash
> tmux new-session -d -s app -x 200 -y 50
> tmux send-keys -t app 'cd apps/desktop && xvfb-run -a node .claude/skills/run-desktop/driver.mjs' Enter
> timeout 20 bash -c 'until tmux capture-pane -t app -p | grep -q "driver>"; do sleep 0.2; done'
> tmux send-keys -t app 'launch' Enter
> timeout 60 bash -c 'until tmux capture-pane -t app -p | grep -q "launched"; do sleep 0.2; done'
> tmux send-keys -t app 'ss landing' Enter
> tmux capture-pane -t app -p
> ```
>
> 截图保存在 `/tmp/shots/`（可通过 `SCREENSHOT_DIR` 覆盖）。
>
> ### 命令
>
> | 命令 | 功能 |
> |---|---|
> | `launch` | 启动应用，等待窗口 |
> | `ss [name]` | 截图 → `/tmp/shots/<name>.png` |
> | `click <css-sel>` | 点击元素（通过 DOM 而非坐标——见坑点） |
> | `click-text <text>` | 点击包含文本的按钮/链接 |
> | `type <text>` / `press <key>` | 键盘输入 |
> | `wait <css-sel>` | 等待元素，10 秒超时 |
> | `eval <js>` | 在页面中执行 JS，打印 JSON |
> | `text [css-sel]` | 打印 innerText |
> | `windows` | 列出所有窗口 + webContents（找到真正的 UI） |
> | `quit` | 关闭应用，退出 |
>
> 加上你构建的任何应用特定命令：`<your-command>` — <它的功能>。
>
> ## 运行（人类路径）
>
> ```bash
> npm start   # 打开一个窗口；在无头环境中无用。Ctrl-C 退出。
> ```
>
> ## 坑点
>
> - **<你遇到的具体奇怪问题>** — <原因> → <修复/变通方案>
> - <等等——仅包含你实际遇到的，而非通用建议>
>
> ## 故障排除
>
> - **启动超时（30 秒）：** 构建输出缺失？→ 重新运行构建
>   步骤。`nodeCliInspect` 熔断被禁用？→ Playwright 无法附加；
>   不要在开发构建中禁用该熔断。
> - **"Missing X server"：** 忘记 `xvfb-run`。无头 Linux 需要它。
> - **过期的 Xvfb 锁：** `rm -f /tmp/.X*-lock; pkill Xvfb`
> - <你实际遇到的其他任何问题>

## 你会遇到的障碍（它们应放入坑点部分）

这些是来自真实 Electron 应用的真实模式。你会遇到其中一部分：

- **`firstWindow()` 返回的是闪屏/加载画面，** 而非应用本身。
  等待更长时间，或按 URL 找到正确的页面，或等待一个
  仅在应用真正就绪时才出现的特定选择器。

- **真正的 UI 在 BrowserView 中，而非 BrowserWindow 中。** Playwright
  将其视为具有不同 URL 的独立"窗口"。`windows`
  命令正是为了弄清楚这一点而存在的。`getBrowserViews()`
  在较新的 Electron 上也可能返回空——改用
  `webContents.getAllWebContents()`。

- **`locator.click()` 点击了错误的位置。** Playwright 计算
  的点击坐标是相对于主窗口的。如果你的内容在
  BrowserView 覆盖层中，这些坐标会命中其背后的窗口。
  驱动程序骨架使用 `page.evaluate(el => el.click())` 正是
  因为这个原因——DOM 点击完全绕过了坐标计算。

- **功能开关阻止了你需要测试的功能。** 应用检查
  套餐级别、环境标志或嵌入在 SSR HTML 中的功能标志。
  找到检查发生的位置（在构建输出中 grep 功能开关
  名称）并为你的本地运行修补它——对构建输出执行 `sed`、
  环境变量覆盖，或（对于 SSR 嵌入的标志）通过
  CDP `Fetch.enable` 拦截响应并在传输中重写。准确记录
  你修补了什么以及为什么。

- **contentEditable 输入**（ProseMirror、Tiptap、Slate）不是
  `<textarea>`。`fill()` 不起作用。聚焦元素，然后使用
  `keyboard.type()`。如果应用有这些，添加一个 `focus <sel>` 命令。

- **Electron 抢占 stdin。** 骨架中的 `fs.openSync('/dev/stdin', 'r')` +
  `createReadStream` 技巧保护了你的 REPL 输入。

- **原生模块加载失败**（keychain、notifications 等）。
  通常不致命——核心应用运行，这些功能变为空操作。记录下来
  并继续。
