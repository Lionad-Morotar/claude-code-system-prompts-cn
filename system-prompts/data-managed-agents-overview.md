<!--
name: 'Data: Managed Agents overview'
description: Provides the agent with a comprehensive overview of the Managed Agents API architecture, mandatory agent-then-session flow, beta headers, documentation reading guide, and common pitfalls
ccVersion: 2.1.118
-->
# Managed Agents — 概览

Managed Agents 为每个会话（session）提供一个容器作为 agent 的工作空间。Agent 循环运行在 Anthropic 的编排层上；容器是 agent 的**工具**执行之处——bash 命令、文件操作、代码。你需要创建一个持久化的 **Agent** 配置（model、system prompt、tools、MCP servers、skills），然后启动引用它的 **Session**。Session 将事件流式返回给你；你则发送用户消息和工具结果。

## 强制流程：Agent（一次性）→ Session（每次运行）

**Agent 之所以是独立对象：版本控制。** Agent 是一个持久化、带版本的配置——每次更新都会创建一个新的不可变版本，session 在创建时锁定一个版本。这使得你可以在不破坏已在运行 session 的情况下迭代 agent（调整 prompt、添加工具），在变更导致退化时回滚，以及并行进行 A/B 测试。如果你每次运行都调用 `agents.create()`，这一切都无法实现。

每个 session 都引用一个预先创建的 `/v1/agents` 对象。创建 agent 一次，存储其 ID，跨多次运行复用。

| 步骤 | 调用 | 频率 |
|---|---|---|
| 1 | `POST /v1/agents` — `model`、`system`、`tools`、`mcp_servers`、`skills` 在此定义 | **仅一次。** 存储 `agent.id` **和** `agent.version`。 |
| 2 | `POST /v1/sessions` — `agent: "agent_abc123"` 或 `{type: "agent", id, version}` | **每次运行。** 字符串简写使用最新版本。 |

如果你打算在 session body 上写带 `model`、`system` 或 `tools` 的 `sessions.create()`——**停下来。** 这些字段属于 `agents.create()`。Session 只接受一个**指针**。

**生成代码时，将设置与运行时分离。** `agents.create()` 应放在设置脚本中（或受 `if agent_id is None:` 保护的代码块中），而不是放在热路径的顶部。如果用户的代码每次调用都执行 `agents.create()`，他们会积累孤立的 agent 对象，并为创建延迟白白付出代价。正确模式是：创建一次 → 持久化 ID（配置文件、环境变量、密钥管理器）→ 每次运行加载 ID 并调用 `sessions.create()`。

**要修改 agent 的行为，使用 `POST /v1/agents/{id}`——不要创建新的。** 每次更新递增版本号；运行中的 session 保持其锁定的版本，新 session 获取最新版本（或通过 `{type: "agent", id, version}` 显式锁定）。参见 `shared/managed-agents-core.md` → Agents → Versioning。

## Beta 请求头

Managed Agents 处于 beta 阶段。SDK 会自动设置所需的 beta 请求头：

| Beta 请求头                       | 启用的功能                                               |
| -------------------------------- | ------------------------------------------------------- |
| `managed-agents-2026-04-01`      | Agents、Environments、Sessions、Events、Session Resources、Vaults、Credentials |
| `skills-2025-10-02`              | Skills API（用于管理自定义 skill 定义）                    |
| `files-api-2025-04-14`           | Files API（用于文件上传）                                 |

**哪个 beta 请求头用在哪里：** SDK 在 `client.beta.{agents,environments,sessions,vaults}.*` 调用时自动设置 `managed-agents-2026-04-01`，在 `client.beta.files.*` / `client.beta.skills.*` 调用时自动设置 `files-api-2025-04-14` / `skills-2025-10-02`。调用 Managed Agents 端点时，你**不需要**手动添加 Skills 或 Files beta 请求头。**例外——session 范围的文件列表：** `client.beta.files.list({scope_id: session.id})` 是一个接受 Managed Agents 参数的 Files 端点，因此需要**同时**携带两个请求头。在该调用上显式传递 `betas: ["managed-agents-2026-04-01"]`（SDK 会添加 Files 请求头；你添加 Managed Agents 的）。参见 `shared/managed-agents-environments.md` → Session outputs。

## 阅读指南

