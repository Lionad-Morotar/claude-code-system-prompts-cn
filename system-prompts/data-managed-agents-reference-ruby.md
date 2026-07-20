<!--
name: 'Data: Managed Agents reference — Ruby'
description: 使用 Anthropic Ruby SDK 创建和管理代理、环境和会话的参考指南
ccVersion: 2.1.203
-->
# Managed Agents — Ruby

> **此处未展示的绑定：** 本 README 涵盖了 Ruby 最常见的 managed-agents 流程。如果你需要未展示的类、方法、命名空间、字段或行为，请 WebFetch Ruby SDK 仓库 **或 `shared/live-sources.md` 中的相关文档页面**，而不是猜测。不要从 cURL 形态或其他语言的 SDK 推断。

> **代理是持久化的 — 创建一次，通过 ID 引用。** 存储 `client.beta.agents.create` 返回的代理 ID，并将其传递给每个后续的 `client.beta.sessions.create`；不要在请求路径中调用 `agents.create`。Anthropic CLI 是从版本控制 YAML 创建代理和环境的便捷方式之一 — 其 URL 在 `shared/live-sources.md` 中。以下示例展示了代码内创建以保证完整性；在生产环境中，创建调用属于设置阶段，而非请求路径。

## 安装

```bash
gem install anthropic
```

## 客户端初始化

```ruby
require "anthropic"

# Default (uses ANTHROPIC_API_KEY env var)
client = Anthropic::Client.new

# Explicit API key
client = Anthropic::Client.new(api_key: "your-api-key")
```

> ⚠️ **尾部下划线：** Ruby SDK 使用 `system_:` 和 `send_(`（尾部下划线）以避免遮蔽 `Kernel#system` 和 `Kernel#send`。在所有 managed-agents 代码中使用这些形式。

---

## 创建环境

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

## 创建代理（必需的第一步）

> ⚠️ **没有内联代理配置。** `model`/`system_`/`tools` 位于代理对象上，而非会话上。始终以 `client.beta.agents.create()` 开始 — 会话接受 `agent: agent.id` 或类型化的哈希形式 `agent: {type: "agent", id: agent.id, version: agent.version}`。

### 最小示例

```ruby
# 1. Create the agent (reusable, versioned)
agent = client.beta.agents.create(
  name: "Coding Assistant",
  model: :"{{OPUS_ID}}",
  system_: "You are a helpful coding assistant.",
  tools: [{type: "agent_toolset_20260401"}]
)

# 2. Start a session
session = client.beta.sessions.create(
  agent: {type: "agent", id: agent.id, version: agent.version},
  environment_id: environment.id,
  title: "Quickstart session"
)
puts "Session ID: #{session.id}"
puts "Trace: https://platform.claude.com/workspaces/default/sessions/#{session.id}"
```

### 更新代理

更新会创建新版本；代理对象在每个版本中是不可变的。

```ruby
updated_agent = client.beta.agents.update(
  agent.id,
  version: agent.version,
  system_: "You are a helpful coding agent. Always write tests."
)
puts "New version: #{updated_agent.version}"

# List all versions
client.beta.agents.versions.list(agent.id).auto_paging_each do |version|
  puts "Version #{version.version}: #{version.updated_at.iso8601}"
end

# Archive the agent
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

> 💡 **流优先：** 在发送消息*之前*（或同时）打开流。流只传递打开后发生的事件 — 发送后再打开流意味着早期事件会作为一个批次缓冲到达。参见[引导模式](../../shared/managed-agents-events.md#steering-patterns)。

---

## 流式事件（SSE）

```ruby
# Open the stream first, then send the user message
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
    # ignore other event types
  end
end
```

> ℹ️ 事件 `.type` 是一个 Symbol（使用 `:"agent.message"` 比较，而非 `"agent.message"`）。

### 重连和追踪

当在会话中途重连时，先列出过去的事件以去重，然后追踪实时事件：

```ruby
require "set"

stream = client.beta.sessions.events.stream_events(session.id)

# Stream is open and buffering. List history before tailing live.
seen_event_ids = Set.new
client.beta.sessions.events.list(session.id).auto_paging_each { |past| seen_event_ids << past.id }

# Tail live events, skipping anything already seen
stream.each do |event|
  next if seen_event_ids.include?(event.id)
  seen_event_ids << event.id
  case event.type
  in :"agent.message"
    event.content.each { |block| print block.text }
  in :"session.status_idle"
    break
  else
    # ignore other event types
  end
end
```

---

## 提供自定义工具结果

> ℹ️ Ruby 的 `user.custom_tool_result` managed-agents 绑定尚未在本技能或应用源代码示例中记录。请参阅 `shared/managed-agents-events.md` 了解线路格式，以及 `anthropic` Ruby gem 仓库了解相应的参数。

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

# Mount in a session
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

### 在现有会话上添加和管理资源

```ruby
# Attach an additional file to an open session
resource = client.beta.sessions.resources.add(
  session.id,
  type: "file",
  file_id: file.id
)
puts resource.id # "sesrsc_01ABC..."

