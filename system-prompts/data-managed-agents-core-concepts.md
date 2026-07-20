<!--
name: 'Data: Managed Agents core concepts'
description: Managed Agents API 的参考文档，涵盖核心概念（Agents、Sessions、Environments、Containers）、生命周期、版本控制、端点和使用模式
ccVersion: 2.1.203
-->
# Managed Agents — 核心概念

## 架构

Managed Agents 围绕四个核心概念构建：

| 概念 | 端点 | 是什么 |
|---|---|---|
| **Agent** | `/v1/agents` | 一个持久化、版本化的对象，定义代理的能力和角色：模型、系统提示、工具、MCP 服务器、技能。**必须在启动会话之前创建。** 参见下方 Agents 部分。 |
| **Session** | `/v1/sessions` | 与代理的有状态交互。通过 ID 引用预创建的代理 + 环境 + 初始指令。产生事件流。 |
| **Environment** | `/v1/environments` | 定义容器配置模板。 |
| **Container** | N/A | 代理的**工具**执行所在的隔离计算实例（bash、文件操作、代码）。代理循环不在这里运行 — 它在 Anthropic 的编排层运行并通过工具调用操作容器。 |

```
                       ┌─────────────────────────────────────┐
                       │  Anthropic 编排层                    │
Agent (配置) ─────────▶│  (代理循环: Claude + 工具调用)        │
                       └──────────────┬──────────────────────┘
                                      │ 工具调用
                                      ▼
Environment (模板) ──▶ Container (工具执行工作区)
                                 │
                         Session ─┤
                                 ├── Resources (文件、仓库、记忆存储 — 启动时附加)
                                 ├── Vault IDs (MCP 凭据引用)
                                 └── Conversation (事件流进出)
```

> **Agent 创建是前提条件。** 会话通过 ID 引用预创建的代理 — `model`/`system`/`tools` 在代理对象上，从不在会话上。每个流程都从 `POST /v1/agents` 开始。

---

## 会话生命周期

```
rescheduling → running ↔ idle → terminated
```

| 状态         | 描述                                                        |
| -------------- | ------------------------------------------------------------------ |
| `idle` | 代理已完成当前任务，正在等待输入。它在等待通过 `user.message` 继续工作的输入，或被阻塞等待 `user.custom_tool_result` 或 `user.tool_confirmation`。附加的 `stop_reason` 包含关于代理为何停止工作的更多信息。 |
| `running` | 会话已开始运行，代理正在积极工作。 |
| `rescheduling` | 会话在可重试错误发生后正在（重新）调度，准备被编排系统接管。 |
| `terminated` | 会话已终止，进入不可逆且不可用的状态。  |

- 事件可以在会话 `running` 或 `idle` 时发送。消息按顺序排队和处理。
- 代理在收到新事件时转换 `idle → running`，然后在完成时回到 `idle`。
- 错误以流中的 `session.error` 事件形式出现，不是状态值。

每个会话在 Anthropic 控制台都有实时跟踪视图，地址为 `https://platform.claude.com/workspaces/{workspace}/sessions/{session_id}`。创建会话后立即打印此 URL，以便用户可以观看工具调用和消息实时流。**`{workspace}` 是 API key 所属的工作区** —— 仅当它是组织的 Default 工作区时才使用 `default`。会话响应**不**包含 workspace 字段，且控制台没有工作区无关的会话路由，因此对于非默认工作区，替换为工作区的 ID（在控制台 URL 栏中可见，或将其作为配置值与 API key 一起暴露）。指向其他工作区中会话的 `default` 链接会落在**"Session not found"**页面 —— 那里的 **Search workspaces** 按钮可以找到它，但这不是自动重定向。

### 内置会话功能

- **上下文压缩** — 如果接近最大上下文，API 自动压缩会话历史以保持交互继续
- **提示缓存** — 历史重复 token 被缓存，减少处理时间和成本
- **扩展思考** — 默认开启，作为 `agent.thinking` 事件返回

### 会话操作

| 操作 | 说明 |
|---|---|
| 列表/获取 | 分页列表或按 ID 获取单个资源 |
| 更新 | 仅 `title` 可更新 |
| 归档 | 会话变为**只读**。不可逆。 |
| 删除 | 永久删除会话、事件历史、容器和检查点。 |

