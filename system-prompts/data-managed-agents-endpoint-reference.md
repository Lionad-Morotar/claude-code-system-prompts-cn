<!--
name: 'Data: Managed Agents endpoint reference'
description: Comprehensive reference for Managed Agents API endpoints, SDK methods, request/response schemas, error handling, and rate limits
ccVersion: 2.1.145
-->
# 托管智能体 — 端点参考

所有端点均需要 `x-api-key` 和 `anthropic-version: 2023-06-01` 头部。托管智能体端点还需要 `anthropic-beta` 头部。

## Beta 头部

```
anthropic-beta: managed-agents-2026-04-01
```

SDK 会自动为所有 `client.beta.{agents,environments,sessions,vaults,memory_stores}.*` 调用添加此头部。Skills 端点使用 `skills-2025-10-02`；Files 端点使用 `files-api-2025-04-14`。

---

## SDK 方法参考

所有资源均在 `beta` 命名空间下。Python 和 TypeScript 共享相同的方法名。

| 资源 | Python / TypeScript (`client.beta.*`) | Go (`client.Beta.*`) |
| --- | --- | --- |
| 智能体 | `agents.create` / `retrieve` / `update` / `list` / `archive` | `Agents.New` / `Get` / `Update` / `List` / `Archive` |
| 智能体版本 | `agents.versions.list` | `Agents.Versions.List` |
| 环境 | `environments.create` / `retrieve` / `update` / `list` / `delete` / `archive` | `Environments.New` / `Get` / `Update` / `List` / `Delete` / `Archive` |
| 环境工作（自托管） | `environments.work.poller` / `stats` / `stop` | 参见 `shared/managed-agents-self-hosted-sandboxes.md` |
| 会话 | `sessions.create` / `retrieve` / `update` / `list` / `delete` / `archive` | `Sessions.New` / `Get` / `Update` / `List` / `Delete` / `Archive` |
| 会话事件 | `sessions.events.list` / `send` / `stream` | `Sessions.Events.List` / `Send` / `StreamEvents` |
| 会话线程 | `sessions.threads.list` / `retrieve` / `archive`; `sessions.threads.events.list` / `stream` | `Sessions.Threads.List` / `Get` / `Archive`; `Sessions.Threads.Events.List` / `StreamEvents` |
| 会话资源 | `sessions.resources.add` / `retrieve` / `update` / `list` / `delete` | `Sessions.Resources.Add` / `Get` / `Update` / `List` / `Delete` |
| 保管库 | `vaults.create` / `retrieve` / `update` / `list` / `delete` / `archive` | `Vaults.New` / `Get` / `Update` / `List` / `Delete` / `Archive` |
| 凭证 | `vaults.credentials.create` / `retrieve` / `update` / `list` / `delete` / `archive` / `mcp_oauth_validate` | `Vaults.Credentials.New` / `Get` / `Update` / `List` / `Delete` / `Archive` / `McpOauthValidate` |
| 记忆存储 | `memory_stores.create` / `retrieve` / `update` / `list` / `delete` / `archive` | `MemoryStores.New` / `Get` / `Update` / `List` / `Delete` / `Archive` |
| 记忆 | `memory_stores.memories.create` / `retrieve` / `update` / `list` / `delete` | `MemoryStores.Memories.New` / `Get` / `Update` / `List` / `Delete` |
| 记忆版本 | `memory_stores.memory_versions.list` / `retrieve` / `redact` | `MemoryStores.MemoryVersions.List` / `Get` / `Redact` |

**需要注意的命名差异：**
- 智能体和会话线程**没有** `delete` 方法——仅有 `archive`。归档是**永久性**的：智能体变为只读，新会话无法引用它，且无法取消归档。归档生产环境智能体之前需与用户确认。环境、会话、保管库、凭证和记忆存储同时拥有 `delete` 和 `archive`；会话资源、文件、技能和记忆仅有 `delete`；记忆版本两者都没有——仅有 `redact`。
- 会话资源使用 `add`（而非 `create`）。
- Go 的事件流方法是 `StreamEvents`（而非 `Stream`）。
- 自托管 worker **不**在 `client.beta.*` 下——它是来自 `anthropic.lib.environments` / `@anthropic-ai/sdk/helpers/beta/environments` 的 `EnvironmentWorker`；只有 `environments.work.poller/stats/stop` 是客户端方法。

