<!--
name: 'Data: Claude API reference — PHP'
description: PHP SDK 参考
ccVersion: 2.1.176
-->
# Claude API — PHP

> **注意：** PHP SDK 是 Anthropic 官方提供的 PHP SDK。通过 `$client->beta->messages->toolRunner()` 提供 beta tool runner。通过 `StructuredOutputModel` 类支持结构化输出辅助功能。不支持 Agent SDK。支持 Bedrock、Vertex AI 和 Foundry 客户端。

## 安装

```bash
composer require "anthropic-ai/sdk"
```

## 客户端初始化

```php
use Anthropic\Client;

// 使用环境变量中的 API 密钥
$client = new Client(apiKey: getenv("ANTHROPIC_API_KEY"));
```

### Amazon Bedrock

```php
use Anthropic\Bedrock;

// 构造函数是私有的——使用静态工厂方法。从环境变量读取 AWS 凭据。
$client = Bedrock\Client::fromEnvironment(region: 'us-east-1');
```

### Google Vertex AI

```php
use Anthropic\Vertex;

// 构造函数是私有的。参数名是 `location`，不是 `region`。
$client = Vertex\Client::fromEnvironment(
    location: 'us-east5',
    projectId: 'my-project-id',
);
```

### Anthropic Foundry

```php
use Anthropic\Foundry;

// 构造函数是私有的。baseUrl 或 resource 必填。
$client = Foundry\Client::withCredentials(
    authToken: getenv('ANTHROPIC_FOUNDRY_AUTH_TOKEN'),
    baseUrl: 'https://<resource>.services.ai.azure.com/anthropic',
);
```

---

## 基本消息请求

```php
$message = $client->messages->create(
    model: '${OPUS_ID}',
    maxTokens: 16000,
    messages: [
        ['role' => 'user', 'content' => 'What is the capital of France?'],
    ],
);

// content 是一个多态块数组（TextBlock、ToolUseBlock、
// ThinkingBlock）。如果不检查块类型就直接访问 content[0]->text，
// 当第一个块不是 TextBlock 时（例如启用了扩展思考且第一个块是
// ThinkingBlock）会抛出异常。始终进行守卫检查：
foreach ($message->content as $block) {
    if ($block->type === 'text') {
        echo $block->text;
    }
}
```

如果只需要第一个文本块：

```php
foreach ($message->content as $block) {
    if ($block->type === 'text') {
        echo $block->text;
        break;
    }
}
```

---

## 流式传输

> **需要 SDK v0.5.0+。** v0.4.0 及更早版本使用单个 `$params` 数组；使用命名参数调用会抛出 `Unknown named parameter $model`。升级方式：`composer require "anthropic-ai/sdk:^0.7"`

```php
use Anthropic\Messages\RawContentBlockDeltaEvent;
use Anthropic\Messages\TextDelta;

$stream = $client->messages->createStream(
    model: '${OPUS_ID}',
    maxTokens: 64000,
    messages: [
        ['role' => 'user', 'content' => 'Write a haiku'],
    ],
);

foreach ($stream as $event) {
    if ($event instanceof RawContentBlockDeltaEvent && $event->delta instanceof TextDelta) {
        echo $event->delta->text;
    }
}
```

---

## 工具使用

### Tool Runner（Beta）

**Beta：** PHP SDK 通过 `$client->beta->messages->toolRunner()` 提供 tool runner。使用 `BetaRunnableTool` 定义工具——一个定义数组加一个 `run` 闭包：

```php
use Anthropic\Lib\Tools\BetaRunnableTool;

$weatherTool = new BetaRunnableTool(
    definition: [
        'name' => 'get_weather',
        'description' => 'Get the current weather for a location.',
        'input_schema' => [
            'type' => 'object',
            'properties' => [
                'location' => ['type' => 'string', 'description' => 'City and state'],
            ],
            'required' => ['location'],
        ],
    ],
    run: function (array $input): string {
        return "The weather in {$input['location']} is sunny and 72°F.";
    },
);

$runner = $client->beta->messages->toolRunner(
    maxTokens: 16000,
    messages: [['role' => 'user', 'content' => 'What is the weather in Paris?']],
    model: '${OPUS_ID}',
    tools: [$weatherTool],
);

foreach ($runner as $message) {
    foreach ($message->content as $block) {
        if ($block->type === 'text') {
            echo $block->text;
        }
    }
}
```

### 手动循环

工具以数组形式传递。**SDK 使用 camelCase 键**（`inputSchema`、`toolUseID`、`stopReason`），并在传输时自动映射为 API 的 snake_case——自 v0.5.0 起。循环模式请参阅 [共享工具使用概念](../shared/tool-use-concepts.md)。

