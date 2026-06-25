---
name: data-claude-api-reference-ruby
description: Claude API 参考 — Ruby SDK 用法。模型、参数、流式传输、工具使用、MCP、智能体、缓存、Token 计数、模型迁移。使用此提示词片段获取 Claude API / Anthropic SDK 的权威规范。
ccVersion: 2.1.176
---

# Claude API 参考 — Ruby SDK

Claude API / Anthropic Ruby SDK 的权威规范。模型 ID、定价、参数、流式传输、工具使用、MCP、智能体、缓存、Token 计数、模型迁移。

在以下情况下使用此提示词片段：
- 编写通过 `anthropic` Ruby gem 调用 Claude API 的代码
- 理解消息参数（`system`、`messages`、`tools`、`max_tokens`、`temperature`、`stream` 等）
- 使用 MCP（Model Context Protocol）服务器、工具或智能体
- 实现 prompt 缓存以减少延迟和成本
- 进行 token 计数和计费计算
- 从旧模型迁移到新的 Claude 模型
- 排除 API 错误、流式传输问题或工具使用问题

---

## 设置与认证

```ruby
require "anthropic"

client = Anthropic::Client.new(
  # 默认为 ENV["ANTHROPIC_API_KEY"]
  # api_key: "my-api-key",
)
```

---

## 消息 API

### 基本请求

```ruby
require "anthropic"

client = Anthropic::Client.new

response = client.messages.create(
  model: "claude-sonnet-4-6",
  max_tokens: 1000,
  temperature: 0.5,
  system: "你是一个乐于助人的助手。",  # 可选；也可以是字符串数组
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "你好，Claude！"
        }
      ]
    }
  ]
)

puts response.content
```

`system` 参数可以是：
- 单个字符串：`system: "你是一个乐于助人的助手。"`
- 字符串数组：`system: ["第一条指令", "第二条指令"]`

### 流式传输

```ruby
require "anthropic"

client = Anthropic::Client.new

client.messages.stream(
  model: "claude-sonnet-4-6",
  max_tokens: 1000,
  messages: [{ role: "user", content: "你好，Claude！" }]
) do |event|
  case event
  when Anthropic::Messages::StreamContentBlockDelta
    print event.delta.text
  when Anthropic::Messages::StreamMessageStop
    final_message = event.message
  end
end
```

### 扩展思考（Extended Thinking）

```ruby
require "anthropic"

client = Anthropic::Client.new

response = client.messages.create(
  model: "claude-sonnet-4-6",
  max_tokens: 20000,
  thinking: {
    type: "enabled",
    budget_tokens: 16000
  },
  messages: [{ role: "user", content: "用数学方法解释量子纠缠。" }]
)
```

流式扩展思考：使用 `stream` 方法，通过 `thinking` 和 `text` delta 事件迭代块。

---

## 消息参数参考

| 参数 | 类型 | 必需 | 描述 |
|---|---|---|---|
| `model` | `String` | 是 | 要使用的 Claude 模型 |
| `max_tokens` | `Integer` | 是 | 生成的最大 token 数 |
| `messages` | `Array<Hash>` | 是 | 对话消息列表 |
| `system` | `String` 或 `Array<String>` | 否 | 系统提示词 |
| `temperature` | `Float` | 否 | 采样温度（0-1），默认 1.0 |
| `tools` | `Array<Hash>` | 否 | 工具定义列表 |
| `tool_choice` | `Hash` | 否 | 工具选择策略 |
| `stop_sequences` | `Array<String>` | 否 | 自定义停止序列 |
| `stream` | `Boolean` | 否 | 启用流式传输 |
| `thinking` | `Hash` | 否 | 扩展思考配置 |
| `metadata` | `Hash` | 否 | 用户标识等元数据 |
| `top_p` | `Float` | 否 | Nucleus 采样 |
| `top_k` | `Integer` | 否 | 仅从 top K 个选项中采样 |

---

## 内容块

消息内容由内容块列表组成：

