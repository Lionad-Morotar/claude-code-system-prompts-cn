<!--
name: 'Data: Tool use reference — Java'
description: Java 工具使用参考，包括定义工具和手动 agentic 循环
ccVersion: 2.1.182
-->
# 工具使用 — Java

概念概览（工具定义、工具选择、技巧）请参阅 [shared/tool-use-concepts.md](../../shared/tool-use-concepts.md)。

## 工具使用（Beta）

Java SDK 支持使用带注解的类进行 beta 工具使用。工具类实现 `Supplier<String>` 即可通过 `BetaToolRunner` 自动执行。

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
        .model("{{OPUS_ID}}")
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

Java SDK 提供 `BetaMemoryToolHandler` 用于实现 memory 工具后端。你提供一个管理文件存储的 handler，`BetaToolRunner` 会自动处理 memory 工具调用。

```java
import com.anthropic.helpers.BetaMemoryToolHandler;
import com.anthropic.helpers.BetaToolRunner;
import com.anthropic.models.beta.messages.BetaMemoryTool20250818;
import com.anthropic.models.beta.messages.BetaMessage;
import com.anthropic.models.beta.messages.MessageCreateParams;
import com.anthropic.models.beta.messages.ToolRunnerCreateParams;

// 实现 BetaMemoryToolHandler，使用你的存储后端（例如文件系统）
BetaMemoryToolHandler memoryHandler = new FileSystemMemoryToolHandler(sandboxRoot);

MessageCreateParams createParams = MessageCreateParams.builder()
    .model("{{OPUS_ID}}")
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

关于 memory 工具的更多细节，请参阅 [shared memory tool concepts](../../shared/tool-use-concepts.md)。

### 非 Beta 工具声明（手动 JSON schema）

`Tool.InputSchema.Properties` 是一个自由形式的 `Map<String, JsonValue>` 包装器——通过 `putAdditionalProperty` 构建属性 schema。`type: "object"` 为默认值。builder 有直接的 `.addTool(Tool)` 重载，会自动包装到 `ToolUnion` 中。

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

对于手动工具循环，处理响应中的 `tool_use` 块，发回 `tool_result`，循环直到 `stop_reason` 为 `"end_turn"`。参见 [shared tool use concepts](../../shared/tool-use-concepts.md)。

### 使用 Content Block 构建 `MessageParam`（工具结果往返）

`MessageParam.Content` 是一个内部联合类（字符串 | 列表）。使用 builder 的 `.contentOfBlockParams(List<ContentBlockParam>)` 别名——没有独立的 `MessageParamContent` 类带 `ofBlockParams` 静态方法：

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

## 结构化输出

基于类的重载会自动从你的 POJO 派生 JSON schema，并提供类型化的 `.text()` 返回值——无需手动 schema，无需手动解析。

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
        // typed.text() 返回 BookList，而非 String
        for (Book b : typed.text().books()) System.out.println(b.title());
    });
```

支持 Jackson 注解：`@JsonPropertyDescription`、`@JsonIgnore`、`@ArraySchema(minItems=...)`。手动 schema 路径：`OutputConfig.builder().format(JsonOutputFormat.builder().schema(...).build())`。

---

## Anthropic 定义的工具

带版本后缀的类型；`name`/`type` 由 builder 自动设置。大多数工具类型有直接的 `.addTool()` 重载；对于没有直接重载的工具（较新或不太常用的工具——参见下方 advisor 说明），通过联合类型的静态工厂方法包装：`.addTool(BetaToolUnion.of<ToolName>(builder…build()))`。网页搜索和代码执行由服务端执行；bash 和文本编辑器由客户端执行（你在本地处理 `tool_use`——参见 `shared/tool-use-concepts.md`）。

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

同样可用：`WebFetchTool20260209`、`MemoryTool20250818`、`ToolSearchToolBm25_20251119`。对于 advisor 工具，在 beta 命名空间中使用 `BetaAdvisorTool20260301`，配合 `.addBeta("advisor-tool-2026-03-01")`（服务端执行；advisor 模型 ≥ executor 模型）。beta builder 上没有直接的 `.addTool(BetaAdvisorTool20260301)` 重载——通过 advisor 类型的 `BetaToolUnion` 静态工厂方法包装；如果 `javac` 拒绝特定的工厂方法名，`javap com.anthropic.models.beta.messages.BetaToolUnion | grep -i advisor` 会显示确切的方法名。

### Beta 命名空间（MCP、压缩）

对于仅 beta 的功能，使用 `com.anthropic.models.beta.messages.*`——类名带有 `Beta` 前缀并且位于 beta 包中。beta 的 `MessageCreateParams.Builder` 具有直接的 `.addTool(BetaToolBash20250124)` 重载以及 `.addMcpServer()`：

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

`BetaTool*` 类型与非 beta 的 `Tool*` 不可互换——每个请求只选择一种命名空间。

**读取响应中的 server-tool 块：** `ServerToolUseBlock` 有 `.id()`、`.name()`（枚举）和返回原始 `JsonValue` 的 `._input()`——没有类型化的 `.input()`。对于代码执行结果，需要解包两层：

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
