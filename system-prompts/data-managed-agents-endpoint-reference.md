<!--
name: 'Data: Managed Agents endpoint reference'
description: Comprehensive reference for Managed Agents API endpoints, SDK methods, request/response schemas, error handling, and rate limits
ccVersion: 2.1.119
-->
# Managed Agents — 接口参考

所有接口都需要 `x-api-key` 和 `anthropic-version: 2023-06-01` 请求头。Managed Agents 接口额外需要 `anthropic-beta` 请求头。

## Beta 请求头

```
anthropic-beta: managed-agents-2026-04-01
```

SDK 会为所有 `client.beta.{agents,environments,sessions,vaults,memory_stores}.*` 调用自动添加此请求头。Skills 接口使用 `skills-2025-10-02`；Files 接口使用 `files-api-2025-04-14`。

---

## SDK 方法参考

所有资源均位于 `beta` 命名空间下。Python 和 TypeScript 共享相同的方法名。

| 资源 | Python / TypeScript (`client.beta.*`) | Go (`client.Beta.*`) |
| --- | --- | --- |
| Agents | `agents.create` / `retrieve` / `update` / `list` / `archive` | `Agents.New` / `Get` / `Update` / `List` / `Archive` |
| Agent Versions | `agents.versions.list` | `Agents.Versions.List` |
| Environments | `environments.create` / `retrieve` / `update` / `list` / `delete` / `archive` | `Environments.New` / `Get` / `Update` / `List` / `Delete` / `Archive` |
| Sessions | `sessions.create` / `retrieve` / `update` / `list` / `delete` / `archive` | `Sessions.New` / `Get` / `Update` / `List` / `Delete` / `Archive` |
| Session Events | `sessions.events.list` / `send` / `stream` | `Sessions.Events.List` / `Send` / `StreamEvents` |
| Session Resources | `sessions.resources.add` / `retrieve` / `update` / `list` / `delete` | `Sessions.Resources.Add` / `Get` / `Update` / `List` / `Delete` |
| Vaults | `vaults.create` / `retrieve` / `update` / `list` / `delete` / `archive` | `Vaults.New` / `Get` / `Update` / `List` / `Delete` / `Archive` |
| Credentials | `vaults.credentials.create` / `retrieve` / `update` / `list` / `delete` / `archive` | `Vaults.Credentials.New` / `Get` / `Update` / `List` / `Delete` / `Archive` |
| Memory Stores | `memory_stores.create` / `retrieve` / `update` / `list` / `delete` / `archive` | `MemoryStores.New` / `Get` / `Update` / `List` / `Delete` / `Archive` |
| Memories | `memory_stores.memories.create` / `retrieve` / `update` / `list` / `delete` | `MemoryStores.Memories.New` / `Get` / `Update` / `List` / `Delete` |
| Memory Versions | `memory_stores.memory_versions.list` / `retrieve` / `redact` | `MemoryStores.MemoryVersions.List` / `Get` / `Redact` |

**需要注意的命名差异：**
- Agents **没有 delete**——只有 `archive`。Archive 是**不可逆的**：agent 变为只读，新 session 无法引用它，且没有 unarchive 操作。归档生产环境 agent 之前请与用户确认。Environments、Sessions、Vaults、Credentials 和 Memory Stores 同时有 `delete` 和 `archive`；Session Resources、Files、Skills 和 Memories 只有 `delete`；Memory Versions 两者都没有——只有 `redact`。
- Session resources 使用 `add`（而非 `create`）。
- Go 的事件流方法是 `StreamEvents`（而非 `Stream`）。

**Agent 简写：** session create 中的 `agent` 字段接受裸字符串（`agent="agent_abc123"`——使用最新版本）或完整的引用对象（`{type: "agent", id: "agent_abc123", version: 123}`）。

**Model 简写：** agent create 中的 `model` 字段接受裸字符串（`model="{{OPUS_ID}}"`——使用 `standard` 速度）或完整的配置对象（`{type: "model_config", id: "claude-opus-4-6", speed: "fast"}`）。注意：`speed: "fast"` 仅在 Opus 4.6 上受支持。

