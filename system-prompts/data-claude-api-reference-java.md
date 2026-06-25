<!--
name: 'Data: Claude API reference — Java'
description: Java SDK 参考，包含安装、客户端初始化、基本请求、流式传输和 beta 工具使用
ccVersion: 2.1.176
-->
# Claude API — Java

> **注意：** Java SDK 支持 Claude API 和通过注解类实现的 beta 工具使用。Java 版暂不支持 Agent SDK。

## 安装

Maven：

```xml
<dependency>
    <groupId>com.anthropic</groupId>
    <artifactId>anthropic-java</artifactId>
    <version>2.34.0</version>
</dependency>
```

Gradle：

```groovy
implementation("com.anthropic:anthropic-java:2.34.0")
```

## 客户端初始化

```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;

// 默认（从环境变量读取 ANTHROPIC_API_KEY）
AnthropicClient client = AnthropicOkHttpClient.fromEnv();

// 显式指定 API 密钥
AnthropicClient client = AnthropicOkHttpClient.builder()
    .apiKey("your-api-key")
    .build();
```

---

## 基本消息请求

```java
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.Model;

MessageCreateParams params = MessageCreateParams.builder()
    .model(Model.CLAUDE_OPUS_4_8)
    .maxTokens(16000L)
    .addUserMessage("What is the capital of France?")
    .build();

Message response = client.messages().create(params);
response.content().stream()
    .flatMap(block -> block.text().stream())
    .forEach(textBlock -> System.out.println(textBlock.text()));
```

---

## 流式传输

```java
import com.anthropic.core.http.StreamResponse;
import com.anthropic.models.messages.RawMessageStreamEvent;

MessageCreateParams params = MessageCreateParams.builder()
    .model(Model.CLAUDE_OPUS_4_8)
    .maxTokens(64000L)
    .addUserMessage("Write a haiku")
    .build();

try (StreamResponse<RawMessageStreamEvent> streamResponse = client.messages().createStreaming(params)) {
    streamResponse.stream()
        .flatMap(event -> event.contentBlockDelta().stream())
        .flatMap(deltaEvent -> deltaEvent.delta().text().stream())
        .forEach(textDelta -> System.out.print(textDelta.text()));
}
```

---

## 思考（Thinking）

**自适应思考（Adaptive thinking）是 Claude 4.6+ 模型的推荐模式。** Claude 会动态决定何时思考以及思考多少。Builder 有直接的 `.thinking(ThinkingConfigAdaptive)` 重载——无需手动包装联合类型。

```java
import com.anthropic.models.messages.ContentBlock;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.Model;
import com.anthropic.models.messages.ThinkingConfigAdaptive;

MessageCreateParams params = MessageCreateParams.builder()
    .model(Model.CLAUDE_SONNET_4_6)
    .maxTokens(16000L)
    .thinking(ThinkingConfigAdaptive.builder().build())
    .addUserMessage("Solve this step by step: 27 * 453")
    .build();

for (ContentBlock block : client.messages().create(params).content()) {
    block.thinking().ifPresent(t -> System.out.println("[thinking] " + t.thinking()));
    block.text().ifPresent(t -> System.out.println(t.text()));
}
```

> **已弃用：** `ThinkingConfigEnabled.builder().budgetTokens(N)`（以及 `.enabledThinking(N)` 快捷方式）在 Claude 4.6 上仍然可用，但已弃用。请使用上方的自适应思考。

`ContentBlock` 收窄：`.thinking()` / `.text()` 返回 `Optional<T>`——使用 `.ifPresent(...)` 或 `.stream().flatMap(...)`。替代方案：`isThinking()` / `asThinking()` 布尔值+解包对（错误变体会抛异常）。

---

## 工具使用（Beta）

Java SDK 通过注解类支持 beta 工具使用。工具类实现 `Supplier<String>` 以便通过 `BetaToolRunner` 自动执行。

### Tool Runner（自动循环）

```java
import com.anthropic.models.beta.messages.MessageCreateParams;
import com.anthropic.models.beta.messages.BetaMessage;
import com.anthropic.helpers.BetaToolRunner;
import com.fasterxml.jackson.annotation.JsonClassDescription;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import java.util.function.Supplier;

@JsonClassDescription("Get the weather in a given location")
static class GetWeather implements Supplier<String> {
    @JsonPropertyDescription("The city and state, e.g. San Francisco, CA")
    public String location;

    @Override
    public String get() {
        return "The weather in " + location + " is sunny and 72°F";
    }
}

BetaToolRunner toolRunner = client.beta().messages().toolRunner(
    MessageCreateParams.builder()
        .model("${OPUS_ID}")
        .maxTokens(16000L)
        .putAdditionalHeader("anthropic-beta", "structured-outputs-2025-11-13")
        .addTool(GetWeather.class)
        .addUserMessage("What's the weather in San Francisco?")
        .build());

for (BetaMessage message : toolRunner) {
    System.out.println(message);
}
```