**智能体简写：** 在创建会话时，`agent` 参数接受裸字符串（`agent="agent_abc123"`——使用最新版本）或完整的引用对象（`{type: "agent", id: "agent_abc123", version: 123}`）。

**模型简写：** 在创建智能体时，`model` 参数接受裸字符串（`model="{{OPUS_ID}}"`——使用 `standard` 速度）或完整的配置对象（`{id: "claude-opus-4-6", speed: "fast"}`）。注意：`speed: "fast"` 仅在 Opus 4.6 上受支持。

---

## 智能体

**所有流程的第一步。** 会话需要预先创建的智能体——在 `managed-agents-2026-04-01` 下不支持内联智能体配置。

| 方法   | 路径                                             | 操作        | 描述                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `GET` | `/v1/agents` | ListAgents | 列出智能体 |
| `POST` | `/v1/agents` | CreateAgent | 创建已保存的智能体配置 |
| `GET` | `/v1/agents/{agent_id}` | GetAgent | 获取智能体详情 |
| `POST` | `/v1/agents/{agent_id}` | UpdateAgent | 更新智能体配置 |
| `POST` | `/v1/agents/{agent_id}/archive` | ArchiveAgent | 归档智能体。使其变为**只读**；现有会话继续运行，新会话无法引用它。无法取消归档——这是终态。 |
| `GET` | `/v1/agents/{agent_id}/versions` | ListAgentVersions | 列出智能体版本 |

## 会话

| 方法   | 路径                                             | 操作        | 描述                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `GET` | `/v1/sessions` | ListSessions | 列出会话（分页） |
| `POST` | `/v1/sessions` | CreateSession | 创建新会话 |
| `GET` | `/v1/sessions/{session_id}` | GetSession | 获取会话详情 |
| `POST` | `/v1/sessions/{session_id}` | UpdateSession | 更新会话 `metadata`/`title`，或 `agent.tools`/`agent.mcp_servers`/`vault_ids`（会话级别覆盖；会话必须处于 `idle` 状态）。参见 `shared/managed-agents-core.md` → 在会话中途更新 agent 配置。 |
| `DELETE` | `/v1/sessions/{session_id}` | DeleteSession | 删除会话 |
| `POST` | `/v1/sessions/{session_id}/archive` | ArchiveSession | 归档会话 |

## 事件

| 方法   | 路径                                             | 操作        | 描述                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `GET` | `/v1/sessions/{session_id}/events` | ListEvents | 列出事件（轮询，分页） |
| `POST` | `/v1/sessions/{session_id}/events` | SendEvents | 发送事件（用户消息、工具结果） |
| `GET` | `/v1/sessions/{session_id}/events/stream` | StreamEvents | 通过 SSE 流式传输事件 |

## 会话线程

多智能体会话中的每个子智能体事件流。参见 `shared/managed-agents-multiagent.md`。

| 方法   | 路径                                             | 操作        | 描述                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `GET` | `/v1/sessions/{session_id}/threads` | ListThreads | 列出线程（分页） |
| `GET` | `/v1/sessions/{session_id}/threads/{thread_id}` | GetThread | 获取单个线程（携带 `agent` 快照、`status`、`parent_thread_id`、`stats`、`usage`） |
| `POST` | `/v1/sessions/{session_id}/threads/{thread_id}/archive` | ArchiveThread | 归档线程 |
| `GET` | `/v1/sessions/{session_id}/threads/{thread_id}/events` | ListThreadEvents | 列出某个线程的历史事件（分页） |
| `GET` | `/v1/sessions/{session_id}/threads/{thread_id}/stream` | StreamThreadEvents | 通过 SSE 流式传输单个线程（SDK：`threads.events.stream`） |

## 会话资源

