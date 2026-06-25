<!--
name: '数据：Managed Agents 参考 — Ruby'
description: 使用 Anthropic Ruby SDK 创建和管理 agent、environment 以及 session 的参考指南
ccVersion: 2.1.182
-->
# Managed Agents — Ruby

> **未列出的绑定：** 本 README 涵盖 Ruby 最常见的 managed-agents 流程。如果你需要的类、方法、命名空间、字段或行为未在此展示，请通过 WebFetch 查阅 Ruby SDK 仓库**或** `shared/live-sources.md` 中的相关文档页面，而非猜测。不要从 cURL 格式或其他语言 SDK 进行推断。

> **Agent 是持久化的 — 创建一次，按 ID 引用。** 将 `client.beta.agents.create` 返回的 agent ID 存储起来，并在每次调用 `client.beta.sessions.create` 时传入；不要在请求路径中调用 `agents.create`。Anthropic CLI 是从版本控制的 YAML 创建 agent 和 environment 的便捷方式 — 其 URL 见 `shared/live-sources.md`。以下示例为完整性展示代码内创建方式；在生产环境中，创建调用应放在初始化阶段，而非请求路径中。

## 安装

```bash
gem install anthropic
```

## 客户端初始化

```ruby
require "anthropic"

# 默认（使用 ANTHROPIC_API_KEY 环境变量）
client = Anthropic::Client.new

# 显式 API key
client = Anthropic::Client.new(api_key: "your-api-key")
```

> ⚠️ **尾部下划线：** Ruby SDK 使用 `system_:` 和 `send_(`（尾部下划线）以避免遮蔽 `Kernel#system` 和 `Kernel#send`。在 managed-agents 代码中请始终使用这些形式。

---

## 创建 Environment

```ruby
environment = client.beta.environments.create(
  name: "my-dev-env",
  config: {
    type: "cloud",
    networking: {type: "unrestricted"}
  }
)
puts "Environment ID: #{environment.id}" # env_...
```

---

## 创建 Agent（必需的第一步）

> ⚠️ **没有内联 agent 配置。** `model`/`system_`/`tools` 位于 agent 对象上，而非 session。始终从 `client.beta.agents.create()` 开始 — session 接受 `agent: agent.id` 或类型化哈希形式 `agent: {type: "agent", id: agent.id, version: agent.version}`。

### 最小示例

```ruby
# 1. 创建 agent（可复用、带版本）
agent = client.beta.agents.create(
  name: "Coding Assistant",
  model: :"{{OPUS_ID}}",
  system_: "You are a helpful coding assistant.",
  tools: [{type: "agent_toolset_20260401"}]
)

# 2. 启动 session
session = client.beta.sessions.create(
  agent: {type: "agent", id: agent.id, version: agent.version},
  environment_id: environment.id,
  title: "Quickstart session"
)
puts "Session ID: #{session.id}"
```

### 更新 Agent

更新会创建新版本；agent 对象在每个版本中是不可变的。

```ruby
updated_agent = client.beta.agents.update(
  agent.id,
  version: agent.version,
  system_: "You are a helpful coding agent. Always write tests."
)
puts "New version: #{updated_agent.version}"

# 列出所有版本
client.beta.agents.versions.list(agent.id).auto_paging_each do |version|
  puts "Version #{version.version}: #{version.updated_at.iso8601}"
end

# 归档 agent
archived = client.beta.agents.archive(agent.id)
puts "Archived at: #{archived.archived_at.iso8601}"
```

---

## 发送用户消息

```ruby
client.beta.sessions.events.send_(
  session.id,
  events: [{
    type: "user.message",
    content: [{type: "text", text: "Review the auth module"}]
  }]
)
```

