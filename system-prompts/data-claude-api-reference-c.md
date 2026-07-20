<!--
name: 'Data: Claude API reference — C#'
description: C# SDK 参考，包含安装、客户端初始化、基本请求、流式传输和工具使用
ccVersion: 2.1.211
-->
# Claude API — C#

> **注意：** C# SDK 是 Anthropic 官方提供的 C# SDK。工具使用（Tool use）通过 Messages API 支持，并提供 `BetaToolRunner` 用于自动工具执行循环。该 SDK 还支持 Microsoft.Extensions.AI IChatClient 集成（含函数调用）和托管智能体（Managed Agents，beta）。

## 安装

```bash
dotnet add package Anthropic
```

## 客户端初始化

```csharp
using Anthropic;

// 默认（使用 ANTHROPIC_API_KEY 环境变量）
AnthropicClient client = new();

// 显式指定 API 密钥（使用环境变量——切勿硬编码密钥）
AnthropicClient client = new() {
    ApiKey = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY")
};
```

---

## 基本消息请求

```csharp
using Anthropic.Models.Messages;

var parameters = new MessageCreateParams
{
    Model = Model.ClaudeOpus4_8,
    MaxTokens = 16000,
    Messages = [new() { Role = Role.User, Content = "What is the capital of France?" }]
};
var response = await client.Messages.Create(parameters);

// ContentBlock 是一个联合（union）包装器。.Value 解包为具体变体对象，
// 然后 OfType<T> 过滤出你需要的类型。或者使用下方 Thinking 部分展示的
// TryPick* 惯用方式。
foreach (var text in response.Content.Select(b => b.Value).OfType<TextBlock>())
{
    Console.WriteLine(text.Text);
}
```

---

## 流式传输

```csharp
using Anthropic.Models.Messages;

var parameters = new MessageCreateParams
{
    Model = Model.ClaudeOpus4_8,
    MaxTokens = 64000,
    Messages = [new() { Role = Role.User, Content = "Write a haiku" }]
};

await foreach (RawMessageStreamEvent streamEvent in client.Messages.CreateStreaming(parameters))
{
    if (streamEvent.TryPickContentBlockDelta(out var delta) &&
        delta.Delta.TryPickText(out var text))
    {
        Console.Write(text.Text);
    }
}
```

**`RawMessageStreamEvent` TryPick 方法**（命名去掉了 `Message`/`Raw` 前缀）：`TryPickStart`、`TryPickDelta`、`TryPickStop`、`TryPickContentBlockStart`、`TryPickContentBlockDelta`、`TryPickContentBlockStop`。没有 `TryPickMessageStop`——请使用 `TryPickStop`。

---

## 思考（Thinking）

**自适应思考（Adaptive thinking）是 Claude 4.6+ 模型的推荐模式。** Claude 会动态决定何时思考以及思考多少。

```csharp
using Anthropic.Models.Messages;

var response = await client.Messages.Create(new MessageCreateParams
{
    Model = Model.ClaudeOpus4_8,
    MaxTokens = 16000,
    // ThinkingConfigParam? 可以从具体变体类隐式转换——无需包装器。
    // display 选择加入（opt-in）：在 Fable 5 / Mythos 5 / Opus 4.8 / 4.7 上默认为省略（空思考文本）
    Thinking = new ThinkingConfigAdaptive { Display = Display.Summarized },
    Messages =
    [
        new() { Role = Role.User, Content = "Solve: 27 * 453" },
    ],
});

// ThinkingBlock 在 Content 中位于 TextBlock 之前。TryPick* 用于收窄联合类型。
foreach (var block in response.Content)
{
    if (block.TryPickThinking(out ThinkingBlock? t))
    {
        Console.WriteLine($"[thinking] {t.Thinking}");
    }
    else if (block.TryPickText(out TextBlock? text))
    {
        Console.WriteLine(text.Text);
    }
}
```