---

## Agents

**所有流程的第一步。** Session 需要预先创建 agent——在 `managed-agents-2026-04-01` 下不支持内联 agent 配置。

| 方法   | 路径                                             | 操作            | 描述                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `GET` | `/v1/agents` | ListAgents | 列出 agents |
| `POST` | `/v1/agents` | CreateAgent | 创建已保存的 agent 配置 |
| `GET` | `/v1/agents/{agent_id}` | GetAgent | 获取 agent 详情 |
| `POST` | `/v1/agents/{agent_id}` | UpdateAgent | 更新 agent 配置 |
| `POST` | `/v1/agents/{agent_id}/archive` | ArchiveAgent | 归档 agent。使其**只读**；已有 session 继续运行，新 session 无法引用它。不可 unarchive——这是终态。 |
| `GET` | `/v1/agents/{agent_id}/versions` | ListAgentVersions | 列出 agent 版本 |

## Sessions

| 方法   | 路径                                             | 操作            | 描述                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `GET` | `/v1/sessions` | ListSessions | 列出 sessions（分页） |
| `POST` | `/v1/sessions` | CreateSession | 创建新 session |
| `GET` | `/v1/sessions/{session_id}` | GetSession | 获取 session 详情 |
| `POST` | `/v1/sessions/{session_id}` | UpdateSession | 更新 session 元数据/标题 |
| `DELETE` | `/v1/sessions/{session_id}` | DeleteSession | 删除 session |
| `POST` | `/v1/sessions/{session_id}/archive` | ArchiveSession | 归档 session |

## Events

| 方法   | 路径                                             | 操作            | 描述                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `GET` | `/v1/sessions/{session_id}/events` | ListEvents | 列出 events（轮询，分页） |
| `POST` | `/v1/sessions/{session_id}/events` | SendEvents | 发送 events（用户消息、工具结果） |
| `GET` | `/v1/sessions/{session_id}/events/stream` | StreamEvents | 通过 SSE 流式传输 events |

## Session Resources

| 方法   | 路径                                                    | 操作            | 描述                              |
| -------- | ------------------------------------------------------- | ---------------- | ---------------------------------------- |
| `GET` | `/v1/sessions/{session_id}/resources` | ListResources | 列出附加到 session 的资源 |
| `POST` | `/v1/sessions/{session_id}/resources` | AddResource | 挂载 `file` 或 `github_repository` 资源（SDK 方法：`add`，而非 `create`）。`memory_store` 资源只能在 session 创建时挂载。 |
| `GET` | `/v1/sessions/{session_id}/resources/{resource_id}` | GetResource | 获取单个资源 |
| `POST` | `/v1/sessions/{session_id}/resources/{resource_id}` | UpdateResource | 更新资源 |
| `DELETE` | `/v1/sessions/{session_id}/resources/{resource_id}` | DeleteResource | 从 session 中移除资源 |

## Environments

| 方法   | 路径                                                             | 操作                | 描述                         |
| -------- | ---------------------------------------------------------------- | -------------------- | ----------------------------------- |
| `POST`   | `/v1/environments`                                     | CreateEnvironment    | 创建 environment                |
| `GET`    | `/v1/environments`                                     | ListEnvironments     | 列出 environments                  |
| `GET`    | `/v1/environments/{environment_id}`                    | GetEnvironment       | 获取 environment 详情             |
| `POST`   | `/v1/environments/{environment_id}`                    | UpdateEnvironment    | 更新 environment                  |
| `DELETE` | `/v1/environments/{environment_id}`                    | DeleteEnvironment    | 删除 environment。返回 204。 |
| `POST`   | `/v1/environments/{environment_id}/archive`            | ArchiveEnvironment   | 归档 environment。使其**只读**；已有 session 继续运行，新 session 无法引用它。不可 unarchive——这是终态。 |

## Vaults

