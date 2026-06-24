<!--
name: 'Data: Managed Agents core concepts'
description: Reference documentation for the Managed Agents API covering core concepts (Agents, Sessions, Environments, Containers), lifecycle, versioning, endpoints, and usage patterns
ccVersion: 2.1.105
-->
# Managed Agents — 核心概念

## 架构

Managed Agents 围绕四个核心概念构建：

| 概念 | 端点 | 含义 |
|---|---|---|
| **Agent** | `/v1/agents` | 一个持久化、带版本的对象，定义 agent 的能力和角色：model、system prompt、tools、MCP servers、skills。**必须在启动 session 之前创建。** 参见下方 Agents 部分。 |
| **Session** | `/v1/sessions` | 与 agent 的有状态交互。通过 ID 引用预先创建的 agent + environment + 初始指令。产生事件流。 |
| **Environment** | `/v1/environments` | 定义容器供应配置的模板。 |
| **Container** | 不适用 | 一个隔离的计算实例，agent 的**工具**在此执行（bash、文件操作、代码）。Agent 循环不在此运行——它运行在 Anthropic 的编排层上，通过工具调用来操作容器。 |

```
                       ┌─────────────────────────────────────┐
                       │  Anthropic 编排层                     │
Agent (配置) ─────────▶│  (agent 循环: Claude + 工具调用)       │
                       └──────────────┬──────────────────────┘
                                      │ 工具调用
                                      ▼
Environment (模板) ────▶ Container (工具执行工作空间)
                                 │
                         Session ─┤
                                 ├── Resources (文件、仓库 — 启动时挂载)
                                 ├── Vault IDs (MCP 凭证引用)
                                 └── Conversation (事件流输入/输出)
```

> **Agent 创建是前置条件。** Session 通过 ID 引用预先创建的 agent——`model`/`system`/`tools` 属于 agent 对象，绝不属于 session。每个流程都从 `POST /v1/agents` 开始。

---

## Session 生命周期

```
rescheduling → running ↔ idle → terminated
```

| 状态              | 描述                                                               |
| ----------------- | ------------------------------------------------------------------ |
| `idle`            | Agent 已完成当前任务，正在等待输入。它要么在等待继续工作的输入（通过 `user.message`），要么在等待 `user.custom_tool_result` 或 `user.tool_confirmation` 而被阻塞。附带的 `stop_reason` 包含 agent 停止工作的更详细原因。 |
| `running`         | Session 已开始运行，Agent 正在积极工作。                              |
| `rescheduling`    | Session 在发生可重试错误后正在（重新）调度，准备被编排系统接手。         |
| `terminated`      | Session 已终止，进入不可逆且不可用的状态。                            |

- 事件可在 session 处于 `running` 或 `idle` 状态时发送。消息排队并按顺序处理。
- Agent 在收到新事件时从 `idle → running` 转换，完成后回到 `idle`。
- 错误作为流中的 `session.error` 事件呈现，而非状态值。

### 内置 session 功能

- **上下文压缩（Context compaction）** — 如果接近最大上下文长度，API 会自动压缩 session 历史以保持交互继续
- **提示缓存（Prompt caching）** — 历史重复 token 被缓存，减少处理时间和成本
- **扩展思考（Extended thinking）** — 默认开启，以 `agent.thinking` 事件返回

### Session 操作

| 操作       | 备注                                                 |
| ---------- | ---------------------------------------------------- |
| 列表 / 获取 | 分页列表或按 ID 获取单个资源                           |
| 更新       | 仅 `title` 可更新                                    |
| 归档       | Session 变为**只读**。不可逆。                         |
| 删除       | 永久删除 session、事件历史、容器和检查点。              |

---

## Sessions

Session 是在 environment 中运行的 agent 实例。

### Session 对象

API 返回的关键字段：

