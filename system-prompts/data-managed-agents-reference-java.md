<!--
name: '数据：Managed Agents 参考 — Java'
description: 使用 Anthropic Java SDK 创建和管理 agent、environment 以及 session 的参考指南
ccVersion: 2.1.182
-->
# Managed Agents — Java

> **未列出的绑定：** 本 README 涵盖 Java 最常见的 managed-agents 流程。如果你需要的类、方法、命名空间、字段或行为未在此展示，请通过 WebFetch 查阅 Java SDK 仓库**或** `shared/live-sources.md` 中的相关文档页面，而非猜测。不要从 cURL 格式或其他语言 SDK 进行推断。

> **Agent 是持久化的 — 创建一次，按 ID 引用。** 将 `client.beta().agents().create` 返回的 agent ID 存储起来，并在每次调用 `client.beta().sessions().create` 时传入；不要在请求路径中调用 `agents().create`。Anthropic CLI 是从版本控制的 YAML 创建 agent 和 environment 的便捷方式 — 其 URL 见 `shared/live-sources.md`。以下示例为完整性展示代码内创建方式；在生产环境中，创建调用应放在初始化阶段，而非请求路径中。

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

// 默认（使用 ANTHROPIC_API_KEY 环境变量）
var client = AnthropicOkHttpClient.fromEnv();
```

---

## 创建 Environment

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

## 创建 Agent（必需的第一步）

> ⚠️ **没有内联 agent 配置。** Model、system 和 tools 位于 agent 对象上，而非 session。始终从 `client.beta().agents().create()` 开始 — session 接受 `.agent(agent.id())` 或类型化的 `BetaManagedAgentsAgentParams.builder()...build()`。

### 最小示例

```java
import com.anthropic.models.beta.agents.AgentCreateParams;
import com.anthropic.models.beta.agents.BetaManagedAgentsAgentToolset20260401Params;
import com.anthropic.models.beta.sessions.BetaManagedAgentsAgentParams;
import com.anthropic.models.beta.sessions.SessionCreateParams;

// 1. 创建 agent（可复用、带版本）
var agent = client.beta().agents().create(AgentCreateParams.builder()
    .name("Coding Assistant")
    .model("{{OPUS_ID}}")
    .system("You are a helpful coding assistant.")
    .addTool(BetaManagedAgentsAgentToolset20260401Params.builder()
        .type(BetaManagedAgentsAgentToolset20260401Params.Type.AGENT_TOOLSET_20260401)
        .build())
    .build());

// 2. 启动 session
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
```

### 更新 Agent

更新会创建新版本；agent 对象在每个版本中是不可变的。

```java
import com.anthropic.models.beta.agents.AgentUpdateParams;

var updatedAgent = client.beta().agents().update(agent.id(), AgentUpdateParams.builder()
    .version(agent.version())
    .system("You are a helpful coding agent. Always write tests.")
    .build());
System.out.println("New version: " + updatedAgent.version());

// 列出所有版本
for (var version : client.beta().agents().versions().list(agent.id()).autoPager()) {
    System.out.println("Version " + version.version() + ": " + version.updatedAt());
}

// 归档 agent
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

