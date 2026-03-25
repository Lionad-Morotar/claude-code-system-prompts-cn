<!--
name: 'Data: Claude API reference — cURL'
description: Raw API reference for Claude API for use with cURL or else Raw HTTP
ccVersion: 2.1.78
-->
# Claude API — cURL / Raw HTTP

当用户需要原始 HTTP 请求或在没有官方 SDK 的语言中工作时，使用以下示例。

## 设置

```bash
export ANTHROPIC_API_KEY="your-api-key"
```

---

## 基础消息请求

```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "{{OPUS_ID}}",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "What is the capital of France?"}
    ]
  }'
```

### 解析响应

使用 `jq` 从 JSON 响应中提取字段。不要使用 `grep`/`sed` ——
JSON 字符串可以包含任意字符，正则解析会在引号、转义符或多行内容上失效。

```bash
# 捕获响应，然后提取字段
response=$(curl -s https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"{{OPUS_ID}}","max_tokens":1024,"messages":[{"role":"user","content":"Hello"}]}')

# 打印第一个文本块（-r 去除 JSON 引号）
echo "$response" | jq -r '.content[0].text'

# 读取用量字段
input_tokens=$(echo "$response" | jq -r '.usage.input_tokens')
output_tokens=$(echo "$response" | jq -r '.usage.output_tokens')

# 读取停止原因（用于工具调用循环）
stop_reason=$(echo "$response" | jq -r '.stop_reason')

# 提取所有文本块（content 是一个数组；过滤 type=="text"）
echo "$response" | jq -r '.content[] | select(.type == "text") | .text'
```


---

## 流式传输（SSE）

```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "{{OPUS_ID}}",
    "max_tokens": 1024,
    "stream": true,
    "messages": [{"role": "user", "content": "Write a haiku"}]
  }'
```

响应是服务器发送事件（Server-Sent Events）的流：

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

---

## 工具使用

```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "{{OPUS_ID}}",
    "max_tokens": 1024,
    "tools": [{
      "name": "get_weather",
      "description": "Get current weather for a location",
      "input_schema": {
        "type": "object",
        "properties": {
          "location": {"type": "string", "description": "City name"}
        },
        "required": ["location"]
      }
    }],
    "messages": [{"role": "user", "content": "What is the weather in Paris?"}]
  }'
```

当 Claude 响应一个 `tool_use` 块时，将结果返回：

```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "{{OPUS_ID}}",
    "max_tokens": 1024,
    "tools": [{
      "name": "get_weather",
      "description": "Get current weather for a location",
      "input_schema": {
        "type": "object",
        "properties": {
          "location": {"type": "string", "description": "City name"}
        },
        "required": ["location"]
      }
    }],
    "messages": [
      {"role": "user", "content": "What is the weather in Paris?"},
      {"role": "assistant", "content": [
        {"type": "text", "text": "Let me check the weather."},
        {"type": "tool_use", "id": "toolu_abc123", "name": "get_weather", "input": {"location": "Paris"}}
      ]},
      {"role": "user", "content": [
        {"type": "tool_result", "tool_use_id": "toolu_abc123", "content": "72°F and sunny"}
      ]}
    ]
  }'
```

---

## 扩展思考

> **Opus 4.6 和 Sonnet 4.6：** 使用自适应思考。`budget_tokens` 在 Opus 4.6 和 Sonnet 4.6 上已弃用。
> **旧版本模型：** 使用 `"type": "enabled"` 配合 `"budget_tokens": N`（必须小于 `max_tokens`，最小 1024）。

```bash
# Opus 4.6: 自适应思考（推荐）
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "{{OPUS_ID}}",
    "max_tokens": 16000,
    "thinking": {
      "type": "adaptive"
    },
    "output_config": {
      "effort": "high"
    },
    "messages": [{"role": "user", "content": "Solve this step by step..."}]
  }'
```

---

## 必需请求头

| Header              | Value              | Description                |
| ------------------- | ------------------ | -------------------------- |
| `Content-Type`      | `application/json` | 必需                       |
| `x-api-key`         | Your API key       | 认证                       |
| `anthropic-version` | `2023-06-01`       | API 版本                   |
| `anthropic-beta`    | Beta feature IDs   | Beta 功能必需              |
