<!--
name: 'Data: Claude Code recent changes reference'
description: 最近被移除或重命名的 Claude Code 命令、标志和术语与其当前替代方案的对照参考表
ccVersion: 2.1.154
-->
# 最近变更的界面

你的训练数据中可能描述了已被重命名或移除的 Claude Code 命令、标志和术语。提示中的"可用命令"列表是*当前构建*的权威列表。当用户使用过时术语或你倾向于推荐过时术语时，使用此文件进行对照转换。

如果某个界面在你的训练数据中存在，但既不在本文件中也不在实时构建中，则它可能自本文件上次更新以来已被移除。在告知用户该功能存在之前，请先通过 WebFetch 查看变更日志或相关文档页面。

## 已移除的斜杠命令

| 已移除 | 替代方案 |
|---|---|
| `/output-style` | 打开 `/config` → 输出风格。输出风格功能仍然存在；只是移除了专用命令 |
| `/pr-comments` | 用自然语言要求 Claude 查看拉取请求评论 |
| `/vim` | 打开 `/config` → 编辑器模式 |
| `/extra-usage` | 已重命名为 `/usage-credits`。功能不变 |

## 已移除的 CLI 标志

| 已移除 | 替代方案 |
|---|---|
| `--enable-auto-mode` | `--permission-mode auto`。自动模式默认也在 Shift+Tab 循环中可用 |

## 已重命名的术语

| 旧术语 | 当前术语 |
|---|---|
| Anthropic API | Claude API |
| 无头模式 | 非交互模式（`-p` / `--print` 标志）。在 Agent SDK 上下文中，直接称为 "Agent SDK" |
| 斜杠命令（指 `/config`、`/login` 等时） | 命令 |
| Extra usage | Usage credits（使用量额度） |
| 自定义命令 | 技能（`.claude/skills/`）。`.claude/commands/*.md` 格式的自定义命令仍然可用，但技能是已文档化的正式界面 |

## 过时建议的注意事项

- 输出风格通过 `/config` 配置，而非 `/output-style`。
- 自动模式可通过 Shift+Tab 或 `--permission-mode auto` 使用。在 Bedrock、Vertex 和 Foundry 上，自动模式的可用性可能与第一方不同 —— 请查看对应提供商的文档页面。
- WebSearch 在 Bedrock 和网关部署中不可用。不要告诉 Bedrock 用户"让 Claude 搜索网页"。
- 推荐使用 `gh` CLI 进行 GitHub 操作，而非对 api.github.com 使用 WebFetch。
