<!--
name: 'Data: Tool use reference — Go'
description: Go 工具使用参考，包括支持自动 schema 生成的 beta 工具运行器和手动 agentic 循环
ccVersion: 2.1.182
-->
# 工具使用 — Go

概念概览（工具定义、工具选择、技巧）请参阅 [shared/tool-use-concepts.md](../../shared/tool-use-concepts.md)。

## 工具使用

### Tool Runner（Beta — 推荐）

**Beta：** Go SDK 通过 `toolrunner` 包提供了 `BetaToolRunner`，用于自动化的工具使用循环。

```go
import (
    "context"
    "fmt"
    "log"

    "github.com/anthropics/anthropic-sdk-go"
    "github.com/anthropics/anthropic-sdk-go/toolrunner"
)

// 使用 jsonschema 标签定义工具输入，实现自动 schema 生成
type GetWeatherInput struct {
    City string `json:"city" jsonschema:"required,description=The city name"`
}

// 通过结构体标签自动生成 schema 来创建工具
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

// 创建工具运行器，自动处理对话循环
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

// RunToCompletion 返回 *BetaMessage；content 为 []BetaContentBlockUnion。
// 通过 AsAny() switch 进行窄化——注意这里使用的是 Beta 命名空间类型
// （BetaTextBlock，而非 TextBlock）：
for _, block := range message.Content {
    switch block := block.AsAny().(type) {
    case anthropic.BetaTextBlock:
        fmt.Println(block.Text)
    }
}
```

**Go 工具运行器的主要特性：**

- 通过 Go 结构体的 `jsonschema` 标签自动生成 schema
- `RunToCompletion()` 用于简单的一次性调用
- `All()` 迭代器用于处理对话中的每条消息
- `NextMessage()` 用于逐步迭代
- 流式变体通过 `NewToolRunnerStreaming()` 配合 `AllStreaming()` 使用

### 手动循环

如需对 agentic 循环进行细粒度控制，可使用 `ToolParam` 定义工具，检查 `StopReason`，自行执行工具，并将 `tool_result` 块反馈回去。当你需要拦截、验证或记录工具调用时，使用此模式。

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

    // 1. 定义工具。ToolParam.InputSchema 使用 map，无需结构体标签。
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
    // ToolParam 必须包装在 ToolUnionParam 中才能放入 Tools 切片
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

        // 2. 在处理工具调用之前，先将 assistant 响应追加到历史记录中。
        //    resp.ToParam() 一键将 Message → MessageParam 转换。
        messages = append(messages, resp.ToParam())

        // 3. 遍历 content 块。ContentBlockUnion 是扁平化的结构体；
        //    使用 block.AsAny().(type) 来根据实际变体进行 switch。
        toolResults := []anthropic.ContentBlockParamUnion{}
        for _, block := range resp.Content {
            switch variant := block.AsAny().(type) {
            case anthropic.TextBlock:
                fmt.Println(variant.Text)
            case anthropic.ToolUseBlock:
                // 4. 解析工具输入。使用 variant.JSON.Input.Raw() 获取
                //    原始 JSON——block.Input 是 json.RawMessage，而非解析后的值。
                var in struct {
                    A int `json:"a"`
                    B int `json:"b"`
                }
                if err := json.Unmarshal([]byte(variant.JSON.Input.Raw()), &in); err != nil {
                    log.Fatal(err)
                }
                result := fmt.Sprintf("%d", in.A+in.B)
                // 5. NewToolResultBlock(toolUseID, content, isError) 为你构建
                //    ContentBlockParamUnion。block.ID 即 tool_use_id。
                toolResults = append(toolResults,
                    anthropic.NewToolResultBlock(block.ID, result, false))
            }
        }

        // 6. 当 Claude 不再请求工具时退出循环
        if resp.StopReason != anthropic.StopReasonToolUse {
            break
        }

        // 7. 工具结果放入 user 消息中（可变参数：所有结果在一个回合中）
        messages = append(messages, anthropic.NewUserMessage(toolResults...))
    }
}
```

**关键 API 接口：**

| 符号 | 用途 |
|---|---|
| `resp.ToParam()` | 将 `Message` 响应 → `MessageParam` 以放入历史记录 |
| `block.AsAny().(type)` | 对 `ContentBlockUnion` 变体进行类型 switch |
| `variant.JSON.Input.Raw()` | 工具输入的原始 JSON 字符串（用于 `json.Unmarshal`） |
| `anthropic.NewToolResultBlock(id, content, isError)` | 构建 `tool_result` 块 |
| `anthropic.NewUserMessage(blocks...)` | 将工具结果包装为 user 回合 |
| `anthropic.StopReasonToolUse` | 用于检查循环终止条件的 `StopReason` 常量 |
| `anthropic.ToolUnionParam{OfTool: &t}` | 将 `ToolParam` 包装到联合类型中以用于 `Tools:` |

---

## Anthropic 定义的工具

带版本后缀的结构体名称，使用 `Param` 后缀。`Name`/`Type` 为 `constant.*` 类型——零值能正确序列化，所以 `{}` 即可。使用匹配的 `Of*` 字段包装在 `ToolUnionParam` 中。网页搜索和代码执行由服务端执行；bash 和文本编辑器由客户端执行（你在本地处理 `tool_use`——参见 `shared/tool-use-concepts.md`）。

```go
Tools: []anthropic.ToolUnionParam{
    {OfWebSearchTool20260209: &anthropic.WebSearchTool20260209Param{}},
    {OfBashTool20250124: &anthropic.ToolBash20250124Param{}},
    {OfTextEditor20250728: &anthropic.ToolTextEditor20250728Param{}},
    {OfCodeExecutionTool20260120: &anthropic.CodeExecutionTool20260120Param{}},
},
```

同样可用：`WebFetchTool20260209Param`、`ToolSearchToolBm25_20251119Param`、`ToolSearchToolRegex20251119Param`。对于 advisor 和 memory 工具，在 `client.Beta.Messages.New` 的 beta 命名空间中使用 `BetaAdvisorTool20260301Param` / `BetaMemoryTool20250818Param`。

### Advisor 工具（beta）

服务端执行——无需 tool_result 往返。advisor 模型必须 ≥ executor（顶层）模型；无效配对将返回 400。

```go
response, err := client.Beta.Messages.New(ctx, anthropic.BetaMessageNewParams{
    Model:     anthropic.ModelClaudeSonnet4_6,
    MaxTokens: 4096,
    Tools: []anthropic.BetaToolUnionParam{
        {OfAdvisorTool20260301: &anthropic.BetaAdvisorTool20260301Param{
            Model: anthropic.ModelClaudeOpus4_8,
        }},
    },
    Messages: []anthropic.BetaMessageParam{ /* ... */ },
    Betas:    []anthropic.AnthropicBeta{anthropic.AnthropicBetaAdvisorTool2026_03_01},
})
```