> **已弃用：** `new ThinkingConfigEnabled { BudgetTokens = N }`（固定预算扩展思考）在 Claude 4.6 上仍然可用，但已弃用。请使用上方的自适应思考。

`TryPick*` 的替代方案：`.Select(b => b.Value).OfType<ThinkingBlock>()`（与基本消息示例相同的 LINQ 模式）。

---

## 工具使用

### 定义工具

使用 `Tool`（而非 `ToolParam`），配合 `InputSchema` 记录（record）。`InputSchema.Type` 由构造函数自动设为 `"object"`——无需手动设置。`ToolUnion` 支持从 `Tool` 隐式转换，由集合表达式 `[...]` 触发。

```csharp
using System.Text.Json;
using Anthropic.Models.Messages;

var parameters = new MessageCreateParams
{
    Model = Model.ClaudeSonnet4_6,
    MaxTokens = 16000,
    Tools = [
        new Tool {
            Name = "get_weather",
            Description = "Get the current weather in a given location",
            InputSchema = new() {
                Properties = new Dictionary<string, JsonElement> {
                    ["location"] = JsonSerializer.SerializeToElement(
                        new { type = "string", description = "City name" }),
                },
                Required = ["location"],
            },
        },
    ],
    Messages = [new() { Role = Role.User, Content = "Weather in Paris?" }],
};
```

源自 `anthropic-sdk-csharp/src/Anthropic/Models/Messages/Tool.cs` 和 `ToolUnion.cs:799`（隐式转换）。

关于循环模式，请参阅 [共享工具使用概念](../shared/tool-use-concepts.md)。

### 将响应内容转换为后续 assistant 消息

在将 Claude 的响应回传至 assistant 轮次时，**没有 `.ToParam()` 辅助方法**——需要手动将每个 `ContentBlock` 变体重构为其对应的 `*Param` 版本。不要使用 `new ContentBlockParam(block.Json)`：它能编译和序列化，但 `.Value` 保持 `null`，导致 `TryPick*`/`Validate()` 失败（退化为 JSON 透传，而非类型化路径）。

```csharp
using Anthropic.Models.Messages;

Message response = await client.Messages.Create(parameters);

// 没有 .ToParam()——按变体逐个重构。每个 *Param 类型到 ContentBlockParam
// 的隐式转换意味着无需显式包装器。
List<ContentBlockParam> assistantContent = [];
List<ContentBlockParam> toolResults = [];
foreach (ContentBlock block in response.Content)
{
    if (block.TryPickText(out TextBlock? text))
    {
        assistantContent.Add(new TextBlockParam { Text = text.Text });
    }
    else if (block.TryPickThinking(out ThinkingBlock? thinking))
    {
        // 签名（Signature）必须保留——API 拒绝篡改
        assistantContent.Add(new ThinkingBlockParam
        {
            Thinking = thinking.Thinking,
            Signature = thinking.Signature,
        });
    }
    else if (block.TryPickRedactedThinking(out RedactedThinkingBlock? redacted))
    {
        assistantContent.Add(new RedactedThinkingBlockParam { Data = redacted.Data });
    }
    else if (block.TryPickToolUse(out ToolUseBlock? toolUse))
    {
        // ToolUseBlock 有必需的 Caller 字段；ToolUseBlockParam.Caller 是可选的——不要复制它
        assistantContent.Add(new ToolUseBlockParam
        {
            ID = toolUse.ID,
            Name = toolUse.Name,
            Input = toolUse.Input,
        });
        // 执行工具；每个 tool_use 块收集一个结果——如果任何 tool_use ID
        // 缺少匹配的 tool_result，API 会拒绝后续请求。
        string result = ExecuteYourTool(toolUse.Name, toolUse.Input);
        toolResults.Add(new ToolResultBlockParam
        {
            ToolUseID = toolUse.ID,
            Content = result,
        });
    }
}

// 后续请求：之前的消息 + assistant 回传 + user tool_result(s)
List<MessageParam> followUpMessages =
[
    .. parameters.Messages,
    new() { Role = Role.Assistant, Content = assistantContent },
    new() { Role = Role.User, Content = toolResults },
];
```