> 💡 **流优先：** 在发送消息*之前*（或同时）打开流。流只会传递在其打开之后发生的事件 — 在流之后发送意味着早期事件会缓冲后批量到达。参见[操控模式](../../shared/managed-agents-events.md#steering-patterns)。

---

## 流式事件（SSE）

```ruby
# 先打开流，再发送用户消息
stream = client.beta.sessions.events.stream_events(session.id)

client.beta.sessions.events.send_(
  session.id,
  events: [{
    type: "user.message",
    content: [{type: "text", text: "Summarize the repo README"}]
  }]
)

stream.each do |event|
  case event.type
  in :"agent.message"
    event.content.each { |block| print block.text }
  in :"agent.tool_use"
    puts "\
[Using tool: #{event.name}]"
  in :"session.status_idle"
    break
  in :"session.error"
    puts "\
[Error: #{event.error&.message || "unknown"}]"
    break
  else
    # 忽略其他事件类型
  end
end
```

> ℹ️ 事件 `.type` 是 Symbol 类型（应使用 `:"agent.message"` 进行比较，而非 `"agent.message"`）。

### 重连和追尾

在会话中途重连时，先列出历史事件以去重，再追尾实时事件：

```ruby
require "set"

stream = client.beta.sessions.events.stream_events(session.id)

# 流已打开并正在缓冲。在追尾实时事件之前先列出历史记录。
seen_event_ids = Set.new
client.beta.sessions.events.list(session.id).auto_paging_each { |past| seen_event_ids << past.id }

# 追尾实时事件，跳过已见过的
stream.each do |event|
  next if seen_event_ids.include?(event.id)
  seen_event_ids << event.id
  case event.type
  in :"agent.message"
    event.content.each { |block| print block.text }
  in :"session.status_idle"
    break
  else
    # 忽略其他事件类型
  end
end
```

---

## 提供自定义工具结果

> ℹ️ Ruby managed-agents 绑定中的 `user.custom_tool_result` 尚未在本 skill 或 apps 源代码示例中记录。请参阅 `shared/managed-agents-events.md` 了解线格式，以及 `anthropic` Ruby gem 仓库了解对应的参数。

---

## 轮询事件

```ruby
client.beta.sessions.events.list(session.id).auto_paging_each do |event|
  puts "#{event.type}: #{event.id}"
end
```

---

## 上传文件

```ruby
require "pathname"

file = client.beta.files.upload(file: Pathname("data.csv"))
puts "File ID: #{file.id}"

# 挂载到 session
session = client.beta.sessions.create(
  agent: agent.id,
  environment_id: environment.id,
  resources: [
    {
      type: "file",
      file_id: file.id,
      mount_path: "/workspace/data.csv"
    }
  ]
)
```

### 在已有 Session 上添加和管理资源

```ruby
# 将额外文件附加到已打开的 session
resource = client.beta.sessions.resources.add(
  session.id,
  type: "file",
  file_id: file.id
)
puts resource.id # "sesrsc_01ABC..."

# 列出 session 上的资源
listed = client.beta.sessions.resources.list(session.id)
listed.data.each { |entry| puts "#{entry.id} #{entry.type}" }

# 分离资源
client.beta.sessions.resources.delete(resource.id, session_id: session.id)
```

---

## 列出和下载 Session 文件

```ruby
files = client.beta.files.list(scope_id: "sesn_abc123", betas: ["managed-agents-2026-04-01"])
content = client.beta.files.download(files.data[0].id)
File.binwrite("output.txt", content.read)
```

---

## Session 管理

```ruby
# 列出 environment
environments = client.beta.environments.list

# 获取特定 environment
env = client.beta.environments.retrieve(environment.id)

# 归档 environment（只读，已有 session 继续运行）
client.beta.environments.archive(environment.id)

# 删除 environment（仅当没有 session 引用时）
client.beta.environments.delete(environment.id)

# 删除 session
client.beta.sessions.delete(session.id)
```

---

## MCP Server 集成

```ruby
# Agent 声明 MCP server（此处无认证 — 认证在 vault 中）
agent = client.beta.agents.create(
  name: "GitHub Assistant",
  model: :"{{OPUS_ID}}",
  mcp_servers: [
    {
      type: "url",
      name: "github",
      url: "https://api.githubcopilot.com/mcp/"
    }
  ],
  tools: [
    {type: "agent_toolset_20260401"},
    {type: "mcp_toolset", mcp_server_name: "github"}
  ]
)

# Session 附加包含这些 MCP server URL 凭据的 vault(s)
session = client.beta.sessions.create(
  agent: {type: "agent", id: agent.id, version: agent.version},
  environment_id: environment.id,
  vault_ids: [vault.id]
)
```

参见 `shared/managed-agents-tools.md` §Vaults 了解创建 vault 和添加凭据的方式。

---

## Vault

```ruby
# 创建 vault
vault = client.beta.vaults.create(
  display_name: "Alice",
  metadata: {external_user_id: "usr_abc123"}
)
puts vault.id # "vlt_01ABC..."

# 添加 OAuth 凭据
credential = client.beta.vaults.credentials.create(
  vault.id,
  display_name: "Alice's Slack",
  auth: {
    type: "mcp_oauth",
    mcp_server_url: "https://mcp.slack.com/mcp",
    access_token: "xoxp-...",
    expires_at: "2026-04-15T00:00:00Z",
    refresh: {
      token_endpoint: "https://slack.com/api/oauth.v2.access",
      client_id: "1234567890.0987654321",
      scope: "channels:read chat:write",
      refresh_token: "xoxe-1-...",
      token_endpoint_auth: {
        type: "client_secret_post",
        client_secret: "abc123..."
      }
    }
  }
)

# 轮换凭据（例如，在 token 刷新之后）
client.beta.vaults.credentials.update(
  credential.id,
  vault_id: vault.id,
  auth: {
    type: "mcp_oauth",
    access_token: "xoxp-new-...",
    expires_at: "2026-05-15T00:00:00Z",
    refresh: {refresh_token: "xoxe-1-new-..."}
  }
)

# 归档 vault
client.beta.vaults.archive(vault.id)
```

---

## GitHub 仓库集成

将 GitHub 仓库挂载为 session 资源（vault 持有 GitHub MCP 凭据）：

```ruby
session = client.beta.sessions.create(
  agent: agent.id,
  environment_id: environment.id,
  vault_ids: [vault.id],
  resources: [
    {
      type: "github_repository",
      url: "https://github.com/org/repo",
      mount_path: "/workspace/repo",
      authorization_token: "ghp_your_github_token"
    }
  ]
)
```

同一 session 上的多个仓库：

```ruby
resources = [
  {
    type: "github_repository",
    url: "https://github.com/org/frontend",
    mount_path: "/workspace/frontend",
    authorization_token: "ghp_your_github_token"
  },
  {
    type: "github_repository",
    url: "https://github.com/org/backend",
    mount_path: "/workspace/backend",
    authorization_token: "ghp_your_github_token"
  }
]
```

轮换仓库的授权 token：

```ruby
listed = client.beta.sessions.resources.list(session.id)
repo_resource_id = listed.data.first.id

client.beta.sessions.resources.update(
  repo_resource_id,
  session_id: session.id,
  authorization_token: "ghp_your_new_github_token"
)
```
