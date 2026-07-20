<!--
name: 'Data: Managed Agents reference — Java'
description: 使用 Anthropic Java SDK 创建和管理代理、环境和会话的参考指南
ccVersion: 2.1.203
-->
# Managed Agents — Java

> **此处未展示的绑定：** 本 README 涵盖了 Java 最常见的 managed-agents 流程。如果你需要未展示的类、方法、命名空间、字段或行为，请 WebFetch Java SDK 仓库 **或 `shared/live-sources.md` 中的相关文档页面**，而不是猜测。不要从 cURL 形态或其他语言的 SDK 推断。

> **代理是持久化的 — 创建一次，通过 ID 引用。** 存储 `client.beta().agents().create` 返回的代理 ID，并将其传递给每个后续的 `client.beta().sessions().create`；不要在请求路径中调用 `agents().create`。Anthropic CLI 是从版本控制 YAML 创建代理和环境的便捷方式之一 — 其 URL 在 `shared/live-sources.md` 中。以下示例展示了代码内创建以保证完整性；在生产环境中，创建调用属于设置阶段，而非请求路径。

## 安装

```xml
<dependency>
    <groupId>com.anthropic</groupId>
    <artifactId>anthropic-java</artifactId>
</dependency>
```

## 客户端初始化

```java
import com.anthropic.client.okhttp.AnthropicOkHttpClient;

// Default (uses ANTHROPIC_API_KEY env var)
var client = AnthropicOkHttpClient.fromEnv();
```

---

## 创建环境

```java
import com.anthropic.models.beta.environments.BetaCloudConfigParams;
import com.anthropic.models.beta.environments.BetaUnrestrictedNetwork;
import com.anthropic.models.beta.environments.EnvironmentCreateParams;

var environment = client.beta().environments().create(EnvironmentCreateParams.builder()
    .name("my-dev-env")
    .config(BetaCloudConfigParams.builder()
        .networking(BetaUnrestrictedNetwork.builder().build())
        .build())
    .build());
System.out.println("Environment ID: " + environment.id()); // env_...
```

---

## 创建代理（必需的第一步）

> ⚠️ **没有内联代理配置。** Model、system 和 tools 位于代理对象上，而非会话上。始终以 `client.beta().agents().create()` 开始 — 会话接受 `.agent(agent.id())` 或类型化的 `BetaManagedAgentsAgentParams.builder()...build()`。

### 最小示例

```java
import com.anthropic.models.beta.agents.AgentCreateParams;
import com.anthropic.models.beta.agents.BetaManagedAgentsAgentToolset20260401Params;
import com.anthropic.models.beta.sessions.BetaManagedAgentsAgentParams;
import com.anthropic.models.beta.sessions.SessionCreateParams;

// 1. Create the agent (reusable, versioned)
var agent = client.beta().agents().create(AgentCreateParams.builder()
    .name("Coding Assistant")
    .model("{{OPUS_ID}}")
    .system("You are a helpful coding assistant.")
    .addTool(BetaManagedAgentsAgentToolset20260401Params.builder()
        .type(BetaManagedAgentsAgentToolset20260401Params.Type.AGENT_TOOLSET_20260401)
        .build())
    .build());

// 2. Start a session
var session = client.beta().sessions().create(SessionCreateParams.builder()
    .agent(BetaManagedAgentsAgentParams.builder()
        .type(BetaManagedAgentsAgentParams.Type.AGENT)
        .id(agent.id())
        .version(agent.version())
        .build())
    .environmentId(environment.id())
    .title("Quickstart session")
    .build());
System.out.println("Session ID: " + session.id());
System.out.println("Trace: https://platform.claude.com/workspaces/default/sessions/" + session.id());
```

### 更新代理

更新会创建新版本；代理对象在每个版本中是不可变的。

```java
import com.anthropic.models.beta.agents.AgentUpdateParams;

var updatedAgent = client.beta().agents().update(agent.id(), AgentUpdateParams.builder()
    .version(agent.version())
    .system("You are a helpful coding agent. Always write tests.")
    .build());
System.out.println("New version: " + updatedAgent.version());

// List all versions
for (var version : client.beta().agents().versions().list(agent.id()).autoPager()) {
    System.out.println("Version " + version.version() + ": " + version.updatedAt());
}

// Archive the agent
var archived = client.beta().agents().archive(agent.id());
System.out.println("Archived at: " + archived.archivedAt().orElseThrow());
```