`ToolResultBlockParam` 没有元组构造函数——请使用对象初始化器。`Content` 是字符串或列表的联合类型；纯 `string` 会隐式转换。

---

## 上下文编辑/压缩（Context Editing / Compaction，Beta）

**Beta 命名空间前缀不一致**（基于 `src/Anthropic/Models/Beta/Messages/*.cs` @ 12.9.0 的源码验证）。无前缀的类型：`MessageCreateParams`、`MessageCountTokensParams`、`Role`。**其余所有类型都有 `Beta` 前缀**：`BetaMessageParam`、`BetaMessage`、`BetaContentBlock`、`BetaToolUseBlock`，以及所有块参数类型。无前缀的 `Role` 如果同时导入两个命名空间，会与 `Anthropic.Models.Messages.Role` 冲突（CS0104）。最安全的做法：仅导入 Beta 命名空间；如果混用，为 beta 的 `Role` 起别名：

```csharp
using Anthropic.Models.Beta.Messages;
using NonBeta = Anthropic.Models.Messages;  // 仅当你同时需要非 beta 类型时
// 现在可以使用：MessageCreateParams、BetaMessageParam、Role（beta 的）、NonBeta.Role（如果需要）
```

`BetaMessage.Content` 是 `IReadOnlyList<BetaContentBlock>`——一个包含 15 个变体的可区分联合类型。使用 `TryPick*` 收窄。**响应的 `BetaContentBlock` 不能赋值给参数的 `BetaContentBlockParam`**——C# 中没有 `.ToParam()`。通过逐个转换每个块来实现往返：

```csharp
using Anthropic.Models.Beta.Messages;

var betaParams = new MessageCreateParams   // 无 Beta 前缀——仅有的两个无前缀类型之一
{
    Model = Model.ClaudeOpus4_8,
    MaxTokens = 16000,
    Betas = ["compact-2026-01-12"],
    ContextManagement = new BetaContextManagementConfig
    {
        Edits = [new BetaCompact20260112Edit()],
    },
    Messages = messages,
};
BetaMessage resp = await client.Beta.Messages.Create(betaParams);

foreach (BetaContentBlock block in resp.Content)
{
    if (block.TryPickCompaction(out BetaCompactionBlock? compaction))
    {
        // Content 可为空——压缩可能在服务端失败
        Console.WriteLine($"compaction summary: {compaction.Content}");
    }
}

// 上下文编辑元数据位于一个单独的可空字段上
if (resp.ContextManagement is { } ctx)
{
    foreach (var edit in ctx.AppliedEdits)
        Console.WriteLine($"cleared {edit.ClearedInputTokens} tokens");
}

// 往返：BetaMessageParam.Content 是 BetaMessageParamContent（字符串|列表的联合类型）。
// 它可以从 List<BetaContentBlockParam> 隐式转换，但不能从响应的
// IReadOnlyList<BetaContentBlock> 转换。需要逐个转换每个块：
List<BetaContentBlockParam> paramBlocks = [];
foreach (var b in resp.Content)
{
    if (b.TryPickText(out var t)) paramBlocks.Add(new BetaTextBlockParam { Text = t.Text });
    else if (b.TryPickCompaction(out var c)) paramBlocks.Add(new BetaCompactionBlockParam { Content = c.Content });
    // ... 其他变体按需添加
}
messages.Add(new BetaMessageParam { Role = Role.Assistant, Content = paramBlocks });
```

全部 15 个 `BetaContentBlock.TryPick*` 变体：`Text`、`Thinking`、`RedactedThinking`、`ToolUse`、`ServerToolUse`、`WebSearchToolResult`、`WebFetchToolResult`、`CodeExecutionToolResult`、`BashCodeExecutionToolResult`、`TextEditorCodeExecutionToolResult`、`ToolSearchToolResult`、`McpToolUse`、`McpToolResult`、`ContainerUpload`、`Compaction`。

