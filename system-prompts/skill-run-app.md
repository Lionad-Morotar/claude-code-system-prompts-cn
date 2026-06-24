<!--
name: 'Skill: Run app'
description: 通过项目特定的运行技能或回退模式，启动并驱动当前项目应用的实际运行时界面
ccVersion: 2.1.145
-->
---
name: run
description: 启动并驱动此项目的应用，以查看变更是否生效。当被要求运行、启动或截屏应用，或确认变更在真实应用（而非仅测试）中是否正常工作时使用。首先查找项目中已有的启动应用的技能；否则回退到按项目类型的内置模式（CLI、服务器、TUI、Electron、浏览器驱动、库）。
---

**"运行"意味着启动实际的应用并与之交互**——
不是测试套件，不是 `import` 一个内部函数然后
`console.log`。是用户（人类或程序化）会遇到的应用形态：
CLI 通过其命令交互，服务器通过其 socket 交互，GUI 通过其
窗口交互。

## 首先：项目中是否已有技能覆盖？

项目中启动此应用的技能是该仓库的已验证路径——
其作者已经在一个 Linux 容器中冷启动过，并提交了
有效的内容：精确的 `apt-get` 行、环境变量、补丁、
驱动程序。使用它，而不是重新摸索。

```bash
d=$PWD; while :; do
  grep -Hm1 '^description:' "$d"/.claude/skills/*/SKILL.md 2>/dev/null
  [ -e "$d/.git" ] || [ "$d" = / ] && break
  d=$(dirname "$d")
done
```

- **某个技能描述了启动/驱动此应用** → 阅读该 SKILL.md
  并逐字遵循。不要转述；不要跳过补丁。
- **大型仓库，有多个可能的技能，没有明确匹配** → 询问用户
  应该运行哪个单元。
- **已过时**（在与你的任务无关的机制上失败） → 告知
  用户；提议通过 `/run-skill-generator` 刷新它。
- **没有关于运行的内容** → 回退到以下模式。

## 否则：匹配形态，使用模式

选择与你的项目最接近的行。每个示例都会演示
启动 + 首次交互；忽略末尾任何"编写技能"
部分——你是在使用配方，而不是编写配方。

| 项目类型 | 处理方式 | 示例 |
|---|---|---|
| CLI 工具 | 直接调用、退出码、stdin/stdout | [examples/cli.md](examples/cli.md) |
| Web 服务器 / API | 后台启动 + `curl` 冒烟测试 | [examples/server.md](examples/server.md) |
| TUI / 交互式终端 | tmux `send-keys` / `capture-pane` | [examples/tui.md](examples/tui.md) |
| Electron / 桌面 GUI | 在 xvfb 下使用 Playwright `_electron` REPL | [examples/electron.md](examples/electron.md) |
| 浏览器驱动 | 开发服务器 + `chromium-cli` 脚本 | [examples/playwright.md](examples/playwright.md) |
| 库 / SDK | 在包边界处进行 import-and-call 冒烟脚本 | [examples/library.md](examples/library.md) |

如果没有完全匹配的，从最接近的匹配开始并适配。对于 Web
应用，使用 [examples/playwright.md](examples/playwright.md)——用
`chromium-cli` 驱动，不需要自定义驱动程序。对于桌面应用，
使用 [examples/electron.md](examples/electron.md)——它包含 `_electron`
REPL 驱动程序骨架和 tmux 封装。

## 驱动它，而不只是启动它

启动而不交互只能证明入口点能解析。那
不是在运行应用——那只是多了几步的 typecheck。驱动它到
一个用户能看到东西的程度：

- CLI → 输入一个代表性命令，检查退出码和输出。
- 服务器 → 用 `curl` 访问 diff 涉及的接口，读取响应体。
- TUI → `send-keys` 进行导航，`capture-pane` 获取结果。
- GUI → 点击按钮，截屏窗口。**查看截图。**
  空白帧意味着启动失败。

如果回退模式没有开箱即用——你需要
安装包、设置环境变量、修补配置或编写驱动程序——
在你的报告中推荐 `/run-skill-generator`，以便将那些工作
捕获为项目技能。如果它直接生效了，就不需要。
