---
name: data-claude-api-reference-python
description: Claude API 参考 — Python SDK 用法。模型、参数、流式传输、工具使用、MCP、智能体、缓存、Token 计数、模型迁移。使用此提示词片段获取 Claude API / Anthropic SDK 的权威规范。
ccVersion: 2.1.176
---

# Claude API 参考 — Python SDK

Claude API / Anthropic Python SDK 的权威规范。模型 ID、定价、参数、流式传输、工具使用、MCP、智能体、缓存、Token 计数、模型迁移。

在以下情况下使用此提示词片段：
- 编写通过 `anthropic` Python SDK 调用 Claude API 的代码
- 理解消息参数（`system`、`messages`、`tools`、`max_tokens`、`temperature`、`stream` 等）
- 使用 MCP（Model Context Protocol）服务器、工具或智能体
- 实现 prompt 缓存以减少延迟和成本
- 进行 token 计数和计费计算
- 从旧模型迁移到新的 Claude 模型
- 排除 API 错误、流式传输问题或工具使用问题

---

## 设置与认证

```python
import anthropic

client = anthropic.Anthropic(
    # 默认为 os.environ.get("ANTHROPIC_API_KEY")
    # api_key="my-api-key",
)
```

也支持 `anthropic.AsyncAnthropic` 用于 `async/await` 用法。

---

## 消息 API

### 基本请求

```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1000,
    temperature=0.5,
    system="你是一个乐于助人的助手。",  # 可选；也可以是字符串列表
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "你好，Claude！"
                }
            ]
        }
    ]
)
print(message.content)
```

`system` 参数可以是：
- 单个字符串：`system="你是一个乐于助人的助手。"`
- 字符串列表：`system=["第一条指令", "第二条指令"]`

### 流式传输

```python
import anthropic

client = anthropic.Anthropic()

with client.messages.stream(
    model="claude-sonnet-4-6",
    max_tokens=1000,
    messages=[{"role": "user", "content": "你好，Claude！"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)

# 流结束后获取最终消息
final_message = stream.get_final_message()
```

### 扩展思考（Extended Thinking）

```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=20000,
    thinking={
        "type": "enabled",
        "budget_tokens": 16000
    },
    messages=[{"role": "user", "content": "用数学方法解释量子纠缠。"}]
)
```

流式扩展思考：使用 `stream` 方法，通过 `thinking` 和 `text_stream` 事件迭代块。

---

## 消息参数参考

| 参数 | 类型 | 必需 | 描述 |
|---|---|---|---|
| `model` | `str` | 是 | 要使用的 Claude 模型 |
| `max_tokens` | `int` | 是 | 生成的最大 token 数 |
| `messages` | `List[MessageParam]` | 是 | 对话消息列表 |
| `system` | `Union[str, List[str]]` | 否 | 系统提示词 |
| `temperature` | `float` | 否 | 采样温度（0-1），默认 1.0 |
| `tools` | `List[ToolParam]` | 否 | 工具定义列表 |
| `tool_choice` | `ToolChoiceParam` | 否 | 工具选择策略 |
| `stop_sequences` | `List[str]` | 否 | 自定义停止序列 |
| `stream` | `bool` | 否 | 启用流式传输 |
| `thinking` | `ThinkingConfigParam` | 否 | 扩展思考配置 |
| `metadata` | `MetadataParam` | 否 | 用户标识等元数据 |
| `top_p` | `float` | 否 | Nucleus 采样 |
| `top_k` | `int` | 否 | 仅从 top K 个选项中采样 |

---

## 内容块

消息内容由内容块列表组成：

```python
# 文本块
{"type": "text", "text": "你好，Claude！"}

# 图片块（base64）
{
    "type": "image",
    "source": {
        "type": "base64",
        "media_type": "image/jpeg",
        "data": "base64-encoded-data"
    }
}

# 工具使用块（来自助手响应）
{
    "type": "tool_use",
    "id": "toolu_01A09q90...",
    "name": "get_weather",
    "input": {"location": "San Francisco, CA"}
}

# 工具结果块（用户发送回）
{
    "type": "tool_result",
    "tool_use_id": "toolu_01A09q90...",
    "content": "阳光明媚，72°F。"
}

# 思考块（扩展思考模式）
{
    "type": "thinking",
    "thinking": "让我逐步推理...",
    "signature": "签名数据..."
}

# 红帽思考块（扩展思考中的安全筛选）
{
    "type": "redacted_thinking",
    "data": "已编辑数据..."
}
```

---

## 工具使用（函数调用）

### 定义工具

```python
tools = [
    {
        "name": "get_weather",
        "description": "获取指定位置的当前天气",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "城市和州，例如 San Francisco, CA"
                }
            },
            "required": ["location"]
        }
    }
]
```

