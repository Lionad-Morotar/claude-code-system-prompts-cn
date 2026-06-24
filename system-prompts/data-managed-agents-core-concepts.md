<!--
name: '数据：Managed Agents 核心概念'
description: Managed Agents API 的参考文档，涵盖核心概念（Agent、Session、Environment、Container）、生命周期、版本管理、端点及使用模式
ccVersion: 2.1.145
-->
# Managed Agents — 核心概念

## 架构

Managed Agents 围绕四个核心概念构建：

| 概念 | 端点 | 含义 |
|---|---|---|
| **Agent** | `/v1/agents` | 一个持久化、带版本的配置对象，定义 agent 的能力和人格：模型、系统提示词、工具、MCP 服务器、技能。**必须在启动 session 之前创建。**参见下方 Agent 部分。 |
| **Session** | `/v1/sessions` | 与 agent 的有状态交互。通过 ID 引用一个预先创建的 agent + 一个环境 + 初始指令。产生事件流。 |
| **Environment** | `/v1/environments` | 一个定义容器配置的模板。 |
| **Container** | N/A | 一个隔离的计算实例，agent 的**工具**在此执行（bash、文件操作、代码）。Agent 循环不在此运行——它在 Anthropic 的编排层上运行，通过工具调用作用于容器。 |

```
                       ┌─────────────────────────────────────┐
                       │  Anthropic 编排层                    │
Agent（配置）──────────▶│  （agent 循环：Claude + 工具调用）     │
                       └──────────────┬──────────────────────┘
                                      │ 工具调用
                                      ▼
Environment（模板）───▶ Container（工具执行工作区）
                                 │
                         Session ─┤
                                 ├── Resources（文件、仓库、记忆存储——启动时挂载）
                                 ├── Vault ID（MCP 凭证引用）
                                 └── Conversation（进出事件流）
```

> **Agent 创建是前置步骤。** Session 通过 ID 引用预先创建的 agent——`model`/`system`/`tools` 存在于 agent 对象上，而非 session。每个流程都以 `POST /v1/agents` 开始。

---

## Session 生命周期

```
rescheduling → running ↔ idle → terminated
```

| 状态         | 描述                                                        |
| -------------- | ------------------------------------------------------------------ |
| `idle` | Agent 已完成当前任务，正在等待输入。它要么在等待输入以通过 `user.message` 继续工作，要么被 `user.custom_tool_result` 或 `user.tool_confirmation` 阻塞。附带的 `stop_reason` 包含 agent 停止工作的更多原因信息。 |
| `running` | Session 已开始运行，agent 正在积极工作。 |
| `rescheduling` | Session 在发生可重试错误后正在（重新）调度，准备由编排系统接管。 |
| `terminated` | Session 已终止，进入不可逆且不可用的状态。 |

- 事件可以在 session 处于 `running` 或 `idle` 状态时发送。消息按顺序排队处理。
- Agent 在收到新事件时从 `idle → running` 转换，完成后回到 `idle`。
- 错误以流中的 `session.error` 事件形式呈现，而非状态值。

### 内置 session 功能

- **上下文压缩**——如果接近最大上下文长度，API 会自动压缩会话历史以维持交互继续进行
- **提示词缓存**——历史重复 token 会被缓存，减少处理时间和成本
- **扩展思考**——默认开启，以 `agent.thinking` 事件形式返回

### Session 操作

| 操作 | 备注 |
|---|---|
| 列表/获取 | 分页列表或按 ID 获取单个资源 |
| 更新 | 仅 `title` 可更新 |
| 归档 | Session 变为**只读**。不可逆。 |
| 删除 | 永久删除 session、事件历史、容器和检查点。 |

这些是操作/检查类调用——通常从终端发出，而非应用程序代码。通过 shell 使用（参见 `shared/anthropic-cli.md`）：

```sh
ant beta:sessions list --transform '{id,title,status,created_at}' --format jsonl
ant beta:sessions retrieve --session-id "$SID"
ant beta:sessions:events stream --session-id "$SID"   # 实时查看事件
ant beta:sessions archive  --session-id "$SID"
ant beta:sessions delete   --session-id "$SID"
```

---

## Sessions

Session 是环境中的一个正在运行的 agent 实例。

### Session 对象

API 返回的关键字段：

| 字段           | 类型     | 描述                                         |
| --------------- | -------- | --------------------------------------------------- |
| `type` | string | 始终为 `"session"` |
| `id` | string | 唯一 session ID |
| `title` | string | 人类可读的标题 |
| `status` | string | `idle`、`running`、`rescheduling`、`terminated` |
| `created_at` | string | ISO 8601 时间戳 |
| `updated_at` | string | ISO 8601 时间戳 |
| `archived_at` | string | ISO 8601 时间戳（可为空） |
| `environment_id` | string | 环境 ID |
| `agent` | object | Agent 配置 |
| `resources` | array | 挂载的文件、仓库和记忆存储 |
| `metadata` | object | 用户提供的键值对（最多 8 个键） |
| `usage` | object | Token 用量统计 |