| 方法   | 路径                                                    | 操作        | 描述                              |
| -------- | ------------------------------------------------------- | ---------------- | ---------------------------------------- |
| `GET` | `/v1/sessions/{session_id}/resources` | ListResources | 列出附加到会话的资源 |
| `POST` | `/v1/sessions/{session_id}/resources` | AddResource | 附加 `file` 或 `github_repository` 资源（SDK 方法：`add`，非 `create`）。`memory_store` 资源仅在会话创建时附加。 |
| `GET` | `/v1/sessions/{session_id}/resources/{resource_id}` | GetResource | 获取单个资源 |
| `POST` | `/v1/sessions/{session_id}/resources/{resource_id}` | UpdateResource | 更新资源 |
| `DELETE` | `/v1/sessions/{session_id}/resources/{resource_id}` | DeleteResource | 从会话中移除资源 |

## 环境

| 方法   | 路径                                                             | 操作            | 描述                         |
| -------- | ---------------------------------------------------------------- | -------------------- | ----------------------------------- |
| `POST`   | `/v1/environments`                                     | CreateEnvironment    | 创建环境                  |
| `GET`    | `/v1/environments`                                     | ListEnvironments     | 列出环境                   |
| `GET`    | `/v1/environments/{environment_id}`                    | GetEnvironment       | 获取环境详情             |
| `POST`   | `/v1/environments/{environment_id}`                    | UpdateEnvironment    | 更新环境                  |
| `DELETE` | `/v1/environments/{environment_id}`                    | DeleteEnvironment    | 删除环境。返回 204。 |
| `POST`   | `/v1/environments/{environment_id}/archive`            | ArchiveEnvironment   | 归档环境。使其变为**只读**；现有会话继续运行，新会话无法引用它。无法取消归档——这是终态。 |
| `GET`    | `/v1/environments/{environment_id}/work/stats`         | WorkQueueStats       | 自托管工作队列深度/待处理/工作进程。使用 `x-api-key` 认证。参见 `shared/managed-agents-self-hosted-sandboxes.md`。 |
| `POST`   | `/v1/environments/{environment_id}/work/{work_id}/stop` | StopWork            | 自托管：停止一个已领取的工作项。使用 `x-api-key` 认证。 |

对于 `type: "self_hosted"`，`config` 为裸的 `{"type": "self_hosted"}`——`networking` 和 `packages` 不适用。
## 保管库

保管库存储由 Anthropic 代为管理的 MCP 凭证——支持自动刷新的 OAuth 凭证，或静态 bearer 令牌。通过 `vault_ids` 附加到会话。概念指南和凭证结构参见 `managed-agents-tools.md` 的保管库章节。

| 方法   | 路径                                             | 操作        | 描述                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `POST`   | `/v1/vaults`                                     | CreateVault      | 创建保管库                           |
| `GET`    | `/v1/vaults`                                     | ListVaults       | 列出保管库                              |
| `GET`    | `/v1/vaults/{vault_id}`                          | GetVault         | 获取保管库详情                        |
| `POST`   | `/v1/vaults/{vault_id}`                          | UpdateVault      | 更新保管库                             |
| `DELETE` | `/v1/vaults/{vault_id}`                          | DeleteVault      | 删除保管库                             |
| `POST`   | `/v1/vaults/{vault_id}/archive`                  | ArchiveVault     | 归档保管库                            |

## 凭证

凭证是存储在保管库中的单个密钥。

| 方法   | 路径                                                              | 操作          | 描述                  |
| -------- | ----------------------------------------------------------------- | ------------------ | ---------------------------- |
| `POST`   | `/v1/vaults/{vault_id}/credentials`                               | CreateCredential   | 创建凭证          |
| `GET`    | `/v1/vaults/{vault_id}/credentials`                               | ListCredentials    | 列出保管库中的凭证    |
| `GET`    | `/v1/vaults/{vault_id}/credentials/{credential_id}`               | GetCredential      | 获取凭证元数据      |
| `POST`   | `/v1/vaults/{vault_id}/credentials/{credential_id}`               | UpdateCredential   | 更新凭证            |
| `DELETE` | `/v1/vaults/{vault_id}/credentials/{credential_id}`               | DeleteCredential   | 删除凭证            |
| `POST`   | `/v1/vaults/{vault_id}/credentials/{credential_id}/archive`       | ArchiveCredential  | 归档凭证           |
| `POST`   | `/v1/vaults/{vault_id}/credentials/{credential_id}/mcp_oauth_validate` | McpOauthValidate | 验证 MCP OAuth 凭证 |

