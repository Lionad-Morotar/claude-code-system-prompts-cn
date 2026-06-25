<!--
name: 'Data: Claude API reference — Go'
description: Go SDK 参考
ccVersion: 2.1.176
-->
# Claude API — Go

> **注意：** Go SDK 支持 Claude API 和通过 `BetaToolRunner` 实现的 beta 工具使用。Go 版暂不支持 Agent SDK。

## 安装

```bash
go get github.com/anthropics/anthropic-sdk-go
```

## 客户端初始化

```go
import (
    "github.com/anthropics/anthropic-sdk-go"
    "github.com/anthropics/anthropic-sdk-go/option"
)

// 默认（使用 ANTHROPIC_API_KEY 环境变量）
client := anthropic.NewClient()

// 显式指定 API 密钥
client := anthropic.NewClient(
    option.WithAPIKey("your-api-key"),
)
```

---

## 模型常量

Go SDK 提供类型化的模型常量：`anthropic.ModelClaudeFable5`、`anthropic.ModelClaudeOpus4_8`、`anthropic.ModelClaudeOpus4_7`、`anthropic.ModelClaudeSonnet4_6`、`anthropic.ModelClaudeHaiku4_5_20251001`。除非用户另有指定，否则使用 `ModelClaudeOpus4_8`；如果用户要求使用 Fable 或最强模型，则使用 `anthropic.ModelClaudeFable5`（完整解析表请参阅 `shared/models.md`）。

---

## 基本消息请求

```go
response, err := client.Messages.New(context.Background(), anthropic.MessageNewParams{
    Model:     anthropic.ModelClaudeOpus4_8,
    MaxTokens: 16000,
    Messages: []anthropic.MessageParam{
        anthropic.NewUserMessage(anthropic.NewTextBlock("What is the capital of France?")),
    },
})
if err != nil {
    log.Fatal(err)
}
for _, block := range response.Content {
    switch variant := block.AsAny().(type) {
    case anthropic.TextBlock:
        fmt.Println(variant.Text)
    }
}
```

---

## 流式传输

```go
stream := client.Messages.NewStreaming(context.Background(), anthropic.MessageNewParams{
    Model:     anthropic.ModelClaudeOpus4_8,
    MaxTokens: 64000,
    Messages: []anthropic.MessageParam{
        anthropic.NewUserMessage(anthropic.NewTextBlock("Write a haiku")),
    },
})

for stream.Next() {
    event := stream.Current()
    switch eventVariant := event.AsAny().(type) {
    case anthropic.ContentBlockDeltaEvent:
        switch deltaVariant := eventVariant.Delta.AsAny().(type) {
        case anthropic.TextDelta:
            fmt.Print(deltaVariant.Text)
        }
    }
}
if err := stream.Err(); err != nil {
    log.Fatal(err)
}
```

**累积最终消息**（流上没有 `GetFinalMessage()` 方法）：

```go
stream := client.Messages.NewStreaming(ctx, params)
message := anthropic.Message{}
for stream.Next() {
    message.Accumulate(stream.Current())
}
if err := stream.Err(); err != nil { log.Fatal(err) }
// message.Content 现在包含完整响应
```

---

## 工具使用

### Tool Runner（Beta —— 推荐）

**Beta：** Go SDK 通过 `toolrunner` 包提供 `BetaToolRunner` 用于自动工具使用循环。

```go
import (
    "context"
    "fmt"
    "log"

    "github.com/anthropics/anthropic-sdk-go"
    "github.com/anthropics/anthropic-sdk-go/toolrunner"
)

// 使用 jsonschema 标签定义工具输入，自动生成 schema
type GetWeatherInput struct {
    City string `json:"city" jsonschema:"required,description=The city name"`
}

// 通过 struct 标签自动生成 schema 来创建工具
weatherTool, err := toolrunner.NewBetaToolFromJSONSchema(
    "get_weather",
    "Get current weather for a city",
    func(ctx context.Context, input GetWeatherInput) (anthropic.BetaToolResultBlockParamContentUnion, error) {
        return anthropic.BetaToolResultBlockParamContentUnion{
            OfText: &anthropic.BetaTextBlockParam{
                Text: fmt.Sprintf("The weather in %s is sunny, 72°F", input.City),
            },
        }, nil
    },
)
if err != nil {
    log.Fatal(err)
}

// 创建 tool runner，自动处理对话循环
runner := client.Beta.Messages.NewToolRunner(
    []anthropic.BetaTool{weatherTool},
    anthropic.BetaToolRunnerParams{
        BetaMessageNewParams: anthropic.BetaMessageNewParams{
            Model:     anthropic.ModelClaudeOpus4_8,
            MaxTokens: 16000,
            Messages: []anthropic.BetaMessageParam{
                anthropic.NewBetaUserMessage(anthropic.NewBetaTextBlock("What's the weather in Paris?")),
            },
        },
        MaxIterations: 5,
    },
)

// 运行直到 Claude 产出最终响应
message, err := runner.RunToCompletion(context.Background())
if err != nil {
    log.Fatal(err)
}

// RunToCompletion 返回 *BetaMessage；content 是 []BetaContentBlockUnion。
// 通过 AsAny() switch 收窄——注意使用 Beta 命名空间类型（BetaTextBlock，
// 而非 TextBlock）：
for _, block := range message.Content {
    switch block := block.AsAny().(type) {
    case anthropic.BetaTextBlock:
        fmt.Println(block.Text)
    }
}
```