### 创建 session

**没有 agent 的 session 是无意义的。** Session 通过 ID 引用预先创建的 agent。先通过 `agents.create()` 创建 agent，再引用它：

```ts
// 1. 创建 agent（可复用、带版本）
const agent = await client.beta.agents.create(
  {
    name: "Coding Assistant",
    model: "{{OPUS_ID}}",
    system: "You are a helpful coding agent.",
    tools: [{ type: "agent_toolset_20260401"}],
  },
);

// 2. 启动引用它的 session
const session = await client.beta.sessions.create(
  {
    agent: agent.id,  // 字符串简写 → 最新版本。或者：{ type: "agent", id: agent.id, version: agent.version }
    environment_id: environmentId,
    title: "Hello World Session",
  },
);
```

> 💡 **在 Console 中实时观察。** 开发时，打印一个链接以便点击进入会话 UI，而无需解析事件流：`https://platform.claude.com/workspaces/{workspace}/sessions/{session.id}`。除非你在非默认工作区中创建了会话，否则使用 `default` 作为工作区 slug；你的工作区会话列表位于 `https://platform.claude.com/workspaces/default/sessions`。在为用户生成的代码中包含此 `print`/`console.log`，方便他们本地迭代。

**Session 创建参数：**

| 字段           | 类型     | 必填 | 描述                                    |
| --------------- | -------- | -------- | ---------------------------------------------- |
| `agent`         | string 或 object | **是** | 字符串简写 `"agent_abc123"`（最新版本）或 `{type: "agent", id, version}` |
| `environment_id`| string   | **是**  | 环境 ID                                 |
| `title`         | string   | 否       | 人类可读的名称（出现在日志/仪表盘中） |
| `resources`     | array    | 否       | 文件、GitHub 仓库或记忆存储，在容器启动时挂载。记忆存储只能在 session 创建时添加（不能通过 `resources.add()` 添加）。 |
| `vault_ids`     | array    | 否       | Vault ID（`vlt_*`）——带自动刷新的 MCP 凭证。参见 `shared/managed-agents-tools.md` → Vaults。 |
| `metadata`      | object   | 否       | 用户提供的键值对                  |

**Agent 配置字段**（传递给 `agents.create()`，而非 `sessions.create()`）：

| 字段         | 类型     | 必填 | 描述                                    |
| ------------- | -------- | -------- | ---------------------------------------------- |
| `name`        | string   | **是**  | 人类可读的名称（1-256 字符）              |
| `model`       | string 或 object | **是** | Claude 模型 ID（裸字符串，或 `{id, speed}` 对象）。支持所有 Claude 4.5+ 模型。 |
| `system`      | string   | 否       | 系统提示词——定义 agent 的行为（最多 100K 字符） |
| `tools`       | array    | 否       | 包含三类：(1) 预构建的 Claude Agent 工具（`agent_toolset_20260401`），(2) MCP 工具（`mcp_toolset`），(3) 自定义客户端工具。最多 128 个。 |
| `mcp_servers` | array    | 否       | MCP 服务器连接——标准化的第三方能力（如 GitHub、Asana）。最多 20 个，名称唯一。参见 `shared/managed-agents-tools.md` → MCP Servers。 |
| `skills`      | array    | 否       | 自定义的"最佳实践"上下文，支持渐进式披露。最多 20 个。参见 `shared/managed-agents-tools.md` → Skills。 |
| `description` | string   | 否       | Agent 的描述（最多 2048 字符）    |
| `multiagent`  | object   | 否       | `{type: "coordinator", agents: [...]}`——此 agent 可委托的 agent 名单。参见 `shared/managed-agents-multiagent.md`。 |
| `metadata`    | object   | 否       | 任意键值对（最多 16 对，键 ≤64 字符，值 ≤512 字符） |

---

## Agents

**这是每个 Managed Agents 流程的起点。** Agent 对象是一个持久化、带版本的配置——你创建一次，然后每次启动 session 时通过 ID 引用它。没有 agent → 没有 session。

### Agent 对象

API 是**扁平化**的——`model`、`system`、`tools` 等是顶层字段，不包装在 `agent:{}` 子对象中。

| 字段              | 类型     | 必填 | 描述                                        |
| ------------------ | -------- | -------- | -------------------------------------------------- |
| `name`             | string   | 是      | 人类可读的名称                                |
| `model`            | string   | 是      | Claude 模型 ID                                    |
| `system`           | string   | 否       | 系统提示词                                      |
| `tools`            | array    | 否       | Agent 工具集 / MCP 工具集 / 自定义工具         |
| `mcp_servers`      | array    | 否       | MCP 服务器连接                             |
| `skills`           | array    | 否       | 技能引用（最多 20 个）                          |
| `description`      | string   | 否       | Agent 的描述                           |
| `multiagent`       | object   | 否       | 协调器名单——参见 `shared/managed-agents-multiagent.md` |
| `metadata`         | object   | 否       | 任意键值对                          |

