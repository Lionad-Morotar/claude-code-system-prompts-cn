<!--
name: 'Data: Claude API reference — cURL'
description: Claude API 原始 API 参考，适用于 cURL 或 Raw HTTP
ccVersion: 2.1.176
-->
# Claude API — cURL / 原始 HTTP

当用户需要使用原始 HTTP 请求或在没有官方 SDK 的语言中工作时，请使用以下示例。

## 环境设置

```bash
export ANTHROPIC_API_KEY="your-api-key"
```

---

## 基本消息请求

```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "${OPUS_ID}",
    "max_tokens": 16000,
    "messages": [
      {"role": "user", "content": "What is the capital of France?"}
    ]
  }'
```

### 解析响应

使用 `jq` 从 JSON 响应中提取字段。不要使用 `grep`/`sed`——JSON 字符串可以包含任何字符，正则解析会在引号、转义字符或多行内容上出错。

```bash
# 捕获响应，然后提取字段
response=$(curl -s https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"${OPUS_ID}","max_tokens":16000,"messages":[{"role":"user","content":"Hello"}]}')

# 打印第一个文本块（-r 去掉 JSON 引号）
echo "$response" | jq -r '.content[0].text'

# 读取用量字段
input_tokens=$(echo "$response" | jq -r '.usage.input_tokens')
output_tokens=$(echo "$response" | jq -r '.usage.output_tokens')

# 读取停止原因（用于工具使用循环）
stop_reason=$(echo "$response" | jq -r '.stop_reason')

# 提取所有文本块（content 是一个数组；过滤 type=="text" 的项）
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
    "model": "${OPUS_ID}",
    "max_tokens": 64000,
    "stream": true,
    "messages": [{"role": "user", "content": "Write a haiku"}]
  }'
```

响应是 Server-Sent Events 流：

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
    "model": "${OPUS_ID}",
    "max_tokens": 16000,
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

当 Claude 返回 `tool_use` 块时，将结果回传：

```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "${OPUS_ID}",
    "max_tokens": 16000,
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

## 提示缓存（Prompt Caching）

将 `cache_control` 放在稳定前缀的最后一个块上。关于放置模式和静默失效审计清单，请参阅 `shared/prompt-caching.md`。

```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "${OPUS_ID}",
    "max_tokens": 16000,
    "system": [
      {"type": "text", "text": "<large shared prompt...>", "cache_control": {"type": "ephemeral"}}
    ],
    "messages": [{"role": "user", "content": "Summarize the key points"}]
  }'
```

设置 1 小时 TTL：`"cache_control": {"type": "ephemeral", "ttl": "1h"}`。请求体上的顶层 `"cache_control"` 会自动放置在最后一个可缓存的块上。通过响应中的 `usage.cache_creation_input_tokens` / `usage.cache_read_input_tokens` 字段验证缓存命中。

---

## 扩展思考（Extended Thinking）

> **Fable 5、Opus 4.8、Opus 4.7、Opus 4.6 和 Sonnet 4.6：** 使用自适应思考（adaptive thinking）。在 Fable 5、Opus 4.8 和 4.7 上，`budget_tokens` 已移除（如果传入会返回 400）；在 Opus 4.6 和 Sonnet 4.6 上已弃用。
> **旧版模型：** 使用 `"type": "enabled"` 配合 `"budget_tokens": N`（必须 < `max_tokens`，最小 1024）。

```bash
# Fable 5 / Opus 4.8 / 4.7 / 4.6：自适应思考（推荐）
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "${OPUS_ID}",
    "max_tokens": 16000,
    "thinking": {
      "type": "adaptive",
      "display": "summarized"
    },
    "output_config": {
      "effort": "high"
    },
    "messages": [{"role": "user", "content": "Solve this step by step..."}]
  }'
```

---

## 拒绝回退（Refusal Fallbacks，${FABLE_NAME}）——默认选择加入（opt in）

在 `${FABLE_ID}` 上，安全分类器可能会拒绝请求（HTTP 200，`stop_reason: "refusal"`）。回退是**选择加入的**：没有它们，请求会直接停止。默认应包含 `fallbacks` 参数及其 beta 头——策略拒绝时，API 会在同一调用内使用回退模型重新运行请求。任何输出产生之前的拒绝不收费（流式传输中途拒绝则按已流式输出的部分计费）；救援请求按回退模型自身费率计费。

```bash
response=$(curl -s https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: server-side-fallback-2026-06-01" \
  -d '{
    "model": "${FABLE_ID}",
    "max_tokens": 16000,
    "fallbacks": [{"model": "${OPUS_ID}"}],
    "messages": [{"role": "user", "content": "Hello"}]
  }')

# 哪个模型产出了消息
echo "$response" | jq -r '.model'

# 最终响应上的 refusal 意味着整个链条都被拒绝
echo "$response" | jq -r '.stop_reason'

# 切换点：每个在本轮运行并被拒绝的模型对应一个 fallback 块
echo "$response" | jq -r '.content[] | select(.type == "fallback") | "\(.from.model) declined; \(.to.model) continued"'

# served-by 信号——涵盖粘性轮次（sticky turns），这些轮次不携带 fallback 块。
# 与 stop_reason 配合使用：回退模型本身也可能拒绝。
if [ "$(echo "$response" | jq -r '.stop_reason')" != "refusal" ] && \
   echo "$response" | jq -e '[.usage.iterations[]? | select(.type == "fallback_message")] | length > 0' > /dev/null; then
  echo "fallback model served this turn"
fi
```

头必须精确为 `server-side-fallback-2026-06-01`。该参数在 Batches API 上会被拒绝，且在 Amazon Bedrock、Vertex AI 和 Microsoft Foundry 上不可用。完整语义（粘性路由、计费、流式传输、回传 fallback 轮次）：`shared/model-migration.md` → 迁移到 ${FABLE_NAME} → `refusal` 停止原因。

---

## 必需请求头

| Header              | Value              | 描述                       |
| ------------------- | ------------------ | -------------------------- |
| `Content-Type`      | `application/json` | 必需                       |
| `x-api-key`         | 你的 API 密钥       | 身份认证                    |
| `anthropic-version` | `2023-06-01`       | API 版本                   |
| `anthropic-beta`    | Beta 功能 ID        | Beta 功能必需               |
