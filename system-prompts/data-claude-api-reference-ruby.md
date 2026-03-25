<!--
name: 'Data: Claude API reference — Ruby'
description: Ruby SDK reference including installation, client initialization, basic requests, streaming, and beta tool runner
ccVersion: 2.1.78
-->
# Claude API — Ruby

> **注意：** Ruby SDK 支持 Claude API。工具运行器（tool runner）可通过 `client.beta.messages.tool_runner()` 以 Beta 形式使用。Agent SDK 尚未支持 Ruby。

## 安装

```bash
gem install anthropic
```

## 客户端初始化

```ruby
require "anthropic"

# 默认方式（使用 ANTHROPIC_API_KEY 环境变量）
client = Anthropic::Client.new

# 显式指定 API 密钥
client = Anthropic::Client.new(api_key: "your-api-key")
```

---

## 基础消息请求

```ruby
message = client.messages.create(
  model: :"{{OPUS_ID}}",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "What is the capital of France?" }
  ]
)
# content 是多态块对象的数组（TextBlock、ThinkingBlock、
# ToolUseBlock 等）。.type 是 Symbol 类型 —— 应与 :text 比较，而非 "text"。
# 在非 TextBlock 条目上调用 .text 会引发 NoMethodError。
message.content.each do |block|
  puts block.text if block.type == :text
end
```

---

## 流式传输

```ruby
stream = client.messages.stream(
  model: :"{{OPUS_ID}}",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Write a haiku" }]
)

stream.text.each { |text| print(text) }
```

---

## 工具使用

Ruby SDK 支持通过原始 JSON schema 定义来使用工具，同时也提供了用于自动执行工具的 Beta 版工具运行器。

### 工具运行器（Beta）

```ruby
class GetWeatherInput < Anthropic::BaseModel
  required :location, String, doc: "City and state, e.g. San Francisco, CA"
end

class GetWeather < Anthropic::BaseTool
  doc "Get the current weather for a location"

  input_schema GetWeatherInput

  def call(input)
    "The weather in #{input.location} is sunny and 72°F."
  end
end

client.beta.messages.tool_runner(
  model: :"{{OPUS_ID}}",
  max_tokens: 1024,
  tools: [GetWeather.new],
  messages: [{ role: "user", content: "What's the weather in San Francisco?" }]
).each_message do |message|
  puts message.content
end
```

### 手动循环

有关工具定义格式和智能体循环模式，请参阅[共享的工具使用概念](../shared/tool-use-concepts.md)。