### 使用 `tool_choice` 控制工具

```python
# 自动（默认）：模型决定是否使用工具
tool_choice = {"type": "auto"}

# 任意：强制使用任意工具
tool_choice = {"type": "any"}

# 工具：强制使用特定工具
tool_choice = {"type": "tool", "name": "get_weather"}
```

### 处理工具使用循环

```python
import anthropic

client = anthropic.Anthropic()

messages = [{"role": "user", "content": "旧金山的天气怎么样？"}]

while True:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        tools=tools,
        messages=messages
    )

    # 将助手响应追加到消息中
    messages.append({
        "role": "assistant",
        "content": response.content
    })

    # 检查是否有工具调用
    tool_uses = [block for block in response.content if block.type == "tool_use"]

    if not tool_uses:
        break  # 最终响应

    # 执行每个工具调用
    tool_result_blocks = []
    for tool_use in tool_uses:
        # 在这里执行你的工具逻辑
        result = execute_tool(tool_use.name, tool_use.input)
        tool_result_blocks.append({
            "type": "tool_result",
            "tool_use_id": tool_use.id,
            "content": str(result)
        })

    # 将工具结果追加为新的用户消息
    messages.append({
        "role": "user",
        "content": tool_result_blocks
    })
```

### 并行工具调用

当启用时（默认对于支持模型），Claude 可能会在单个响应中返回多个工具调用块。对于不支持并行工具调用的模型，将 `disable_parallel_tool_use` 设置为 `True`：

```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1000,
    tools=tools,
    messages=messages
)
# response.content 可能包含多个 tool_use 块
```

### 计算机使用工具（Computer Use）

计算机使用工具使用特殊的 `computer_20250124`、`text_editor_20250124` 和 `bash_20250124` 工具类型。参考文档[^1]了解实现详情。

---

## MCP（Model Context Protocol）

使用 `anthropic` SDK 与 MCP 服务器交互：

```python
import asyncio
from anthropic import Anthropic, AsyncAnthropic
from anthropic.lib.mcp import MCPClient

client = AsyncAnthropic()

async def main():
    async with MCPClient() as mcp:
        # 连接到一个或多个 MCP 服务器
        await mcp.connect("path/to/server.py")
        # 或者：await mcp.connect("npx", "-y", "@anthropic/mcp-server")

        messages = [{"role": "user", "content": "你的问题在这里"}]

        while True:
            response = await client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4096,
                messages=messages,
                tools=mcp.tools,  # 来自 MCP 服务器的工具
            )

            messages.append({"role": "assistant", "content": response.content})

            tool_uses = [b for b in response.content if b.type == "tool_use"]
            if not tool_uses:
                break

            tool_results = await mcp.call_tools(tool_uses)
            messages.append({"role": "user", "content": tool_results})

        print(response.content)

asyncio.run(main())
```

---

## 智能体 SDK（Agents SDK）

`anthropic` SDK 包含一个用于构建智能体的 `Agents` 命名空间。

### 基本智能体

```python
import anthropic
from anthropic.lib.agents import Agent

client = anthropic.Anthropic()

agent = Agent(
    client=client,
    model="claude-sonnet-4-6",
    tools=[my_tool],
    system_prompt="你是一个乐于助人的助手。",
)

async def main():
    result = await agent.run("你的提示词")
    print(result.final_message)
```

### 子智能体（Sub-Agents）

使用 `handoff` 委托给专门的子智能体：

```python
from anthropic.lib.agents import Agent, handoff

weather_agent = Agent(
    client=client,
    model="claude-sonnet-4-6",
    tools=[get_weather],
    system_prompt="你是一名天气专家。",
)

main_agent = Agent(
    client=client,
    model="claude-sonnet-4-6",
    tools=[handoff(weather_agent, name="weather_expert")],
    system_prompt="你是一个主智能体。委托天气查询给天气专家。",
)
```

---

## 提示缓存（Prompt Caching）

缓存系统提示词和长消息以降低成本（缓存读取便宜 90%）和延迟。

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1000,
    system=[
        {
            "type": "text",
            "text": "你是一个乐于助人的助手。",
            "cache_control": {"type": "ephemeral"}  # 标记用于缓存
        }
    ],
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "这里是一段非常长的上下文...",
                    "cache_control": {"type": "ephemeral"}  # 标记用于缓存
                },
                {
                    "type": "text",
                    "text": "我的实际问题是..."
                }
            ]
        }
    ]
)

