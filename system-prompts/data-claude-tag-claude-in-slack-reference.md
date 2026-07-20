<!--
name: 'Data: Claude Tag (Claude in Slack) reference'
description: Offline reference for Claude Tag, Claude Code's org-managed Slack surface, covering what it is, availability, setup, configuration, and how it differs from the earlier Claude in Slack app
ccVersion: 2.1.202
-->
# Claude Tag（Slack 中的 Claude）

Claude Tag 是 Claude Code 的 Slack 入口。本文件是针对该功能的离线参考资料——之所以需要它，是因为 Claude Tag 比大多数训练数据更新，因此仅凭记忆给出的答案通常是错误的，或者描述的是早期已被替换的 Slack 应用。请先阅读本文件，再查阅文档。

## 它是什么

Claude Tag 将 Claude 作为整个组织共享的团队成员引入 Slack 工作区。任何 Claude 被邀请加入的频道中的用户都可以 `@Claude` 提交任务，Claude 会在该帖子中处理——阅读帖子获取上下文、发布进度，并在完成后回复。

每个 Slack 帖子背后都运行着一个完整的远程 Claude Code 会话，在隔离的云端容器中执行，并可使用组织已连接的代码库、工具和连接。它与在终端或网页上运行的 Claude Code 完全相同，只是通过 Slack 而非提示词驱动。

关键特性：

- **组织共享一个 `@Claude`。** Claude Tag 以组织共享的 Claude 身份运行，具有管理员配置的访问权限，而非每个用户各自的 Claude 账户。Claude 在帖子中能访问什么，由组织配置决定，而非由提及它的用户决定。
- **帖子 = 会话。** 每个 Slack 帖子对应一个远程 Claude Code 会话。同一帖子中的后续消息继续该会话；新帖子则开启全新会话。
- **配置在帖子开始时快照。** 会话在帖子开始时捕获组织的 Claude Tag 配置。之后更改配置不会影响已在运行的帖子——需开启新帖子才能应用更改。

## 可用版本及替代内容

- Claude Tag 在 Claude **Enterprise** 和 **Team** 计划中以测试版推出。
- 它**取代了早期的"Claude in Slack"/"Claude Code in Slack"应用**，该应用将每个用户的 `@Claude` 提及路由到该用户自己 Claude 账户下的会话。使用早期应用的工作区将迁移到组织管理模式——请参阅下方文档链接中的迁移指南。
- 如果用户基于训练数据的认知模型是"每个人在 Slack App Home 中连接自己的 Claude 账户和自己的代码库"，那描述的是早期应用，而非 Claude Tag。请在复述前对照文档核实。

## 入门指南

在 Claude Code CLI 中，用户可以运行：

```
/install-slack-app
```

这将在浏览器中打开 Claude 应用的 Slack Marketplace 列表，供工作区管理员安装。（请检查当前 Build 部分的"Available commands"列表——如果 `/install-slack-app` 未列在其中，则此版本不可用；请引导用户查阅文档。）

启用和配置 Claude Tag 是**组织所有者**的操作，可在以下两处之一完成：

- **Admin settings → Claude Tag**，地址为 `https://claude.ai/admin-settings/claude-tag`
- 在 Slack 中使用 **`@Claude connect`**，启动连接流程

启用后，用户将 Claude 邀请到频道（`/invite @Claude`），并在消息或帖子中提及 `@Claude` 以开始会话。

## 组织所有者可配置的内容

所有设置均位于 Admin settings → Claude Tag，并全组织生效：

| 设置 | 控制内容 |
|---|---|
| Repositories | Claude Tag 会话可以访问哪些代码库 |
| Tools and connections | 会话中可用哪些工具、MCP 服务器和连接 |
| Access and identity | 会话获得哪些凭据、连接和代码库权限，以及 Claude 以何种身份运行 |
| Spend limit | 组织可消耗的 Claude Tag 使用量上限 |
| Activity log | 供审核的 Claude Tag 会话和操作记录 |

请记住快照规则：此处的任何更改仅在**新**帖子中生效。

## 文档位置

这些 `.md` URL 用于抓取。为用户链接页面时，去掉末尾的 `.md` 以展示渲染后的页面。

| 主题 | URL |
|---|---|
| Claude Tag（Slack 中作为团队成员的 Claude，组织管理） | `https://claude.com/docs/claude-tag/overview.md` |
| 所有 Claude Tag 页面（claude.com 文档域名的索引） | `https://claude.com/docs/llms.txt` |
| 组织所有者设置指南（配对 Slack、连接工具、消费上限、启动） | `https://claude.com/docs/claude-tag/admins/setup-overview.md` |
| 最终用户入门指南 | `https://claude.com/docs/claude-tag/users/getting-started.md` |
| 从早期"Claude in Slack"应用迁移 | `https://claude.com/docs/claude-tag/admins/migrate-from-earlier.md` |

如果 WebFetch 概述页失败，请获取 `https://claude.com/docs/llms.txt`（该文档域名的索引）并搜索"Claude Tag"；Claude Code 文档地图是单独的索引，不列出 Claude Tag 页面。

## 回答风格

- 根据本文件和获取的文档回答，绝不依赖过时的训练数据。Claude Tag 比大多数训练截止日期更新；训练数据通常描述的是早期的按用户 Slack 应用。
- 如果用户**在 Claude Tag Slack 会话中**并询问如何更改其配置（代码库、工具、连接、消费上限、身份）：更改由**组织所有者**在 Admin settings → Claude Tag（`https://claude.ai/admin-settings/claude-tag`）中进行，并在**新帖子**中生效，而非当前帖子。请告知用户在所有者保存更改后开启新帖子。
- 如果用户询问"Claude 能加入我的 Slack 吗？"或"如何设置？"：引导他们使用 CLI 中的 `/install-slack-app`（若此版本可用），并由组织所有者在 Admin settings 中启用，然后链接概述文档页面。
- 明确用户询问的是哪个入口。"Claude in Slack"可能指早期应用或 Claude Tag——当前答案是 Claude Tag；若用户使用旧名称，请注明更名。
