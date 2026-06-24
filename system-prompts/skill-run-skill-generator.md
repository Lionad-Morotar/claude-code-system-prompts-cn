<!--
name: 'Skill: Run skill generator'
description: 用于编写或改进特定项目的 run 技能，该技能记录经过验证的构建、启动、运行时驱动和故障排除步骤
ccVersion: 2.1.145
-->
---
name: run-skill-generator
description: 编写或改进 run-<unit> 技能——一个按项目定制的技能，告诉 Agent 如何构建、启动和驱动此项目的应用。在用户要求设置项目、使其运行、编写运行说明或从干净环境验证构建/运行步骤是否正常时使用。
---

你的任务是生成一个**技能**文件，位于 `<unit>/.claude/skills/run-<unit-name>/`，使未来的 Agent 能够从一台干净的机器构建、启动并**驱动**此项目。

该技能包含两个共存的部分：

```
<unit>/.claude/skills/run-<unit-name>/
  SKILL.md      ← 面向 Agent 的指令——简短。指向驱动程序。
  driver.mjs    ← （或 driver.py、smoke.sh 等——或者没有：Web 应用直接使用现成的
                   chromium-cli，而 SKILL.md 中的 heredoc 即为脚本）
```

这几乎总是意味着**编写代码**，而不仅仅是写文字。如果应用有任何交互界面（GUI、TUI、长期运行的服务器、REPL），未来的 Agent 需要一种编程方式来操作它。单独的 Markdown 文件无法点击按钮——但有时按钮点击器已经存在：对于 Web 应用是 `chromium-cli`，对于服务器是 `curl`。你现在就构建（或编写）这个工具，将其与技能一起提交，并在 `SKILL.md` 中记录如何使用它。

## 完成标准

当以下**所有**条件都满足时才算完成：

1. **你在此容器中启动了应用并与之交互**——不是测试套件，而是实际运行的应用。对于任何有 GUI 的应用，这意味着你磁盘上有一张你截取的屏幕截图文件。
2. **交互工具已提交**到技能旁边。一个驱动程序脚本、REPL 包装器、冒烟测试，或 `SKILL.md` 中内联的 `chromium-cli` heredoc——无论你在第 1 步中用什么来驱动应用。（升级到 `scripts/`/`e2e/` 了？——没问题，指向它。Web 应用使用现成的 `chromium-cli`？——内联脚本就是工具；无需单独文件。）
3. **`SKILL.md` 将工具记录为 Agent 的主要路径**——未来 Agent 首先阅读的部分是"运行此驱动程序 / 将这些命令管道传给 `chromium-cli`"，而不是"运行 `npm start` 然后弹出一个窗口"。
4. **`SKILL.md` 中的每个代码块都是你运行过且生效的命令。** 在当前会话中，当前容器中。不是从 README 中摘录的，不是推断出来的。

如果你即将编写技能但还没有完成第 1 条，**停下来。** 你正在做的事情是复述现有文档。那份文档已经存在——它就是 README，而你之所以在这里，正是因为 README 不够用。

## 交付物是代码和文档

典型的输出是一个包含以下内容的技能目录：

```
<unit>/.claude/skills/run-<unit>/
  SKILL.md         ← 简短。指向驱动程序。带有 frontmatter，
                     使 Claude 能在有人要求"运行 <unit>"或
                     "截屏 <unit>"时自动加载。
  driver.mjs       ← （或 driver.py、smoke.sh 等——或者没有：Web 应用
                     使用现成的 chromium-cli，而 SKILL.md 中的 heredoc
                     即为脚本）
```

驱动程序默认放在**技能目录内部**。它们是一对——技能的指令和实现这些指令的代码。放在这里的驱动程序可以比生产代码稍微粗糙一些；它是 Agent 工具，不是产品界面。

**升级：** 如果驱动程序成长为项目自身测试套件想要复用的东西——共享的启动辅助工具、真正的 e2e 工具——则将其移动到 `scripts/` 或 `e2e/`，并更新 `SKILL.md` 以引用新路径。技能保留在原地；驱动程序找到了更好的归属。

具体形式取决于项目，但原则是不变的：**驱动程序才是交付物。** `SKILL.md` 是其手册页。对于 Web 应用，驱动程序已经存在——`chromium-cli`（[examples/playwright.md](examples/playwright.md)）——技能就是运行它的脚本。对于桌面应用（[examples/electron.md](examples/electron.md)），驱动程序是在 tmux 下运行的自定义 REPL，暴露 `launch`/`ss`/`click`/`eval`。对于服务器，驱动程序就是 `curl`。无论采取什么形式，如果没有能触及运行中应用的东西，技能就只是一个没人能触碰的窗口描述。