## 记忆存储

工作区级别的持久记忆，跨会话保留。通过在 `resources[]` 中添加 `{"type": "memory_store", "memory_store_id": ...}` 条目附加到会话（仅在会话创建时）。概念指南、FUSE 挂载智能体接口、前置条件和版本控制参见 `shared/managed-agents-memory.md`。

| 方法   | 路径                                             | 操作          | 描述                              |
| -------- | ------------------------------------------------ | ------------------ | ---------------------------------------- |
| `POST`   | `/v1/memory_stores`                              | CreateMemoryStore  | 创建存储（`name`、`description`、`metadata`） |
| `GET`    | `/v1/memory_stores`                              | ListMemoryStores   | 列出存储（`include_archived`、`created_at_{gte,lte}`） |
| `GET`    | `/v1/memory_stores/{memory_store_id}`            | GetMemoryStore     | 获取存储详情                        |
| `POST`   | `/v1/memory_stores/{memory_store_id}`            | UpdateMemoryStore  | 更新存储                             |
| `DELETE` | `/v1/memory_stores/{memory_store_id}`            | DeleteMemoryStore  | 删除存储                             |
| `POST`   | `/v1/memory_stores/{memory_store_id}/archive`    | ArchiveMemoryStore | 归档存储。使其变为**只读**；现有会话继续运行，新会话无法引用它。无法取消归档。 |

## 记忆

存储中的单个文本文档（每个不超过 100KB）。`create` 在指定 `path` 上创建，若路径已被占用则返回 `409`（`memory_path_conflict_error`，附带 `conflicting_memory_id`）；`update` 通过 `mem_...` ID 进行修改（重命名和/或内容）。仅 `update` 接受 `precondition`（`{"type": "content_sha256", "content_sha256": ...}`）——不匹配时返回 `409`（`memory_precondition_failed_error`）。列表端点接受 `view: "basic"|"full"`（控制是否填充 `content`；`retrieve` 默认为 `full`）。

| 方法   | 路径                                                              | 操作      | 描述                              |
| -------- | ----------------------------------------------------------------- | -------------- | ---------------------------------------- |
| `GET`    | `/v1/memory_stores/{memory_store_id}/memories`                    | ListMemories   | 返回 `Memory | MemoryPrefix`；按 `path_prefix`、`depth`、`order_by`/`order` 过滤 |
| `POST`   | `/v1/memory_stores/{memory_store_id}/memories`                    | CreateMemory   | 在 `path` 上创建（SDK：`memories.create`）；路径被占用时返回 `409 memory_path_conflict_error` |
| `GET`    | `/v1/memory_stores/{memory_store_id}/memories/{memory_id}`        | GetMemory      | 读取单条记忆（默认 `view="full"`） |
| `PATCH`  | `/v1/memory_stores/{memory_store_id}/memories/{memory_id}`        | UpdateMemory   | 按 ID 修改 `content`、`path` 或两者；可选 `precondition` |
| `DELETE` | `/v1/memory_stores/{memory_store_id}/memories/{memory_id}`        | DeleteMemory   | 删除（可选 `expected_content_sha256`） |

## 记忆版本

每次变更的不可变快照（`memver_...`）——审计和回滚的依据。`operation` 取值：`created` / `modified` / `deleted`。

| 方法   | 路径                                                                          | 操作             | 描述                              |
| -------- | ----------------------------------------------------------------------------- | --------------------- | ---------------------------------------- |
| `GET`    | `/v1/memory_stores/{memory_store_id}/memory_versions`                         | ListMemoryVersions    | 最新优先；按 `memory_id`、`operation`、`session_id`、`api_key_id`、`created_at_{gte,lte}` 过滤 |
| `GET`    | `/v1/memory_stores/{memory_store_id}/memory_versions/{version_id}`            | GetMemoryVersion      | 列表字段 + 完整 `content`             |
| `POST`   | `/v1/memory_stores/{memory_store_id}/memory_versions/{version_id}/redact`     | RedactMemoryVersion   | 清除 `content`/`content_sha256`/`content_size_bytes`/`path`；保留操作者和时间戳 |