| 字段              | 类型     | 描述                                               |
| ----------------- | -------- | -------------------------------------------------- |
| `type`            | string   | 始终为 `"session"`                                  |
| `id`              | string   | 唯一 session ID                                     |
| `title`           | string   | 人类可读的标题                                       |
| `status`          | string   | `idle`、`running`、`rescheduling`、`terminated`      |
| `created_at`      | string   | ISO 8601 时间戳                                     |
| `updated_at`      | string   | ISO 8601 时间戳                                     |
| `archived_at`     | string   | ISO 8601 时间戳（可为空）                             |
| `environment_id`  | string   | Environment ID                                      |
| `agent`           | object   | Agent 配置                                          |
| `resources`       | array    | 附加的文件和仓库                                      |
| `metadata`        | object   | 用户提供的键值对（最多 8 个键）                        |
| `usage`           | object   | Token 用量统计                                      |

### 创建 session

**没有 agent 的 session 毫无意义。** Session 通过 ID 引用预先创建的 agent。先通过 `agents.create()` 创建 agent，再引用它：

```ts
// 1. 创建 agent（可复用，带版本）
const agent = await client.beta.agents.create(
  {
    name: "Coding Assistant",
    model: "{{OPUS_ID}}",
    system: "You are a helpful coding agent.",
    tools: [{ type: "agent_toolset_20260401"}],
  },
);

// 2. 启动引用该 agent 的 session
const session = await client.beta.sessions.create(
  {
    agent: agent.id,  // 字符串简写 → 最新版本。或：{ type: "agent", id: agent.id, version: agent.version }
    environment_id: environmentId,
    title: "Hello World Session",
  },
);
```

**Session 创建参数：**

| 字段              | 类型             | 必填     | 描述                                              |
| ----------------- | ---------------- | -------- | ------------------------------------------------- |
| `agent`           | string 或 object | **是**   | 字符串简写 `"agent_abc123"`（最新版本）或 `{type: "agent", id, version}` |
| `environment_id`  | string           | **是**   | Environment ID                                     |
| `title`           | string           | 否       | 人类可读的名称（显示在日志/仪表板中）                 |
| `resources`       | array            | 否       | 文件或 GitHub 仓库，在容器启动时挂载                  |
| `vault_ids`       | array            | 否       | Vault ID（`vlt_*`）— 带自动刷新的 MCP 凭证。参见 `shared/managed-agents-tools.md` → Vaults。 |
| `metadata`        | object           | 否       | 用户提供的键值对                                    |

**Agent 配置字段**（传递给 `agents.create()`，而非 `sessions.create()`）：

| 字段           | 类型             | 必填     | 描述                                              |
| -------------- | ---------------- | -------- | ------------------------------------------------- |
| `name`         | string           | **是**   | 人类可读的名称（1-256 字符）                        |
| `model`        | string 或 object | **是**   | Claude 模型 ID（裸字符串，或 `{id, speed}` 对象）。支持所有 Claude 4.5+ 模型。 |
| `system`       | string           | 否       | System prompt — 定义 agent 的行为（最多 100K 字符） |
| `tools`        | array            | 否       | 包含三种类型：(1) 预构建的 Claude Agent 工具（`agent_toolset_20260401`），(2) MCP 工具（`mcp_toolset`），(3) 自定义客户端工具。最多 128 个。 |
| `mcp_servers`  | array            | 否       | MCP 服务器连接 — 标准化的第三方能力（如 GitHub、Asana）。最多 20 个，名称唯一。参见 `shared/managed-agents-tools.md` → MCP Servers。 |
| `skills`       | array            | 否       | 定制的"最佳实践"上下文，支持渐进式展开。最多 64 个。参见 `shared/managed-agents-tools.md` → Skills。 |
| `description`  | string           | 否       | Agent 的描述（最多 2048 字符）                      |
| `metadata`     | object           | 否       | 任意键值对（最多 16 个，键 ≤64 字符，值 ≤512 字符）   |

---

## Agents

**这是每个 Managed Agents 流程的起点。** Agent 对象是一个持久化、带版本的配置——你创建一次，然后每次启动 session 时通过 ID 引用它。没有 agent → 没有 session。

### Agent 对象

API 是**扁平**的——`model`、`system`、`tools` 等是顶层字段，而非包裹在 `agent:{}` 子对象中。

