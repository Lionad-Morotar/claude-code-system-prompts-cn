<!--
name: 'Data: Claude API reference — Python'
description: Python SDK 参考，包括安装、客户端初始化、基本请求、思考和多轮对话
ccVersion: 2.1.154
-->
# Claude API — Python

## 安装

```bash
pip install anthropic
```

## 客户端初始化

```python
import anthropic

# 默认 —— 从环境解析凭据：
# ANTHROPIC_API_KEY、ANTHROPIC_AUTH_TOKEN 或 `ant auth login` 配置文件。
# 本地开发推荐此方式；不要硬编码密钥。
client = anthropic.Anthropic()

# 显式指定 API 密钥（仅在必须注入特定密钥时使用）
client = anthropic.Anthropic(api_key="your-api-key")

# 异步客户端
async_client = anthropic.AsyncAnthropic()
```

---

## 客户端配置

### 按请求覆盖

使用 `with_options()` 为单次调用覆盖客户端设置，而不改变客户端本身：

```python
client.with_options(timeout=5.0, max_retries=5).messages.create(
    model="{{OPUS_ID}}",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
)
```

### 超时

默认请求超时为 10 分钟。传入浮点数（秒）或 `httpx.Timeout` 以进行精细控制。超时时 SDK 抛出 `anthropic.APITimeoutError`（并根据 `max_retries` 重试）。

```python
import httpx

client = anthropic.Anthropic(timeout=20.0)
client = anthropic.Anthropic(
    timeout=httpx.Timeout(60.0, read=5.0, write=10.0, connect=2.0),
)
```

### 重试

SDK 自动对连接错误、408、409、429 和 500+ 错误进行指数退避重试（默认 2 次重试）。在客户端上或通过 `with_options()` 设置 `max_retries`；`max_retries=0` 禁用重试。

### 异步性能（aiohttp 后端）

对于高并发异步工作负载，安装 `anthropic[aiohttp]` 并传入 `DefaultAioHttpClient`，替代默认的 httpx 后端：

```python
from anthropic import AsyncAnthropic, DefaultAioHttpClient

async with AsyncAnthropic(http_client=DefaultAioHttpClient()) as client:
    ...
```

### 自定义 HTTP 客户端（代理、基础 URL）

使用 `DefaultHttpxClient` / `DefaultAsyncHttpxClient` —— 而非原始的 `httpx.Client` —— 以便保留 SDK 的默认超时和连接限制：

```python
from anthropic import Anthropic, DefaultHttpxClient

client = Anthropic(
    base_url="http://my.test.server.example.com:8083",  # 或 ANTHROPIC_BASE_URL 环境变量
    http_client=DefaultHttpxClient(proxy="http://my.test.proxy.example.com"),
)
```

### 日志

设置 `ANTHROPIC_LOG=debug`（或 `info`）以通过标准 `logging` 模块启用 SDK 日志。

---

## 基本消息请求

```python
response = client.messages.create(
    model="{{OPUS_ID}}",
    max_tokens=16000,
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
    max_tokens=16000,
    system="You are a helpful coding assistant. Always provide examples in Python.",
    messages=[{"role": "user", "content": "How do I read a JSON file?"}]
)
```

### 对话中途系统消息（Beta，模型限制）

对于在对话中途到达的操作指令（模式切换、注入状态），将 `{"role": "system", ...}` 追加到 `messages` 中，而不是编辑顶层 `system` —— 这样可以保留缓存前缀并携带操作员权限。必须跟在用户消息之后；不能作为 `messages[0]`。不支持的模型返回 400（`role 'system' is not supported on this model`）。关于何时使用此方式与顶层 `system`，请参阅 `shared/prompt-caching.md`。