这些是运维/检查调用 — 通常从终端发起，不是应用代码。从 shell（参见 `shared/anthropic-cli.md`）：

```sh
ant beta:sessions list --transform '{id,title,status,created_at}' --format jsonl
ant beta:sessions retrieve --session-id "$SID"
ant beta:sessions:events stream --session-id "$SID"   # 实时观察事件
ant beta:sessions archive  --session-id "$SID"
ant beta:sessions delete   --session-id "$SID"
```

---

## 会话

会话是环境内运行的代理实例。

### 会话对象

API 返回的关键字段：

| 字段           | 类型     | 描述                                         |
| --------------- | -------- | --------------------------------------------------- |
| `type` | string | 始终为 `"session"` |
| `id` | string | 唯一会话 ID |
| `title` | string | 人类可读标题 |
| `status` | string | `idle`、`running`、`rescheduling`、`terminated` |
| `created_at` | string | ISO 8601 时间戳 |
| `updated_at` | string | ISO 8601 时间戳 |
| `archived_at` | string | ISO 8601 时间戳（可空） |
| `environment_id` | string | 环境 ID |
| `agent` | object | 代理配置 |
| `resources` | array | 附加的文件、仓库和记忆存储 |
| `metadata` | object | 用户提供的键值对（最多 8 个键） |
| `usage` | object | Token 使用统计 |

### 创建会话

**没有代理的会话没有意义。** 会话通过 ID 引用预创建的代理。先通过 `agents.create()` 创建代理，然后引用它：

```ts
// 1. 创建代理（可重用，版本化）
const agent = await client.beta.agents.create(
  {
    name: "Coding Assistant",
    model: "{{OPUS_ID}}",
    system: "You are a helpful coding agent.",
    tools: [{ type: "agent_toolset_20260401"}],
  },
);

// 2. 启动引用它的会话
const session = await client.beta.sessions.create(
  {
    agent: agent.id,  // 字符串简写 → 最新版本。或：{ type: "agent", id: agent.id, version: agent.version }
    environment_id: environmentId,
    title: "Hello World Session",
  },
);
```

> 💡 **在控制台中实时观看。** 开发时，打印链接以便你可以点击进入会话 UI 而非解析事件流：`https://platform.claude.com/workspaces/{workspace}/sessions/{session.id}`。对于 `{workspace}`，仅当 API key 属于组织的 Default 工作区时使用 `default`；否则替换为工作区的 ID（会话响应不携带它 —— 从控制台 URL 栏读取或使其成为配置值）。在你为本地迭代的用户生成的代码中包含此 `print`/`console.log`。

**会话创建参数：**

| 字段           | 类型     | 必需 | 描述                                    |
| --------------- | -------- | -------- | ---------------------------------------------- |
| `agent`         | string or object | **是** | 三种形式：字符串简写 `"agent_abc123"`（最新版本）；固定 `{type: "agent", id, version}`；或 `{type: "agent_with_overrides", id, version?, ...}` 仅为此会话覆盖 `model`/`system`/`tools`/`mcp_servers`/`skills` — 参见 § 为会话覆盖代理配置 |
| `environment_id`| string   | **是**  | 环境 ID                                 |
| `title`         | string   | 否       | 人类可读名称（出现在日志/仪表板中） |
| `resources`     | array    | 否       | 文件、GitHub 仓库或记忆存储，在启动时附加到容器。记忆存储仅在会话创建时可添加（不能通过 `resources.add()` 添加）。 |
| `vault_ids`     | array    | 否       | Vault ID（`vlt_*`）— 具有自动刷新的 MCP 凭据 + 在出口时替换的 `environment_variable` 秘密。参见 `shared/managed-agents-tools.md` → Vaults。 |
| `metadata`      | object   | 否       | 用户提供的键值对                  |

**代理配置字段**（传递给 `agents.create()`，不是 `sessions.create()`）：