---

## 发送用户消息

```java
import com.anthropic.models.beta.sessions.events.BetaManagedAgentsUserMessageEventParams;
import com.anthropic.models.beta.sessions.events.EventSendParams;

client.beta().sessions().events().send(session.id(), EventSendParams.builder()
    .addEvent(BetaManagedAgentsUserMessageEventParams.builder()
        .type(BetaManagedAgentsUserMessageEventParams.Type.USER_MESSAGE)
        .addTextContent("Review the auth module")
        .build())
    .build());
```

> 💡 **流优先：** 在发送消息*之前*（或同时）打开流。流只传递打开后发生的事件 — 发送后再打开流意味着早期事件会作为一个批次缓冲到达。参见[引导模式](../../shared/managed-agents-events.md#steering-patterns)。

---

## 流式事件（SSE）

```java
import com.anthropic.models.beta.sessions.events.StreamEvents;

// Open the stream first, then send the user message
try (var stream = client.beta().sessions().events().streamStreaming(session.id())) {
    client.beta().sessions().events().send(session.id(), EventSendParams.builder()
        .addEvent(BetaManagedAgentsUserMessageEventParams.builder()
            .type(BetaManagedAgentsUserMessageEventParams.Type.USER_MESSAGE)
            .addTextContent("Summarize the repo README")
            .build())
        .build());

    for (var event : (Iterable<StreamEvents>) stream.stream()::iterator) {
        if (event.isAgentMessage()) {
            event.asAgentMessage().content().forEach(block -> System.out.print(block.text()));
        } else if (event.isAgentToolUse()) {
            System.out.println("\
[Using tool: " + event.asAgentToolUse().name() + "]");
        } else if (event.isSessionStatusIdle()) {
            break;
        } else if (event.isSessionError()) {
            System.out.println("\
[Error]");
            break;
        }
    }
}
```

### 重连和追踪

当在会话中途重连时，先列出过去的事件以去重，然后追踪实时事件。跨变体的 `id` 字段从原始 `_json()` 值中读取：

```java
import com.anthropic.core.JsonValue;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;

try (var stream = client.beta().sessions().events().streamStreaming(session.id())) {
    // Stream is open and buffering. List history before tailing live.
    var seenEventIds = new HashSet<String>();
    for (var past : client.beta().sessions().events().list(session.id()).autoPager()) {
        Optional<Map<String, JsonValue>> obj = past._json().orElseThrow().asObject();
        seenEventIds.add(obj.orElseThrow().get("id").asStringOrThrow());
    }

    // Tail live events, skipping anything already seen
    for (var event : (Iterable<StreamEvents>) stream.stream()::iterator) {
        Optional<Map<String, JsonValue>> obj = event._json().orElseThrow().asObject();
        if (!seenEventIds.add(obj.orElseThrow().get("id").asStringOrThrow())) continue;
        if (event.isAgentMessage()) {
            event.asAgentMessage().content().forEach(block -> System.out.print(block.text()));
        } else if (event.isSessionStatusIdle()) {
            break;
        }
    }
}
```

---

## 提供自定义工具结果

> ℹ️ Java 的 `user.custom_tool_result` managed-agents 绑定尚未在本技能或应用源代码示例中记录。请参阅 `shared/managed-agents-events.md` 了解线路格式，以及 `anthropic-java` 仓库了解相应的参数类型。

---

## 轮询事件

```java
for (var event : client.beta().sessions().events().list(session.id()).autoPager()) {
    System.out.println(event.type() + ": " + event);
}
```

---

## 上传文件

```java
import com.anthropic.models.beta.files.FileUploadParams;
import com.anthropic.models.beta.sessions.BetaManagedAgentsFileResourceParams;
import java.nio.file.Path;

var dataCsv = Path.of("data.csv");

var file = client.beta().files().upload(FileUploadParams.builder()
    .file(dataCsv)
    .build());
System.out.println("File ID: " + file.id());

// Mount in a session
var session = client.beta().sessions().create(SessionCreateParams.builder()
    .agent(agent.id())
    .environmentId(environment.id())
    .addResource(BetaManagedAgentsFileResourceParams.builder()
        .type(BetaManagedAgentsFileResourceParams.Type.FILE)
        .fileId(file.id())
        .mountPath("/workspace/data.csv")
        .build())
    .build());
```

### 在现有会话上添加和管理资源

```java
import com.anthropic.models.beta.sessions.resources.ResourceAddParams;
import com.anthropic.models.beta.sessions.resources.ResourceDeleteParams;

// Attach an additional file to an open session
var resource = client.beta().sessions().resources().add(session.id(), ResourceAddParams.builder()
    .betaManagedAgentsFileResourceParams(BetaManagedAgentsFileResourceParams.builder()
        .type(BetaManagedAgentsFileResourceParams.Type.FILE)
        .fileId(file.id())
        .build())
    .build());
System.out.println(resource.id()); // "sesrsc_01ABC..."

// List resources on the session — entries are a discriminated union
var listed = client.beta().sessions().resources().list(session.id());
for (var entry : listed.data()) {
    if (entry.isFile()) {
        var fileResource = entry.asFile();
        System.out.println(fileResource.id() + " " + fileResource.type());
    } else if (entry.isGitHubRepository()) {
        var repoResource = entry.asGitHubRepository();
        System.out.println(repoResource.id() + " " + repoResource.type());
    }
}

// Detach a resource
client.beta().sessions().resources().delete(resource.id(), ResourceDeleteParams.builder()
    .sessionId(session.id())
    .build());
```

---

## 列出和下载会话文件

> ℹ️ 列出和下载代理在会话期间写入的文件尚未在本技能或应用源代码示例中为 Java 记录。请参阅 `shared/managed-agents-events.md` 和 `anthropic-java` 仓库了解文件列表/下载的绑定。

---

## 会话管理

```java
// List environments
var environments = client.beta().environments().list();

// Retrieve a specific environment
var env = client.beta().environments().retrieve(environment.id());

// Archive an environment (read-only, existing sessions continue)
client.beta().environments().archive(environment.id());

// Delete an environment (only if no sessions reference it)
client.beta().environments().delete(environment.id());

// Delete a session
client.beta().sessions().delete(session.id());
```

---

## MCP 服务器集成

```java
import com.anthropic.models.beta.agents.BetaManagedAgentsMcpToolsetParams;
import com.anthropic.models.beta.agents.BetaManagedAgentsUrlMcpServerParams;

// Agent declares MCP server (no auth here — auth goes in a vault)
var agent = client.beta().agents().create(AgentCreateParams.builder()
    .name("GitHub Assistant")
    .model("{{OPUS_ID}}")
    .addMcpServer(BetaManagedAgentsUrlMcpServerParams.builder()
        .type(BetaManagedAgentsUrlMcpServerParams.Type.URL)
        .name("github")
        .url("https://api.githubcopilot.com/mcp/")
        .build())
    .addTool(BetaManagedAgentsAgentToolset20260401Params.builder()
        .type(BetaManagedAgentsAgentToolset20260401Params.Type.AGENT_TOOLSET_20260401)
        .build())
    .addTool(BetaManagedAgentsMcpToolsetParams.builder()
        .type(BetaManagedAgentsMcpToolsetParams.Type.MCP_TOOLSET)
        .mcpServerName("github")
        .build())
    .build());

// Session attaches vault(s) containing credentials for those MCP server URLs
var session = client.beta().sessions().create(SessionCreateParams.builder()
    .agent(BetaManagedAgentsAgentParams.builder()
        .type(BetaManagedAgentsAgentParams.Type.AGENT)
        .id(agent.id())
        .version(agent.version())
        .build())
    .environmentId(environment.id())
    .addVaultId(vault.id())
    .build());
```

参见 `shared/managed-agents-tools.md` §Vaults 以了解创建保管库和添加凭据。

---

## 保管库

```java
import com.anthropic.core.JsonValue;
import com.anthropic.models.beta.vaults.VaultCreateParams;
import com.anthropic.models.beta.vaults.credentials.BetaManagedAgentsMcpOAuthCreateParams;
import com.anthropic.models.beta.vaults.credentials.BetaManagedAgentsMcpOAuthRefreshParams;
import com.anthropic.models.beta.vaults.credentials.BetaManagedAgentsMcpOAuthRefreshUpdateParams;
import com.anthropic.models.beta.vaults.credentials.BetaManagedAgentsMcpOAuthUpdateParams;
import com.anthropic.models.beta.vaults.credentials.CredentialCreateParams;
import com.anthropic.models.beta.vaults.credentials.CredentialUpdateParams;
import java.time.OffsetDateTime;

// Create a vault
var vault = client.beta().vaults().create(VaultCreateParams.builder()
    .displayName("Alice")
    .metadata(VaultCreateParams.Metadata.builder()
        .putAdditionalProperty("external_user_id", JsonValue.from("usr_abc123"))
        .build())
    .build());
System.out.println(vault.id()); // "vlt_01ABC..."

// Add an OAuth credential
var credential = client.beta().vaults().credentials().create(vault.id(),
    CredentialCreateParams.builder()
        .displayName("Alice's Slack")
        .auth(BetaManagedAgentsMcpOAuthCreateParams.builder()
            .type(BetaManagedAgentsMcpOAuthCreateParams.Type.MCP_OAUTH)
            .mcpServerUrl("https://mcp.slack.com/mcp")
            .accessToken("xoxp-...")
            .expiresAt(OffsetDateTime.parse("2026-04-15T00:00:00Z"))
            .refresh(BetaManagedAgentsMcpOAuthRefreshParams.builder()
                .tokenEndpoint("https://slack.com/api/oauth.v2.access")
                .clientId("1234567890.0987654321")
                .scope("channels:read chat:write")
                .refreshToken("xoxe-1-...")
                .clientSecretPostTokenEndpointAuth("abc123...")
                .build())
            .build())
        .build());

// Rotate the credential (e.g., after a token refresh)
client.beta().vaults().credentials().update(credential.id(),
    CredentialUpdateParams.builder()
        .vaultId(vault.id())
        .auth(BetaManagedAgentsMcpOAuthUpdateParams.builder()
            .type(BetaManagedAgentsMcpOAuthUpdateParams.Type.MCP_OAUTH)
            .accessToken("xoxp-new-...")
            .expiresAt(OffsetDateTime.parse("2026-05-15T00:00:00Z"))
            .refresh(BetaManagedAgentsMcpOAuthRefreshUpdateParams.builder()
                .refreshToken("xoxe-1-new-...")
                .build())
            .build())
        .build());

// Archive a vault
client.beta().vaults().archive(vault.id());
```

---

## GitHub 仓库集成

将 GitHub 仓库作为会话资源挂载（保管库持有 GitHub MCP 凭据）：

```java
import com.anthropic.models.beta.sessions.BetaManagedAgentsGitHubRepositoryResourceParams;

var session = client.beta().sessions().create(SessionCreateParams.builder()
    .agent(agent.id())
    .environmentId(environment.id())
    .addVaultId(vault.id())
    .addResource(BetaManagedAgentsGitHubRepositoryResourceParams.builder()
        .type(BetaManagedAgentsGitHubRepositoryResourceParams.Type.GITHUB_REPOSITORY)
        .url("https://github.com/org/repo")
        .mountPath("/workspace/repo")
        .authorizationToken("ghp_your_github_token")
        .build())
    .build());
```

同一会话上的多个仓库：

```java
import java.util.List;

var resources = List.of(
    BetaManagedAgentsGitHubRepositoryResourceParams.builder()
        .type(BetaManagedAgentsGitHubRepositoryResourceParams.Type.GITHUB_REPOSITORY)
        .url("https://github.com/org/frontend")
        .mountPath("/workspace/frontend")
        .authorizationToken("ghp_your_github_token")
        .build(),
    BetaManagedAgentsGitHubRepositoryResourceParams.builder()
        .type(BetaManagedAgentsGitHubRepositoryResourceParams.Type.GITHUB_REPOSITORY)
        .url("https://github.com/org/backend")
        .mountPath("/workspace/backend")
        .authorizationToken("ghp_your_github_token")
        .build());
```

轮换仓库的授权令牌：

```java
import com.anthropic.models.beta.sessions.resources.ResourceUpdateParams;

var listed = client.beta().sessions().resources().list(session.id());
var repoResourceId = listed.data().get(0).asGitHubRepository().id();

client.beta().sessions().resources().update(repoResourceId, ResourceUpdateParams.builder()
    .sessionId(session.id())
    .authorizationToken("ghp_your_new_github_token")
    .build());
```
<!--
name: 'Data: Managed Agents reference — Java'
description: Reference guide for using the Anthropic Java SDK to create and manage agents, environments, and sessions
ccVersion: 2.1.203
-->
# Managed Agents — Java

> **Bindings not shown here:** This README covers the most common managed-agents flows for Java. If you need a class, method, namespace, field, or behavior that isn't shown, WebFetch the Java SDK repo **or the relevant docs page** from `shared/live-sources.md` rather than guess. Do not extrapolate from cURL shapes or another language's SDK.

> **Agents are persistent — create once, reference by ID.** Store the agent ID returned by `client.beta().agents().create` and pass it to every subsequent `client.beta().sessions().create`; do not call `agents().create` in the request path. The Anthropic CLI is one convenient way to create agents and environments from version-controlled YAML — its URL is in `shared/live-sources.md`. The examples below show in-code creation for completeness; in production the create call belongs in setup, not in the request path.

## Installation

```xml
<dependency>
    <groupId>com.anthropic</groupId>
    <artifactId>anthropic-java</artifactId>
</dependency>
```

## Client Initialization

```java
import com.anthropic.client.okhttp.AnthropicOkHttpClient;

// Default (uses ANTHROPIC_API_KEY env var)
var client = AnthropicOkHttpClient.fromEnv();
```

---

## Create an Environment

```java
import com.anthropic.models.beta.environments.BetaCloudConfigParams;
import com.anthropic.models.beta.environments.BetaUnrestrictedNetwork;
import com.anthropic.models.beta.environments.EnvironmentCreateParams;

var environment = client.beta().environments().create(EnvironmentCreateParams.builder()
    .name("my-dev-env")
    .config(BetaCloudConfigParams.builder()
        .networking(BetaUnrestrictedNetwork.builder().build())
        .build())
    .build());
System.out.println("Environment ID: " + environment.id()); // env_...
```

---

## Create an Agent (required first step)

> ⚠️ **There is no inline agent config.** Model, system, and tools live on the agent object, not the session. Always start with `client.beta().agents().create()` — the session takes either `.agent(agent.id())` or the typed `BetaManagedAgentsAgentParams.builder()...build()`.

### Minimal

```java
import com.anthropic.models.beta.agents.AgentCreateParams;
import com.anthropic.models.beta.agents.BetaManagedAgentsAgentToolset20260401Params;
import com.anthropic.models.beta.sessions.BetaManagedAgentsAgentParams;
import com.anthropic.models.beta.sessions.SessionCreateParams;

// 1. Create the agent (reusable, versioned)
var agent = client.beta().agents().create(AgentCreateParams.builder()
    .name("Coding Assistant")
    .model("{{OPUS_ID}}")
    .system("You are a helpful coding assistant.")
    .addTool(BetaManagedAgentsAgentToolset20260401Params.builder()
        .type(BetaManagedAgentsAgentToolset20260401Params.Type.AGENT_TOOLSET_20260401)
        .build())
    .build());

// 2. Start a session
var session = client.beta().sessions().create(SessionCreateParams.builder()
    .agent(BetaManagedAgentsAgentParams.builder()
        .type(BetaManagedAgentsAgentParams.Type.AGENT)
        .id(agent.id())
        .version(agent.version())
        .build())
    .environmentId(environment.id())
    .title("Quickstart session")
    .build());
System.out.println("Session ID: " + session.id());
System.out.println("Trace: https://platform.claude.com/workspaces/default/sessions/" + session.id());
```

### Updating an Agent

Updates create new versions; the agent object is immutable per version.

```java
import com.anthropic.models.beta.agents.AgentUpdateParams;

var updatedAgent = client.beta().agents().update(agent.id(), AgentUpdateParams.builder()
    .version(agent.version())
    .system("You are a helpful coding agent. Always write tests.")
    .build());
System.out.println("New version: " + updatedAgent.version());

// List all versions
for (var version : client.beta().agents().versions().list(agent.id()).autoPager()) {
    System.out.println("Version " + version.version() + ": " + version.updatedAt());
}

// Archive the agent
var archived = client.beta().agents().archive(agent.id());
System.out.println("Archived at: " + archived.archivedAt().orElseThrow());
```

---

## Send a User Message

```java
import com.anthropic.models.beta.sessions.events.BetaManagedAgentsUserMessageEventParams;
import com.anthropic.models.beta.sessions.events.EventSendParams;

client.beta().sessions().events().send(session.id(), EventSendParams.builder()
    .addEvent(BetaManagedAgentsUserMessageEventParams.builder()
        .type(BetaManagedAgentsUserMessageEventParams.Type.USER_MESSAGE)
        .addTextContent("Review the auth module")
        .build())
    .build());
```

> 💡 **Stream-first:** Open the stream *before* (or concurrently with) sending the message. The stream only delivers events that occur after it opens — stream-after-send means early events arrive buffered in one batch. See [Steering Patterns](../../shared/managed-agents-events.md#steering-patterns).

---

## Stream Events (SSE)

```java
import com.anthropic.models.beta.sessions.events.StreamEvents;

// Open the stream first, then send the user message
try (var stream = client.beta().sessions().events().streamStreaming(session.id())) {
    client.beta().sessions().events().send(session.id(), EventSendParams.builder()
        .addEvent(BetaManagedAgentsUserMessageEventParams.builder()
            .type(BetaManagedAgentsUserMessageEventParams.Type.USER_MESSAGE)
            .addTextContent("Summarize the repo README")
            .build())
        .build());

    for (var event : (Iterable<StreamEvents>) stream.stream()::iterator) {
        if (event.isAgentMessage()) {
            event.asAgentMessage().content().forEach(block -> System.out.print(block.text()));
        } else if (event.isAgentToolUse()) {
            System.out.println("\
[Using tool: " + event.asAgentToolUse().name() + "]");
        } else if (event.isSessionStatusIdle()) {
            break;
        } else if (event.isSessionError()) {
            System.out.println("\
[Error]");
            break;
        }
    }
}
```

### Reconnecting and Tailing

When reconnecting mid-session, list past events first to dedupe, then tail live events. The cross-variant `id` field is read from the raw `_json()` value:

```java
import com.anthropic.core.JsonValue;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;

try (var stream = client.beta().sessions().events().streamStreaming(session.id())) {
    // Stream is open and buffering. List history before tailing live.
    var seenEventIds = new HashSet<String>();
    for (var past : client.beta().sessions().events().list(session.id()).autoPager()) {
        Optional<Map<String, JsonValue>> obj = past._json().orElseThrow().asObject();
        seenEventIds.add(obj.orElseThrow().get("id").asStringOrThrow());
    }

    // Tail live events, skipping anything already seen
    for (var event : (Iterable<StreamEvents>) stream.stream()::iterator) {
        Optional<Map<String, JsonValue>> obj = event._json().orElseThrow().asObject();
        if (!seenEventIds.add(obj.orElseThrow().get("id").asStringOrThrow())) continue;
        if (event.isAgentMessage()) {
            event.asAgentMessage().content().forEach(block -> System.out.print(block.text()));
        } else if (event.isSessionStatusIdle()) {
            break;
        }
    }
}
```

---

## Provide Custom Tool Result

> ℹ️ The Java managed-agents bindings for `user.custom_tool_result` are not yet documented in this skill or in the apps source examples. Refer to `shared/managed-agents-events.md` for the wire format and the `anthropic-java` repository for the corresponding params types.

---

## Poll Events

```java
for (var event : client.beta().sessions().events().list(session.id()).autoPager()) {
    System.out.println(event.type() + ": " + event);
}
```

---

## Upload a File

```java
import com.anthropic.models.beta.files.FileUploadParams;
import com.anthropic.models.beta.sessions.BetaManagedAgentsFileResourceParams;
import java.nio.file.Path;

var dataCsv = Path.of("data.csv");

var file = client.beta().files().upload(FileUploadParams.builder()
    .file(dataCsv)
    .build());
System.out.println("File ID: " + file.id());

// Mount in a session
var session = client.beta().sessions().create(SessionCreateParams.builder()
    .agent(agent.id())
    .environmentId(environment.id())
    .addResource(BetaManagedAgentsFileResourceParams.builder()
        .type(BetaManagedAgentsFileResourceParams.Type.FILE)
        .fileId(file.id())
        .mountPath("/workspace/data.csv")
        .build())
    .build());
```

### Add and Manage Resources on an Existing Session

```java
import com.anthropic.models.beta.sessions.resources.ResourceAddParams;
import com.anthropic.models.beta.sessions.resources.ResourceDeleteParams;

// Attach an additional file to an open session
var resource = client.beta().sessions().resources().add(session.id(), ResourceAddParams.builder()
    .betaManagedAgentsFileResourceParams(BetaManagedAgentsFileResourceParams.builder()
        .type(BetaManagedAgentsFileResourceParams.Type.FILE)
        .fileId(file.id())
        .build())
    .build());
System.out.println(resource.id()); // "sesrsc_01ABC..."

// List resources on the session — entries are a discriminated union
var listed = client.beta().sessions().resources().list(session.id());
for (var entry : listed.data()) {
    if (entry.isFile()) {
        var fileResource = entry.asFile();
        System.out.println(fileResource.id() + " " + fileResource.type());
    } else if (entry.isGitHubRepository()) {
        var repoResource = entry.asGitHubRepository();
        System.out.println(repoResource.id() + " " + repoResource.type());
    }
}

// Detach a resource
client.beta().sessions().resources().delete(resource.id(), ResourceDeleteParams.builder()
    .sessionId(session.id())
    .build());
```

---

## List and Download Session Files

> ℹ️ Listing and downloading files an agent wrote during a session is not yet documented for Java in this skill or in the apps source examples. See `shared/managed-agents-events.md` and the `anthropic-java` repository for the file list/download bindings.

---

## Session Management

```java
// List environments
var environments = client.beta().environments().list();

// Retrieve a specific environment
var env = client.beta().environments().retrieve(environment.id());

// Archive an environment (read-only, existing sessions continue)
client.beta().environments().archive(environment.id());

// Delete an environment (only if no sessions reference it)
client.beta().environments().delete(environment.id());

// Delete a session
client.beta().sessions().delete(session.id());
```

---

## MCP Server Integration

```java
import com.anthropic.models.beta.agents.BetaManagedAgentsMcpToolsetParams;
import com.anthropic.models.beta.agents.BetaManagedAgentsUrlMcpServerParams;

// Agent declares MCP server (no auth here — auth goes in a vault)
var agent = client.beta().agents().create(AgentCreateParams.builder()
    .name("GitHub Assistant")
    .model("{{OPUS_ID}}")
    .addMcpServer(BetaManagedAgentsUrlMcpServerParams.builder()
        .type(BetaManagedAgentsUrlMcpServerParams.Type.URL)
        .name("github")
        .url("https://api.githubcopilot.com/mcp/")
        .build())
    .addTool(BetaManagedAgentsAgentToolset20260401Params.builder()
        .type(BetaManagedAgentsAgentToolset20260401Params.Type.AGENT_TOOLSET_20260401)
        .build())
    .addTool(BetaManagedAgentsMcpToolsetParams.builder()
        .type(BetaManagedAgentsMcpToolsetParams.Type.MCP_TOOLSET)
        .mcpServerName("github")
        .build())
    .build());

// Session attaches vault(s) containing credentials for those MCP server URLs
var session = client.beta().sessions().create(SessionCreateParams.builder()
    .agent(BetaManagedAgentsAgentParams.builder()
        .type(BetaManagedAgentsAgentParams.Type.AGENT)
        .id(agent.id())
        .version(agent.version())
        .build())
    .environmentId(environment.id())
    .addVaultId(vault.id())
    .build());
```

See `shared/managed-agents-tools.md` §Vaults for creating vaults and adding credentials.

---

## Vaults

```java
import com.anthropic.core.JsonValue;
import com.anthropic.models.beta.vaults.VaultCreateParams;
import com.anthropic.models.beta.vaults.credentials.BetaManagedAgentsMcpOAuthCreateParams;
import com.anthropic.models.beta.vaults.credentials.BetaManagedAgentsMcpOAuthRefreshParams;
import com.anthropic.models.beta.vaults.credentials.BetaManagedAgentsMcpOAuthRefreshUpdateParams;
import com.anthropic.models.beta.vaults.credentials.BetaManagedAgentsMcpOAuthUpdateParams;
import com.anthropic.models.beta.vaults.credentials.CredentialCreateParams;
import com.anthropic.models.beta.vaults.credentials.CredentialUpdateParams;
import java.time.OffsetDateTime;

// Create a vault
var vault = client.beta().vaults().create(VaultCreateParams.builder()
    .displayName("Alice")
    .metadata(VaultCreateParams.Metadata.builder()
        .putAdditionalProperty("external_user_id", JsonValue.from("usr_abc123"))
        .build())
    .build());
System.out.println(vault.id()); // "vlt_01ABC..."

// Add an OAuth credential
var credential = client.beta().vaults().credentials().create(vault.id(),
    CredentialCreateParams.builder()
        .displayName("Alice's Slack")
        .auth(BetaManagedAgentsMcpOAuthCreateParams.builder()
            .type(BetaManagedAgentsMcpOAuthCreateParams.Type.MCP_OAUTH)
            .mcpServerUrl("https://mcp.slack.com/mcp")
            .accessToken("xoxp-...")
            .expiresAt(OffsetDateTime.parse("2026-04-15T00:00:00Z"))
            .refresh(BetaManagedAgentsMcpOAuthRefreshParams.builder()
                .tokenEndpoint("https://slack.com/api/oauth.v2.access")
                .clientId("1234567890.0987654321")
                .scope("channels:read chat:write")
                .refreshToken("xoxe-1-...")
                .clientSecretPostTokenEndpointAuth("abc123...")
                .build())
            .build())
        .build());

// Rotate the credential (e.g., after a token refresh)
client.beta().vaults().credentials().update(credential.id(),
    CredentialUpdateParams.builder()
        .vaultId(vault.id())
        .auth(BetaManagedAgentsMcpOAuthUpdateParams.builder()
            .type(BetaManagedAgentsMcpOAuthUpdateParams.Type.MCP_OAUTH)
            .accessToken("xoxp-new-...")
            .expiresAt(OffsetDateTime.parse("2026-05-15T00:00:00Z"))
            .refresh(BetaManagedAgentsMcpOAuthRefreshUpdateParams.builder()
                .refreshToken("xoxe-1-new-...")
                .build())
            .build())
        .build());

// Archive a vault
client.beta().vaults().archive(vault.id());
```

---

## GitHub Repository Integration

Mount a GitHub repository as a session resource (a vault holds the GitHub MCP credential):

```java
import com.anthropic.models.beta.sessions.BetaManagedAgentsGitHubRepositoryResourceParams;

var session = client.beta().sessions().create(SessionCreateParams.builder()
    .agent(agent.id())
    .environmentId(environment.id())
    .addVaultId(vault.id())
    .addResource(BetaManagedAgentsGitHubRepositoryResourceParams.builder()
        .type(BetaManagedAgentsGitHubRepositoryResourceParams.Type.GITHUB_REPOSITORY)
        .url("https://github.com/org/repo")
        .mountPath("/workspace/repo")
        .authorizationToken("ghp_your_github_token")
        .build())
    .build());
```

Multiple repositories on the same session:

```java
import java.util.List;

var resources = List.of(
    BetaManagedAgentsGitHubRepositoryResourceParams.builder()
        .type(BetaManagedAgentsGitHubRepositoryResourceParams.Type.GITHUB_REPOSITORY)
        .url("https://github.com/org/frontend")
        .mountPath("/workspace/frontend")
        .authorizationToken("ghp_your_github_token")
        .build(),
    BetaManagedAgentsGitHubRepositoryResourceParams.builder()
        .type(BetaManagedAgentsGitHubRepositoryResourceParams.Type.GITHUB_REPOSITORY)
        .url("https://github.com/org/backend")
        .mountPath("/workspace/backend")
        .authorizationToken("ghp_your_github_token")
        .build());
```

Rotating a repository's authorization token:

```java
import com.anthropic.models.beta.sessions.resources.ResourceUpdateParams;

var listed = client.beta().sessions().resources().list(session.id());
var repoResourceId = listed.data().get(0).asGitHubRepository().id();

client.beta().sessions().resources().update(repoResourceId, ResourceUpdateParams.builder()
    .sessionId(session.id())
    .authorizationToken("ghp_your_new_github_token")
    .build());
```
