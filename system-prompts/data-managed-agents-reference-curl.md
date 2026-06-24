---
name: 'Data: Managed Agents reference — cURL'
description: Provides cURL and raw HTTP request examples for the Managed Agents API including environment, agent, and session lifecycle operations
ccVersion: 2.1.105
---

<!-- name: Data: Managed Agents reference — cURL -->
<!-- description: Provides cURL and raw HTTP request examples for the Managed Agents API including environment, agent, and session lifecycle operations -->

# Managed Agents — cURL / 原始 HTTP

当用户需要原始 HTTP 请求或不使用 SDK 时，使用这些示例。

## 准备工作

```bash
export ANTHROPIC_API_KEY="your-api-key"

# 通用请求头
HEADERS=(
  -H "Content-Type: application/json"
  -H "x-api-key: $ANTHROPIC_API_KEY"
  -H "anthropic-version: 2023-06-01"
  -H "anthropic-beta: managed-agents-2026-04-01"
)
```

---

## 创建 Environment（环境）

```bash
curl -X POST https://api.anthropic.com/v1/environments \
  "${HEADERS[@]}" \
  -d '{
    "name": "my-dev-env",
    "config": {
      "type": "cloud",
      "networking": { "type": "unrestricted" }
    }
  }'
```

### 使用受限网络

```bash
curl -X POST https://api.anthropic.com/v1/environments \
  "${HEADERS[@]}" \
  -d '{
    "name": "restricted-env",
    "config": {
      "type": "cloud",
      "networking": {
        "type": "package_managers_and_custom",
        "allowed_hosts": ["api.example.com"]
      }
    }
  }'
```

---

## 创建 Agent（必需的第一步）

> ⚠️ **没有内联 agent 配置。** 在 `managed-agents-2026-04-01` 下，`model`/`system`/`tools` 是 `POST /v1/agents` 上的顶层字段，而非 session 上的字段。始终先创建 agent — session 只接受 `"agent": {"type": "agent", "id": "..."}`。

### 最小化示例

```bash
# 1. 创建 agent
curl -X POST https://api.anthropic.com/v1/agents \
  "${HEADERS[@]}" \
  -d '{
    "name": "Coding Assistant",
    "model": "{{OPUS_ID}}",
    "tools": [{ "type": "agent_toolset_20260401" }]
  }'
# → { "id": "agent_abc123", ... }

# 2. 启动 session
curl -X POST https://api.anthropic.com/v1/sessions \
  "${HEADERS[@]}" \
  -d '{
    "agent": { "type": "agent", "id": "agent_abc123", "version": "1772585501101368014" },
    "environment_id": "env_abc123"
  }'
```

### 带 system prompt、自定义 tools 和 GitHub 仓库

```bash
# 1. 创建 agent
curl -X POST https://api.anthropic.com/v1/agents \
  "${HEADERS[@]}" \
  -d '{
    "name": "Code Reviewer",
    "model": "{{OPUS_ID}}",
    "system": "You are a senior code reviewer. Be thorough and constructive.",
    "tools": [
      { "type": "agent_toolset_20260401" },
      {
        "type": "custom",
        "name": "run_linter",
        "description": "Run the project linter on a file",
        "input_schema": {
          "type": "object",
          "properties": {
            "file_path": { "type": "string", "description": "Path to lint" }
          },
          "required": ["file_path"]
        }
      }
    ]
  }'

# 2. 启动 session 并挂载仓库
curl -X POST https://api.anthropic.com/v1/sessions \
  "${HEADERS[@]}" \
  -d '{
    "agent": { "type": "agent", "id": "agent_abc123", "version": "1772585501101368014" },
    "environment_id": "env_abc123",
    "title": "Code review session",
    "resources": [
      {
        "type": "github_repository",
        "url": "https://github.com/owner/repo",
        "mount_path": "/workspace/repo",
        "authorization_token": "ghp_...",
        "branch": "feature-branch"
      }
    ]
  }'
```

---

## 发送用户消息

```bash
curl -X POST https://api.anthropic.com/v1/sessions/$SESSION_ID/events \
  "${HEADERS[@]}" \
  -d '{
    "events": [
      {
        "type": "user.message",
        "content": [{ "type": "text", "text": "Review the auth module for security issues" }]
      }
    ]
  }'
```

---

## 流式事件（SSE）

```bash
curl -N https://api.anthropic.com/v1/sessions/$SESSION_ID/events/stream \
  "${HEADERS[@]}"
```