# List resources on the session
listed = client.beta.sessions.resources.list(session.id)
listed.data.each { |entry| puts "#{entry.id} #{entry.type}" }

# Detach a resource
client.beta.sessions.resources.delete(resource.id, session_id: session.id)
```

---

## 列出和下载会话文件

```ruby
files = client.beta.files.list(scope_id: "sesn_abc123", betas: ["managed-agents-2026-04-01"])
content = client.beta.files.download(files.data[0].id)
File.binwrite("output.txt", content.read)
```

---

## 会话管理

```ruby
# List environments
environments = client.beta.environments.list

# Retrieve a specific environment
env = client.beta.environments.retrieve(environment.id)

# Archive an environment (read-only, existing sessions continue)
client.beta.environments.archive(environment.id)

# Delete an environment (only if no sessions reference it)
client.beta.environments.delete(environment.id)

# Delete a session
client.beta.sessions.delete(session.id)
```

---

## MCP 服务器集成

```ruby
# Agent declares MCP server (no auth here — auth goes in a vault)
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

# Session attaches vault(s) containing credentials for those MCP server URLs
session = client.beta.sessions.create(
  agent: {type: "agent", id: agent.id, version: agent.version},
  environment_id: environment.id,
  vault_ids: [vault.id]
)
```

参见 `shared/managed-agents-tools.md` §Vaults 以了解创建保管库和添加凭据。

---

## 保管库

```ruby
# Create a vault
vault = client.beta.vaults.create(
  display_name: "Alice",
  metadata: {external_user_id: "usr_abc123"}
)
puts vault.id # "vlt_01ABC..."

# Add an OAuth credential
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

# Rotate the credential (e.g., after a token refresh)
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

# Archive a vault
client.beta.vaults.archive(vault.id)
```

---

## GitHub 仓库集成

将 GitHub 仓库作为会话资源挂载（保管库持有 GitHub MCP 凭据）：

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

同一会话上的多个仓库：

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

轮换仓库的授权令牌：

```ruby
listed = client.beta.sessions.resources.list(session.id)
repo_resource_id = listed.data.first.id

client.beta.sessions.resources.update(
  repo_resource_id,
  session_id: session.id,
  authorization_token: "ghp_your_new_github_token"
)
```
<!--
name: 'Data: Managed Agents reference — Ruby'
description: Reference guide for using the Anthropic Ruby SDK to create and manage agents, environments, and sessions
ccVersion: 2.1.203
-->
# Managed Agents — Ruby

> **Bindings not shown here:** This README covers the most common managed-agents flows for Ruby. If you need a class, method, namespace, field, or behavior that isn't shown, WebFetch the Ruby SDK repo **or the relevant docs page** from `shared/live-sources.md` rather than guess. Do not extrapolate from cURL shapes or another language's SDK.

> **Agents are persistent — create once, reference by ID.** Store the agent ID returned by `client.beta.agents.create` and pass it to every subsequent `client.beta.sessions.create`; do not call `agents.create` in the request path. The Anthropic CLI is one convenient way to create agents and environments from version-controlled YAML — its URL is in `shared/live-sources.md`. The examples below show in-code creation for completeness; in production the create call belongs in setup, not in the request path.

## Installation

```bash
gem install anthropic
```

## Client Initialization

```ruby
require "anthropic"

# Default (uses ANTHROPIC_API_KEY env var)
client = Anthropic::Client.new