| 字段            | 类型     | 必填     | 描述                                        |
| --------------- | -------- | -------- | ------------------------------------------- |
| `name`          | string   | 是       | 人类可读的名称                                |
| `model`         | string   | 是       | Claude 模型 ID                               |
| `system`        | string   | 否       | System prompt                                |
| `tools`         | array    | 否       | Agent toolset / MCP toolset / 自定义工具      |
| `mcp_servers`   | array    | 否       | MCP 服务器连接                                |
| `skills`        | array    | 否       | Skill 引用（最多 64 个）                      |
| `description`   | string   | 否       | Agent 的描述                                  |
| `metadata`      | object   | 否       | 任意键值对                                    |

### 生命周期：创建一次，运行多次，原地更新

Agent 是一个**持久化资源**，而非每次运行的参数。预期模式：

```
┌─ 设置（一次性）──────────┐     ┌─ 运行时（每次调用）────────┐
│ agents.create()         │     │ sessions.create(          │
│   → 将 agent_id 存储     │ ──→ │   agent={type:..., id: ID} │
│     在 config/env/db 中  │     │ )                         │
└─────────────────────────┘     └───────────────────────────┘
```

**反模式：** 在每次脚本运行顶部调用 `agents.create()`。这会积累孤立的 agent 对象，每次调用都付出创建延迟，并破坏版本控制模型。如果你在每次请求或每次 cron 触发时调用的函数中看到 `agents.create()`，那是错误的——将其提升到一次性设置并持久化 ID。

### 版本控制

每次 `POST /v1/agents/{id}`（更新）都会创建一个新的不可变版本（数字时间戳，如 `1772585501101368014`）。Agent 的历史是追加式的——你无法编辑过去的版本。

**为何需要版本：**
- **可复现性** — 将 session 锁定到已知良好的配置：`{type: "agent", id, version: 3}`
- **安全迭代** — 更新 agent 而不会破坏已在旧版本上运行的 session
- **回滚** — 如果新的 system prompt 导致退化，在调试时将新 session 锁定回之前的版本

**`version` 是可选的。** 省略它（或使用字符串简写 `agent="agent_abc123"`）即可在 session 创建时获取最新版本。显式传递它（`{type: "agent", id, version: N}`）以锁定版本实现可复现性。

**获取要锁定的版本号：** `agents.create()` 和 `agents.update()` 都在响应中返回 `version`。将其与 `agent_id` 一起存储。要获取已有 agent 的当前最新版本：`GET /v1/agents/{id}` → `.version`。

**何时更新 vs 新建：** 当它在概念上是同一个 agent 但调整了行为（更好的 prompt、额外的工具）时，使用更新（`POST /v1/agents/{id}`）。当它是不同的角色/用途时，创建新的 agent。经验法则：如果你会给它相同的 `name`，就更新。

### Agent 端点

| 操作     | 方法     | 路径                                    |
| -------- | -------- | --------------------------------------- |
| 创建     | `POST`   | `/v1/agents`                            |
| 列表     | `GET`    | `/v1/agents`                            |
| 获取     | `GET`    | `/v1/agents/{id}`                       |
| 更新     | `POST`   | `/v1/agents/{id}`                       |
| 归档     | `POST`   | `/v1/agents/{id}/archive`               |

> **归档是永久性的。** 归档使 agent 变为只读：已有 session 继续运行，但**新 session 无法引用它**，且没有取消归档操作。由于 agent 没有 `delete`，这是最终的生命周期状态。绝不要将生产 agent 归档作为例行清理——先与用户确认。

### 在 Session 中使用 Agent

通过字符串 ID（最新版本）或带显式版本号的对象引用 agent：

```python
# 字符串简写 — 使用 agent 的最新版本
session = client.beta.sessions.create(
    agent=agent.id,
    environment_id=environment_id,
)

# 或锁定到特定版本（整数）
session = client.beta.sessions.create(
    agent={"type": "agent", "id": agent.id, "version": agent.version},
    environment_id=environment_id,
)
```
