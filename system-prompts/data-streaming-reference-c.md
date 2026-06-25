<!--
name: '数据：流式参考 — C#'
description: C# 流式参考，包括流式事件和 RawMessageStreamEvent 的 TryPick 方法
ccVersion: 2.1.182
-->
# 流式 — C#

## 流式

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

**`RawMessageStreamEvent` 的 TryPick 方法**（命名省略了 `Message`/`Raw` 前缀）：`TryPickStart`、`TryPickDelta`、`TryPickStop`、`TryPickContentBlockStart`、`TryPickContentBlockDelta`、`TryPickContentBlockStop`。不存在 `TryPickMessageStop` — 请使用 `TryPickStop`。

---