| 字段         | 类型     | 必需 | 描述                                    |
| ------------- | -------- | -------- | ---------------------------------------------- |
| `name`        | string   | **是**  | 人类可读名称（1-256 字符）              |
| `model`       | string or object | **是** | Claude 模型 ID（裸字符串，或 `{id, speed}` 对象）。支持所有 Claude 4.5+ 模型。 |
| `system`      | string   | 否       | 系统提示 — 定义代理的行为（最多 100K 字符） |
| `tools`       | array    | 否       | 包含三种类型：(1) 预构建 Claude Agent 工具（`agent_toolset_20260401`），(2) MCP 工具（`mcp_toolset`），(3) 自定义客户端工具。最多 128 个。 |
| `mcp_servers` | array    | 否       | MCP 服务器连接 — 标准化的第三方功能（如 GitHub、Asana）。最多 20 个，名称唯一。参见 `shared/managed-agents-tools.md` → MCP Servers。 |
| `skills`      | array    | 否       | 自定义"最佳实践"上下文，渐进式披露。最多 20 个。参见 `shared/managed-agents-tools.md` → Skills。 |
| `description` | string   | 否       | 代理描述（最多 2048 字符）    |
| `multiagent`  | object   | 否       | `{type: "coordinator", agents: [...]}` — 此代理可以委派的名单。参见 `shared/managed-agents-multiagent.md`。 |
| `metadata`    | object   | 否       | 任意键值对（最多 16 个，键 ≤64 字符，值 ≤512 字符） |

---

## 代理

**这是每个 Managed Agents 流程的起点。** 代理对象是持久化、版本化的配置 — 你创建一次，然后每次启动会话时通过 ID 引用它。没有代理 → 没有会话。

### 代理对象

API 是**扁平的** — `model`、`system`、`tools` 等是顶层字段，不包装在 `agent:{}` 子对象中。

| 字段              | 类型     | 必需 | 描述                                        |
| ------------------ | -------- | -------- | -------------------------------------------------- |
| `name`             | string   | 是      | 人类可读名称                                |
| `model`            | string   | 是      | Claude 模型 ID                                    |
| `system`           | string   | 否       | 系统提示                                      |
| `tools`            | array    | 否       | 代理工具集 / MCP 工具集 / 自定义工具         |
| `mcp_servers`      | array    | 否       | MCP 服务器连接                             |
| `skills`           | array    | 否       | 技能引用（最多 20 个）                          |
| `description`      | string   | 否       | 代理描述                           |
| `multiagent`       | object   | 否       | 协调器名单 — 参见 `shared/managed-agents-multiagent.md` |
| `metadata`         | object   | 否       | 任意键值对                          |

### 生命周期：创建一次，运行多次，就地更新

代理是**持久资源**，不是每次运行的参数。预期模式：

```
┌─ 设置（一次）─────────┐     ┌─ 运行时（每次调用）──────┐
│ agents.create()        │     │ sessions.create(             │
│   → 存储 agent_id     │ ──→ │   agent={type:..., id: ID}   │
│     在配置/环境/数据库中   │     │ )                            │
└────────────────────────┘     └──────────────────────────────┘
```

**反模式：** 在每次脚本运行时调用 `agents.create()`。这会积累孤立的代理对象，在每次调用时付出创建延迟，并破坏版本控制模型。如果你在按请求或按定时任务调用的函数中看到 `agents.create()`，那就是错的 — 将其提升到一次性设置并持久化 ID。

> **推荐 — 将代理和环境定义为 YAML + 通过 `ant` CLI 应用。** 分工是**控制面用 CLI，数据面用 SDK**：代理和环境是你用 `ant` 管理的相对静态的资源（版本控制的 YAML，从 CI 应用）；会话是动态的，由应用通过 SDK 驱动。参见 `shared/anthropic-cli.md` → *版本控制的 Managed Agents 资源* 了解 `ant beta:agents create < agent.yaml` / `update --version N` 流程。本文档其他地方显示的 SDK `agents.create()` 调用是代码中的等效版本 — 在需要编程式配置时使用它，但对于人类维护的任何内容优先使用 YAML 流程。

### 版本控制

每次 `POST /v1/agents/{id}`（更新）创建新的不可变版本（数字时间戳，如 `1772585501101368014`）。代理的历史是仅追加的 — 你不能编辑过去的版本。

**为什么版本控制：**
- **可复现性** — 将会话固定到已知良好的配置：`{type: "agent", id, version: 3}`
- **安全迭代** — 更新代理而不破坏在旧版本上运行的会话
- **回滚** — 如果新系统提示回退，将新会话固定回先前版本同时你调试

**`version` 是可选的。** 省略它（或使用字符串简写 `agent="agent_abc123"`）获取会话创建时的最新版本。显式传递（`{type: "agent", id, version: N}`）以固定用于可复现性。