### Memory 工具

Java SDK 提供 `BetaMemoryToolHandler` 用于实现 memory 工具后端。你提供管理文件存储的处理器，`BetaToolRunner` 自动处理 memory 工具调用。

```java
import com.anthropic.helpers.BetaMemoryToolHandler;
import com.anthropic.helpers.BetaToolRunner;
import com.anthropic.models.beta.messages.BetaMemoryTool20250818;
import com.anthropic.models.beta.messages.BetaMessage;
import com.anthropic.models.beta.messages.MessageCreateParams;
import com.anthropic.models.beta.messages.ToolRunnerCreateParams;

// 使用你的存储后端（如文件系统）实现 BetaMemoryToolHandler
BetaMemoryToolHandler memoryHandler = new FileSystemMemoryToolHandler(sandboxRoot);

MessageCreateParams createParams = MessageCreateParams.builder()
    .model("${OPUS_ID}")
    .maxTokens(4096L)
    .addTool(BetaMemoryTool20250818.builder().build())
    .addUserMessage("Remember that my favorite color is blue")
    .build();

BetaToolRunner toolRunner = client.beta().messages().toolRunner(
    ToolRunnerCreateParams.builder()
        .betaMemoryToolHandler(memoryHandler)
        .initialMessageParams(createParams)
        .build());

for (BetaMessage message : toolRunner) {
    System.out.println(message);
}
```

更多详情请参阅 [共享 memory 工具概念](../shared/tool-use-concepts.md)。

### 非 Beta 工具声明（手动 JSON Schema）

`Tool.InputSchema.Properties` 是一个自由形式的 `Map<String, JsonValue>` 包装器——通过 `putAdditionalProperty` 构建属性 schema。`type: "object"` 是默认值。Builder 有直接的 `.addTool(Tool)` 重载，自动包装在 `ToolUnion` 中。

```java
import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.Tool;

Tool tool = Tool.builder()
    .name("get_weather")
    .description("Get the current weather in a given location")
    .inputSchema(Tool.InputSchema.builder()
        .properties(Tool.InputSchema.Properties.builder()
            .putAdditionalProperty("location", JsonValue.from(Map.of("type", "string")))
            .build())
        .required(List.of("location"))
        .build())
    .build();

MessageCreateParams params = MessageCreateParams.builder()
    .model(Model.CLAUDE_SONNET_4_6)
    .maxTokens(16000L)
    .addTool(tool)
    .addUserMessage("Weather in Paris?")
    .build();
```

对于手动工具循环，处理响应中的 `tool_use` 块，回传 `tool_result`，循环直到 `stop_reason` 为 `"end_turn"`。请参阅 [共享工具使用概念](../shared/tool-use-concepts.md)。

### 使用内容块构建 `MessageParam`（工具结果往返）

`MessageParam.Content` 是一个内部联合类（string | list）。使用 builder 的 `.contentOfBlockParams(List<ContentBlockParam>)` 别名——**没有**独立的 `MessageParamContent` 类及其静态 `ofBlockParams`：

```java
import com.anthropic.models.messages.MessageParam;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.ToolResultBlockParam;

List<ContentBlockParam> results = List.of(
    ContentBlockParam.ofToolResult(ToolResultBlockParam.builder()
        .toolUseId(toolUseBlock.id())
        .content(yourResultString)
        .build())
);

MessageParam toolResultMsg = MessageParam.builder()
    .role(MessageParam.Role.USER)
    .contentOfBlockParams(results)   // builder 别名，等价于 Content.ofBlockParams(...)
    .build();
```

---

## Effort 参数

Effort 嵌套在 `OutputConfig` 内部——`MessageCreateParams.Builder` 上**没有**直接的 `.effort()` 方法。

```java
import com.anthropic.models.messages.OutputConfig;

.outputConfig(OutputConfig.builder()
    .effort(OutputConfig.Effort.HIGH)  // 或 LOW、MEDIUM、MAX
    .build())
```