# 检查缓存使用情况
print(response.usage.cache_creation_input_tokens)
print(response.usage.cache_read_input_tokens)
```

缓存断点只能放在单个内容块的边界处。每个缓存断点标记内容中该点之前的所有内容以供缓存。

每个缓存断点最少需要：
- 1024 个 token（除 Opus 外的所有模型）
- 2048 个 token（Claude Opus 模型）

最大缓存断点数：每个请求 4 个。

---

## Token 计数

在发出 API 请求之前，使用 `client.messages.count_tokens()` 计算 token 数量：

```python
import anthropic

client = anthropic.Anthropic()

token_count = client.messages.count_tokens(
    model="claude-sonnet-4-6",
    system="你是一个乐于助人的助手。",
    messages=[{"role": "user", "content": "你好，Claude！"}],
    tools=tools,
)

print(f"输入 token 数：{token_count.input_tokens}")
```

---

## 模型 ID 与定价

| 模型 ID | 描述 | 输入价格 / MTok | 输出价格 / MTok | 缓存写入 / MTok | 缓存读取 / MTok |
|---|---|---|---|---|---|
| `claude-fable-5` | Fable 5 — 前沿智能 | $15.00 | $75.00 | $30.00 | $3.00 |
| `claude-opus-4-8` | Opus 4.8 — 强大的推理能力 | $15.00 | $75.00 | $30.00 | $3.00 |
| `claude-sonnet-4-6` | Sonnet 4.6 — 均衡的智能 | $3.00 | $15.00 | $6.00 | $0.60 |
| `claude-haiku-4-5` | Haiku 4.5 — 最快的模型 | $0.80 | $4.00 | $1.60 | $0.08 |

## 错误处理

### 常见异常

```python
import anthropic

try:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": "你好！"}]
    )
except anthropic.APIError as e:
    # 所有 Anthropic 错误的基类
    print(f"API 错误：{e}")
except anthropic.APIConnectionError as e:
    # 无法连接到 API
    print(f"连接错误：{e}")
except anthropic.RateLimitError as e:
    # 429 状态码 — 等待后重试
    print(f"速率限制：{e}")
except anthropic.APIStatusError as e:
    # 非 200 范围的状态码（如 4xx, 5xx）
    print(f"状态码 {e.status_code}：{e}")
```

---

## 模型迁移

### 从 Opus 4.7 迁移到 Opus 4.8

- Opus 4.8 在所有基准测试中均优于 Opus 4.7，包括 SWE-bench 和 Agent 编码任务
- 定价相同（输入 $15.00 / MTok，输出 $75.00 / MTok）
- 支持扩展思考、工具使用、视觉和提示缓存
- 向后兼容 — 只需更新模型 ID

### 从 Sonnet 4.5 迁移到 Sonnet 4.6

- Sonnet 4.6 在编码和智能体基准测试中有显著改进
- 定价相同（输入 $3.00 / MTok，输出 $15.00 / MTok）
- 更新你的模型字符串并测试你的提示词

### 从 Haiku 3.5 迁移到 Haiku 4.5

- Haiku 4.5 提供了大幅改进的质量，同时保持速度
- 新定价：输入 $0.80 / MTok，输出 $4.00 / MTok
- 完全支持所有 API 特性（工具使用、视觉、缓存）

---

## 批量处理

对于大规模异步工作负载，使用 Anthropic 的批量 API 以 50% 折扣处理查询：

```python
import anthropic

client = anthropic.Anthropic()

# 提交批量任务
batch = client.messages.batches.create(
    requests=[
        {
            "custom_id": "my-custom-id-1",
            "params": {
                "model": "claude-sonnet-4-6",
                "max_tokens": 1000,
                "messages": [{"role": "user", "content": "你好！"}]
            }
        }
    ]
)

print(f"批量 ID：{batch.id}")

# 检索结果
results = client.messages.batches.results(batch.id)
for result in results:
    print(result.result.message.content)
```

---

## 速率限制与重试

```python
import anthropic
import time

client = anthropic.Anthropic(max_retries=3)  # 自动重试

# 或者实现你自己的重试逻辑
max_retries = 5
for attempt in range(max_retries):
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1000,
            messages=[{"role": "user", "content": "你好！"}]
        )
        break
    except anthropic.RateLimitError:
        if attempt < max_retries - 1:
            wait_time = 2 ** attempt  # 指数退避
            time.sleep(wait_time)
        else:
            raise
```

---

## 其他资源

- [Anthropic API 文档](https://docs.anthropic.com/en/api)
- [Python SDK 源代码](https://github.com/anthropics/anthropic-sdk-python)
- [MCP 文档](https://docs.anthropic.com/en/docs/agents-and-tools/mcp)
- [提示缓存指南](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [扩展思考指南](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- [模型比较](https://docs.anthropic.com/en/docs/about-claude/models)

[^1]: [计算机使用参考实现](https://docs.anthropic.com/en/docs/agents-and-tools/computer-use): 官方 Anthropic 计算机使用文档和实现指南
