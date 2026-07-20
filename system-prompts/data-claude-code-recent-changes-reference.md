<!--
name: 'Data: Claude Code recent changes reference'
description: 最近被移除或重命名的 Claude Code 命令、标志和术语到其当前替代方案的参考映射
ccVersion: 2.1.211
-->
# 最近变更的界面

你的训练数据可能描述了已被重命名或移除的 Claude Code 命令、标志和术语。提示中的"Available commands"列表是*此构建版本*的权威列表。当用户使用过时术语或你想推荐某个术语时，请使用此文件进行转换。

如果某个界面存在于你的训练数据中但不在此文件和实时构建中，它可能在此文件上次更新后被移除。在告知用户其存在之前，请先 WebFetch 变更日志或相关文档页面。

## 已移除的斜杠命令

| 已移除 | 替代方案 |
|---|---|
| `/output-style` | 打开 `/config` → Output style。输出样式作为功能仍然存在；仅移除了专用命令 |
| `/pr-comments` | 用自然英语请求 Claude 查看 Pull Request 评论 |
| `/vim` | 打开 `/config` → Editor mode |
| `/extra-usage` | 重命名为 `/usage-credits`。功能未变 |

## 已移除的 CLI 标志

| 已移除 | 替代方案 |
|---|---|
| `--enable-auto-mode` | `--permission-mode auto`。Auto mode 在会话中可用时也位于 Shift+Tab 循环中 |

## 已移除的键盘和输入快捷键

| 已移除 | 替代方案 |
|---|---|
| `#` 前缀用于快速记忆输入 | 请求 Claude 编辑 CLAUDE.md，或使用 `/memory` |

## 已重命名的术语

| 旧术语 | 当前术语 |
|---|---|
| Anthropic API | Claude API |
| Headless mode | 非交互模式（`-p` / `--print` 标志）。在 Agent SDK 上下文中，简称"Agent SDK" |
| Slash command（当指 `/config`、`/login` 等时） | Command |
| Extra usage | Usage credits |
| Custom commands | Skills（`.claude/skills/`）。Custom commands 作为 `.claude/commands/*.md` 仍然可用，但 skills 是文档记录的界面 |
| Claude in Slack（早期 Slack 应用） | Claude Tag — Claude 作为 Slack 中的团队成员，由远程 Claude Code 会话驱动；取代了早期应用。参见 `references/claude-tag.md` |
| `Tab` 切换扩展思考 | `Option+T`（macOS）/ `Alt+T`（Windows/Linux）。在 macOS 上无需 Option-as-Meta 配置即可使用 |

## 常被错误记忆的行为

你的训练数据以一致的方向在这些方面出错。以下更正优先于你的记忆；抓取的文档仍然优先于此文件。

- 存在比你训练数据更新的模型。永远不要告诉用户他们提到的模型不存在；请检查模型配置文档或 `/model` 选择器。
- 永远不要凭记忆说明别名（`opus`、`sonnet`、`haiku`）解析到哪个模型。解析因版本和提供商而异，允许列表可以将其固定到较旧的版本。
- `~/.claude/keybindings.json` 在保存时热重载；不要告诉用户重启。该文件是一个包含上下文范围绑定块的对象（`{"bindings": [{"context": "Chat", "bindings": {...}}]}`），而非扁平的键到命令映射。操作名称来自 schema；不要自行编造。
- `Shift+Tab` 权限模式循环为 `default → acceptEdits → plan → bypassPermissions → auto → default`，其中 `bypassPermissions` 和 `auto` 仅在该会话中可用时出现。`dontAsk` 不在循环中。
- 在 macOS 上，`Alt`/`Option` 组合键如 `Alt+B` 和 `Alt+F` 仅在终端配置为将 Option 作为 Meta 发送时有效。不要声称 Option 组合键在每个终端中都有效。
- `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` 从子进程环境中剥离 Anthropic 和云提供商凭据，并强制权限模式为 `default`。它不清理其他任意密钥，如 `GITHUB_TOKEN` 或 `NPM_TOKEN`。
- 大多数（但不是全部）CLI 选项可与 `-p`/`--print` 组合使用；`--bg` 不可以。

## 过时建议备注

- 输出样式通过 `/config` 配置，而非 `/output-style`。
- Auto mode 可通过 Shift+Tab 或 `--permission-mode auto` 使用。在 Bedrock、Vertex 和 Foundry 上，auto mode 的可用性可能与第一方不同——请查看提供商的文档页面。
- WebSearch 在 Bedrock 和网关部署上不可用。不要告诉 Bedrock 用户"请求 Claude 搜索网络"。
- GitHub 操作推荐使用 `gh` CLI，而非对 api.github.com 使用 WebFetch。