**Go tool runner 的关键特性：**

- 通过 `jsonschema` 标签从 Go struct 自动生成 schema
- `RunToCompletion()` 用于简单的一次性调用
- `All()` 迭代器用于处理对话中的每条消息
- `NextMessage()` 用于逐步迭代
- 通过 `NewToolRunnerStreaming()` 和 `AllStreaming()` 支持流式变体

### 手动循环

如需对智能体循环进行细粒度控制，使用 `ToolParam` 定义工具，检查 `StopReason`，自行执行工具，并将 `tool_result` 块回传。当你需要拦截、验证或记录工具调用时，使用此模式。

源自 `anthropic-sdk-go/examples/tools/main.go`。

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"

    "github.com/anthropics/anthropic-sdk-go"
)

func main() {
    client := anthropic.NewClient()

    // 1. 定义工具。ToolParam.InputSchema 使用 map，无需 struct 标签。
    addTool := anthropic.ToolParam{
        Name:        "add",
        Description: anthropic.String("Add two integers"),
        InputSchema: anthropic.ToolInputSchemaParam{
            Properties: map[string]any{
                "a": map[string]any{"type": "integer"},
                "b": map[string]any{"type": "integer"},
            },
        },
    }
    // ToolParam 必须包装在 ToolUnionParam 中才能用于 Tools 切片
    tools := []anthropic.ToolUnionParam{{OfTool: &addTool}}

    messages := []anthropic.MessageParam{
        anthropic.NewUserMessage(anthropic.NewTextBlock("What is 2 + 3?")),
    }

    for {
        resp, err := client.Messages.New(context.Background(), anthropic.MessageNewParams{
            Model:     anthropic.ModelClaudeSonnet4_6,
            MaxTokens: 16000,
            Messages:  messages,
            Tools:     tools,
        })
        if err != nil {
            log.Fatal(err)
        }

        // 2. 在处理工具调用之前，先将 assistant 响应追加到历史中。
        //    resp.ToParam() 将 Message 一次性转换为 MessageParam。
        messages = append(messages, resp.ToParam())

        // 3. 遍历内容块。ContentBlockUnion 是一个扁平化的 struct；
        //    使用 block.AsAny().(type) 来切换实际变体类型。
        toolResults := []anthropic.ContentBlockParamUnion{}
        for _, block := range resp.Content {
            switch variant := block.AsAny().(type) {
            case anthropic.TextBlock:
                fmt.Println(variant.Text)
            case anthropic.ToolUseBlock:
                // 4. 解析工具输入。使用 variant.JSON.Input.Raw() 获取
                //    原始 JSON——block.Input 是 json.RawMessage，不是解析后的值。
                var in struct {
                    A int `json:"a"`
                    B int `json:"b"`
                }
                if err := json.Unmarshal([]byte(variant.JSON.Input.Raw()), &in); err != nil {
                    log.Fatal(err)
                }
                result := fmt.Sprintf("%d", in.A+in.B)
                // 5. NewToolResultBlock(toolUseID, content, isError) 为你构建
                //    ContentBlockParamUnion。block.ID 即为 tool_use_id。
                toolResults = append(toolResults,
                    anthropic.NewToolResultBlock(block.ID, result, false))
            }
        }

        // 6. 当 Claude 不再请求工具时退出循环
        if resp.StopReason != anthropic.StopReasonToolUse {
            break
        }

        // 7. 工具结果放入一条 user 消息中（可变参数：所有结果在一个轮次中）
        messages = append(messages, anthropic.NewUserMessage(toolResults...))
    }
}
```

**关键 API 概览：**

| 符号 | 用途 |
|---|---|
| `resp.ToParam()` | 将 `Message` 响应转换为 `MessageParam` 用于历史记录 |
| `block.AsAny().(type)` | 对 `ContentBlockUnion` 变体进行类型切换 |
| `variant.JSON.Input.Raw()` | 工具输入的原始 JSON 字符串（供 `json.Unmarshal` 使用） |
| `anthropic.NewToolResultBlock(id, content, isError)` | 构建 `tool_result` 块 |
| `anthropic.NewUserMessage(blocks...)` | 将工具结果包装为用户轮次 |
| `anthropic.StopReasonToolUse` | `StopReason` 常量，用于检查循环终止条件 |
| `anthropic.ToolUnionParam{OfTool: &t}` | 将 `ToolParam` 包装在联合类型中用于 `Tools:` |

---

## 思考（Thinking）

通过在 `MessageNewParams` 中设置 `Thinking` 来启用 Claude 的内部推理。响应将在最终的 `TextBlock` 之前包含 `ThinkingBlock` 内容。

**自适应思考（Adaptive thinking）是 Claude 4.6+ 模型的推荐模式。** Claude 会动态决定何时思考以及思考多少。与 `effort` 参数结合使用以实现成本-质量控制。

源自 `anthropic-sdk-go/message.go`（`ThinkingConfigParamUnion`、`ThinkingConfigAdaptiveParam`）。

```go
// 没有 ThinkingConfigParamOfAdaptive 辅助函数——直接使用 struct 字面量
// 构造联合类型，并取变体的地址。
adaptive := anthropic.ThinkingConfigAdaptiveParam{}
params := anthropic.MessageNewParams{
    Model:     anthropic.ModelClaudeSonnet4_6,
    MaxTokens: 16000,
    Thinking:  anthropic.ThinkingConfigParamUnion{OfAdaptive: &adaptive},
    Messages: []anthropic.MessageParam{
        anthropic.NewUserMessage(anthropic.NewTextBlock("How many r's in strawberry?")),
    },
}

