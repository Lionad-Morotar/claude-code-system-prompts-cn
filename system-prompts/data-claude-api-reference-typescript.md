<!--
name: 'Data: Claude API reference — TypeScript'
description: TypeScript SDK reference including installation, client initialization, basic requests, thinking, and multi-turn conversation
ccVersion: 2.1.78
-->
# Claude API — TypeScript

## 安装

```bash
npm install @anthropic-ai/sdk
```

## 客户端初始化

```typescript
import Anthropic from "@anthropic-ai/sdk";

// 默认（使用 ANTHROPIC_API_KEY 环境变量）
const client = new Anthropic();

// 显式指定 API 密钥
const client = new Anthropic({ apiKey: "your-api-key" });
```

---

## 基本消息请求

```typescript
const response = await client.messages.create({
  model: "{{OPUS_ID}}",
  max_tokens: 1024,
  messages: [{ role: "user", content: "What is the capital of France?" }],
});
// response.content 是 ContentBlock[] — 一个可辨识的联合类型。在使用前需通过 .type 进行类型收窄
// 否则 TypeScript 会在访问 content[0].text 时报错。
for (const block of response.content) {
  if (block.type === "text") {
    console.log(block.text);
  }
}
```

---

## 系统提示词

```typescript
const response = await client.messages.create({
  model: "{{OPUS_ID}}",
  max_tokens: 1024,
  system:
    "You are a helpful coding assistant. Always provide examples in Python.",
  messages: [{ role: "user", content: "How do I read a JSON file?" }],
});
```

---

## 视觉（图像）

### URL

```typescript
const response = await client.messages.create({
  model: "{{OPUS_ID}}",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "url", url: "https://example.com/image.png" },
        },
        { type: "text", text: "Describe this image" },
      ],
    },
  ],
});
```

### Base64

```typescript
import fs from "fs";

const imageData = fs.readFileSync("image.png").toString("base64");

const response = await client.messages.create({
  model: "{{OPUS_ID}}",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: "image/png", data: imageData },
        },
        { type: "text", text: "What's in this image?" },
      ],
    },
  ],
});
```

---

## 提示词缓存

### 自动缓存（推荐）

使用顶层的 `cache_control` 自动缓存请求中最后一个可缓存的块：

```typescript
const response = await client.messages.create({
  model: "{{OPUS_ID}}",
  max_tokens: 1024,
  cache_control: { type: "ephemeral" }, // 自动缓存最后一个可缓存的块
  system: "You are an expert on this large document...",
  messages: [{ role: "user", content: "Summarize the key points" }],
});
```

### 手动缓存控制

如需精细控制，可在特定内容块上添加 `cache_control`：

```typescript
const response = await client.messages.create({
  model: "{{OPUS_ID}}",
  max_tokens: 1024,
  system: [
    {
      type: "text",
      text: "You are an expert on this large document...",
      cache_control: { type: "ephemeral" }, // 默认 TTL 为 5 分钟
    },
  ],
  messages: [{ role: "user", content: "Summarize the key points" }],
});

// 显式指定 TTL（存活时间）
const response2 = await client.messages.create({
  model: "{{OPUS_ID}}",
  max_tokens: 1024,
  system: [
    {
      type: "text",
      text: "You are an expert on this large document...",
      cache_control: { type: "ephemeral", ttl: "1h" }, // 1 小时 TTL
    },
  ],
  messages: [{ role: "user", content: "Summarize the key points" }],
});
```

---

## 扩展思考

> **Opus 4.6 和 Sonnet 4.6：** 使用自适应思考。`budget_tokens` 在这两个模型上已弃用。
> **旧版模型：** 使用 `thinking: {type: "enabled", budget_tokens: N}`（必须小于 `max_tokens`，最小值为 1024）。

```typescript
// Opus 4.6：自适应思考（推荐）
const response = await client.messages.create({
  model: "{{OPUS_ID}}",
  max_tokens: 16000,
  thinking: { type: "adaptive" },
  output_config: { effort: "high" }, // low | medium | high | max
  messages: [
    { role: "user", content: "Solve this math problem step by step..." },
  ],
});

for (const block of response.content) {
  if (block.type === "thinking") {
    console.log("Thinking:", block.thinking);
  } else if (block.type === "text") {
    console.log("Response:", block.text);
  }
}
```

---

## 错误处理

使用 SDK 提供的类型化异常类 —— 切勿通过字符串匹配检查错误消息：

