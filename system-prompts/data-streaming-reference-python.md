<!--
name: 'Data: Streaming reference — Python'
description: Python streaming reference including sync/async streaming and handling different content types
ccVersion: 2.1.78
-->
# 流式传输 — Python

## 快速开始

```python
with client.messages.stream(
    model="{{OPUS_ID}}",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Write a story"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

### 异步

```python
async with async_client.messages.stream(
    model="{{OPUS_ID}}",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Write a story"}]
) as stream:
    async for text in stream.text_stream:
        print(text, end="", flush=True)
```

---

## 处理不同类型的内容

Claude 可能返回文本、思考块或工具使用。请分别处理：

> **Opus 4.6:** 使用 `thinking: {type: "adaptive"}`。在旧模型上，请改用 `thinking: {type: "enabled", budget_tokens: N}`。

```python
with client.messages.stream(
    model="{{OPUS_ID}}",
    max_tokens=16000,
    thinking={"type": "adaptive"},
    messages=[{"role": "user", "content": "Analyze this problem"}]
) as stream:
    for event in stream:
        if event.type == "content_block_start":
            if event.content_block.type == "thinking":
                print("\n[Thinking...]")
            elif event.content_block.type == "text":
                print("\n[Response:]")

        elif event.type == "content_block_delta":
            if event.delta.type == "thinking_delta":
                print(event.delta.thinking, end="", flush=True)
            elif event.delta.type == "text_delta":
                print(event.delta.text, end="", flush=True)
```

---

## 带工具使用的流式传输

Python 工具运行器目前返回完整的消息。如果您需要在工具使用时进行逐令牌流式传输，请在手动循环中对单个 API 调用使用流式传输：

```python
with client.messages.stream(
    model="{{OPUS_ID}}",
    max_tokens=4096,
    tools=tools,
    messages=messages
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)

    response = stream.get_final_message()
    # 如果 response.stop_reason == "tool_use"，继续执行工具
```

---

## 获取最终消息

```python
with client.messages.stream(
    model="{{OPUS_ID}}",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)

    # 流式传输后获取完整消息
    final_message = stream.get_final_message()
    print(f"\n\nTokens used: {final_message.usage.output_tokens}")
```

---

## 带进度更新的流式传输

```python
def stream_with_progress(client, **kwargs):
    """Stream a response with progress updates."""
    total_tokens = 0
    content_parts = []

    with client.messages.stream(**kwargs) as stream:
        for event in stream:
            if event.type == "content_block_delta":
                if event.delta.type == "text_delta":
                    text = event.delta.text
                    content_parts.append(text)
                    print(text, end="", flush=True)

            elif event.type == "message_delta":
                if event.usage and event.usage.output_tokens is not None:
                    total_tokens = event.usage.output_tokens

        final_message = stream.get_final_message()

    print(f"\n\n[Tokens used: {total_tokens}]")
    return "".join(content_parts)
```

---

## 流式传输中的错误处理

```python
try:
    with client.messages.stream(
        model="{{OPUS_ID}}",
        max_tokens=1024,
        messages=[{"role": "user", "content": "Write a story"}]
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
except anthropic.APIConnectionError:
    print("\nConnection lost. Please retry.")
except anthropic.RateLimitError:
    print("\nRate limited. Please wait and retry.")
except anthropic.APIStatusError as e:
    print(f"\nAPI error: {e.status_code}")
```

---

## 流事件类型

| 事件类型              | 描述                         | 触发时机                          |
| --------------------- | ---------------------------- | --------------------------------- |
| `message_start`       | 包含消息元数据               | 在开始时触发一次                  |
| `content_block_start` | 新内容块开始                 | 当 text/tool_use 块开始时触发     |
| `content_block_delta` | 增量内容更新                 | 对每个令牌/块触发                 |
| `content_block_stop`  | 内容块完成                   | 当块结束时触发                    |
| `message_delta`       | 消息级别更新                 | 包含 `stop_reason`、使用量信息    |
| `message_stop`        | 消息完成                     | 在结束时触发一次                  |

## 最佳实践

1. **始终刷新输出** — 使用 `flush=True` 立即显示令牌
2. **处理部分响应** — 如果流被中断，您可能会有不完整的内容
3. **跟踪令牌使用量** — `message_delta` 事件包含使用量信息
4. **使用超时** — 为您的应用程序设置适当的超时
5. **默认使用流式传输** — 使用 `.get_final_message()` 即使在流式传输时也能获取完整响应，这样可以在不需要处理单个事件的情况下获得超时保护
