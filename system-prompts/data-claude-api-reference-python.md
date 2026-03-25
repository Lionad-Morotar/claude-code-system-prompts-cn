<!--
name: 'Data: Claude API reference — Python'
description: Python SDK reference including installation, client initialization, basic requests, thinking, and multi-turn conversation
ccVersion: 2.1.78
-->
# Claude API — Python

## 安装

```bash
pip install anthropic
```

## 客户端初始化

```python
import anthropic

# 默认（使用 ANTHROPIC_API_KEY 环境变量）
client = anthropic.Anthropic()

# 显式指定 API 密钥
client = anthropic.Anthropic(api_key="your-api-key")

# 异步客户端
async_client = anthropic.AsyncAnthropic()
```

---

## 基本消息请求

```python
response = client.messages.create(
    model="{{OPUS_ID}}",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "What is the capital of France?"}
    ]
)
# response.content 是内容块对象的列表（TextBlock、ThinkingBlock、
# ToolUseBlock 等）。在访问 .text 前先检查 .type。
for block in response.content:
    if block.type == "text":
        print(block.text)
```

---

## 系统提示词

```python
response = client.messages.create(
    model="{{OPUS_ID}}",
    max_tokens=1024,
    system="You are a helpful coding assistant. Always provide examples in Python.",
    messages=[{"role": "user", "content": "How do I read a JSON file?"}]
)
```

---

## 视觉（图像）

### Base64

```python
import base64

with open("image.png", "rb") as f:
    image_data = base64.standard_b64encode(f.read()).decode("utf-8")

response = client.messages.create(
    model="{{OPUS_ID}}",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": image_data
                }
            },
            {"type": "text", "text": "What's in this image?"}
        ]
    }]
)
```

### URL

```python
response = client.messages.create(
    model="{{OPUS_ID}}",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "url",
                    "url": "https://example.com/image.png"
                }
            },
            {"type": "text", "text": "Describe this image"}
        ]
    }]
)
```

---

## 提示词缓存

缓存大型上下文以降低成本（最高可节省 90%）。

### 自动缓存（推荐）

使用顶级的 `cache_control` 来自动缓存请求中最后一个可缓存的块——无需逐个标注内容块：

```python
response = client.messages.create(
    model="{{OPUS_ID}}",
    max_tokens=1024,
    cache_control={"type": "ephemeral"},  # 自动缓存最后一个可缓存块
    system="You are an expert on this large document...",
    messages=[{"role": "user", "content": "Summarize the key points"}]
)
```

### 手动缓存控制

如需精细控制，可将 `cache_control` 添加到特定内容块：

```python
response = client.messages.create(
    model="{{OPUS_ID}}",
    max_tokens=1024,
    system=[{
        "type": "text",
        "text": "You are an expert on this large document...",
        "cache_control": {"type": "ephemeral"}  # 默认 TTL 为 5 分钟
    }],
    messages=[{"role": "user", "content": "Summarize the key points"}]
)

# 使用显式 TTL（存活时间）
response = client.messages.create(
    model="{{OPUS_ID}}",
    max_tokens=1024,
    system=[{
        "type": "text",
        "text": "You are an expert on this large document...",
        "cache_control": {"type": "ephemeral", "ttl": "1h"}  # 1 小时 TTL
    }],
    messages=[{"role": "user", "content": "Summarize the key points"}]
)
```

---

## 扩展思考

> **Opus 4.6 和 Sonnet 4.6：** 使用自适应思考。`budget_tokens` 在这两个模型上已弃用。
> **旧版模型：** 使用 `thinking: {type: "enabled", budget_tokens: N}`（必须小于 `max_tokens`，最小 1024）。

```python
# Opus 4.6：自适应思考（推荐）
response = client.messages.create(
    model="{{OPUS_ID}}",
    max_tokens=16000,
    thinking={"type": "adaptive"},
    output_config={"effort": "high"},  # low | medium | high | max
    messages=[{"role": "user", "content": "Solve this step by step..."}]
)

# 访问思考内容和回复
for block in response.content:
    if block.type == "thinking":
        print(f"Thinking: {block.thinking}")
    elif block.type == "text":
        print(f"Response: {block.text}")
```

---

## 错误处理

```python
import anthropic

try:
    response = client.messages.create(...)
except anthropic.BadRequestError as e:
    print(f"Bad request: {e.message}")
except anthropic.AuthenticationError:
    print("Invalid API key")
except anthropic.PermissionDeniedError:
    print("API key lacks required permissions")
except anthropic.NotFoundError:
    print("Invalid model or endpoint")
except anthropic.RateLimitError as e:
    retry_after = int(e.response.headers.get("retry-after", "60"))
    print(f"Rate limited. Retry after {retry_after}s.")
except anthropic.APIStatusError as e:
    if e.status_code >= 500:
        print(f"Server error ({e.status_code}). Retry later.")
    else:
        print(f"API error: {e.message}")
except anthropic.APIConnectionError:
    print("Network error. Check internet connection.")
```

---

## 多轮对话

API 是无状态的——每次都需要发送完整的对话历史。