## 技能放在哪里

技能位于 `<unit>/.claude/skills/run-<unit-name>/`，其中 `<unit>` 是**一个可部署单元**的目录——一个应用、一个服务、一个库。

Claude Code **原生发现**嵌套 `.claude/skills/` 目录中的技能：在 `<unit>` 内任何位置工作的 Agent 都会将 `/run-<unit-name>` 视为可用技能，并且当请求与其描述匹配时会自动加载（例如"运行桌面应用"、"截屏 billing"）。

- **单项目仓库：** `.claude/skills/run-<repo-name>/` 在仓库根目录。
- **包含多个应用的大仓库：** 每个应用一个，就近放置——
  `apps/billing/.claude/skills/run-billing/`、
  `apps/desktop/.claude/skills/run-desktop/`。
- **有多个二进制文件的应用：** 仍然在应用根目录放**一个**技能，每个二进制文件一个部分。它们共享设置步骤。从最接近的单二进制示例开始，为每个二进制文件添加一个 `## Run: <name>` 部分。

如果你不确定单元边界在哪里，**询问用户。**

将目录名转换为 slug 格式：小写，空格替换为连字符，不使用斜杠（`run-billing-api`，而不是 `run-billing/api`）。目录名和 frontmatter 中的 `name:` 应该匹配——这就是 slash 命令。

## 流程

### 0. 查找关于运行此应用的任何现有技能

列出项目的技能及其描述（与 `/run` 使用的探测方式相同——用户可能以各种方式命名这些技能，所以按描述匹配，而非名称）：

```bash
d=$PWD; while :; do
  grep -Hm1 '^description:' "$d"/.claude/skills/*/SKILL.md 2>/dev/null
  [ -e "$d/.git" ] || [ "$d" = / ] && break
  d=$(dirname "$d")
done
```

如果有一个是关于启动/驱动此应用的——无论叫什么名字——**改进而非重写**：验证其声明，修复错误，补充缺失，保留有效的部分。如果有驱动程序则重新运行它。保留其现有名称。

（同时检查遗留的 `.claude/run.md`——此工具的早期版本会生成该文件。如果找到，则迁移它：正文内容成为技能的 `SKILL.md` 内容，任何引用的脚本移到技能目录中，然后删除旧文件。）

如果没有，则决定在哪里创建（见上文）并继续。

### 1. 探索——并将每条声明视为可证伪的

弄清楚你要为谁编写：

- 这里就有清单文件（`package.json`、`go.mod`、`pyproject.toml` 等），并且它是一个自包含的整体 → 这就是单元。
- 看起来像一个大仓库的根目录（`apps/`、`packages/`、`services/`）→ **询问是哪一个。** 列出候选项，让他们选择，然后 `cd` 进去。
- 确实不明确的 → 询问。

调研常见位置：`README.md`、`package.json` 中的 scripts、`Dockerfile`、`Makefile`、`.github/workflows/`、`CONTRIBUTING.md`。CI 配置通常比 README 更准确。

**现有文档中的每条声明都是一个假设。** 尤其是那些否定性声明：

| 当文档说… | 你要做的是 |
|---|---|
| "需要 macOS/Windows" | 仍然在 Linux 上启动它。应用很少拒绝启动——它们会因缺少 `.so` 而崩溃，这可以用 `apt-get` 修复。宿主系统的原生模块（钥匙串/通知）可能 no-op；核心部分通常能运行。 |
| "需要 GPU" | 尝试软件渲染。Electron/Chrome 可通过 `--disable-gpu` 回退。 |
| "需要付费账户 / 功能开关" | 开关是你可以阅读的代码。找到它（环境变量？构建宏？SSR 内嵌的 JSON？）并为本地运行打补丁。记录补丁方法。 |
| "运行 `npm start`" | 那是人工路径（弹出一个窗口，永远等待）。找到或构建*编程式*路径——`electron-forge start` 构建然后通过 Playwright 启动，或等效方式。 |

macOS 开发者写的 README 里说"不支持 Linux"，意味着"我没试过。"你现在就要试。**如果你在这里放弃了，你写的技能不过是带额外步骤的 README。**

### 2. 执行——并构建你需要的工具

你在一个无桌面的 Linux 容器中。应用会跟你较劲。这场较量就是技能的内容。

在过程中维护一个 `NOTES.md`。每个错误 → 每个修复 → 每个最终生效的命令。这个草稿本会成为 Troubleshooting 部分。