```typescript
import Anthropic from "@anthropic-ai/sdk";

try {
  const response = await client.messages.create({...});
} catch (error) {
  if (error instanceof Anthropic.BadRequestError) {
    console.error("Bad request:", error.message);
  } else if (error instanceof Anthropic.AuthenticationError) {
    console.error("Invalid API key");
  } else if (error instanceof Anthropic.RateLimitError) {
    console.error("Rate limited - retry later");
  } else if (error instanceof Anthropic.APIError) {
    console.error(`API error ${error.status}:`, error.message);
  }
}
```

所有类都继承自 `Anthropic.APIError`，并带有类型化的 `status` 字段。请从最具体的类型检查到最通用的类型。完整的错误代码参考请参见 [shared/error-codes.md](../../shared/error-codes.md)。

---

## 多轮对话

API 是无状态的 —— 每次请求都需要发送完整的对话历史。使用 `Anthropic.MessageParam[]` 来类型化消息数组：

```typescript
const messages: Anthropic.MessageParam[] = [
  { role: "user", content: "My name is Alice." },
  { role: "assistant", content: "Hello Alice! Nice to meet you." },
  { role: "user", content: "What's my name?" },
];

const response = await client.messages.create({
  model: "{{OPUS_ID}}",
  max_tokens: 1024,
  messages: messages,
});
```

**规则：**

- 允许连续相同角色的消息 —— API 会将它们合并为单轮
- 第一条消息必须是 `user`
- 对所有 API 数据结构使用 SDK 类型（`Anthropic.MessageParam`、`Anthropic.Message`、`Anthropic.Tool` 等）—— 不要重新定义等效接口

---

### 压缩（长对话）

> **Beta 功能，Opus 4.6 和 Sonnet 4.6。** 当对话接近 200K 上下文窗口时，压缩功能会自动在服务端总结早期上下文。API 会返回一个 `compaction` 块；你必须在后续请求中将其传回 —— 追加 `response.content`，而不仅仅是文本。

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const messages: Anthropic.Beta.BetaMessageParam[] = [];

async function chat(userMessage: string): Promise<string> {
  messages.push({ role: "user", content: userMessage });

  const response = await client.beta.messages.create({
    betas: ["compact-2026-01-12"],
    model: "{{OPUS_ID}}",
    max_tokens: 4096,
    messages,
    context_management: {
      edits: [{ type: "compact_20260112" }],
    },
  });

  // 追加完整内容 —— 压缩块必须被保留
  messages.push({ role: "assistant", content: response.content });

  const textBlock = response.content.find(
    (b): b is Anthropic.Beta.BetaTextBlock => b.type === "text",
  );
  return textBlock?.text ?? "";
}

// 当上下文增长较大时，压缩会自动触发
console.log(await chat("Help me build a Python web scraper"));
console.log(await chat("Add support for JavaScript-rendered pages"));
console.log(await chat("Now add rate limiting and error handling"));
```

---

## 停止原因

响应中的 `stop_reason` 字段指示模型停止生成的原因：

| 值              | 含义                                                            |
| --------------- | --------------------------------------------------------------- |
| `end_turn`      | Claude 自然完成了其响应                                         |
| `max_tokens`    | 达到 `max_tokens` 限制 —— 增加该值或使用流式传输                |
| `stop_sequence` | 触发了自定义停止序列                                            |
| `tool_use`      | Claude 想要调用工具 —— 执行它并继续                             |
| `pause_turn`    | 模型已暂停，可以恢复（代理流程）                                |
| `refusal`       | Claude 因安全原因拒绝 —— 输出可能不符合模式                     |

---

## 成本优化策略

### 1. 对重复上下文使用提示词缓存

```typescript
// 自动缓存（最简单 —— 缓存最后一个可缓存的块）
const response = await client.messages.create({
  model: "{{OPUS_ID}}",
  max_tokens: 1024,
  cache_control: { type: "ephemeral" },
  system: largeDocumentText, // 例如，50KB 的上下文
  messages: [{ role: "user", content: "Summarize the key points" }],
});

// 首次请求：全额费用
// 后续请求：缓存部分约便宜 90%
```

### 2. 请求前使用令牌计数

```typescript
const countResponse = await client.messages.countTokens({
  model: "{{OPUS_ID}}",
  messages: messages,
  system: system,
});

const estimatedInputCost = countResponse.input_tokens * 0.000005; // $5/1M tokens
console.log(`Estimated input cost: $${estimatedInputCost.toFixed(4)}`);
```