**获取要固定的版本：** `agents.create()` 和 `agents.update()` 都在响应中返回 `version`。将其与 `agent_id` 一起存储。要获取现有代理的当前最新版本：`GET /v1/agents/{id}` → `.version`。

**何时更新 vs. 创建新的：** 当概念上是同一个代理只是行为调整时更新（`POST /v1/agents/{id}`）（更好的提示、额外工具）。当是不同角色/目的时创建新代理。经验法则：如果你会给它相同的 `name`，就更新。

### 代理端点

| 操作        | 方法   | 路径                                  |
| ---------------- | -------- | ------------------------------------- |
| 创建           | `POST`   | `/v1/agents`                          |
| 列表             | `GET`    | `/v1/agents`                          |
| 获取              | `GET`    | `/v1/agents/{id}`                     |
| 更新           | `POST`   | `/v1/agents/{id}`                     |
| 归档          | `POST`   | `/v1/agents/{id}/archive`             |

> ⚠️ **归档是永久的。** 归档使代理只读：现有会话继续运行，但**新会话不能引用它**，且没有取消归档。由于代理没有 `delete`，这是终端生命周期状态。永远不要将生产代理作为常规清理归档 — 先与用户确认。

### 在会话中使用代理

通过字符串 ID（最新版本）或带显式版本的对象引用代理：

```python
# 字符串简写 — 使用代理的最新版本
session = client.beta.sessions.create(
    agent=agent.id,
    environment_id=environment_id,
)

# 或固定到特定版本（int）
session = client.beta.sessions.create(
    agent={"type": "agent", "id": agent.id, "version": agent.version},
    environment_id=environment_id,
)
```

### 为会话覆盖代理配置

第三种 `agent` 形式 `agent_with_overrides` 为**单个会话**替换代理配置的部分 — 尝试不同模型或授予额外工具而不版本化代理。传递 `id`（和可选的 `version`；省略 = 最新，与其他两种形式默认相同）加上 `model`、`system`、`tools`、`mcp_servers`、`skills` 中的任意项：

```python
session = client.beta.sessions.create(
    agent={
        "type": "agent_with_overrides",
        "id": agent.id,
        "model": "{{OPUS_ID}}",   # 替换此会话的代理模型
        "system": None,           # 清除此会话的系统提示
    },
    environment_id=environment_id,
)
```

每个可覆盖字段遵循三态规则：
- **省略** → 会话从引用的代理版本继承值。
- **`null`（或列表字段的 `[]`）** → 会话在清除该字段的情况下运行。完全适用于 `system`、`mcp_servers`、`skills`。两个例外：`model` 永远不可清除（`model: null` → 400 `agent_model_required`）；当会话的有效 `skills` 非空时清除 `tools` 返回 400（技能需要 `read` 工具），否则 `tools: null` / `tools: []` 清除。
- **值** → **完全**替换代理的值。覆盖从不合并 — `tools` 覆盖必须列出会话应拥有的每个工具。

覆盖是会话本地的：它们不修改代理资源或创建新代理版本。响应的 `agent` 对象反映覆盖后的配置，而 `id` 和 `version` 仍然标识基础代理 — 所以你可以将会话追溯回其基础。在多代理会话中，覆盖应用于协调器及其 `{type: "self"}` 副本；通过 ID 引用的名单代理始终使用其自身的创建配置（参见 `shared/managed-agents-multiagent.md`）。

### 在会话中途更新代理配置

`sessions.update()` 可以在**现有**会话上更改 `agent.tools`、`agent.mcp_servers`（包括权限策略）和 `vault_ids`。这是**会话本地覆盖** — 它不创建新代理版本，不传播回代理对象。提供的数组是**完全替换**；要追加一个工具，`GET` 会话，修改，然后 `POST` 回去。会话必须是 `idle` — 如果运行中先中断。

只有 `tools` 和 `mcp_servers` 可以在会话创建后更改 — 要以不同于代理值的 `model`、`system` 或 `skills` 运行，在创建时使用 `agent_with_overrides`（上方）。代理配置的 `system` 字段在会话生命周期内是固定的；你仍然可以通过发送 `system.message` 事件来**在轮次之间替换有效的系统提示**（参见 `shared/managed-agents-events.md` § 在会话中途更新系统提示）。

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