```python
response = client.messages.create(
    model=MODEL_ID,  # 必须支持对话中途系统消息
    max_tokens=16000,
    system=[{"type": "text", "text": STABLE_SYSTEM, "cache_control": {"type": "ephemeral"}}],
    messages=history + [
        {"role": "user", "content": user_message},
        {"role": "system", "content": "Terse mode enabled — keep responses under 40 words."},
    ],
    extra_headers={"anthropic-beta": "mid-conversation-system-2026-04-07"},
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
    max_tokens=16000,
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
    max_tokens=16000,
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

缓存大型上下文以降低成本（最高可节省 90%）。**缓存是一种前缀匹配**——前缀中任何字节的变更都会使之后的所有内容失效。有关放置模式、架构指南（冻结系统提示、确定性工具顺序、易变内容放置位置）以及静默失效审查清单，请阅读 `shared/prompt-caching.md`。

### 自动缓存（推荐）

使用顶层的 `cache_control` 来自动缓存请求中最后一个可缓存的块——无需逐个标注内容块：

```python
response = client.messages.create(
    model="{{OPUS_ID}}",
    max_tokens=16000,
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
    max_tokens=16000,
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
    max_tokens=16000,
    system=[{
        "type": "text",
        "text": "You are an expert on this large document...",
        "cache_control": {"type": "ephemeral", "ttl": "1h"}  # 1 小时 TTL
    }],
    messages=[{"role": "user", "content": "Summarize the key points"}]
)
```

### 验证缓存命中

```python
print(response.usage.cache_creation_input_tokens)  # 写入缓存的 token（约 1.25 倍成本）
print(response.usage.cache_read_input_tokens)      # 从缓存提供的 token（约 0.1 倍成本）
print(response.usage.input_tokens)                 # 未缓存的 token（全额成本）
```

如果重复的相同前缀请求中 `cache_read_input_tokens` 始终为零，则存在静默失效器——系统提示中的 `datetime.now()` 或 UUID、未排序的 `json.dumps()` 或变化的工具集。请参阅 `shared/prompt-caching.md` 获取完整的审查表。

---

## 扩展思考

> **Opus 4.8、Opus 4.7、Opus 4.6 和 Sonnet 4.6：** 使用自适应思考。`budget_tokens` 在 Opus 4.8 和 4.7 上已移除（如发送则返回 400）；在 Opus 4.6 和 Sonnet 4.6 上已弃用。
> **旧版模型：** 使用 `thinking: {type: "enabled", budget_tokens: N}`（必须小于 `max_tokens`，最小 1024）。

```python
# Opus 4.8 / 4.7 / 4.6：自适应思考（推荐）
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

## 响应辅助方法

每个响应对象都暴露 `_request_id`（从 `request-id` 头填充）—— 向 Anthropic 报告故障时记下它。尽管有下划线前缀，此属性是公开的。

```python
message = client.messages.create(...)
print(message._request_id)       # req_018EeWyXxfu5pfWkrYcMdjWG
print(message.to_json())          # 序列化 Pydantic 模型
print(message.to_dict())          # 普通字典
```

要访问原始头或其他响应元数据，使用 `.with_raw_response`：

```python
raw = client.messages.with_raw_response.create(
    model="{{OPUS_ID}}",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
)
print(raw.headers.get("request-id"))
message = raw.parse()  # messages.create() 本应返回的 Message 对象
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
            max_tokens=kwargs.get("max_tokens", 16000),
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

- 允许连续相同角色的消息 —— API 会将它们合并为单轮
- 第一条消息必须是 `user`
- 在支持的模型上，`role: "system"` 消息允许通过 `mid-conversation-system-2026-04-07` beta 在对话中途使用 —— 请参阅上文 § 对话中途系统消息

---

### 压缩（长对话）

> **Beta 版，Opus 4.8、Opus 4.7、Opus 4.6 和 Sonnet 4.6。** 当对话接近 200K 上下文窗口时，压缩会在服务端自动总结较早的上下文。API 会返回一个 `compaction` 块；你必须在后续请求中将其传回——追加 `response.content`，而不仅仅是文本。

```python
import anthropic

client = anthropic.Anthropic()
messages = []

def chat(user_message: str) -> str:
    messages.append({"role": "user", "content": user_message})

    response = client.beta.messages.create(
        betas=["compact-2026-01-12"],
        model="{{OPUS_ID}}",
        max_tokens=16000,
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
| `refusal` | Claude 因安全原因拒绝——请检查 `stop_details` |

### 结构化停止详情

当 `stop_reason` 为 `"refusal"` 时，响应包含一个 `stop_details` 对象，其中包含有关拒绝的结构化信息：

```python
if response.stop_reason == "refusal" and response.stop_details:
    print(f"Category: {response.stop_details.category}")   # "cyber" | "bio" | None
    print(f"Explanation: {response.stop_details.explanation}")
```

---

## 成本优化策略

### 1. 对重复上下文使用提示词缓存

```python
# 自动缓存（最简单——缓存最后一个可缓存块）
response = client.messages.create(
    model="{{OPUS_ID}}",
    max_tokens=16000,
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
    max_tokens=16000,
    messages=[{"role": "user", "content": "Explain quantum computing"}]
)

# 对高容量生产工作负载使用 Sonnet
standard_response = client.messages.create(
    model="{{SONNET_ID}}",  # 每 100 万 token $3.00/$15.00
    max_tokens=16000,
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