```php
use Anthropic\Messages\ToolUseBlock;

$tools = [
    [
        'name' => 'get_weather',
        'description' => 'Get the current weather in a given location',
        'inputSchema' => [  // camelCase，不是 input_schema
            'type' => 'object',
            'properties' => [
                'location' => ['type' => 'string', 'description' => 'City and state'],
            ],
            'required' => ['location'],
        ],
    ],
];

$messages = [['role' => 'user', 'content' => 'What is the weather in SF?']];

$response = $client->messages->create(
    model: '${OPUS_ID}',
    maxTokens: 16000,
    tools: $tools,
    messages: $messages,
);

while ($response->stopReason === 'tool_use') {  // camelCase 属性
    $toolResults = [];
    foreach ($response->content as $block) {
        if ($block instanceof ToolUseBlock) {
            // $block->name  : string               — 用于分发的工具名称
            // $block->input : array<string,mixed>  — 解析后的 JSON 输入
            // $block->id    : string               — 作为 toolUseID 回传
            $result = executeYourTool($block->name, $block->input);
            $toolResults[] = [
                'type' => 'tool_result',
                'toolUseID' => $block->id,  // camelCase，不是 tool_use_id
                'content' => $result,
            ];
        }
    }

    // 追加 assistant 轮次 + 包含工具结果的 user 轮次
    $messages[] = ['role' => 'assistant', 'content' => $response->content];
    $messages[] = ['role' => 'user', 'content' => $toolResults];

    $response = $client->messages->create(
        model: '${OPUS_ID}',
        maxTokens: 16000,
        tools: $tools,
        messages: $messages,
    );
}

// 最终文本响应
foreach ($response->content as $block) {
    if ($block->type === 'text') {
        echo $block->text;
    }
}
```

`$block->type === 'tool_use'` 也可以使用；`instanceof ToolUseBlock` 可以为 PHPStan 收窄类型。

---

## 扩展思考（Extended Thinking）

**自适应思考（Adaptive thinking）是 Claude 4.6+ 模型的推荐模式。** Claude 会动态决定何时思考以及思考多少。

```php
use Anthropic\Messages\ThinkingBlock;

$message = $client->messages->create(
    model: '${OPUS_ID}',
    maxTokens: 16000,
    thinking: ['type' => 'adaptive', 'display' => 'summarized'], // display 选择加入（opt-in）：在 Fable 5 / Mythos 5 / Opus 4.8 / 4.7 上默认为省略（空思考文本）
    messages: [
        ['role' => 'user', 'content' => 'Solve: 27 * 453'],
    ],
);

// ThinkingBlock 在 content 中位于 TextBlock 之前
foreach ($message->content as $block) {
    if ($block instanceof ThinkingBlock) {
        echo "Thinking:\n{$block->thinking}\n\n";
        // $block->signature 是一个不透明的字符串——如果需要在多轮对话中
        // 回传思考块，请原样保留
    } elseif ($block->type === 'text') {
        echo "Answer: {$block->text}\n";
    }
}
```

> **已弃用：** `['type' => 'enabled', 'budgetTokens' => N]`（固定预算扩展思考）在 Claude 4.6 上仍然可用，但已弃用。请使用上方的自适应思考。

`$block->type === 'thinking'` 也可用于检查；`instanceof` 可以为 PHPStan 收窄类型。

---

## 提示缓存（Prompt Caching）

`system:` 接受文本块数组；在最后一个块上设置 `cacheControl`。数组形状语法（camelCase 键）是惯用写法。关于放置模式和静默失效审计清单，请参阅 `shared/prompt-caching.md`。

```php
$message = $client->messages->create(
    model: '${OPUS_ID}',
    maxTokens: 16000,
    system: [
        ['type' => 'text', 'text' => $longSystemPrompt, 'cacheControl' => ['type' => 'ephemeral']],
    ],
    messages: [['role' => 'user', 'content' => 'Summarize the key points']],
);
```

设置 1 小时 TTL：`'cacheControl' => ['type' => 'ephemeral', 'ttl' => '1h']`。`messages->create(...)` 上也有顶层的 `cacheControl:`，会自动放置在最后一个可缓存的块上。

通过 `$message->usage->cacheCreationInputTokens` / `$message->usage->cacheReadInputTokens` 验证缓存命中。

---

## 结构化输出（Structured Outputs）

### 使用 StructuredOutputModel（推荐）

定义一个实现 `StructuredOutputModel` 的 PHP 类，并将其作为 `outputConfig` 传递：