## 文件

| 方法   | 路径                                             | 操作        | 描述                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `POST`   | `/v1/files`                            | UploadFile       | 上传文件                            |
| `GET`    | `/v1/files`                            | ListFiles        | 列出文件                               |
| `GET`    | `/v1/files/{file_id}`                  | GetFile          | 获取文件元数据（SDK 方法：`retrieve_metadata`） |
| `GET`    | `/v1/files/{file_id}/content`          | DownloadFile     | 下载文件内容                    |
| `DELETE` | `/v1/files/{file_id}`                  | DeleteFile       | 删除文件                            |

## 技能

| 方法   | 路径                                                            | 操作          | 描述                  |
| -------- | --------------------------------------------------------------- | ------------------ | ---------------------------- |
| `POST`   | `/v1/skills`                                          | CreateSkill        | 创建技能               |
| `GET`    | `/v1/skills`                                          | ListSkills         | 列出技能                  |
| `GET`    | `/v1/skills/{skill_id}`                               | GetSkill           | 获取技能详情            |
| `DELETE` | `/v1/skills/{skill_id}`                               | DeleteSkill        | 删除技能               |
| `POST`   | `/v1/skills/{skill_id}/versions`                      | CreateVersion      | 创建技能版本         |
| `GET`    | `/v1/skills/{skill_id}/versions`                      | ListVersions       | 列出技能版本          |
| `GET`    | `/v1/skills/{skill_id}/versions/{version}`            | GetVersion         | 获取技能版本            |
| `DELETE` | `/v1/skills/{skill_id}/versions/{version}`            | DeleteVersion      | 删除技能版本         |

---

## 请求/响应模式快速参考

### CreateAgent 请求体

**始终从此处开始。** `model`、`system`、`tools`、`mcp_servers`、`skills` 是此对象的顶层字段——它们**不**放在会话上。

```json
{
  "name": "string（必需，1-256 个字符）",
  "model": "{{OPUS_ID}}（必需——裸字符串，或 {id, speed} 对象）",
  "description": "string（可选，最多 2048 个字符）",
  "system": "string（可选，最多 100,000 个字符）",
  "tools": [
    { "type": "agent_toolset_20260401" }
  ],
  "skills": [
    { "type": "anthropic", "skill_id": "xlsx" },
    { "type": "custom", "skill_id": "skill_abc123", "version": "1" }
  ],
  "mcp_servers": [
    {
      "type": "url",
      "name": "github",
      "url": "https://api.githubcopilot.com/mcp/"
    }
  ],
  "multiagent": {
    "type": "coordinator",
    "agents": [
      "agent_abc123",
      { "type": "agent", "id": "agent_def456", "version": 4 },
      { "type": "self" }
    ]
  },
  "metadata": {
    "key": "value（最多 16 对，键不超过 64 个字符，值不超过 512 个字符）"
  }
}
```

> 限制：`tools` 最多 128 个，`skills` 最多 20 个，`mcp_servers` 最多 20 个（名称需唯一）。`multiagent.agents` 1–20 个条目（字符串 ID | `{type:"agent",id,version?}` | `{type:"self"}`）——参见 `shared/managed-agents-multiagent.md`。

### CreateSession 请求体

```json
{
  "agent": "agent_abc123（必需——使用最新版本的字符串简写，或 {type: \"agent\", id, version} 对象）",
  "environment_id": "env_abc123（必需）",
  "title": "string（可选）",
  "resources": [
    {
      "type": "github_repository",
      "url": "https://github.com/owner/repo（必需）",
      "authorization_token": "ghp_...（必需）",
      "mount_path": "/workspace/repo（可选——默认为 /workspace/<repo-name>）",
      "checkout": { "type": "branch", "name": "main" }
    }
  ],
  "vault_ids": ["vlt_abc123（可选——支持自动刷新的 MCP 凭证）"],
  "metadata": {
    "key": "value"
  }
}
```