```python
class ConversationManager:
    """管理与 Claude API 的多轮对话。"""

    def __init__(self, client: anthropic.Anthropic, model: str, system: str = None):
        self.client = client
        self.model = model
        self.system = system
        self.messages = []

    def send(self, user_message: str, **kwargs) -> str:
        """发送消息并获取回复。"""
        self.messages.append({"role": "user", "content": user_message})

        response = self.client.messages.create(
            model=self.model,
            max_tokens=kwargs.get("max_tokens", 1024),
            system=self.system,
            messages=self.messages,
            **kwargs
        )

        assistant_message = next(
            (b.text for b in response.content if b.type == "text"), ""
        )
        self.messages.append({"role": "assistant", "content": assistant_message})

        return assistant_message

# 使用示例
conversation = ConversationManager(
    client=anthropic.Anthropic(),
    model="{{OPUS_ID}}",
    system="You are a helpful assistant."
)

response1 = conversation.send("My name is Alice.")
response2 = conversation.send("What's my name?")  # Claude 记得 "Alice"
```

**规则：**

- 消息必须在 `user` 和 `assistant` 之间交替
- 第一条消息必须是 `user`

---

### 压缩（长对话）

> **Beta 版，Opus 4.6 和 Sonnet 4.6。** 当对话接近 200K 上下文窗口时，压缩会在服务端自动总结较早的上下文。API 会返回一个 `compaction` 块；你必须在后续请求中将其传回——追加 `response.content`，而不仅仅是文本。

```python
import anthropic

client = anthropic.Anthropic()
messages = []

def chat(user_message: str) -> str:
    messages.append({"role": "user", "content": user_message})

    response = client.beta.messages.create(
        betas=["compact-2026-01-12"],
        model="{{OPUS_ID}}",
        max_tokens=4096,
        messages=messages,
        context_management={
            "edits": [{"type": "compact_20260112"}]
        }
    )

    # 追加完整内容——压缩块必须保留
    messages.append({"role": "assistant", "content": response.content})

    return next(block.text for block in response.content if block.type == "text")

# 当上下文增长较大时，压缩会自动触发
print(chat("Help me build a Python web scraper"))
print(chat("Add support for JavaScript-rendered pages"))
print(chat("Now add rate limiting and error handling"))
```

---

## 停止原因

响应中的 `stop_reason` 字段表示模型停止生成的原因：

| 值 | 含义 |
|-------|---------|
| `end_turn` | Claude 自然完成了回复 |
| `max_tokens` | 达到 `max_tokens` 限制——增加限制或使用流式传输 |
| `stop_sequence` | 触发了自定义停止序列 |
| `tool_use` | Claude 想要调用工具——执行它并继续 |
| `pause_turn` | 模型暂停，可以继续（代理流程） |
| `refusal` | Claude 因安全原因拒绝——输出可能不符合你的模式 |

---

## 成本优化策略

### 1. 对重复上下文使用提示词缓存

```python
# 自动缓存（最简单——缓存最后一个可缓存块）
response = client.messages.create(
    model="{{OPUS_ID}}",
    max_tokens=1024,
    cache_control={"type": "ephemeral"},
    system=large_document_text,  # 例如，50KB 的上下文
    messages=[{"role": "user", "content": "Summarize the key points"}]
)

# 第一次请求：全价
# 后续请求：缓存部分便宜约 90%
```

### 2. 选择合适的模型

```python
# 默认使用 Opus 处理大多数任务
response = client.messages.create(
    model="{{OPUS_ID}}",  # 每 100 万 token $5.00/$25.00
    max_tokens=1024,
    messages=[{"role": "user", "content": "Explain quantum computing"}]
)

# 对高容量生产工作负载使用 Sonnet
standard_response = client.messages.create(
    model="{{SONNET_ID}}",  # 每 100 万 token $3.00/$15.00
    max_tokens=1024,
    messages=[{"role": "user", "content": "Summarize this document"}]
)

# 仅对简单、速度关键的任务使用 Haiku
simple_response = client.messages.create(
    model="{{HAIKU_ID}}",  # 每 100 万 token $1.00/$5.00
    max_tokens=256,
    messages=[{"role": "user", "content": "Classify this as positive or negative"}]
)
```

### 3. 在请求前使用 Token 计数

```python
count_response = client.messages.count_tokens(
    model="{{OPUS_ID}}",
    messages=messages,
    system=system
)

estimated_input_cost = count_response.input_tokens * 0.000005  # $5/100 万 token
print(f"Estimated input cost: ${estimated_input_cost:.4f}")
```

---

## 指数退避重试

> **注意：** Anthropic SDK 会自动对速率限制（429）和服务器错误（5xx）使用指数退避进行重试。你可以通过 `max_retries` 进行配置（默认：2）。仅当你需要 SDK 提供之外的行为时，才实现自定义重试逻辑。

```python
import time
import random
import anthropic

def call_with_retry(
    client: anthropic.Anthropic,
    max_retries: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    **kwargs
):
    """使用指数退避重试调用 API。"""
    last_exception = None

    for attempt in range(max_retries):
        try:
            return client.messages.create(**kwargs)
        except anthropic.RateLimitError as e:
            last_exception = e
        except anthropic.APIStatusError as e:
            if e.status_code >= 500:
                last_exception = e
            else:
                raise  # 客户端错误（4xx 除 429 外）不应重试

        delay = min(base_delay * (2 ** attempt) + random.uniform(0, 1), max_delay)
        print(f"Retry {attempt + 1}/{max_retries} after {delay:.1f}s")
        time.sleep(delay)

    raise last_exception
```