响应格式：

```
event: session.status_running
data: {"type":"session.status_running","id":"sevt_...","processed_at":"..."}

event: agent.message
data: {"type":"agent.message","id":"sevt_...","content":[{"type":"text","text":"I'll review..."}],"processed_at":"..."}

event: session.status_idle
data: {"type":"session.status_idle","id":"sevt_...","processed_at":"..."}
```

---

## 轮询事件

```bash
# 获取所有事件
curl https://api.anthropic.com/v1/sessions/$SESSION_ID/events \
  "${HEADERS[@]}"

# 分页 — 获取下一页事件
curl "https://api.anthropic.com/v1/sessions/$SESSION_ID/events?page=page_abc123" \
  "${HEADERS[@]}"
```

---

## 提供自定义 Tool 结果

当 agent 调用自定义 tool 时，将结果发送回去：

```bash
curl -X POST https://api.anthropic.com/v1/sessions/$SESSION_ID/events \
  "${HEADERS[@]}" \
  -d '{
    "events": [
      {
        "type": "user.custom_tool_result",
        "custom_tool_use_id": "sevt_abc123",
        "content": [{ "type": "text", "text": "No linting errors found." }]
      }
    ]
  }'
```

---

## 中断正在运行的 Session

```bash
curl -X POST https://api.anthropic.com/v1/sessions/$SESSION_ID/events \
  "${HEADERS[@]}" \
  -d '{
    "events": [
      {
        "type": "interrupt"
      }
    ]
  }'
```

---

## 获取 Session 详情

```bash
curl https://api.anthropic.com/v1/sessions/$SESSION_ID \
  "${HEADERS[@]}"
```

---

## 列出 Sessions

```bash
curl https://api.anthropic.com/v1/sessions \
  "${HEADERS[@]}"
```

---

## 删除 Session

```bash
curl -X DELETE https://api.anthropic.com/v1/sessions/$SESSION_ID \
  "${HEADERS[@]}"
```

---

## 上传文件

```bash
curl -X POST https://api.anthropic.com/v1/files \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: files-api-2025-04-14" \
  -F "file=@path/to/file.txt" \
  -F "purpose=agent"
```

---

## 列出和下载 Session 文件

列出 agent 在 session 期间写入 `/mnt/session/outputs/` 的文件，然后下载它们。

```bash
# 列出与 session 关联的文件
curl "https://api.anthropic.com/v1/files?scope_id=$SESSION_ID" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: files-api-2025-04-14,managed-agents-2026-04-01"

# 下载特定文件
curl "https://api.anthropic.com/v1/files/$FILE_ID/content" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: files-api-2025-04-14,managed-agents-2026-04-01" \
  -o downloaded_file.txt
```

---

## 列出 Agents

```bash
curl https://api.anthropic.com/v1/agents \
  "${HEADERS[@]}"
```

---

## MCP Server 集成

```bash
# 1. Agent 声明 MCP server（此处不含认证 — 认证信息存放在 vault 中）
curl -X POST https://api.anthropic.com/v1/agents \
  "${HEADERS[@]}" \
  -d '{
    "name": "MCP Agent",
    "model": "{{OPUS_ID}}",
    "mcp_servers": [
      { "type": "url", "name": "my-tools", "url": "https://my-mcp-server.example.com/sse" }
    ],
    "tools": [
      { "type": "agent_toolset_20260401" },
      { "type": "mcp_toolset", "mcp_server_name": "my-tools" }
    ]
  }'

# 2. Session 附加包含该 MCP server URL 凭据的 vault
curl -X POST https://api.anthropic.com/v1/sessions \
  "${HEADERS[@]}" \
  -d '{
    "agent": "agent_abc123",
    "environment_id": "env_abc123",
    "vault_ids": ["vlt_abc123"]
  }'
```

有关创建 vault 和添加凭据的信息，请参阅 `shared/managed-agents-tools.md` §Vaults。

---

## Tool 配置

```bash
curl -X POST https://api.anthropic.com/v1/agents \
  "${HEADERS[@]}" \
  -d '{
    "name": "Restricted Agent",
    "model": "{{OPUS_ID}}",
    "tools": [
      {
        "type": "agent_toolset_20260401",
        "default_config": { "enabled": true },
        "configs": [
          { "name": "bash", "enabled": false }
        ]
      }
    ]
  }'
```
