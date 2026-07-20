<!--
name: 'Data: Managed Agents memory stores reference'
description: Reference documentation for managed agents memory stores, memory versions, attachment, and direct memory management
ccVersion: 2.1.203
-->
# 托管智能体 —— 记忆存储

> **公开测试版。** 记忆存储随 `managed-agents-2026-04-01` beta 标头发布；SDK 会自动在所有 `client.beta.memory_stores.*` 调用上设置该标头。如果 `client.beta.memory_stores` 不可用，请升级到最新的 SDK 版本。

会话默认是临时的 —— 会话结束后，代理学到的所有内容都会丢失。**记忆存储**是一个工作区范围内的文本文档集合，可以跨会话持久化。当存储通过 `resources[]` 挂载到会话时，它会以文件系统目录的形式挂载到容器中；代理使用普通的文件工具读写它，系统提示词中会有一条说明告知代理挂载点的存在。

对记忆的每次修改都会产生一个不可变的**记忆版本**（`memver_...`），为你提供审计跟踪和按时间点回滚/编辑的能力。

> ⚠️ **永远不要在记忆存储中存储凭据、API key 或令牌。** 记忆跨会话持久化，并在未来的上下文中逐字返回 —— 写入一次的密钥会在每个挂载该存储的后续会话中重放。请改用 vault 的 `environment_variable` 凭据（`shared/managed-agents-tools.md` → Vaults）。如果密钥已经被写入，删除该记忆并编辑受影响的版本（参见下方的"编辑版本"）。

## 对象模型

| 对象 | ID 前缀 | 作用域 | 备注 |
| --- | --- | --- | --- |
| 记忆存储 | `memstore_...` | 工作区 | 通过 `resources[]` 挂载到会话 |
| 记忆 | `mem_...` | 存储 | 一个文本文件，通过 `path` 寻址（每文件 ≤ 100KB —— 推荐使用多个小文件） |
| 记忆版本 | `memver_...` | 记忆 | 每次修改的不可变快照；`operation` ∈ `created` / `modified` / `deleted` |

## 创建存储

`description` 会传递给代理，让它了解存储包含什么内容 —— 请为模型编写，而非为人类。

```python
store = client.beta.memory_stores.create(
    name="用户偏好",
    description="每个用户的偏好和项目上下文。",
)
print(store.id)  # memstore_01Hx...
```

其他 SDK：TypeScript `client.beta.memoryStores.create({...})`；Go `client.Beta.MemoryStores.New(ctx, ...)`。完整的分语言表格参见 `shared/managed-agents-api-reference.md` → SDK 方法参考。

存储支持 `retrieve` / `update` / `list`（支持 `include_archived`、`created_at_{gte,lte}` 过滤器）/ `delete` / **`archive`**。归档使存储变为只读 —— 现有会话挂载继续有效，新会话无法引用它；不可取消归档。

### 预填充内容（可选）

在任何会话运行之前预加载参考资料。`memories.create` 在指定的 `path` 创建记忆；如果该路径已存在记忆，调用会返回 `409`（`memory_path_conflict_error`，包含 `conflicting_memory_id`）。存储 ID 是第一个位置参数。

```python
client.beta.memory_stores.memories.create(
    store.id,
    path="/formatting_standards.md",
    content="所有报告使用 GAAP 格式。日期使用 ISO-8601...",
)
```

## 挂载到会话

记忆存储放在会话的 `resources[]` 数组中，与 `file` 和 `github_repository` 资源并列（参见 `shared/managed-agents-environments.md` → 资源）。记忆存储仅在**会话创建时**挂载 —— `sessions.resources.add()` 不接受 `memory_store`。

```python
session = client.beta.sessions.create(
    agent=agent.id,
    environment_id=environment.id,
    resources=[
        {
            "type": "memory_store",
            "memory_store_id": store.id,
            "access": "read_write",  # 或 "read_only"；默认为 "read_write"
            "instructions": "用户偏好和项目上下文。在开始任何任务之前检查。",
        }
    ],
)
```

| 字段 | 必填 | 备注 |
| --- | --- | --- |
| `type` | ✅ | `"memory_store"` |
| `memory_store_id` | ✅ | `memstore_...` |
| `access` | — | `"read_write"`（默认）或 `"read_only"` —— 在挂载点文件系统级别强制执行 |
| `instructions` | — | 针对此存储的会话特定指导，补充存储的 `name`/`description`。≤ 4,096 个字符。 |

**每个会话最多 8 个记忆存储。** 当不同的记忆分片有不同的所有者或生命周期时，挂载多个存储 —— 例如一个只读共享参考存储加一个读写用户专属存储，或共享同一代理配置的每个最终用户/团队/项目各一个存储。

### 代理的视角（FUSE 挂载）

每个挂载的存储在会话容器中挂载在 `/mnt/memory/<store-name>/` 下。代理使用标准文件工具（`bash`、`read`、`write`、`edit`、`glob`、`grep`）与之交互 —— 没有专门的记忆工具。`access: "read_only"` 在文件系统级别使挂载点为只读；`"read_write"` 允许代理在挂载点下创建、编辑和删除文件。每个挂载点的简短描述（名称、路径、`instructions`、访问模式）会自动注入到系统提示词中，因此代理无需你额外说明就知道存储的存在。

代理在挂载点下的写入操作会持久化回存储，并像宿主端的 `memories.update` 调用一样产生记忆版本。