Vaults 用于存储由 Anthropic 代管的 MCP 凭证——支持自动刷新的 OAuth 凭证或静态 bearer token。通过 `vault_ids` 附加到 session。概念指南和凭证格式参见 `managed-agents-tools.md` §Vaults。

| 方法   | 路径                                             | 操作            | 描述                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `POST`   | `/v1/vaults`                                     | CreateVault      | 创建 vault                           |
| `GET`    | `/v1/vaults`                                     | ListVaults       | 列出 vaults                              |
| `GET`    | `/v1/vaults/{vault_id}`                          | GetVault         | 获取 vault 详情                        |
| `POST`   | `/v1/vaults/{vault_id}`                          | UpdateVault      | 更新 vault                             |
| `DELETE` | `/v1/vaults/{vault_id}`                          | DeleteVault      | 删除 vault                             |
| `POST`   | `/v1/vaults/{vault_id}/archive`                  | ArchiveVault     | 归档 vault                            |

## Credentials

Credentials 是存储在 vault 内部的单个密钥。

| 方法   | 路径                                                              | 操作              | 描述                  |
| -------- | ----------------------------------------------------------------- | ------------------ | ---------------------------- |
| `POST`   | `/v1/vaults/{vault_id}/credentials`                               | CreateCredential   | 创建 credential          |
| `GET`    | `/v1/vaults/{vault_id}/credentials`                               | ListCredentials    | 列出 vault 中的 credentials    |
| `GET`    | `/v1/vaults/{vault_id}/credentials/{credential_id}`               | GetCredential      | 获取 credential 元数据      |
| `POST`   | `/v1/vaults/{vault_id}/credentials/{credential_id}`               | UpdateCredential   | 更新 credential            |
| `DELETE` | `/v1/vaults/{vault_id}/credentials/{credential_id}`               | DeleteCredential   | 删除 credential            |
| `POST`   | `/v1/vaults/{vault_id}/credentials/{credential_id}/archive`       | ArchiveCredential  | 归档 credential           |

## Memory Stores

工作空间级别的持久化记忆，可跨 session 保留。通过 session 创建时在 `resources[]` 中添加 `{"type": "memory_store", "memory_store_id": ...}` 条目来挂载到 session。概念指南、FUSE 挂载的 agent 接口、前提条件和版本管理参见 `shared/managed-agents-memory.md`。

| 方法   | 路径                                             | 操作              | 描述                              |
| -------- | ------------------------------------------------ | ------------------ | ---------------------------------------- |
| `POST`   | `/v1/memory_stores`                              | CreateMemoryStore  | 创建 store（`name`、`description`、`metadata`） |
| `GET`    | `/v1/memory_stores`                              | ListMemoryStores   | 列出 stores（`include_archived`、`created_at_{gte,lte}`） |
| `GET`    | `/v1/memory_stores/{memory_store_id}`            | GetMemoryStore     | 获取 store 详情                        |
| `POST`   | `/v1/memory_stores/{memory_store_id}`            | UpdateMemoryStore  | 更新 store                             |
| `DELETE` | `/v1/memory_stores/{memory_store_id}`            | DeleteMemoryStore  | 删除 store                             |
| `POST`   | `/v1/memory_stores/{memory_store_id}/archive`    | ArchiveMemoryStore | 归档 store。使其**只读**；已有 session 继续运行，新 session 无法引用它。不可 unarchive。 |

## Memories

Store 中的单个文本文档（每个 ≤ 100KB）。`create` 在指定 `path` 创建，若路径已被占用则返回 `409`（`memory_path_conflict_error`，附带 `conflicting_memory_id`）；`update` 通过 `mem_...` ID 进行变更（重命名和/或内容）。只有 `update` 接受 `precondition`（`{"type": "content_sha256", "content_sha256": ...}`）——不匹配时返回 `409`（`memory_precondition_failed_error`）。List 接口接受 `view: "basic"|"full"`（控制是否填充 `content`；`retrieve` 默认为 `full`）。