### 生命周期：创建一次，运行多次，原地更新

Agent 是一个**持久化资源**，而非每次运行的参数。推荐模式：

```
┌─ 初始化（一次性）──────┐     ┌─ 运行时（每次调用）──────┐
│ agents.create()        │     │ sessions.create(             │
│   → 存储 agent_id      │ ──→ │   agent={type:..., id: ID}   │
│     到 config/env/db   │     │ )                            │
└────────────────────────┘     └──────────────────────────────┘
```

**反模式：** 在每次脚本运行的顶部调用 `agents.create()`。这会积累孤立的 agent 对象，每次调用都付出创建延迟，并且破坏了版本管理模型。如果你看到 `agents.create()` 出现在每次请求或每次 cron 定时任务调用的函数中，那就是错的——应将其提升到一次性初始化步骤并持久化 ID。

> **推荐——将 agent 和 environment 定义为 YAML 并通过 `ant` CLI 部署。** 分工是 **CLI 管理控制面，SDK 管理数据面**：agent 和 environment 是相对静态的资源，通过 `ant` 管理（版本控制的 YAML，从 CI 部署）；session 是动态的，由你的应用程序通过 SDK 驱动。参见 `shared/anthropic-cli.md` → *Version-controlled Managed Agents resources* 了解 `ant beta:agents create < agent.yaml` / `update --version N` 流程。本文档中其他地方的 SDK `agents.create()` 调用是等价的代码方式——在你需要编程式创建时使用，但对于人工维护的任何内容，优先使用 YAML 流程。

### 版本管理

每次 `POST /v1/agents/{id}`（更新）都会创建一个新的不可变版本（数字时间戳，如 `1772585501101368014`）。Agent 的历史是仅追加的——你无法编辑过去的版本。

**为什么需要版本：**
- **可复现性**——将会话固定到一个已知良好的配置：`{type: "agent", id, version: 3}`
- **安全迭代**——更新 agent 不会破坏已在旧版本上运行的 session
- **回滚**——如果新的系统提示词出现回退，将新 session 固定回旧版本以便调试

**`version` 是可选的。** 省略它（或使用字符串简写 `agent="agent_abc123"`）可在 session 创建时获取最新版本。显式传递它（`{type: "agent", id, version: N}`）以固定版本，保证可复现性。

**获取要固定的版本：** `agents.create()` 和 `agents.update()` 都在响应中返回 `version`。将其与 `agent_id` 一起存储。要获取现有 agent 的当前最新版本：`GET /v1/agents/{id}` → `.version`。

**何时更新 vs 新建：** 当概念上是同一个 agent 但调整了行为（更好的提示词、额外的工具）时，使用更新（`POST /v1/agents/{id}`）。当是完全不同的角色/用途时，创建新 agent。经验法则：如果会给它相同的 `name`，就更新。

### Agent 端点

| 操作        | 方法   | 路径                                  |
| ---------------- | -------- | ------------------------------------- |
| 创建           | `POST`   | `/v1/agents`                          |
| 列表             | `GET`    | `/v1/agents`                          |
| 获取              | `GET`    | `/v1/agents/{id}`                     |
| 更新           | `POST`   | `/v1/agents/{id}`                     |
| 归档          | `POST`   | `/v1/agents/{id}/archive`             |

> ⚠️ **归档是永久的。** 归档使 agent 变为只读：现有 session 继续运行，但**新 session 无法引用它**，并且没有取消归档操作。由于 agent 没有 `delete`，这是终态生命周期状态。绝不要将生产 agent 归档作为常规清理——先与用户确认。

### 在 Session 中使用 Agent

通过字符串 ID 引用 agent（最新版本）或通过带显式版本的对象引用：

```python
# 字符串简写——使用 agent 的最新版本
session = client.beta.sessions.create(
    agent=agent.id,
    environment_id=environment_id,
)

# 或固定到特定版本（整数）
session = client.beta.sessions.create(
    agent={"type": "agent", "id": agent.id, "version": agent.version},
    environment_id=environment_id,
)
```

### 在会话中途更新 agent 配置

`sessions.update()` 可以在**现有**会话上更改 `agent.tools`、`agent.mcp_servers`（包括权限策略）和 `vault_ids`。这是一个**会话级别的覆盖**——它不会创建新的 agent 版本，也不会传播回 agent 对象。提供的数组是**完全替换**；要追加一个工具，先 `GET` 会话，修改后再 `POST` 回去。会话必须处于 `idle` 状态——如果正在运行，先中断。

```python
client.beta.sessions.update(
    session.id,
    agent={
        "tools": [
            {"type": "agent_toolset_20260401"},
            {"type": "mcp_toolset", "mcp_server_name": "linear"},
        ],
        "mcp_servers": [{"type": "url", "name": "linear", "url": "https://mcp.linear.app/sse"}],
    },
    vault_ids=["vlt_..."],
)
```
