<!--
name: 'Skill: Run browser-driven web app example'
description: Run app 技能的示例文件，展示如何启动 Web 开发服务器、用 chromium-cli 驱动它、截取屏幕截图，以及记录应用特定的坑点
ccVersion: 2.1.145
-->
# 示例：浏览器驱动的 Web 应用

你有一个向浏览器提供 HTML 的开发服务器。在无头容器中的 Agent
无法打开浏览器窗口——所以"运行应用"意味着
启动开发服务器，用无头 Chromium 驱动它，并
生成一张截图来证明页面已渲染。

不要写浏览器驱动程序。使用 `chromium-cli`。

## 开发服务器

找到开发命令（`package.json` `scripts.dev`、`Makefile`、
README），在后台启动它，等待它真正开始提供服务：

```bash
npm run dev &   # 或 yarn dev、pnpm dev、make serve、./dev.sh
echo $! > /tmp/dev.pid
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'
```

不要 `sleep 5`——轮询端口。在重新启动前用
`kill $(cat /tmp/dev.pid)`（或 `pkill -f 'npm run dev'`）
停止，否则下次运行会遇到 `EADDRINUSE`。

## 驱动

`chromium-cli` 是一个无头 Chromium REPL。将脚本通过管道传入 stdin：

```bash
chromium-cli --session app <<'EOF'
nav http://localhost:3000
wait-for text=Dashboard
screenshot
click button:has-text("New item")
fill input[name="title"] Smoke test
press Enter
wait-for text=Smoke test
screenshot
console --errors
EOF
```

截图保存在 `chromium_cli/sessions/app/screenshots/`（最新的
通过符号链接 `screenshot.png` 引用）。这就是整个循环：`nav` →
`wait-for` 你需要的元素 → 操作（`click` / `fill` / `type` /
`press`）→ `screenshot` → `console --errors` 检查是否有异常抛出。
完整命令参考：`chromium-cli` 技能，或在提示符下输入 `help`。

对于迭代调试，在 tmux 下运行并逐个 `send-keys` 命令——
相同的命令，相同的会话。

**如果 `chromium-cli` 不可用：** 适配
[electron.md](electron.md) 的 REPL 驱动程序——结构和命令
可以迁移，但它是 `_electron` 专用的：
改为 import `{ chromium }`，使用
`chromium.launch({ args: ['--no-sandbox'] })` 启动，通过
`(await app.newContext()).newPage()` 获取页面，然后 `goto()` 你的开发 URL，并
去掉 Electron 专用的窗口内省
（`.windows()`/`.firstWindow()`/`windows` 命令）。

## 技能中应包含的内容

仅包含项目特定的部分。`chromium-cli` 处理机制层面的东西。

- **开发命令 + 端口 + 停止方式。** 精确的启动命令、所需的任何环境变量，
  以及停止它的 `kill`/`pkill` 命令。
- **认证。** 获得已登录会话所需的任何内容——一行 `set-cookie`，
  一个 `fill`/`click` 登录序列，或一个执行 API 流程
  并输出 cookie 的辅助脚本。
- **一个代表性交互。** 不是整个应用——一条能证明
  它在运行的路径，以一张截图结束。
- **应用特定的坑点。** 仅包含你实际遇到的。

## 常见的坑点

- **React 受控输入。** `eval el.value = '…'` 不会触发
  React 的 onChange。使用 `fill` / `type`——它们通过 Playwright 的
  输入管道处理。
- **WebSockets / 长轮询。** `wait-idle` 永远不会 settle。`wait-for`
  你实际需要的元素。
- **慢速首次渲染。** Vite/Next 按需编译路由；第一次
  `nav` 可能需要 10 秒以上。`wait-for` 可以处理；原始 `sleep` 不行。
- **`screenshot-element <sel>`** 裁剪到单个元素——当 diff
  在特定组件而非整个页面时使用。
- **在声明成功前检查 `console --errors`。** 页面可能
  渲染了外壳，但每个数据请求都返回了 500。