# Explicit API key
client = Anthropic::Client.new(api_key: "your-api-key")
```

> ⚠️ **Trailing underscores:** The Ruby SDK uses `system_:` and `send_(` (trailing underscore) to avoid shadowing `Kernel#system` and `Kernel#send`. Use these forms throughout managed-agents code.

---

## Create an Environment

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

## Create an Agent (required first step)

> ⚠️ **There is no inline agent config.** `model`/`system_`/`tools` live on the agent object, not the session. Always start with `client.beta.agents.create()` — the session takes either `agent: agent.id` or the typed hash form `agent: {type: "agent", id: agent.id, version: agent.version}`.

### Minimal

```ruby
# 1. Create the agent (reusable, versioned)
agent = client.beta.agents.create(
  name: "Coding Assistant",
  model: :"{{OPUS_ID}}",
  system_: "You are a helpful coding assistant.",
  tools: [{type: "agent_toolset_20260401"}]
)

# 2. Start a session
session = client.beta.sessions.create(
  agent: {type: "agent", id: agent.id, version: agent.version},
  environment_id: environment.id,
  title: "Quickstart session"
)
puts "Session ID: #{session.id}"
puts "Trace: https://platform.claude.com/workspaces/default/sessions/#{session.id}"
```

### Updating an Agent

Updates create new versions; the agent object is immutable per version.

```ruby
updated_agent = client.beta.agents.update(
  agent.id,
  version: agent.version,
  system_: "You are a helpful coding agent. Always write tests."
)
puts "New version: #{updated_agent.version}"

# List all versions
client.beta.agents.versions.list(agent.id).auto_paging_each do |version|
  puts "Version #{version.version}: #{version.updated_at.iso8601}"
end

# Archive the agent
archived = client.beta.agents.archive(agent.id)
puts "Archived at: #{archived.archived_at.iso8601}"
```

---

## Send a User Message

```ruby
client.beta.sessions.events.send_(
  session.id,
  events: [{
    type: "user.message",
    content: [{type: "text", text: "Review the auth module"}]
  }]
)
```

> 💡 **Stream-first:** Open the stream *before* (or concurrently with) sending the message. The stream only delivers events that occur after it opens — stream-after-send means early events arrive buffered in one batch. See [Steering Patterns](../../shared/managed-agents-events.md#steering-patterns).

---

## Stream Events (SSE)

```ruby
# Open the stream first, then send the user message
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
    # ignore other event types
  end
end
```

> ℹ️ Event `.type` is a Symbol (compare with `:"agent.message"`, not `"agent.message"`).

### Reconnecting and Tailing

When reconnecting mid-session, list past events first to dedupe, then tail live events:

```ruby
require "set"

stream = client.beta.sessions.events.stream_events(session.id)

# Stream is open and buffering. List history before tailing live.
seen_event_ids = Set.new
client.beta.sessions.events.list(session.id).auto_paging_each { |past| seen_event_ids << past.id }

# Tail live events, skipping anything already seen
stream.each do |event|
  next if seen_event_ids.include?(event.id)
  seen_event_ids << event.id
  case event.type
  in :"agent.message"
    event.content.each { |block| print block.text }
  in :"session.status_idle"
    break
  else
    # ignore other event types
  end
end
```

---

## Provide Custom Tool Result

> ℹ️ The Ruby managed-agents bindings for `user.custom_tool_result` are not yet documented in this skill or in the apps source examples. Refer to `shared/managed-agents-events.md` for the wire format and the `anthropic` Ruby gem repository for the corresponding params.

---

## Poll Events

```ruby
client.beta.sessions.events.list(session.id).auto_paging_each do |event|
  puts "#{event.type}: #{event.id}"
end
```

---

## Upload a File

```ruby
require "pathname"

file = client.beta.files.upload(file: Pathname("data.csv"))
puts "File ID: #{file.id}"

# Mount in a session
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

### Add and Manage Resources on an Existing Session

```ruby
# Attach an additional file to an open session
resource = client.beta.sessions.resources.add(
  session.id,
  type: "file",
  file_id: file.id
)
puts resource.id # "sesrsc_01ABC..."

# List resources on the session
listed = client.beta.sessions.resources.list(session.id)
listed.data.each { |entry| puts "#{entry.id} #{entry.type}" }

# Detach a resource
client.beta.sessions.resources.delete(resource.id, session_id: session.id)
```

---

## List and Download Session Files

```ruby
files = client.beta.files.list(scope_id: "sesn_abc123", betas: ["managed-agents-2026-04-01"])
content = client.beta.files.download(files.data[0].id)
File.binwrite("output.txt", content.read)
```

---

## Session Management

```ruby
# List environments
environments = client.beta.environments.list

# Retrieve a specific environment
env = client.beta.environments.retrieve(environment.id)

# Archive an environment (read-only, existing sessions continue)
client.beta.environments.archive(environment.id)

# Delete an environment (only if no sessions reference it)
client.beta.environments.delete(environment.id)

# Delete a session
client.beta.sessions.delete(session.id)
```

---

## MCP Server Integration

```ruby
# Agent declares MCP server (no auth here — auth goes in a vault)
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

# Session attaches vault(s) containing credentials for those MCP server URLs
session = client.beta.sessions.create(
  agent: {type: "agent", id: agent.id, version: agent.version},
  environment_id: environment.id,
  vault_ids: [vault.id]
)
```

See `shared/managed-agents-tools.md` §Vaults for creating vaults and adding credentials.

---

## Vaults

```ruby
# Create a vault
vault = client.beta.vaults.create(
  display_name: "Alice",
  metadata: {external_user_id: "usr_abc123"}
)
puts vault.id # "vlt_01ABC..."

# Add an OAuth credential
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

# Rotate the credential (e.g., after a token refresh)
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

# Archive a vault
client.beta.vaults.archive(vault.id)
```

---

## GitHub Repository Integration

Mount a GitHub repository as a session resource (a vault holds the GitHub MCP credential):

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

Multiple repositories on the same session:

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

Rotating a repository's authorization token:

```ruby
listed = client.beta.sessions.resources.list(session.id)
repo_resource_id = listed.data.first.id

client.beta.sessions.resources.update(
  repo_resource_id,
  session_id: session.id,
  authorization_token: "ghp_your_new_github_token"
)
```
