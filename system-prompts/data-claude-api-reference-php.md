<!--
name: 'Data: Claude API reference — PHP'
description: PHP SDK reference
ccVersion: 2.1.78
-->
# Claude API — PHP

> **注意：** PHP SDK 是 Anthropic 官方的 PHP SDK。工具运行器和 Agent SDK 不可用。支持 Bedrock、Vertex AI 和 Foundry 客户端。

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

// 构造函数为私有 — 使用静态工厂方法。从环境变量读取 AWS 凭证。
$client = Bedrock\Client::fromEnvironment(region: 'us-east-1');
```

### Google Vertex AI

```php
use Anthropic\Vertex;

// 构造函数为私有。参数是 `location`，而非 `region`。
$client = Vertex\Client::fromEnvironment(
    location: 'us-east5',
    projectId: 'my-project-id',
);
```

### Anthropic Foundry

```php
use Anthropic\Foundry;

// 构造函数为私有。baseUrl 或 resource 为必填项。
$client = Foundry\Client::withCredentials(
    authToken: getenv('ANTHROPIC_FOUNDRY_AUTH_TOKEN'),
    baseUrl: 'https://<resource>.services.ai.azure.com/anthropic',
);
```

---

## 基本消息请求

```php
$message = $client->messages->create(
    model: '{{OPUS_ID}}',
    maxTokens: 1024,
    messages: [
        ['role' => 'user', 'content' => 'What is the capital of France?'],
    ],
);

// content 是多态块数组（TextBlock、ToolUseBlock、
// ThinkingBlock）。在未检查块类型的情况下直接访问 content[0]->text
// 会在第一个块不是 TextBlock 时抛出异常（例如，当启用扩展思考且
// ThinkingBlock 排在第一位时）。务必进行保护：
foreach ($message->content as $block) {
    if ($block->type === 'text') {
        echo $block->text;
    }
}
```

如果你只需要第一个文本块：

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

> **需要 SDK v0.5.0+。** v0.4.0 及更早版本使用单个 `$params` 数组；使用命名参数调用会抛出 `Unknown named parameter $model`。升级：`composer require "anthropic-ai/sdk:^0.6"`

```php
use Anthropic\Messages\RawContentBlockDeltaEvent;
use Anthropic\Messages\TextDelta;

$stream = $client->messages->createStream(
    model: '{{OPUS_ID}}',
    maxTokens: 1024,
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

## 工具使用（手动循环）

工具以数组形式传递。**SDK 使用驼峰命名键**（`inputSchema`、`toolUseID`、`stopReason`）并在传输时自动映射为 API 的蛇形命名 — 自 v0.5.0 起。有关循环模式，请参阅[共享工具使用概念](../shared/tool-use-concepts.md)。

```php
use Anthropic\Messages\ToolUseBlock;

$tools = [
    [
        'name' => 'get_weather',
        'description' => 'Get the current weather in a given location',
        'inputSchema' => [  // 驼峰命名，不是 input_schema
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
    model: '{{OPUS_ID}}',
    maxTokens: 1024,
    tools: $tools,
    messages: $messages,
);

while ($response->stopReason === 'tool_use') {  // 驼峰命名属性
    $toolResults = [];
    foreach ($response->content as $block) {
        if ($block instanceof ToolUseBlock) {
            // $block->name  : string               — 用于分派的工具名称
            // $block->input : array<string,mixed>  — 解析后的 JSON 输入
            // $block->id    : string               — 传回时作为 toolUseID
            $result = executeYourTool($block->name, $block->input);
            $toolResults[] = [
                'type' => 'tool_result',
                'toolUseID' => $block->id,  // 驼峰命名，不是 tool_use_id
                'content' => $result,
            ];
        }
    }

    // 追加助手回合 + 带工具结果的用户回合
    $messages[] = ['role' => 'assistant', 'content' => $response->content];
    $messages[] = ['role' => 'user', 'content' => $toolResults];

    $response = $client->messages->create(
        model: '{{OPUS_ID}}',
        maxTokens: 1024,
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

`$block->type === 'tool_use'` 也可以工作；`instanceof ToolUseBlock` 用于 PHPStan 类型收窄。


---

## 扩展思考

**自适应思考是 Claude 4.6+ 模型推荐的模式。** Claude 动态决定何时以及思考多少。

```php
use Anthropic\Messages\ThinkingBlock;

$message = $client->messages->create(
    model: '{{OPUS_ID}}',
    maxTokens: 16000,
    thinking: ['type' => 'adaptive'],
    messages: [
        ['role' => 'user', 'content' => 'Solve: 27 * 453'],
    ],
);

// ThinkingBlock(s) 在 content 中排在 TextBlock 之前
foreach ($message->content as $block) {
    if ($block instanceof ThinkingBlock) {
        echo "Thinking:\n{$block->thinking}\n\n";
        // $block->signature 是不透明字符串 — 如果在多轮对话中
        // 传回思考块，请原样保留
    } elseif ($block->type === 'text') {
        echo "Answer: {$block->text}\n";
    }
}
```

> **已弃用：** `['type' => 'enabled', 'budgetTokens' => N]`（固定预算扩展思考）在 Claude 4.6 上仍然可用，但已弃用。请使用上面的自适应思考。

`$block->type === 'thinking'` 也可以用于检查；`instanceof` 用于 PHPStan 类型收窄。

---

## Beta 功能和服务器端工具

**`betas:` 不是 `$client->messages->create()` 的参数** — 它只存在于 beta 命名空间。用于需要显式选择加入标头的功能：

```php
use Anthropic\Beta\Messages\BetaRequestMCPServerURLDefinition;

$response = $client->beta->messages->create(
    model: '{{OPUS_ID}}',
    maxTokens: 1024,
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

**服务器端工具**（bash、web_search、text_editor、code_execution）已 GA，在两条路径上都可用 — 非 beta 使用 `Anthropic\Messages\ToolBash20250124` / `WebSearchTool20260209` / `ToolTextEditor20250728` / `CodeExecutionTool20260120`，beta 使用 `Anthropic\Beta\Messages\BetaToolBash20250124` / `BetaWebSearchTool20260209` / `BetaToolTextEditor20250728` / `BetaCodeExecutionTool20260120`。这些工具不需要 `betas:` 标头。