| 方法   | 路径                                                              | 操作          | 描述                              |
| -------- | ----------------------------------------------------------------- | -------------- | ---------------------------------------- |
| `GET`    | `/v1/memory_stores/{memory_store_id}/memories`                    | ListMemories   | 返回 `Memory \| MemoryPrefix`；可按 `path_prefix`、`depth`、`order_by`/`order` 过滤 |
| `POST`   | `/v1/memory_stores/{memory_store_id}/memories`                    | CreateMemory   | 在 `path` 创建（SDK：`memories.create`）；路径被占用时返回 `409 memory_path_conflict_error` |
| `GET`    | `/v1/memory_stores/{memory_store_id}/memories/{memory_id}`        | GetMemory      | 读取一条 memory（默认 `view="full"`） |
| `PATCH`  | `/v1/memory_stores/{memory_store_id}/memories/{memory_id}`        | UpdateMemory   | 通过 ID 修改 `content`、`path` 或两者；可选的 `precondition` |
| `DELETE` | `/v1/memory_stores/{memory_store_id}/memories/{memory_id}`        | DeleteMemory   | 删除（可选的 `expected_content_sha256`） |

## Memory Versions

不可变的每次变更快照（`memver_...`）——审计和回滚的载体。`operation` ∈ `created` / `modified` / `deleted`。

| 方法   | 路径                                                                          | 操作                 | 描述                              |
| -------- | ----------------------------------------------------------------------------- | --------------------- | ---------------------------------------- |
| `GET`    | `/v1/memory_stores/{memory_store_id}/memory_versions`                         | ListMemoryVersions    | 最新优先；可按 `memory_id`、`operation`、`session_id`、`api_key_id`、`created_at_{gte,lte}` 过滤 |
| `GET`    | `/v1/memory_stores/{memory_store_id}/memory_versions/{version_id}`            | GetMemoryVersion      | 列表字段 + 完整 `content`             |
| `POST`   | `/v1/memory_stores/{memory_store_id}/memory_versions/{version_id}/redact`     | RedactMemoryVersion   | 清除 `content`/`content_sha256`/`content_size_bytes`/`path`；保留操作者和时间戳 |

## Files

| 方法   | 路径                                             | 操作            | 描述                              |
| -------- | ------------------------------------------------ | ---------------- | ---------------------------------------- |
| `POST`   | `/v1/files`                            | UploadFile       | 上传文件                            |
| `GET`    | `/v1/files`                            | ListFiles        | 列出文件                               |
| `GET`    | `/v1/files/{file_id}`                  | GetFile          | 获取文件元数据（SDK 方法：`retrieve_metadata`） |
| `GET`    | `/v1/files/{file_id}/content`          | DownloadFile     | 下载文件内容                    |
| `DELETE` | `/v1/files/{file_id}`                  | DeleteFile       | 删除文件                            |

## Skills

| 方法   | 路径                                                            | 操作              | 描述                  |
| -------- | --------------------------------------------------------------- | ------------------ | ---------------------------- |
| `POST`   | `/v1/skills`                                          | CreateSkill        | 创建 skill               |
| `GET`    | `/v1/skills`                                          | ListSkills         | 列出 skills                  |
| `GET`    | `/v1/skills/{skill_id}`                               | GetSkill           | 获取 skill 详情            |
| `DELETE` | `/v1/skills/{skill_id}`                               | DeleteSkill        | 删除 skill               |
| `POST`   | `/v1/skills/{skill_id}/versions`                      | CreateVersion      | 创建 skill version         |
| `GET`    | `/v1/skills/{skill_id}/versions`                      | ListVersions       | 列出 skill versions          |
| `GET`    | `/v1/skills/{skill_id}/versions/{version}`            | GetVersion         | 获取 skill version            |
| `DELETE` | `/v1/skills/{skill_id}/versions/{version}`            | DeleteVersion      | 删除 skill version         |

---

## 请求/响应 Schema 快速参考

### CreateAgent 请求体