> 💡 **流优先：** 在发送消息*之前*（或同时）打开流。流只会传递在其打开之后发生的事件 — 在流之后发送意味着早期事件会缓冲后批量到达。参见[操控模式](../../shared/managed-agents-events.md#steering-patterns)。

---

## 流式事件（SSE）

```java
import com.anthropic.models.beta.sessions.events.StreamEvents;

// 先打开流，再发送用户消息
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

### 重连和追尾

在会话中途重连时，先列出历史事件以去重，再追尾实时事件。跨变体的 `id` 字段从原始 `_json()` 值中读取：

```java
import com.anthropic.core.JsonValue;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;

try (var stream = client.beta().sessions().events().streamStreaming(session.id())) {
    // 流已打开并正在缓冲。在追尾实时事件之前先列出历史记录。
    var seenEventIds = new HashSet<String>();
    for (var past : client.beta().sessions().events().list(session.id()).autoPager()) {
        Optional<Map<String, JsonValue>> obj = past._json().orElseThrow().asObject();
        seenEventIds.add(obj.orElseThrow().get("id").asStringOrThrow());
    }

    // 追尾实时事件，跳过已见过的
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

> ℹ️ Java managed-agents 绑定中的 `user.custom_tool_result` 尚未在本 skill 或 apps 源代码示例中记录。请参阅 `shared/managed-agents-events.md` 了解线格式，以及 `anthropic-java` 仓库了解对应的参数类型。

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

// 挂载到 session
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

### 在已有 Session 上添加和管理资源

```java
import com.anthropic.models.beta.sessions.resources.ResourceAddParams;
import com.anthropic.models.beta.sessions.resources.ResourceDeleteParams;

// 将额外文件附加到已打开的 session
var resource = client.beta().sessions().resources().add(session.id(), ResourceAddParams.builder()
    .betaManagedAgentsFileResourceParams(BetaManagedAgentsFileResourceParams.builder()
        .type(BetaManagedAgentsFileResourceParams.Type.FILE)
        .fileId(file.id())
        .build())
    .build());
System.out.println(resource.id()); // "sesrsc_01ABC..."

// 列出 session 上的资源 — 条目是区分联合类型
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

// 分离资源
client.beta().sessions().resources().delete(resource.id(), ResourceDeleteParams.builder()
    .sessionId(session.id())
    .build());
```

---

## 列出和下载 Session 文件

> ℹ️ 列出和下载 agent 在 session 期间写入的文件尚未在本 skill 或 apps 源代码示例中为 Java 记录。请参阅 `shared/managed-agents-events.md` 以及 `anthropic-java` 仓库了解文件列表/下载绑定。

---

## Session 管理

```java
// 列出 environment
var environments = client.beta().environments().list();

// 获取特定 environment
var env = client.beta().environments().retrieve(environment.id());

// 归档 environment（只读，已有 session 继续运行）
client.beta().environments().archive(environment.id());

// 删除 environment（仅当没有 session 引用时）
client.beta().environments().delete(environment.id());

// 删除 session
client.beta().sessions().delete(session.id());
```

---

## MCP Server 集成

```java
import com.anthropic.models.beta.agents.BetaManagedAgentsMcpToolsetParams;
import com.anthropic.models.beta.agents.BetaManagedAgentsUrlMcpServerParams;

// Agent 声明 MCP server（此处无认证 — 认证在 vault 中）
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

// Session 附加包含这些 MCP server URL 凭据的 vault(s)
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

参见 `shared/managed-agents-tools.md` §Vaults 了解创建 vault 和添加凭据的方式。

---

## Vault

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

// 创建 vault
var vault = client.beta().vaults().create(VaultCreateParams.builder()
    .displayName("Alice")
    .metadata(VaultCreateParams.Metadata.builder()
        .putAdditionalProperty("external_user_id", JsonValue.from("usr_abc123"))
        .build())
    .build());
System.out.println(vault.id()); // "vlt_01ABC..."

// 添加 OAuth 凭据
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

// 轮换凭据（例如，在 token 刷新之后）
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

// 归档 vault
client.beta().vaults().archive(vault.id());
```

---

## GitHub 仓库集成

将 GitHub 仓库挂载为 session 资源（vault 持有 GitHub MCP 凭据）：

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

同一 session 上的多个仓库：

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

轮换仓库的授权 token：

```java
import com.anthropic.models.beta.sessions.resources.ResourceUpdateParams;

var listed = client.beta().sessions().resources().list(session.id());
var repoResourceId = listed.data().get(0).asGitHubRepository().id();

client.beta().sessions().resources().update(repoResourceId, ResourceUpdateParams.builder()
    .sessionId(session.id())
    .authorizationToken("ghp_your_new_github_token")
    .build());
```