## 直接管理记忆（宿主端）

用于审查工作流、修正错误记忆或带外预填充存储。

### 列表

返回 `Memory | MemoryPrefix` 条目 —— `MemoryPrefix`（`type: "memory_prefix"`，仅包含 `path`）是分层列表时的目录类节点。使用 `path_prefix` 限定范围（包含尾部斜杠：`"/notes/"` 匹配 `/notes/a.md` 但不匹配 `/notes_backup/old.md`），使用 `depth` 限制树遍历深度。`order_by` / `order` 对结果排序。传入 `view="full"` 以在每个条目中包含 `content`；默认的 `"basic"` 仅返回元数据。

```python
for m in client.beta.memory_stores.memories.list(store.id, path_prefix="/"):
    if m.type == "memory":
        print(f"{m.path}  ({m.content_size_bytes} 字节, sha={m.content_sha256[:8]})")
    else:  # "memory_prefix"
        print(f"{m.path}/")
```

### 读取

```python
mem = client.beta.memory_stores.memories.retrieve(memory_id, memory_store_id=store.id)
print(mem.content)
```

`retrieve` 默认 `view="full"`（包含内容）；`view` 主要在列表端点上起作用。

### 创建 vs. 更新

| 操作 | 寻址方式 | 语义 |
| --- | --- | --- |
| `memories.create(store_id, path=..., content=...)` | **Path（路径）** | 在 `path` 处创建。如果路径已被占用，返回 `409`（`memory_path_conflict_error`，包含 `conflicting_memory_id`）。 |
| `memories.update(mem_id, memory_store_id=..., path=..., content=...)` | **`mem_...` ID** | 修改现有记忆。更改 `content`、`path`（重命名）或两者。重命名到已被占用的路径返回同样的 `409 memory_path_conflict_error`。 |

```python
mem = client.beta.memory_stores.memories.create(
    store.id,
    path="/preferences/formatting.md",
    content="始终使用制表符，而非空格。",
)

client.beta.memory_stores.memories.update(
    mem.id,
    memory_store_id=store.id,
    path="/archive/2026_q1_formatting.md",  # 重命名
)
```

### 乐观并发（`update` 的前置条件）

`memories.update` 接受 `precondition`，以便你可以读取 → 修改 → 写回，而不会覆盖并发写入者的修改。唯一支持的类型是 `content_sha256`。不匹配时 API 返回 `409`（`memory_precondition_failed_error`）—— 重新读取并以最新状态重试。

```python
client.beta.memory_stores.memories.update(
    mem.id,
    memory_store_id=store.id,
    content="已更正：始终使用 2 空格缩进。",
    precondition={"type": "content_sha256", "content_sha256": mem.content_sha256},
)
```

### 删除

```python
client.beta.memory_stores.memories.delete(mem.id, memory_store_id=store.id)
```

传入 `expected_content_sha256` 以进行条件删除。

## 审计与回滚 —— 记忆版本

每次修改都会创建一个不可变的 `memver_...` 快照。版本在父记忆的整个生命周期中累积；`memories.retrieve` 始终返回当前头部，版本端点提供历史记录。

| 触发版本的操作 | 版本上的 `operation` 字段 |
| --- | --- |
| 在新路径上 `memories.create` | `"created"` |
| `memories.update` 更改 `content`、`path` 或两者（或代理端对挂载点的写入） | `"modified"` |
| `memories.delete` | `"deleted"` |

每个版本还记录 `created_by` —— 一个 actor 对象，`type` ∈ `session_actor` / `api_actor` / `user_actor` —— 以及编辑后的 `redacted_at` + `redacted_by`。

### 列出版本

按最新到最旧排序，分页。可按 `memory_id`、`operation`、`session_id`、`api_key_id` 或 `created_at_gte` / `created_at_lte` 过滤。传入 `view="full"` 以包含 `content`；默认仅返回元数据。

```python
for v in client.beta.memory_stores.memory_versions.list(store.id, memory_id=mem.id):
    print(f"{v.id}: {v.operation}")
```

### 获取版本

```python
version = client.beta.memory_stores.memory_versions.retrieve(
    version_id, memory_store_id=store.id
)
print(version.content)
```

### 编辑版本

清除历史版本中的内容，同时保留审计跟踪（actor + 时间戳）。清除 `content`、`content_sha256`、`content_size_bytes` 和 `path`；其他所有内容保持不变。用于处理泄露的密钥、PII 或用户删除请求。

```python
client.beta.memory_stores.memory_versions.redact(version_id, memory_store_id=store.id)
```

## 端点参考

完整的 HTTP 方法/路径表参见 `shared/managed-agents-api-reference.md` → Memory Stores / Memories / Memory Versions。原始 HTTP 基础路径：

```
POST   /v1/memory_stores
POST   /v1/memory_stores/{memory_store_id}/archive
GET    /v1/memory_stores/{memory_store_id}/memories
PATCH  /v1/memory_stores/{memory_store_id}/memories/{memory_id}
GET    /v1/memory_stores/{memory_store_id}/memory_versions
POST   /v1/memory_stores/{memory_store_id}/memory_versions/{version_id}/redact
```

cURL 示例和 CLI（`ant beta:memory-stores ...`），请 WebFetch `shared/live-sources.md` → Managed Agents 中的 Memory URL。