| 用户想要...                                  | 阅读这些文件                                                  |
| ------------------------------------------- | ----------------------------------------------------------- |
| **从头开始 / "帮我设置一个 agent"**            | `shared/managed-agents-onboarding.md` — 引导式问答（WHERE→WHO→WHAT→WATCH），然后生成代码 |
| 理解 API 如何工作                            | `shared/managed-agents-core.md`                             |
| 查看完整端点参考                              | `shared/managed-agents-api-reference.md`                    |
| **创建 agent**（必须的第一步）                | `shared/managed-agents-core.md`（Agents 部分）+ 语言文件      |
| 更新/版本化 agent                            | `shared/managed-agents-core.md`（Agents → Versioning）— 更新，不要重新创建 |
| 创建 session                                | `shared/managed-agents-core.md` + `{lang}/managed-agents/README.md` |
| 配置工具和权限                                | `shared/managed-agents-tools.md`                            |
| 设置 MCP 服务器                              | `shared/managed-agents-tools.md`（MCP Servers 部分）          |
| 流式接收事件 / 处理 tool_use                  | `shared/managed-agents-events.md` + 语言文件                  |
| 设置 environment                            | `shared/managed-agents-environments.md` + 语言文件            |
| 上传文件 / 挂载仓库                          | `shared/managed-agents-environments.md`（Resources）          |
| 将 agent/environment 定义为版本控制的 YAML；从 shell 驱动 API | `shared/anthropic-cli.md` —— `ant beta:agents create < agent.yaml`、`--transform`、`@file` 内联 |
| 存储 MCP 凭证                                | `shared/managed-agents-tools.md`（Vaults 部分）               |
| 调用需要密钥的非 MCP API / CLI                | `shared/managed-agents-client-patterns.md` Pattern 9 — 容器内无环境变量；vault 仅限 MCP；通过自定义工具将密钥保留在主机侧 |

## 常见陷阱

- **先 Agent，再 Session——没有例外** — session 的 `agent` 字段**仅**接受字符串 ID 或 `{type: "agent", id, version}`。`model`、`system`、`tools`、`mcp_servers`、`skills` 是 **`POST /v1/agents` 的顶层字段**，绝不能放在 `sessions.create()` 上。如果用户还没有创建 agent，那是每个示例的第零步。
- **Agent 只需创建一次，不是每次运行** — `agents.create()` 是设置步骤。存储返回的 `agent_id` 并复用；不要在热路径顶部调用 `agents.create()`。如果需要修改 agent 的配置，使用 `POST /v1/agents/{id}`——每次更新创建新版本，session 可以锁定特定版本以实现可复现性。
- **MCP 认证通过 vault 进行** — agent 的 `mcp_servers` 数组仅声明 `{type, name, url}`（不含认证信息）。凭证存储在 vault 中（`client.beta.vaults.credentials.create`），并通过 `vault_ids` 附加到 session。Anthropic 使用存储的 refresh token 自动刷新 OAuth token。
- **通过流接收事件** — `GET /v1/sessions/{id}/events/stream` 是实时接收 agent 输出的主要方式。
- **SSE 流没有重放——重连时需合并历史** — 如果流在 `agent.tool_use`、`agent.mcp_tool_use` 或 `agent.custom_tool_use` 等待解决时断开（前两者等待 `user.tool_confirmation`，后者等待 `user.custom_tool_result`），session 会死锁（客户端断开 → session 空闲 → 重连发生 → 没有客户端解决）。每次（重）连接时：先打开 `GET /v1/sessions/{id}/events/stream` 流，再获取 `GET /v1/sessions/{id}/events`，按事件 ID 去重，然后继续处理。参见 `shared/managed-agents-events.md` → Reconnecting after a dropped stream。
- **不要将 HTTP 库超时当作挂钟截止时间** — `requests` 的 `timeout=(c, r)` 和 `httpx.Timeout(n)` 是**每块（per-chunk）**读取超时；每收到一个字节就重置，因此一个缓慢滴流的连接可以无限期阻塞。要为原始 HTTP 轮询设置硬性截止时间，在循环级别跟踪 `time.monotonic()` 并显式退出。优先使用 SDK 的 `sessions.events.stream()` / `session.events.list()` 而非手写 HTTP。参见 `shared/managed-agents-events.md` → Receiving Events。
- **消息排队** — 你可以在 session 处于 `running` 或 `idle` 状态时发送事件；它们按顺序处理。无需等待响应再发送下一条消息。
- **仅支持云端 environment** — `config.type: "cloud"` 是唯一支持的 environment 类型。
- **归档对每个资源都是永久性的** — 归档 agent、environment、session、vault 或 credential 会使其变为只读，且不可取消归档。特别是对于 agent 和 environment，归档后的资源不能被新 session 引用（已有 session 继续运行）。不要在生产 agent 或 environment 上调用 `.archive()` 作为清理手段——**归档前务必与用户确认。**