resp, err := client.Messages.New(context.Background(), params)
if err != nil {
    log.Fatal(err)
}

// ThinkingBlock 在内容中位于 TextBlock 之前
for _, block := range resp.Content {
    switch b := block.AsAny().(type) {
    case anthropic.ThinkingBlock:
        fmt.Println("[thinking]", b.Thinking)
    case anthropic.TextBlock:
        fmt.Println(b.Text)
    }
}
```

> **已弃用：** `ThinkingConfigParamOfEnabled(budgetTokens)`（固定预算扩展思考）在 Claude 4.6 上仍然可用，但已弃用。请使用上方的自适应思考。

禁用：`anthropic.ThinkingConfigParamUnion{OfDisabled: &anthropic.ThinkingConfigDisabledParam{}}`。

---

## 提示缓存（Prompt Caching）

`System` 是 `[]TextBlockParam`；在最后一个块上设置 `CacheControl` 以将工具和 system 一起缓存。关于放置模式和静默失效审计清单，请参阅 `shared/prompt-caching.md`。

```go
System: []anthropic.TextBlockParam{{
    Text:         longSystemPrompt,
    CacheControl: anthropic.NewCacheControlEphemeralParam(), // 默认 5 分钟 TTL
}},
```

设置 1 小时 TTL：`anthropic.CacheControlEphemeralParam{TTL: anthropic.CacheControlEphemeralTTLTTL1h}`。`MessageNewParams` 上也有一个顶层 `CacheControl`，会自动放置在最后一个可缓存的块上。

通过 `resp.Usage.CacheCreationInputTokens` / `resp.Usage.CacheReadInputTokens` 验证缓存命中。

---

## 服务端工具（Server-Side Tools）

版本后缀的 struct 名称带 `Param` 后缀。`Name`/`Type` 是 `constant.*` 类型——零值能正确序列化，所以 `{}` 即可。包装在 `ToolUnionParam` 中，使用匹配的 `Of*` 字段。

```go
Tools: []anthropic.ToolUnionParam{
    {OfWebSearchTool20260209: &anthropic.WebSearchTool20260209Param{}},
    {OfBashTool20250124: &anthropic.ToolBash20250124Param{}},
    {OfTextEditor20250728: &anthropic.ToolTextEditor20250728Param{}},
    {OfCodeExecutionTool20260120: &anthropic.CodeExecutionTool20260120Param{}},
},
```

也可用：`WebFetchTool20260209Param`、`MemoryTool20250818Param`、`ToolSearchToolBm25_20251119Param`、`ToolSearchToolRegex20251119Param`。对于 advisor 工具，请在 beta 命名空间中使用 `BetaAdvisorTool20260301Param`。

---

## 停止详情（Stop Details）

当 `StopReason` 为 `anthropic.StopReasonRefusal` 时，响应包含结构化的 `StopDetails`：

```go
if resp.StopReason == anthropic.StopReasonRefusal {
    fmt.Println("Category:", resp.StopDetails.Category)     // 例如 "cyber"、"bio"、"reasoning_extraction"、"frontier_llm" 或 ""——完整集合请参阅文档
    fmt.Println("Explanation:", resp.StopDetails.Explanation)
}
```

**拒绝回退（Refusal fallbacks，${FABLE_NAME}）——默认选择加入（opt in）。** 回退是选择加入的：没有它们，被拒绝的请求会直接停止。在 `${FABLE_ID}` 代码中，默认应包含 `Fallbacks: []anthropic.BetaFallbackParam{{Model: "${OPUS_ID}"}}` 并在 `client.Beta.Messages.New` 上添加 `anthropic.AnthropicBetaServerSideFallback2026_06_01` beta 头——策略拒绝将由回退模型在同一调用内重新处理。在 Amazon Bedrock、Vertex AI 或 Microsoft Foundry 上不可用——在这些平台上注册客户端中间件：来自 `lib/betafallback` 的 `option.WithMiddleware(betafallback.BetaRefusalFallbackMiddleware(...))`，通过 `betafallback.WithBetaFallbackState(&betafallback.BetaFallbackState{})` 管理每次对话的状态。完整语义（计费、粘性路由、流式传输）和可运行示例：`shared/model-migration.md` → 迁移到 ${FABLE_NAME} → `refusal` 停止原因，以及 Go SDK 仓库的 `examples/`（通过 `shared/live-sources.md` 的 WebFetch 获取）。

---

## PDF / 文档输入

`NewDocumentBlock` 泛型辅助函数接受任何源类型。`MediaType`/`Type` 自动设置。

```go
b64 := base64.StdEncoding.EncodeToString(pdfBytes)