与 `Thinking = ThinkingConfigAdaptive` 结合使用以实现成本-质量控制。

---

## 提示缓存（Prompt Caching）

System 消息作为 `TextBlockParam` 列表，配合 `CacheControlEphemeral`。使用 `.systemOfTextBlockParams(...)`——普通的 `.system(String)` 重载无法携带缓存控制。关于放置模式和静默失效审计清单，请参阅 `shared/prompt-caching.md`。

```java
import com.anthropic.models.messages.TextBlockParam;
import com.anthropic.models.messages.CacheControlEphemeral;

.systemOfTextBlockParams(List.of(
    TextBlockParam.builder()
        .text(longSystemPrompt)
        .cacheControl(CacheControlEphemeral.builder()
            .ttl(CacheControlEphemeral.Ttl.TTL_1H)  // 可选；也可用 TTL_5M
            .build())
        .build()))
```

`MessageCreateParams.Builder` 和 `Tool.builder()` 上也有顶层的 `.cacheControl(CacheControlEphemeral)`。

通过 `response.usage().cacheCreationInputTokens()` / `response.usage().cacheReadInputTokens()` 验证缓存命中。

---

## Token 计数

```java
import com.anthropic.models.messages.MessageCountTokensParams;

long tokens = client.messages().countTokens(
    MessageCountTokensParams.builder()
        .model(Model.CLAUDE_SONNET_4_6)
        .addUserMessage("Hello")
        .build()
).inputTokens();
```

---

## 结构化输出（Structured Output）

基于类的重载自动从你的 POJO 派生 JSON schema，并给你类型化的 `.text()` 返回值——无需手动编写 schema，无需手动解析。

```java
import com.anthropic.models.messages.StructuredMessageCreateParams;

record Book(String title, String author) {}
record BookList(List<Book> books) {}

StructuredMessageCreateParams<BookList> params = MessageCreateParams.builder()
    .model(Model.CLAUDE_SONNET_4_6)
    .maxTokens(16000L)
    .outputConfig(BookList.class)  // 返回类型化的 builder
    .addUserMessage("List 3 classic novels")
    .build();

client.messages().create(params).content().stream()
    .flatMap(cb -> cb.text().stream())
    .forEach(typed -> {
        // typed.text() 返回 BookList，而不是 String
        for (Book b : typed.text().books()) System.out.println(b.title());
    });
```

支持 Jackson 注解：`@JsonPropertyDescription`、`@JsonIgnore`、`@ArraySchema(minItems=...)`。手动 schema 路径：`OutputConfig.builder().format(JsonOutputFormat.builder().schema(...).build())`。

---

## PDF / 文档输入

`DocumentBlockParam` builder 有源类型快捷方式。包装在 `ContentBlockParam.ofDocument()` 中，并通过 `.addUserMessageOfBlockParams()` 传递。

```java
import com.anthropic.models.messages.DocumentBlockParam;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.TextBlockParam;

DocumentBlockParam doc = DocumentBlockParam.builder()
    .base64Source(base64String)  // 或 .urlSource("https://...") 或 .textSource("...")
    .title("My Document")        // 可选
    .build();

.addUserMessageOfBlockParams(List.of(
    ContentBlockParam.ofDocument(doc),
    ContentBlockParam.ofText(TextBlockParam.builder().text("Summarize this").build())))
```

---

## 服务端工具（Server-Side Tools）

版本后缀的类型；`name`/`type` 由 builder 自动设置。每种类型都有直接的 `.addTool()` 重载——无需手动包装 `ToolUnion`。

```java
import com.anthropic.models.messages.WebSearchTool20260209;
import com.anthropic.models.messages.ToolBash20250124;
import com.anthropic.models.messages.ToolTextEditor20250728;
import com.anthropic.models.messages.CodeExecutionTool20260120;

.addTool(WebSearchTool20260209.builder()
    .maxUses(5L)                              // 可选
    .allowedDomains(List.of("example.com"))   // 可选
    .build())
.addTool(ToolBash20250124.builder().build())
.addTool(ToolTextEditor20250728.builder().build())
.addTool(CodeExecutionTool20260120.builder().build())
```

也可用：`WebFetchTool20260209`、`MemoryTool20250818`、`ToolSearchToolBm25_20251119`。对于 advisor 工具，请在 beta 命名空间中使用 `BetaAdvisorTool20260301`。

### Beta 命名空间（MCP、压缩）