**`BetaToolUseBlock.Input` 是 `IReadOnlyDictionary<string, JsonElement>`**——按键索引，然后调用 `JsonElement` 提取器：

```csharp
if (block.TryPickToolUse(out BetaToolUseBlock? tu))
{
    int a = tu.Input["a"].GetInt32();
    string s = tu.Input["name"].GetString()!;
}
```

---

## Effort 参数

Effort 嵌套在 `OutputConfig` 下，不是顶层属性。`ApiEnum<string, Effort>` 支持从枚举隐式转换，所以可以直接赋值 `Effort.High`。

```csharp
OutputConfig = new OutputConfig { Effort = Effort.High },
```

可选值：`Effort.Low`、`Effort.Medium`、`Effort.High`、`Effort.Max`。与 `Thinking = new ThinkingConfigAdaptive()` 结合使用以实现成本-质量控制。

---

## 提示缓存（Prompt Caching）

`System` 接受 `MessageCreateParamsSystem?`——即 `string` 或 `List<TextBlockParam>` 的联合类型。没有 `SystemTextBlockParam`；请使用普通的 `TextBlockParam`。隐式转换需要具体的 `List<TextBlockParam>` 类型（数组字面量无法转换）。关于放置模式和静默失效审计清单，请参阅 `shared/prompt-caching.md`。

```csharp
System = new List<TextBlockParam> {
    new() {
        Text = longSystemPrompt,
        CacheControl = new CacheControlEphemeral(),  // 自动设置 Type = "ephemeral"
    },
},
```

`CacheControlEphemeral` 上的可选 `Ttl`：`new() { Ttl = Ttl.Ttl1h }` 或 `Ttl.Ttl5m`。`CacheControl` 也存在于 `Tool.CacheControl` 和顶层的 `MessageCreateParams.CacheControl` 上。

通过 `response.Usage.CacheCreationInputTokens` / `response.Usage.CacheReadInputTokens` 验证缓存命中。

---

## Token 计数

```csharp
MessageTokensCount result = await client.Messages.CountTokens(new MessageCountTokensParams {
    Model = Model.ClaudeOpus4_8,
    Messages = [new() { Role = Role.User, Content = "Hello" }],
});
long tokens = result.InputTokens;
```

`MessageCountTokensParams.Tools` 使用的联合类型（`MessageCountTokensTool`）与 `MessageCreateParams.Tools`（`ToolUnion`）不同——如果传递工具，编译器会在必要时提醒你。

---

## 结构化输出（Structured Output）

```csharp
OutputConfig = new OutputConfig {
    Format = new JsonOutputFormat {
        Schema = new Dictionary<string, JsonElement> {
            ["type"] = JsonSerializer.SerializeToElement("object"),
            ["properties"] = JsonSerializer.SerializeToElement(
                new { name = new { type = "string" } }),
            ["required"] = JsonSerializer.SerializeToElement(new[] { "name" }),
        },
    },
},
```

`JsonOutputFormat.Type` 由构造函数自动设为 `"json_schema"`。`Schema` 是必填的。

---

## PDF / 文档输入

`DocumentBlockParam` 接受 `DocumentBlockParamSource` 联合类型：`Base64PdfSource` / `UrlPdfSource` / `PlainTextSource` / `ContentBlockSource`。`Base64PdfSource` 自动设置 `MediaType = "application/pdf"` 和 `Type = "base64"`。

```csharp
new MessageParam {
    Role = Role.User,
    Content = new List<ContentBlockParam> {
        new DocumentBlockParam { Source = new Base64PdfSource { Data = base64String } },
        new TextBlockParam { Text = "Summarize this PDF" },
    },
}
```

---

## 服务端工具（Server-Side Tools）

网页搜索（web search）、bash、文本编辑器（text editor）和代码执行（code execution）是内置的服务端工具。类型名称带有版本后缀；构造函数自动设置 `name`/`type`。所有这些类型都支持隐式转换为 `ToolUnion`。