```php
use Anthropic\Lib\Contracts\StructuredOutputModel;
use Anthropic\Lib\Concerns\StructuredOutputModelTrait;
use Anthropic\Lib\Attributes\Constrained;

class Person implements StructuredOutputModel
{
    use StructuredOutputModelTrait;

    #[Constrained(description: 'Full name')]
    public string $name;

    public int $age;

    public ?string $email = null;  // nullable = 可选字段
}

$message = $client->messages->create(
    model: '${OPUS_ID}',
    maxTokens: 16000,
    messages: [['role' => 'user', 'content' => 'Generate a profile for Alice, age 30']],
    outputConfig: ['format' => Person::class],
);

$person = $message->parsedOutput();  // Person 实例
echo $person->name;
```

类型从 PHP 类型提示推断。使用 `#[Constrained(description: '...')]` 添加描述。可空属性（`?string`）变为可选字段。

### 原始 Schema

```php
$message = $client->messages->create(
    model: '${OPUS_ID}',
    maxTokens: 16000,
    messages: [['role' => 'user', 'content' => 'Extract: John (john@co.com), Enterprise plan']],
    outputConfig: [
        'format' => [
            'type' => 'json_schema',
            'schema' => [
                'type' => 'object',
                'properties' => [
                    'name' => ['type' => 'string'],
                    'email' => ['type' => 'string'],
                    'plan' => ['type' => 'string'],
                ],
                'required' => ['name', 'email', 'plan'],
                'additionalProperties' => false,
            ],
        ],
    ],
);

// 第一个文本块包含有效的 JSON
foreach ($message->content as $block) {
    if ($block->type === 'text') {
        $data = json_decode($block->text, true);
        break;
    }
}
```

---

## Beta 功能与服务端工具

**`betas:` 不是 `$client->messages->create()` 的参数**——它只存在于 beta 命名空间中。对于需要显式选择加入头的功能，请使用它：

```php
use Anthropic\Beta\Messages\BetaRequestMCPServerURLDefinition;

$response = $client->beta->messages->create(
    model: '${OPUS_ID}',
    maxTokens: 16000,
    mcpServers: [
        BetaRequestMCPServerURLDefinition::with(
            name: 'my-server',
            url: 'https://example.com/mcp',
        ),
    ],
    betas: ['mcp-client-2025-11-20'],  // 仅在 ->beta->messages 上有效
    messages: [['role' => 'user', 'content' => 'Use the MCP tools']],
);
```

**服务端工具**（bash、web_search、text_editor、code_execution）是正式发布（GA）功能，两种路径均可使用——非 beta 路径使用 `Anthropic\Messages\ToolBash20250124` / `WebSearchTool20260209` / `ToolTextEditor20250728` / `CodeExecutionTool20260120`，beta 路径使用 `Anthropic\Beta\Messages\BetaToolBash20250124` / `BetaWebSearchTool20260209` / `BetaToolTextEditor20250728` / `BetaCodeExecutionTool20260120`。这些工具不需要 `betas:` 头。

---

## 停止详情（Stop Details）

当 `stopReason` 为 `'refusal'` 时，响应包含结构化的 `stopDetails`：

```php
if ($message->stopReason === 'refusal' && $message->stopDetails !== null) {
    echo "Category: " . $message->stopDetails->category . "\n";     // 例如 "cyber"、"bio"、"reasoning_extraction"、"frontier_llm" 或 null——完整集合请参阅文档
    echo "Explanation: " . $message->stopDetails->explanation . "\n";
}
```

**拒绝回退（Refusal fallbacks，${FABLE_NAME}）——默认选择加入（opt in）。** 回退是选择加入的：没有它们，被拒绝的请求会直接停止。新的 `${FABLE_ID}` 代码默认应包含服务端 `fallbacks` 参数（beta 头 `server-side-fallback-2026-06-01`，回退模型 `${OPUS_ID}`，在 beta 消息调用上设置）。具体的 PHP 绑定（以及不支持服务端回退的提供商的客户端中间件）未在此记录——请通过 `shared/live-sources.md` 的 WebFetch 获取 PHP SDK 仓库的 `examples/`；完整语义见 `shared/model-migration.md` → 迁移到 ${FABLE_NAME} → `refusal` 停止原因。

---

## 错误类型

`APIStatusException` 暴露 `->type` 属性用于程序化错误分类：

```php
try {
    $client->messages->create(...);
} catch (\Anthropic\Core\Exceptions\APIStatusException $e) {
    echo $e->type?->value;  // "rate_limit_error"、"overloaded_error" 等
}
```
