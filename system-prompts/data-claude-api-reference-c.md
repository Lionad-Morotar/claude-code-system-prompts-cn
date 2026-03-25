<!--
name: 'Data: Claude API reference — C#'
description: C# SDK 参考，包括安装、客户端初始化、基本请求、流式传输和工具使用
ccVersion: 2.1.78
-->
# Claude API — C#

> **注意：** C# SDK 是 Anthropic 官方提供的 C# SDK。工具使用通过 Messages API 支持。暂无可用的基于类注解的工具运行器；请使用原始工具定义配合 JSON schema。该 SDK 还支持 Microsoft.Extensions.AI IChatClient 集成与函数调用。

## 安装

```bash
dotnet add package Anthropic
```

## 客户端初始化

```csharp
using Anthropic;

// 默认（使用 ANTHROPIC_API_KEY 环境变量）
AnthropicClient client = new();

// 显式指定 API 密钥（使用环境变量 —— 切勿硬编码密钥）
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
    Model = Model.ClaudeOpus4_6,
    MaxTokens = 1024,
    Messages = [new() { Role = Role.User, Content = "What is the capital of France?" }]
};
var response = await client.Messages.Create(parameters);

// ContentBlock 是一个联合包装器。.Value 解包为变体对象，
// 然后 OfType<T> 过滤为你需要的类型。或者使用下方 Thinking 部分展示的 TryPick* 惯用法
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
    Model = Model.ClaudeOpus4_6,
    MaxTokens = 1024,
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

**`RawMessageStreamEvent` TryPick 方法**（命名中省略了 `Message`/`Raw` 前缀）：`TryPickStart`、`TryPickDelta`、`TryPickStop`、`TryPickContentBlockStart`、`TryPickContentBlockDelta`、`TryPickContentBlockStop`。没有 `TryPickMessageStop` —— 请使用 `TryPickStop`。

---

## 思考

**自适应思考是 Claude 4.6+ 模型推荐的模式。** Claude 动态决定何时思考以及思考多少。

```csharp
using Anthropic.Models.Messages;

var response = await client.Messages.Create(new MessageCreateParams
{
    Model = Model.ClaudeOpus4_6,
    MaxTokens = 16000,
    // ThinkingConfigParam? 从具体变体类隐式转换 ——
    // 无需包装器。
    Thinking = new ThinkingConfigAdaptive(),
    Messages =
    [
        new() { Role = Role.User, Content = "Solve: 27 * 453" },
    ],
});

// ThinkingBlock(s) 在 Content 中位于 TextBlock 之前。TryPick* 用于收窄联合类型。
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

> **已弃用：** `new ThinkingConfigEnabled { BudgetTokens = N }`（固定预算扩展思考）在 Claude 4.6 上仍然可用，但已弃用。请使用上述自适应思考。

`TryPick*` 的替代方案：`.Select(b => b.Value).OfType<ThinkingBlock>()`（与基本消息示例中相同的 LINQ 模式）。

---

## 工具使用

### 定义工具

使用 `Tool`（不是 `ToolParam`）配合 `InputSchema` 记录。`InputSchema.Type` 由构造函数自动设置为 `"object"` —— 不要手动设置。`ToolUnion` 有从 `Tool` 的隐式转换，由集合表达式 `[...]` 触发。

```csharp
using System.Text.Json;
using Anthropic.Models.Messages;

var parameters = new MessageCreateParams
{
    Model = Model.ClaudeSonnet4_6,
    MaxTokens = 1024,
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

有关循环模式，请参阅[共享工具使用概念](../shared/tool-use-concepts.md)。

### 将响应内容转换为后续助手消息

当在助手回合中回显 Claude 的响应时，**没有 `.ToParam()` 辅助方法** —— 手动将每个 `ContentBlock` 变体重构为其对应的 `*Param` 对应物。不要使用 `new ContentBlockParam(block.Json)`：它可以编译和序列化，但 `.Value` 保持为 `null`，导致 `TryPick*`/`Validate()` 失败（降级的 JSON 透传，而非类型化路径）。

```csharp
using Anthropic.Models.Messages;

Message response = await client.Messages.Create(parameters);