```ruby
# 文本块
{ type: "text", text: "你好，Claude！" }

# 图片块（base64）
{
  type: "image",
  source: {
    type: "base64",
    media_type: "image/jpeg",
    data: "base64-encoded-data"
  }
}

# 工具使用块（来自助手响应）
{
  type: "tool_use",
  id: "toolu_01A09q90...",
  name: "get_weather",
  input: { location: "San Francisco, CA" }
}

# 工具结果块（用户发送回）
{
  type: "tool_result",
  tool_use_id: "toolu_01A09q90...",
  content: "阳光明媚，72°F。"
}

# 思考块（扩展思考模式）
{
  type: "thinking",
  thinking: "让我逐步推理...",
  signature: "签名数据..."
}

# 红帽思考块（扩展思考中的安全筛选）
{
  type: "redacted_thinking",
  data: "已编辑数据..."
}
```

---

## 工具使用（函数调用）

### 定义工具

```ruby
tools = [
  {
    name: "get_weather",
    description: "获取指定位置的当前天气",
    input_schema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "城市和州，例如 San Francisco, CA"
        }
      },
      required: ["location"]
    }
  }
]
```

### 使用 `tool_choice` 控制工具

```ruby
# 自动（默认）：模型决定是否使用工具
tool_choice = { type: "auto" }

# 任意：强制使用任意工具
tool_choice = { type: "any" }

# 工具：强制使用特定工具
tool_choice = { type: "tool", name: "get_weather" }
```

### 处理工具使用循环

```ruby
require "anthropic"

client = Anthropic::Client.new

messages = [{ role: "user", content: "旧金山的天气怎么样？" }]

loop do
  response = client.messages.create(
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    tools: tools,
    messages: messages
  )

  # 将助手响应追加到消息中
  messages << { role: "assistant", content: response.content }

  # 检查是否有工具调用
  tool_uses = response.content.select { |block| block["type"] == "tool_use" }
  break if tool_uses.empty?

  # 执行每个工具调用
  tool_result_blocks = tool_uses.map do |tool_use|
    # 在这里执行你的工具逻辑
    result = execute_tool(tool_use["name"], tool_use["input"])
    {
      type: "tool_result",
      tool_use_id: tool_use["id"],
      content: result.to_s
    }
  end

  # 将工具结果追加为新的用户消息
  messages << { role: "user", content: tool_result_blocks }
end
```

### 并行工具调用

当启用时（默认对于支持模型），Claude 可能会在单个响应中返回多个工具调用块。对于不支持并行工具调用的模型，将 `disable_parallel_tool_use` 设置为 `true`：

```ruby
response = client.messages.create(
  model: "claude-sonnet-4-6",
  max_tokens: 1000,
  tools: tools,
  messages: messages
)
# response.content 可能包含多个 tool_use 块
```

### 计算机使用工具（Computer Use）

计算机使用工具使用特殊的 `computer_20250124`、`text_editor_20250124` 和 `bash_20250124` 工具类型。参考文档[^1]了解实现详情。

---

## MCP（Model Context Protocol）

```ruby
# Ruby MCP 支持可通过社区 gem 获得，例如：
# https://github.com/anthropics/mcp-ruby
```

---

## 智能体 SDK（Agents SDK）

`anthropic` gem 包含一个用于构建智能体的 `Agents` 命名空间。

### 基本智能体

```ruby
require "anthropic"

client = Anthropic::Client.new

agent = Anthropic::Agents::Agent.new(
  client: client,
  model: "claude-sonnet-4-6",
  tools: [my_tool],
  system_prompt: "你是一个乐于助人的助手。"
)

result = agent.run("你的提示词")
puts result.final_message
```

### 子智能体（Sub-Agents）

使用 `handoff` 委托给专门的子智能体：

```ruby
weather_agent = Anthropic::Agents::Agent.new(
  client: client,
  model: "claude-sonnet-4-6",
  tools: [get_weather],
  system_prompt: "你是一名天气专家。"
)

main_agent = Anthropic::Agents::Agent.new(
  client: client,
  model: "claude-sonnet-4-6",
  tools: [Anthropic::Agents.handoff(weather_agent, name: "weather_expert")],
  system_prompt: "你是一个主智能体。委托天气查询给天气专家。"
)
```

---

## 提示缓存（Prompt Caching）

缓存系统提示词和长消息以降低成本（缓存读取便宜 90%）和延迟。