**始终从这里开始。** `model`、`system`、`tools`、`mcp_servers`、`skills` 是此对象的顶层字段——它们**不**放在 session 上。

```json
{
  "name": "string（必填，1-256 字符）",
  "model": "{{OPUS_ID}}（必填——裸字符串或 {id, speed} 对象）",
  "description": "string（可选，最多 2048 字符）",
  "system": "string（可选，最多 100,000 字符）",
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
  "metadata": {
    "key": "value（最多 16 对，键 ≤64 字符，值 ≤512 字符）"
  }
}
```

> 限制：`tools` 最多 50 个，`skills` 最多 64 个，`mcp_servers` 最多 20 个（名称唯一）。

### CreateSession 请求体

```json
{
  "agent": "agent_abc123（必填——表示最新版本的字符串简写，或 {type: \"agent\", id, version} 对象）",
  "environment_id": "env_abc123（必填）",
  "title": "string（可选）",
  "resources": [
    {
      "type": "github_repository",
      "url": "https://github.com/owner/repo（必填）",
      "authorization_token": "ghp_...（必填）",
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

> `agent` 字段只接受字符串 ID 或 `{type: "agent", id, version}`——`model`/`system`/`tools` 属于 agent，不在此处。
>
> **`checkout`** 接受 `{type: "branch", name: "..."}` 或 `{type: "commit", sha: "..."}`。省略则使用仓库的默认分支。

### CreateEnvironment 请求体

```json
{
  "name": "string（必填）",
  "description": "string（可选）",
  "config": {
    "type": "cloud",
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

### Tool Result Event

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

Managed Agents 接口使用标准的 Anthropic API 错误格式。错误以 HTTP 状态码和包含 `type`、`error`、`request_id` 的 JSON 响应体返回：

```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "Description of what went wrong"
  },
  "request_id": "req_011CRv1W3XQ8XpFikNYG7RnE"
}
```

向 Anthropic 报告问题时请提供 `request_id`——它允许我们端到端追踪请求。内层的 `error.type` 为以下值之一：

| 状态码 | 错误类型 | 描述 |
|---|---|---|
| 400 | `invalid_request_error` | 请求格式错误或缺少必需参数 |
| 401 | `authentication_error` | API key 无效或缺失 |
| 403 | `permission_error` | 该 API key 没有此操作的权限 |
| 404 | `not_found_error` | 请求的资源不存在 |
| 409 | `invalid_request_error` | 请求与资源的当前状态冲突（例如，向已归档的 session 发送消息） |
| 413 | `request_too_large` | 请求体超过允许的最大大小 |
| 429 | `rate_limit_error` | 请求过多——检查速率限制请求头以确定重试时机 |
| 500 | `api_error` | 内部服务器错误 |
| 529 | `overloaded_error` | 服务暂时过载——使用退避策略重试 |

注意，`409 Conflict` 携带的 `error.type` 是 `"invalid_request_error"`（没有单独的 `conflict_error` 类型）；请同时检查 HTTP 状态码和 `message` 来区分冲突与其他无效请求。

---

## 速率限制

Managed Agents 接口有按组织（per-organization）的每分钟请求数（RPM）限制，独立于你的 [Messages API token 限制](https://platform.claude.com/docs/en/api/rate-limits)。Session 内部的模型推理仍然受组织的标准 ITPM/OTPM 限制约束。

| 接口分组 | 范围 | RPM | 最大并发 |
|---|---|---|---|
| 创建操作（Agents、Sessions、Vaults） | 组织 | 60 | — |
| 所有其他操作（Agents、Sessions、Vaults） | 组织 | 600 | — |
| 所有操作（Environments） | 组织 | 60 | 5 |

Files 和 Skills 接口使用基于 tier 的标准[速率限制](https://platform.claude.com/docs/en/api/rate-limits)。

超出限制时，API 返回 `429` 及 `rate_limit_error`（响应结构参见[错误处理](#错误处理)），以及 `retry-after` 响应头指示需要等待多少秒后重试。Anthropic SDK 会读取此响应头并自动重试。