```csharp
Tools = [
    new WebSearchTool20260209(),
    new ToolBash20250124(),
    new ToolTextEditor20250728(),
    new CodeExecutionTool20260120(),
],
```

也可用：`WebFetchTool20260209`、`MemoryTool20250818`。`WebSearchTool20260209` 的可选项：`AllowedDomains`、`BlockedDomains`、`MaxUses`、`UserLocation`。

---

## Files API（Beta）

文件操作位于 `client.Beta.Files`（命名空间 `Anthropic.Models.Beta.Files`）。`BinaryContent` 可以从 `Stream` 和 `byte[]` 隐式转换。

```csharp
using Anthropic.Models.Beta.Files;
using Anthropic.Models.Beta.Messages;

FileMetadata meta = await client.Beta.Files.Upload(
    new FileUploadParams { File = File.OpenRead("doc.pdf") });

// 引用已上传的文件需要使用 Beta 消息类型：
new BetaRequestDocumentBlock {
    Source = new BetaFileDocumentSource { FileID = meta.ID },
}
```

非 beta 的 `DocumentBlockParamSource` 联合类型没有文件 ID 变体——文件引用需要使用 `client.Beta.Messages.Create()`。

---

## Tool Runner（Beta）

C# SDK 提供了 `BetaToolRunner` 用于自动工具执行循环。使用原始 JSON schema 定义工具，runner 会处理 API 调用 → 工具执行 → 结果反馈循环。

```csharp
using Anthropic.Models.Beta.Messages;

// 按上方"工具使用"部分所示定义工具和创建参数，
// 但使用 beta 命名空间的类型（BetaToolUnion 等）
var runner = client.Beta.Messages.ToolRunner(betaParams);

await foreach (BetaMessage message in runner)
{
    foreach (var block in message.Content)
    {
        if (block.TryPickText(out var text))
        {
            Console.WriteLine(text.Text);
        }
    }
}
```

---

## 停止详情（Stop Details）

当 `StopReason` 为 `"refusal"` 时，响应包含结构化的 `StopDetails`：

```csharp
if (response.StopReason == "refusal" && response.StopDetails is { } details)
{
    Console.WriteLine($"Category: {details.Category}");
    Console.WriteLine($"Explanation: {details.Explanation}");
}
```

**拒绝回退（Refusal fallbacks，${FABLE_NAME}）——默认选择加入（opt in）。** 回退是选择加入的：没有它们，被拒绝的请求会直接停止。在 `${FABLE_ID}` 代码中，默认应包含 `Fallbacks = [new(Model.ClaudeOpus4_8)]` 并在 beta 消息调用上添加 `AnthropicBeta.ServerSideFallback2026_06_01` beta 头——策略拒绝将由回退模型在同一调用内重新处理。在 Amazon Bedrock、Vertex AI 或 Microsoft Foundry 上不可用——在这些平台上使用客户端处理器：`new AnthropicClient { Handlers = [new BetaRefusalFallbackHandler { Fallbacks = [new(Model.ClaudeOpus4_8)] }] }`（命名空间 `Anthropic.Helpers`），通过 `BetaFallbackState.Create()` 管理每次对话的状态，并用 `using (fallbackState.Use()) { ... }` 限定作用域。完整语义（计费、粘性路由、流式传输）和可运行示例：`shared/model-migration.md` → 迁移到 ${FABLE_NAME} → `refusal` 停止原因，以及 C# SDK 仓库的 `examples/`（通过 `shared/live-sources.md` 的 WebFetch 获取）。

---

## 托管智能体（Managed Agents，Beta）

C# SDK 通过 `client.Beta.Agents`、`client.Beta.Sessions`、`client.Beta.Environments` 和相关命名空间支持托管智能体。架构概述请参阅 `shared/managed-agents-overview.md`，线路级参考请参阅 `curl/managed-agents.md`。