```ruby
require "anthropic"

client = Anthropic::Client.new

response = client.messages.create(
  model: "claude-sonnet-4-6",
  max_tokens: 1000,
  system: [
    {
      type: "text",
      text: "你是一个乐于助人的助手。",
      cache_control: { type: "ephemeral" }  # 标记用于缓存
    }
  ],
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "这里是一段非常长的上下文...",
          cache_control: { type: "ephemeral" }  # 标记用于缓存
        },
        {
          type: "text",
          text: "我的实际问题是..."
        }
      ]
    }
  ]
)

# 检查缓存使用情况
puts response.usage.cache_creation_input_tokens
puts response.usage.cache_read_input_tokens
```

缓存断点只能放在单个内容块的边界处。每个缓存断点标记内容中该点之前的所有内容以供缓存。

每个缓存断点最少需要：
- 1024 个 token（除 Opus 外的所有模型）
- 2048 个 token（Claude Opus 模型）

最大缓存断点数：每个请求 4 个。

---

## Token 计数

在发出 API 请求之前，使用 `client.messages.count_tokens()` 计算 token 数量：

```ruby
require "anthropic"

client = Anthropic::Client.new

token_count = client.messages.count_tokens(
  model: "claude-sonnet-4-6",
  system: "你是一个乐于助人的助手。",
  messages: [{ role: "user", content: "你好，Claude！" }],
  tools: tools
)

puts "输入 token 数：#{token_count.input_tokens}"
```

---

## 模型 ID 与定价

| 模型 ID | 描述 | 输入价格 / MTok | 输出价格 / MTok | 缓存写入 / MTok | 缓存读取 / MTok |
|---|---|---|---|---|---|
| `claude-fable-5` | Fable 5 — 前沿智能 | $15.00 | $75.00 | $30.00 | $3.00 |
| `claude-opus-4-8` | Opus 4.8 — 强大的推理能力 | $15.00 | $75.00 | $30.00 | $3.00 |
| `claude-sonnet-4-6` | Sonnet 4.6 — 均衡的智能 | $3.00 | $15.00 | $6.00 | $0.60 |
| `claude-haiku-4-5` | Haiku 4.5 — 最快的模型 | $0.80 | $4.00 | $1.60 | $0.08 |

---

## 错误处理

### 常见异常

```ruby
begin
  response = client.messages.create(
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: "你好！" }]
  )
rescue Anthropic::APIError => e
  # 所有 Anthropic 错误的基类
  puts "API 错误：#{e}"
rescue Anthropic::APIConnectionError => e
  # 无法连接到 API
  puts "连接错误：#{e}"
rescue Anthropic::RateLimitError => e
  # 429 状态码 — 等待后重试
  puts "速率限制：#{e}"
rescue Anthropic::APIStatusError => e
  # 非 200 范围的状态码（如 4xx, 5xx）
  puts "状态码 #{e.status_code}：#{e}"
end
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

```ruby
require "anthropic"

client = Anthropic::Client.new

# 提交批量任务
batch = client.messages.batches.create(
  requests: [
    {
      custom_id: "my-custom-id-1",
      params: {
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: "你好！" }]
      }
    }
  ]
)

puts "批量 ID：#{batch.id}"

# 检索结果
results = client.messages.batches.results(batch.id)
results.each do |result|
  puts result.result.message.content
end
```

---

## 速率限制与重试

```ruby
require "anthropic"

client = Anthropic::Client.new(max_retries: 3)  # 自动重试

# 或者实现你自己的重试逻辑
max_retries = 5
max_retries.times do |attempt|
  begin
    response = client.messages.create(
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: "你好！" }]
    )
    break
  rescue Anthropic::RateLimitError
    if attempt < max_retries - 1
      wait_time = 2 ** attempt  # 指数退避
      sleep(wait_time)
    else
      raise
    end
  end
end
```

---

## 其他资源

- [Anthropic API 文档](https://docs.anthropic.com/en/api)
- [Ruby SDK 源代码](https://github.com/anthropics/anthropic-sdk-ruby)
- [MCP 文档](https://docs.anthropic.com/en/docs/agents-and-tools/mcp)
- [提示缓存指南](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [扩展思考指南](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- [模型比较](https://docs.anthropic.com/en/docs/about-claude/models)

[^1]: [计算机使用参考实现](https://docs.anthropic.com/en/docs/agents-and-tools/computer-use): 官方 Anthropic 计算机使用文档和实现指南
