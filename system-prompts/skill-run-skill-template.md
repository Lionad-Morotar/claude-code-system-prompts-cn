<!--
name: 'Skill: Run skill template'
description: Run 技能生成器的模板文件，展示项目特定 run 技能的 frontmatter 和章节结构
ccVersion: 2.1.145
-->
---
name: run-<unit-name>
description: 构建、运行和驱动 <unit-name>。在需要启动 <unit-name>、运行其测试、构建它、截取其 UI 屏幕截图或与运行中的应用交互时使用。
---

<一句话描述：这是什么，Agent 如何驱动它。
在这里指明操作句柄——桌面应用用"通过 xvfb 下的
`.claude/skills/run-<unit-name>/driver.mjs` 驱动"，Web 应用用
"启动 dev server 然后通过 `chromium-cli` 驱动"——
这样 Agent 就知道首先看哪里。>

<如果单元不在仓库根目录：>
以下所有路径均相对于 `<unit-dir>/`。

## Prerequisites

<系统级别的要求。你运行过的确切 `apt-get install` 命令——不是泛泛的列表，是实际生效的那条。目标系统为 Ubuntu。>

```bash
sudo apt-get update
sudo apt-get install -y <你实际安装过的包>
```

<运行时版本，如果有影响：>

```bash
# 示例：通过 nvm 使用 Node 20，通过 uv 使用 Python 3.12 等
```

## Setup

<克隆后的一次性设置：安装依赖、配置、应用任何补丁（功能开关覆盖、配置存根），使用确切的命令。>

```bash
<命令>
```

<环境变量——必需与可选，带有合理的默认值：>

```bash
export FOO_API_KEY=...   # 必需——从 <何处获取>
export BAR_MODE=dev      # 可选——默认为 prod
```

## Build

<如果没有单独的构建步骤则跳过。否则给出确切命令：>

```bash
<命令>
```

## Run（Agent 路径）

<这是未来 Agent 实际使用的部分。如果你构建了驱动程序/REPL/冒烟脚本，这里记录如何启动它以及它的功能。如果应用足够简单，`curl` 或一行命令就够用，那么这里放那行命令。>

```bash
<启动驱动程序或冒烟脚本>
```

<对于 REPL 风格的驱动程序，展示 tmux 包装。在 send-keys 和 capture-pane 之间轮询就绪标记——比固定 sleep 更快，并且在失败时能明确报错，而不是捕获半渲染的屏幕：>

```bash
tmux new-session -d -s app -x 200 -y 50
tmux send-keys -t app '<启动命令>' Enter
timeout 30 bash -c 'until tmux capture-pane -t app -p | grep -q "<就绪标记>"; do sleep 0.2; done'
tmux send-keys -t app '<第一条驱动程序命令>' Enter
tmux capture-pane -t app -p
```

<产物存放位置（截图、日志）——绝对路径：>

截图 → `/tmp/shots/`。日志 → `/tmp/<app>.log`。

<如果驱动程序有命令，用一个表格：>

| 命令 | 功能 |
|---|---|
| `<cmd>` | <描述> |

## Run（人工路径）

<如果与 Agent 路径有实质性差异。简短——Agent 不会用这个，人类自己能弄明白。>

```bash
<命令>   # → <发生什么>。<如何停止>。
```

## Test

```bash
<命令>
```

<预期结果——"N 个套件通过"，或已知的不稳定测试。>

---

<以下为可选部分——仅在相关且内容是你实际遇到的情况下才包含，而非泛泛的建议。>

## Gotchas

<非显而易见的陷阱。那些看起来应该能用但实际不行的事情，以及变通方法。如果这部分是泛泛之谈，删掉它。>

- **<具体事项>**——<为什么不行> → <应该怎么做>

## Troubleshooting

<症状 → 修复。仅记录你实际遇到的错误。>

- **<确切的错误信息或症状>**：<原因>。<修复方法>。

<---

关于上方 frontmatter 的注意事项：
- 在 `name:` 和 `description:` 中都要替换 `<unit-name>`。`name:` 成为 slash 命令（/run-<unit-name>），并且必须与目录名匹配。
- `description:` 是 Claude 扫描以决定是否自动加载此技能的依据。保留动词——"start"、"run"、"build"、"test"、"screenshot"——它们是发出请求的 Agent 实际会输入的词。

关于驱动程序的注意事项：
- 如果你编写了驱动程序脚本，它默认放在同一目录中（紧邻此文件）。在 Run 部分中引用它。
- 对于 Web 应用，通常没有驱动程序文件——Run 部分中的 `chromium-cli` heredoc 就是工具。
- 如果驱动程序成长为项目测试套件想要复用的东西——共享的启动辅助工具、真正的 e2e 工具——将其移动到单元的 scripts/ 或 e2e/ 中，并更新此处的路径。技能保留在原地。

提交前删除从上方 `---` 开始往后的所有内容。--->