对于 beta 专属功能，使用 `com.anthropic.models.beta.messages.*`——类名带有 `Beta` 前缀且位于 beta 包中。Beta 版的 `MessageCreateParams.Builder` 有直接的 `.addTool(BetaToolBash20250124)` 重载和 `.addMcpServer()`：

```java
import com.anthropic.models.beta.messages.MessageCreateParams;
import com.anthropic.models.beta.messages.BetaToolBash20250124;
import com.anthropic.models.beta.messages.BetaCodeExecutionTool20260120;
import com.anthropic.models.beta.messages.BetaRequestMcpServerUrlDefinition;

MessageCreateParams params = MessageCreateParams.builder()
    .model(Model.CLAUDE_OPUS_4_8)
    .maxTokens(16000L)
    .addBeta("mcp-client-2025-11-20")
    .addTool(BetaToolBash20250124.builder().build())
    .addTool(BetaCodeExecutionTool20260120.builder().build())
    .addMcpServer(BetaRequestMcpServerUrlDefinition.builder()
        .name("my-server")
        .url("https://example.com/mcp")
        .build())
    .addUserMessage("...")
    .build();

client.beta().messages().create(params);
```

`BetaTool*` 类型与非 beta 的 `Tool*` **不可互换**——每个请求只能选一个命名空间。

**读取响应中的服务端工具块：** `ServerToolUseBlock` 有 `.id()`、`.name()`（枚举）和 `._input()`（返回原始 `JsonValue`）——**没有**类型化的 `.input()`。对于代码执行结果，需要解包两层：

```java
for (ContentBlock block : response.content()) {
    block.serverToolUse().ifPresent(stu -> {
        System.out.println("tool: " + stu.name() + " input: " + stu._input());
    });
    block.codeExecutionToolResult().ifPresent(r -> {
        r.content().resultBlock().ifPresent(result -> {
            System.out.println("stdout: " + result.stdout());
            System.out.println("stderr: " + result.stderr());
            System.out.println("exit: " + result.returnCode());
        });
    });
}
```

---

## 停止详情（Stop Details）

当 `stopReason()` 为 `"refusal"` 时，响应包含结构化的 `stopDetails()`：

```java
response.stopDetails().ifPresent(details -> {
    System.out.println("Category: " + details.category());
    System.out.println("Explanation: " + details.explanation());
});
```

**拒绝回退（Refusal fallbacks，${FABLE_NAME}）——默认选择加入（opt in）。** 回退是选择加入的：没有它们，被拒绝的请求会直接停止。新的 `${FABLE_ID}` 代码默认应包含服务端 `fallbacks` 参数（beta 头 `server-side-fallback-2026-06-01`，回退模型 `${OPUS_ID}`，在 beta 消息调用上设置）。具体的 Java builder 方法（以及不支持服务端回退的提供商的客户端中间件）未在此记录——请通过 `shared/live-sources.md` 的 WebFetch 获取 Java SDK 仓库的 `examples/`；完整语义见 `shared/model-migration.md` → 迁移到 ${FABLE_NAME} → `refusal` 停止原因。

---

## 错误类型

`AnthropicServiceException` 暴露 `.errorType()` 返回 `Optional<ErrorType>`，用于程序化错误分类：

```java
try {
    client.messages().create(params);
} catch (AnthropicServiceException e) {
    e.errorType().ifPresent(type ->
        System.out.println("Error type: " + type)  // RATE_LIMIT_ERROR、OVERLOADED_ERROR 等
    );
}
```

---

## Files API（Beta）

位于 `client.beta().files()` 下。消息中的文件引用需要使用 beta 消息类型（非 beta 的 `DocumentBlockParam.Source` 没有文件 ID 变体）。

```java
import com.anthropic.models.beta.files.FileUploadParams;
import com.anthropic.models.beta.files.FileMetadata;
import com.anthropic.models.beta.messages.BetaRequestDocumentBlock;
import java.nio.file.Paths;

FileMetadata meta = client.beta().files().upload(
    FileUploadParams.builder()
        .file(Paths.get("/path/to/doc.pdf"))  // 或 .file(InputStream) 或 .file(byte[])
        .build());

// 在 beta 消息中引用：
BetaRequestDocumentBlock doc = BetaRequestDocumentBlock.builder()
    .fileSource(meta.id())
    .build();
```

其他方法：`.list()`、`.delete(String fileId)`、`.download(String fileId)`、`.retrieveMetadata(String fileId)`。