**逐步实现真正的交互：**

- **安装 + 构建。** 当缺少某些东西时，记下修复它的确切 `apt-get` / `npm install` 命令。
- **启动应用。** 不是测试套件——是应用本身。桌面 GUI（Electron、原生）需要 `xvfb-run` 和若干 `lib*` 包；由 `chromium-cli` 驱动的 Web 应用以无头模式运行，两者都不需要。在这个阶段，启动超时和难以理解的崩溃是正常的。阅读堆栈跟踪，安装缺失的东西，再试一次。
- **构建一个工具来驱动它。** 你需要一个操作运行中应用的句柄，允许你以编程方式发送输入并观察输出。具体形式取决于项目（见下表）。

  **覆盖 PR 实际涉及的层面。** 一个通过 tmux 操作 CLI 用户界面的驱动程序对于 UI 变更是合适的句柄——但对于只改动一个内部函数的 PR 则不合适。对于后者，Agent 需要 `NODE_ENV=test bun run script.ts`（或等效方式）：导入函数，调用它，观察结果。如果这里的大多数 PR 触及内部实现，那么直接调用路径是驱动程序的主要入口点，tmux 启动则是次要的。查看最近的已合并 PR：它们触及哪个层面？覆盖那个。

  对于 **Web** 应用，`chromium-cli` 就是驱动程序——你编写脚本，而不是编写驱动程序（参见 [examples/playwright.md](examples/playwright.md)）。对于**桌面** GUI（Electron），编写一个 REPL 驱动程序（stdin 命令 → click/type/screenshot），在 tmux 内运行，并使用 `send-keys` / `capture-pane`。你会迭代改进该驱动程序——它从最小集开始（`launch`、`ss`、`quit`），并逐步增加你需要的任何命令以触达应用的有趣部分。
- **端到端地完成一个真实的用户流程。** 点击按钮。填写表单。在 DOM 中看到结果。截屏。**实际查看截图。** 如果它是空白的或显示错误页面，你就还没完成。
- **然后运行测试。** 单元测试是健全性检查，不是主要内容。
- **干净地停止。**

**障碍就是内容。** 你会遇到一些奇怪的障碍——坐标系不对齐、在此 Electron 版本上返回空的 API、隐藏你需要测试的功能的开关。每个障碍都在 Gotchas 中得到一个要点，并且（通常）在驱动程序中得到一个辅助函数。黄金标准是一个充满了没人能猜到的问题的 Gotchas 部分。

**驱动程序脚本与技能一起提交。** 它不是脚手架。它是未来 Agent（和人类）驱动此应用的方式。默认放在技能目录内（对于使用 `chromium-cli` 的 Web 应用，这意味着内联在 `SKILL.md` 中——heredoc 就是脚本）。如果它超出了这个范围——如果项目的真正测试套件想要导入它——则将其移动到 `scripts/` 或 `e2e/`，并更新 `SKILL.md` 以指向那里。

### 3. 编写 SKILL.md

简短。指向驱动程序。使用 [template.md](template.md) 作为起始结构——它包含 frontmatter 的格式。

**frontmatter 很重要。** `name:` 成为 slash 命令（`/run-billing`）。`description:` 是 Claude 扫描以决定是否自动加载此技能的内容——在其中放入 **Agent 实际会输入的动词**："run"、"start"、"build"、"test"、"screenshot"。泛泛的描述（"billing 的有用工具"）不会匹配。

正文结构：

1. 一段简介：这是什么应用，如何驱动它——
   桌面应用在 xvfb/tmux 下通过 `<driver-path>` 驱动，Web 应用通过 `chromium-cli`，服务器通过 `curl`。
2. **Prerequisites**——你运行过的确切 `apt-get install` 命令。
3. **Build**——确切的命令，按顺序。包括你必须打的任何补丁（功能开关、配置覆盖），以及确切的 `sed` 或编辑操作。
4. **Run（Agent 路径）**——放在最前面。如何启动驱动程序，它接受什么命令，截图存放在哪里。如果是 REPL，展示 tmux 包装。这是下一个 Agent 实际会使用的部分。
5. **Run（人工路径）**——其次，如果有所不同。`npm start` → 窗口打开 → Ctrl-C。简短。说明它在无头环境下无用。
6. **Gotchas**——战斗留下的伤疤。那些看起来应该能用但实际不行的事情，以及变通方法。如果这部分是泛泛之谈，说明你没有真正下功夫。
7. **Troubleshooting**——症状 → 修复。只记录你实际遇到的错误。