msg := anthropic.NewUserMessage(
    anthropic.NewDocumentBlock(anthropic.Base64PDFSourceParam{Data: b64}),
    anthropic.NewTextBlock("Summarize this document"),
)
```

其他源类型：`URLPDFSourceParam{URL: "https://..."}`、`PlainTextSourceParam{Data: "..."}`。

---

## Files API（Beta）

位于 `client.Beta.Files` 下。方法为 **`Upload`**（不是 `New`/`Create`），参数 struct 为 `BetaFileUploadParams`。`File` 字段接受 `io.Reader`；使用 `anthropic.File()` 附加文件名和 content-type 用于 multipart 编码。

```go
f, _ := os.Open("./upload_me.txt")
defer f.Close()

meta, err := client.Beta.Files.Upload(ctx, anthropic.BetaFileUploadParams{
    File:  anthropic.File(f, "upload_me.txt", "text/plain"),
    Betas: []anthropic.AnthropicBeta{anthropic.AnthropicBetaFilesAPI2025_04_14},
})
// meta.ID 是在后续消息请求中引用的 file_id
```

其他 `Beta.Files` 方法：`List`、`Delete`、`Download`、`GetMetadata`。

---

## 上下文编辑/压缩（Context Editing / Compaction，Beta）

使用 `Beta.Messages.New` 并在 `BetaMessageNewParams` 上设置 `ContextManagement`。没有 `NewBetaAssistantMessage`——使用 `.ToParam()` 进行往返。

```go
params := anthropic.BetaMessageNewParams{
    Model:     anthropic.ModelClaudeOpus4_8,  // 也支持：ModelClaudeSonnet4_6
    MaxTokens: 16000,
    Betas:     []anthropic.AnthropicBeta{"compact-2026-01-12"},
    ContextManagement: anthropic.BetaContextManagementConfigParam{
        Edits: []anthropic.BetaContextManagementConfigEditUnionParam{
            {OfCompact20260112: &anthropic.BetaCompact20260112EditParam{}},
        },
    },
    Messages: []anthropic.BetaMessageParam{ /* ... */ },
}

resp, err := client.Beta.Messages.New(ctx, params)
if err != nil {
    log.Fatal(err)
}

// 往返：通过 .ToParam() 将响应追加到历史记录中
params.Messages = append(params.Messages, resp.ToParam())

// 从响应中读取压缩块
for _, block := range resp.Content {
    if c, ok := block.AsAny().(anthropic.BetaCompactionBlock); ok {
        fmt.Println("compaction summary:", c.Content)
    }
}
```

其他编辑类型：`BetaClearToolUses20250919EditParam`、`BetaClearThinking20251015EditParam`。