> `agent` 字段仅接受字符串 ID 或 `{type: "agent", id, version}`——`model`/`system`/`tools` 在智能体上，不在此处。
>
> **`checkout`** 接受 `{type: "branch", name: "..."}` 或 `{type: "commit", sha: "..."}`。省略则使用仓库的默认分支。

### CreateEnvironment 请求体

```json
{
  "name": "string（必需）",
  "description": "string（可选）",
  "config": {
    "type": "cloud | self_hosted（联合类型——参见 SDK 类型定义）",
    "networking": {
      "type": "unrestricted | limited（联合类型——参见 SDK 类型定义）"
    },
    "packages": { }
  },
  "metadata": { "key": "value" }
}
```

### SendEvents 请求体

```json
{
  "events": [
    {
      "type": "user.message",
      "content": [
        {
          "type": "text",
          "text": "Hello"
        }
      ]
    }
  ]
}
```

### Define Outcome 事件

```json
{
  "type": "user.define_outcome",
  "description": "在 .xlsx 中为 Costco 构建 DCF 模型",
  "rubric": { "type": "file", "file_id": "file_01..." },
  "max_iterations": 5
}
```

> `rubric` 为必需项：`{type: "text", content}` 或 `{type: "file", file_id}`。`max_iterations` 默认为 3，最大为 20。返回时附带 `outcome_id` + `processed_at`。参见 `shared/managed-agents-outcomes.md`。

### 工具结果事件

```json
{
  "type": "user.custom_tool_result",
  "custom_tool_use_id": "sevt_abc123",
  "content": [{ "type": "text", "text": "Result data" }],
  "is_error": false
}
```

---

## 错误处理

托管智能体端点使用标准的 Anthropic API 错误格式。错误返回时附带 HTTP 状态码和一个包含 `type`、`error` 和 `request_id` 的 JSON 正文：

```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "问题描述"
  },
  "request_id": "req_011CRv1W3XQ8XpFikNYG7RnE"
}
```

向 Anthropic 报告问题时请附带 `request_id`——它使我们能够端到端追踪请求。内部的 `error.type` 取值如下：

| 状态码 | 错误类型 | 描述 |
|---|---|---|
| 400 | `invalid_request_error` | 请求格式错误或缺少必需参数 |
| 401 | `authentication_error` | API 密钥无效或缺失 |
| 403 | `permission_error` | API 密钥没有执行此操作的权限 |
| 404 | `not_found_error` | 请求的资源不存在 |
| 409 | `invalid_request_error` | 请求与资源的当前状态冲突（例如，向已归档的会话发送消息） |
| 413 | `request_too_large` | 请求体超出最大允许大小 |
| 429 | `rate_limit_error` | 请求过多——检查速率限制头部以获取重试时机 |
| 500 | `api_error` | 服务器内部错误 |
| 529 | `overloaded_error` | 服务暂时过载——使用退避策略重试 |

注意：`409 Conflict` 携带的 `error.type` 是 `"invalid_request_error"`（没有单独的 `conflict_error` 类型）；请同时检查 HTTP 状态码和 `message` 来区分冲突与其他无效请求。

---

## 速率限制

托管智能体端点具有按组织的每分钟请求数（RPM）限制，独立于你的 [Messages API 令牌限制](https://platform.claude.com/docs/en/api/rate-limits)。会话内的模型推理仍从你组织的标准 ITPM/OTPM 限额中扣除。

| 端点组 | 范围 | RPM | 最大并发数 |
|---|---|---|---|
| 创建操作（智能体、会话、保管库） | 组织 | 300 | — |
| 所有其他操作（智能体、会话、保管库） | 组织 | 600 | — |
| 所有操作（环境） | 组织 | 60 | 5 |

文件和技能端点使用标准的按等级划分的[速率限制](https://platform.claude.com/docs/en/api/rate-limits)。

超出限制时，API 返回 `429` 和 `rate_limit_error`（响应格式参见[错误处理](#错误处理)），以及一个 `retry-after` 头部，指示重试前需等待的秒数。Anthropic SDK 会读取此头部并自动重试。