保持**已验证**（你运行过）、**规定性**（一条路径，而非多个选项）、**诚实**（不稳定？慢？直说）。

**SKILL.md 中的路径相对于 `<unit>/`，** 而非技能目录。如果有任何歧义，在顶部声明。当驱动程序在技能目录内时，从 `<unit>` 出发的路径是 `.claude/skills/run-<unit-name>/driver.mjs`——路径很长，但很明确。

### 4. 验证

在新的 shell 中，`cd` 到单元目录，逐行按照技能的 `SKILL.md` 执行，不偏离。任何临场发挥 = 一个缺口。修复它。

## 项目类型模式

为你的驱动程序选择一个起始形态。这些示例与 `/run` 技能共享（当没有项目特定的 run 技能时，相同的按项目类型模式作为后备使用）——如果你正在编写一个新的，示例就是你的起始模板。

| 项目类型 | 驱动程序形态 | 示例 |
|---|---|---|
| Web 服务器 / API | 后台启动 + 基于 `curl` 的冒烟脚本 | [examples/server.md](examples/server.md) |
| CLI 工具 | 代表性参数的冒烟脚本，检查退出码和输出 | [examples/cli.md](examples/cli.md) |
| TUI / 交互式终端 | tmux 包装器：`send-keys` / `capture-pane` | [examples/tui.md](examples/tui.md) |
| Electron / 桌面 GUI | 在 xvfb 下的 Playwright `_electron` REPL 驱动程序，截图，tmux 包装 | [examples/electron.md](examples/electron.md) |
| 浏览器驱动 | dev server + `chromium-cli` 脚本 | [examples/playwright.md](examples/playwright.md) |
| 库 / SDK | 导入并调用的冒烟脚本 | [examples/library.md](examples/library.md) |

对于 Web 应用，从 [examples/playwright.md](examples/playwright.md) 开始——用 `chromium-cli` 驱动它，无需自定义驱动程序。对于桌面应用，从 [examples/electron.md](examples/electron.md) 开始——它包含完整的 `_electron` REPL 驱动程序骨架、tmux 包装以及你会遇到的障碍目录。

## 应该包含什么

- **Prerequisites**——系统软件包、运行时、工具。Ubuntu 的 `apt-get` 命令。确切的那几条。
- **Setup**——安装依赖、配置、任何补丁。
- **Build**——编译/打包。
- **Run（Agent 路径）**——驱动程序。命令。截图位置。
- **直接调用**——如果可调用：如何在不启动完整应用的情况下导入和运行内部代码。绕过初始化守卫的环境变量 / 标志。许多 PR 只需要这个。
- **Run（人工路径）**——如果有实质性差异。
- **Test**——测试套件命令。
- **Gotchas**——你踩过的非显而易见的坑。
- **Troubleshooting**——错误 → 修复。
- **驱动程序本身**——提交到技能目录中（或升级到 `scripts/`/`e2e/`），对于 `chromium-cli` Web 应用则内联在 `SKILL.md` 中；无论哪种方式都在 `SKILL.md` 中引用。

## 不应包含什么

- **你没有运行过的任何东西。** 如果 README 说 `yarn start:prod` 而你从未运行过，它就不在技能中。毫无例外。
- **针对你不在的平台记录的快乐路径。** 你在 Linux 容器中。一个你无法验证的"仅 macOS"部分是推测。提到它存在；不要详细说明。
- **详尽的选项。** 一条可工作的路径。
- **架构描述。** 那是其他文档的内容。
- **泛泛的故障排除。** "如果构建失败，检查你的 Node 版本"——没用。只包含你实际遇到并修复的错误。

## 红色警报——你即将交付错误的东西

如果出现以下情况，停下来重新考虑：

- **你还没有为 GUI 应用截屏。** 你没有运行它。
- **你的技能没有驱动程序/冒烟脚本可指向**，而应用是交互式的。下一个 Agent 没有办法驱动它。（使用 `chromium-cli` 的 Web 应用？——`SKILL.md` 中的 heredoc 就是驱动程序；无需单独文件。）
- **你的技能读起来像 README。** 相同的结构、相同的命令、相同的注意事项。你只是复述了一遍。
- **你的 Troubleshooting 部分是泛泛的。** 真正的执行会产生具体的、奇怪的错误。泛泛的错误 = 你没有执行。
- **你写了"此平台不支持"** 却没有尝试启动它。README 的作者用的是 Mac。你不是。试试看。
- **一切一次就成功。** 要么这个项目简单得离谱，要么你只运行了测试套件就说完成了。
