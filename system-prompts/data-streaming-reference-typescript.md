<!--
name: 'Data: Streaming reference — TypeScript'
description: TypeScript streaming reference including basic streaming and handling different content types
ccVersion: 2.1.78
-->
# 流式传输 — TypeScript

## 快速开始

```typescript
const stream = client.messages.stream({
  model: "{{OPUS_ID}}",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Write a story" }],
});

for await (const event of stream) {
  if (
    event.type === "content_block_delta" &&
    event.delta.type === "text_delta"
  ) {
    process.stdout.write(event.delta.text);
  }
}
```

---

## 处理不同的内容类型

> **Opus 4.6:** 使用 `thinking: {type: "adaptive"}`。对于旧版模型，请改用 `thinking: {type: "enabled", budget_tokens: N}`。

```typescript
const stream = client.messages.stream({
  model: "{{OPUS_ID}}",
  max_tokens: 16000,
  thinking: { type: "adaptive" },
  messages: [{ role: "user", content: "Analyze this problem" }],
});

for await (const event of stream) {
  switch (event.type) {
    case "content_block_start":
      switch (event.content_block.type) {
        case "thinking":
          console.log("\n[Thinking...]");
          break;
        case "text":
          console.log("\n[Response:]");
          break;
      }
      break;
    case "content_block_delta":
      switch (event.delta.type) {
        case "thinking_delta":
          process.stdout.write(event.delta.thinking);
          break;
        case "text_delta":
          process.stdout.write(event.delta.text);
          break;
      }
      break;
  }
}
```

---

## 使用工具运行器进行流式传输

在工具运行器中使用 `stream: true`。外层循环遍历工具运行器的迭代（消息），内层循环处理流事件：

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

const client = new Anthropic();

const getWeather = betaZodTool({
  name: "get_weather",
  description: "Get current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City and state, e.g., San Francisco, CA"),
  }),
  run: async ({ location }) => `72°F and sunny in ${location}`,
});

const runner = client.beta.messages.toolRunner({
  model: "{{OPUS_ID}}",
  max_tokens: 4096,
  tools: [getWeather],
  messages: [
    { role: "user", content: "What's the weather in Paris and London?" },
  ],
  stream: true,
});

// 外层循环：每个工具运行器迭代
for await (const messageStream of runner) {
  // 内层循环：处理此迭代的流事件
  for await (const event of messageStream) {
    switch (event.type) {
      case "content_block_delta":
        switch (event.delta.type) {
          case "text_delta":
            process.stdout.write(event.delta.text);
            break;
          case "input_json_delta":
            // 工具输入正在流式传输
            break;
        }
        break;
    }
  }
}
```

---

## 获取最终消息

```typescript
const stream = client.messages.stream({
  model: "{{OPUS_ID}}",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello" }],
});

for await (const event of stream) {
  // 处理事件...
}

const finalMessage = await stream.finalMessage();
console.log(`Tokens used: ${finalMessage.usage.output_tokens}`);
```

---

## 流事件类型

| 事件类型              | 描述                        | 触发时机                          |
| --------------------- | --------------------------- | --------------------------------- |
| `message_start`       | 包含消息元数据              | 在开始时触发一次                  |
| `content_block_start` | 新内容块开始                | 当 text/tool_use 块开始时触发     |
| `content_block_delta` | 增量内容更新                | 每个 token/数据块触发             |
| `content_block_stop`  | 内容块完成                  | 当块结束时触发                    |
| `message_delta`       | 消息级更新                  | 包含 `stop_reason`、使用量信息    |
| `message_stop`        | 消息完成                    | 在结束时触发一次                  |

## 最佳实践

1. **始终刷新输出** — 使用 `process.stdout.write()` 实现即时显示
2. **处理部分响应** — 如果流被中断，可能会有不完整的内容
3. **跟踪 token 使用量** — `message_delta` 事件包含使用量信息
4. **使用 `finalMessage()`** — 即使在流式传输时也能获取完整的 `Anthropic.Message` 对象。不要将 `.on()` 事件包装在 `new Promise()` 中 — `finalMessage()` 内部处理所有完成/错误/中止状态
5. **为 Web UI 缓冲** — 考虑在渲染前缓冲几个 token，以避免过多的 DOM 更新
6. **使用 `stream.on("text", ...)` 获取增量** — `text` 事件仅提供增量字符串，比手动过滤 `content_block_delta` 事件更简单
7. **对于带流式传输的代理循环** — 请参阅 tool-use.md 中的[流式手动循环](./tool-use.md#streaming-manual-loop)部分，了解如何结合 `stream()` + `finalMessage()` 与工具使用循环

## 原始 SSE 格式

如果使用原始 HTTP（而非 SDK），流将返回服务器发送事件：

```
event: message_start
data: {"type":"message_start","message":{"id":"msg_...","type":"message",...}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":12}}

event: message_stop
data: {"type":"message_stop"}
```
