<!--
name: 'Data: Tool use reference — C#'
description: C# 工具使用参考，包括定义工具以及为后续 assistant 消息重构响应内容
ccVersion: 2.1.182
-->
# 工具使用 — C#

概念概览（工具定义、工具选择、技巧）请参阅 [shared/tool-use-concepts.md](../../shared/tool-use-concepts.md)。

## 工具使用

### 定义工具

使用 `Tool`（而非 `ToolParam`），配合 `InputSchema` 记录。`InputSchema.Type` 由构造函数自动设置为 `"object"`——无需手动设置。`ToolUnion` 具有从 `Tool` 的隐式转换，由集合表达式 `[...]` 触发。

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

关于循环模式，请参阅 [shared tool use concepts](../../shared/tool-use-concepts.md)。

### 将响应内容转换为后续 assistant 消息

当在 assistant 回合中回显 Claude 的响应时，**没有 `.ToParam()` 辅助方法**——需要手动将每个 `ContentBlock` 变体重构为对应的 `*Param` 变体。不要使用 `new ContentBlockParam(block.Json)`：虽然能编译和序列化，但 `.Value` 保持为 `null`，导致 `TryPick*`/`Validate()` 失败（降级为 JSON 透传，而非类型化路径）。

```csharp
using Anthropic.Models.Messages;

Message response = await client.Messages.Create(parameters);

// 没有 .ToParam()——按变体重构。每个 *Param 类型到 ContentBlockParam
// 都有隐式转换，无需显式包装。
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
        // 签名必须保留——API 拒绝篡改
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
        // ToolUseBlock 具有必需的 Caller；ToolUseBlockParam.Caller 是可选的——不要复制它
        assistantContent.Add(new ToolUseBlockParam
        {
            ID = toolUse.ID,
            Name = toolUse.Name,
            Input = toolUse.Input,
        });
        // 执行工具；每个 tool_use 块只收集一个结果——如果任何 tool_use ID
        // 缺少匹配的 tool_result，API 将拒绝后续请求。
        string result = ExecuteYourTool(toolUse.Name, toolUse.Input);
        toolResults.Add(new ToolResultBlockParam
        {
            ToolUseID = toolUse.ID,
            Content = result,
        });
    }
}

// 后续请求：先前的消息 + assistant 回显 + user tool_result(s)
List<MessageParam> followUpMessages =
[
    .. parameters.Messages,
    new() { Role = Role.Assistant, Content = assistantContent },
    new() { Role = Role.User, Content = toolResults },
];
```

`ToolResultBlockParam` 没有元组构造函数——使用对象初始化器。`Content` 是字符串或列表的联合类型；纯 `string` 会隐式转换。

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

`JsonOutputFormat.Type` 由构造函数自动设置为 `"json_schema"`。`Schema` 为必需字段。

---

## Anthropic 定义的工具

网页搜索、bash、文本编辑器和代码执行是 Anthropic 定义的工具，具有内置 schema。网页搜索和代码执行由服务端执行；bash 和文本编辑器由客户端执行（你在本地处理 `tool_use`——参见 `shared/tool-use-concepts.md`）。类型名称带有版本后缀；构造函数自动设置 `name`/`type`。**每个都需要显式包装在 `new ToolUnion(...)` 中。**

```csharp
Tools = [
    new ToolUnion(new WebSearchTool20260209()),
    new ToolUnion(new ToolBash20250124()),
    new ToolUnion(new ToolTextEditor20250728()),
    new ToolUnion(new CodeExecutionTool20260120()),
],
```

同样可用：`new ToolUnion(new WebFetchTool20260209())`、`new ToolUnion(new MemoryTool20250818())`。`WebSearchTool20260209` 可选参数：`AllowedDomains`、`BlockedDomains`、`MaxUses`、`UserLocation`。

---

## Tool Runner（Beta）

C# SDK 提供了 `BetaToolRunner` 用于自动工具执行循环。使用原始 JSON schema 定义工具，runner 负责处理 API 调用 → 工具执行 → 结果反馈的循环。

```csharp
using Anthropic.Models.Beta.Messages;

// 按上面"工具使用"部分所示定义工具和创建参数，
// 但使用 beta 命名空间类型（BetaToolUnion 等）
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