// 没有 .ToParam() —— 按变体重构。从每个
// *Param 类型到 ContentBlockParam 的隐式转换意味着无需显式包装器。
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
        // 签名必须保留 —— API 拒绝篡改
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
        // ToolUseBlock 有必需的 Caller；ToolUseBlockParam.Caller 是可选的 —— 不要复制它
        assistantContent.Add(new ToolUseBlockParam
        {
            ID = toolUse.ID,
            Name = toolUse.Name,
            Input = toolUse.Input,
        });
        // 执行工具；每个 tool_use 块收集一个结果 —— 如果任何 tool_use ID
        // 缺少匹配的 tool_result，API 会拒绝后续请求。
        string result = ExecuteYourTool(toolUse.Name, toolUse.Input);
        toolResults.Add(new ToolResultBlockParam
        {
            ToolUseID = toolUse.ID,
            Content = result,
        });
    }
}

// 后续：之前的消息 + 助手回显 + 用户 tool_result(s)
List<MessageParam> followUpMessages =
[
    .. parameters.Messages,
    new() { Role = Role.Assistant, Content = assistantContent },
    new() { Role = Role.User, Content = toolResults },
];
```

`ToolResultBlockParam` 没有元组构造函数 —— 使用对象初始化器。`Content` 是字符串或列表的联合类型；普通 `string` 可隐式转换。

---

## 上下文编辑 / 压缩（Beta）

**Beta 命名空间前缀不一致**（已根据 `src/Anthropic/Models/Beta/Messages/*.cs` @ 12.8.0 验证源码）。无前缀：`MessageCreateParams`、`MessageCountTokensParams`、`Role`。**其他所有内容都有 `Beta` 前缀**：`BetaMessageParam`、`BetaMessage`、`BetaContentBlock`、`BetaToolUseBlock`，所有块参数类型。如果你同时导入两个命名空间，无前缀的 `Role` 会与 `Anthropic.Models.Messages.Role` 冲突（CS0104）。最安全：只导入 Beta；如果混合使用，为 beta 的 `Role` 设置别名：

```csharp
using Anthropic.Models.Beta.Messages;
using NonBeta = Anthropic.Models.Messages;  // 仅在同时需要非 beta 类型时使用
// 现在：MessageCreateParams、BetaMessageParam、Role（beta 的）、NonBeta.Role（如果需要）
```


`BetaMessage.Content` 是 `IReadOnlyList<BetaContentBlock>` —— 一个 15 变体的可辨识联合类型。使用 `TryPick*` 收窄。**响应 `BetaContentBlock` 不能赋值给参数 `BetaContentBlockParam`** —— C# 中没有 `.ToParam()`。通过转换每个块来实现往返：

```csharp
using Anthropic.Models.Beta.Messages;

var betaParams = new MessageCreateParams   // 没有 Beta 前缀 —— 仅有的 2 个无前缀之一
{
    Model = Model.ClaudeOpus4_6,
    MaxTokens = 1024,
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
        // Content 可为 null —— 压缩可能在服务端失败
        Console.WriteLine($"compaction summary: {compaction.Content}");
    }
}

// 上下文编辑元数据位于单独的可空字段
if (resp.ContextManagement is { } ctx)
{
    foreach (var edit in ctx.AppliedEdits)
        Console.WriteLine($"cleared {edit.ClearedInputTokens} tokens");
}

// 往返：BetaMessageParam.Content 是 BetaMessageParamContent（string|list
// 联合类型）。它从 List<BetaContentBlockParam> 隐式转换，而不是从
// 响应的 IReadOnlyList<BetaContentBlock>。转换每个块：
List<BetaContentBlockParam> paramBlocks = [];
foreach (var b in resp.Content)
{
    if (b.TryPickText(out var t)) paramBlocks.Add(new BetaTextBlockParam { Text = t.Text });
    else if (b.TryPickCompaction(out var c)) paramBlocks.Add(new BetaCompactionBlockParam { Content = c.Content });
    // ... 根据需要处理其他变体
}
messages.Add(new BetaMessageParam { Role = Role.Assistant, Content = paramBlocks });
```

所有 15 个 `BetaContentBlock.TryPick*` 变体：`Text`、`Thinking`、`RedactedThinking`、`ToolUse`、`ServerToolUse`、`WebSearchToolResult`、`WebFetchToolResult`、`CodeExecutionToolResult`、`BashCodeExecutionToolResult`、`TextEditorCodeExecutionToolResult`、`ToolSearchToolResult`、`McpToolUse`、`McpToolResult`、`ContainerUpload`、`Compaction`。

**`BetaToolUseBlock.Input` 是 `IReadOnlyDictionary<string, JsonElement>`** —— 按键索引然后调用 `JsonElement` 提取器：

```csharp
if (block.TryPickToolUse(out BetaToolUseBlock? tu))
{
    int a = tu.Input["a"].GetInt32();
    string s = tu.Input["name"].GetString()!;
}
```

---

## Effort 参数

Effort 嵌套在 `OutputConfig` 下，不是顶级属性。`ApiEnum<string, Effort>` 有从枚举的隐式转换，因此直接赋值 `Effort.High`。

```csharp
OutputConfig = new OutputConfig { Effort = Effort.High },
```

值：`Effort.Low`、`Effort.Medium`、`Effort.High`、`Effort.Max`。与 `Thinking = new ThinkingConfigAdaptive()` 结合使用以控制成本-质量。

---

## 提示缓存

`System` 接受 `MessageCreateParamsSystem?` —— `string` 或 `List<TextBlockParam>` 的联合类型。没有 `SystemTextBlockParam`；使用普通 `TextBlockParam`。隐式转换需要具体的 `List<TextBlockParam>` 类型（数组字面量不会转换）。

```csharp
System = new List<TextBlockParam> {
    new() {
        Text = longSystemPrompt,
        CacheControl = new CacheControlEphemeral(),  // 自动设置 Type = "ephemeral"
    },
},
```

`CacheControlEphemeral` 上的可选 `Ttl`：`new() { Ttl = Ttl.Ttl1h }` 或 `Ttl.Ttl5m`。`CacheControl` 也存在于 `Tool.CacheControl` 和顶级 `MessageCreateParams.CacheControl`。

---

## Token 计数

```csharp
MessageTokensCount result = await client.Messages.CountTokens(new MessageCountTokensParams {
    Model = Model.ClaudeOpus4_6,
    Messages = [new() { Role = Role.User, Content = "Hello" }],
});
long tokens = result.InputTokens;
```

`MessageCountTokensParams.Tools` 使用不同的联合类型（`MessageCountTokensTool`）而不是 `MessageCreateParams.Tools`（`ToolUnion`）—— 如果你传递工具，编译器会在需要时告诉你。

---

## 结构化输出

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

`JsonOutputFormat.Type` 由构造函数自动设置为 `"json_schema"`。`Schema` 是 `required`。

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

## 服务端工具

网页搜索、bash、文本编辑器和代码执行是内置的服务端工具。类型名称带有版本后缀；构造函数自动设置 `name`/`type`。所有类型都隐式转换为 `ToolUnion`。

```csharp
Tools = [
    new WebSearchTool20260209(),
    new ToolBash20250124(),
    new ToolTextEditor20250728(),
    new CodeExecutionTool20260120(),
],
```

还有：`WebFetchTool20260209`、`MemoryTool20250818`。`WebSearchTool20260209` 的可选参数：`AllowedDomains`、`BlockedDomains`、`MaxUses`、`UserLocation`。

---

## 文件 API（Beta）

文件位于 `client.Beta.Files` 下（命名空间 `Anthropic.Models.Beta.Files`）。`BinaryContent` 从 `Stream` 和 `byte[]` 隐式转换。

```csharp
using Anthropic.Models.Beta.Files;
using Anthropic.Models.Beta.Messages;

FileMetadata meta = await client.Beta.Files.Upload(
    new FileUploadParams { File = File.OpenRead("doc.pdf") });

// 引用上传的文件需要 Beta 消息类型：
new BetaRequestDocumentBlock {
    Source = new BetaFileDocumentSource { FileID = meta.ID },
}
```

非 beta 的 `DocumentBlockParamSource` 联合类型没有文件 ID 变体 —— 文件引用需要使用 `client.Beta.Messages.Create()`。
