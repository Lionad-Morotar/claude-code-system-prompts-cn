<!--
name: 'Data: Tool use reference — PHP'
description: PHP 工具使用参考，包括 beta 工具运行器和使用 camelCase 键的手动 agentic 循环
ccVersion: 2.1.182
-->
# 工具使用 — PHP

概念概览（工具定义、工具选择、技巧）请参阅 [shared/tool-use-concepts.md](../../shared/tool-use-concepts.md)。

## 工具使用

### Tool Runner（Beta）

**Beta：** PHP SDK 通过 `$client->beta->messages->toolRunner()` 提供工具运行器。使用 `BetaRunnableTool` 定义工具——一个定义数组加上一个 `run` 闭包：

```php
use Anthropic\Lib\Tools\BetaRunnableTool;

$weatherTool = new BetaRunnableTool(
    definition: [
        'name' => 'get_weather',
        'description' => 'Get the current weather for a location.',
        'inputSchema' => [
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
    model: '{{OPUS_ID}}',
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

工具以数组形式传递。**SDK 使用 camelCase 键名**（`inputSchema`、`toolUseID`、`stopReason`），并自动映射为 API 传输层使用的 snake_case——自 v0.5.0 起生效。关于循环模式，请参阅 [shared tool use concepts](../../shared/tool-use-concepts.md)。

```php
use Anthropic\Messages\ToolUseBlock;

$tools = [
    [
        'name' => 'get_weather',
        'description' => 'Get the current weather in a given location',
        'inputSchema' => [  // camelCase，而非 input_schema
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
                'toolUseID' => $block->id,  // camelCase，而非 tool_use_id
                'content' => $result,
            ];
        }
    }

    // 追加 assistant 回合 + 带有工具结果的 user 回合
    $messages[] = ['role' => 'assistant', 'content' => $response->content];
    $messages[] = ['role' => 'user', 'content' => $toolResults];

    $response = $client->messages->create(
        model: '{{OPUS_ID}}',
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

`$block->type === 'tool_use'` 同样有效；`instanceof ToolUseBlock` 可为 PHPStan 提供类型窄化。


---

## 结构化输出

### 使用 StructuredOutputModel（推荐）

定义一个实现 `StructuredOutputModel` 的 PHP 类，并将其作为 `outputConfig` 传入：

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
    model: '{{OPUS_ID}}',
    maxTokens: 16000,
    messages: [['role' => 'user', 'content' => 'Generate a profile for Alice, age 30']],
    outputConfig: ['format' => Person::class],
);

$person = $message->parsedOutput();  // Person 实例
echo $person->name;
```

类型从 PHP 类型提示中推断。使用 `#[Constrained(description: '...')]` 添加描述。可为 null 的属性（`?string`）成为可选字段。

### 原始 Schema

```php
$message = $client->messages->create(
    model: '{{OPUS_ID}}',
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

// 第一个文本块包含合法的 JSON
foreach ($message->content as $block) {
    if ($block->type === 'text') {
        $data = json_decode($block->text, true);
        break;
    }
}
```

---

## Beta 功能与 Anthropic 定义的工具

**`betas:` 不是 `$client->messages->create()` 的参数**——它仅存在于 beta 命名空间中。当功能需要显式 opt-in 头时使用：

```php
use Anthropic\Beta\Messages\BetaRequestMCPServerURLDefinition;

$response = $client->beta->messages->create(
    model: '{{OPUS_ID}}',
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

### 任务预算

```php
$response = $client->beta->messages->create(
    model: '{{OPUS_ID}}',
    maxTokens: 16000,
    outputConfig: ['taskBudget' => ['type' => 'tokens', 'total' => 64000]],
    tools: [...],
    messages: [...],
    betas: ['task-budgets-2026-03-13'],
);
```

### 缓存诊断

将前一次响应的 `id` 传递给下一次请求；在响应上打印 `diagnostics` 对象：

```php
$r2 = $client->beta->messages->create(
    model: '{{OPUS_ID}}', maxTokens: 1024,
    diagnostics: ['previousMessageId' => $r1->id],
    betas: ['cache-diagnosis-2026-04-07'],
    messages: [...],
);
```

**Anthropic 定义的工具**（bash、web_search、text_editor、code_execution）为 GA 状态，两种路径均可使用。其中 web_search 和 code_execution 由服务端执行；bash 和 text_editor 由客户端执行（你在本地处理 `tool_use`）——非 beta 路径使用 `Anthropic\Messages\ToolBash20250124` / `WebSearchTool20260209` / `ToolTextEditor20250728` / `CodeExecutionTool20260120`，beta 路径使用 `Anthropic\Beta\Messages\BetaToolBash20250124` / `BetaWebSearchTool20260209` / `BetaToolTextEditor20250728` / `BetaCodeExecutionTool20260120`。这些工具不需要 `betas:` 头。

### 工具搜索（非 beta，服务端执行）

```php
tools: [
    ['type' => 'tool_search_tool_regex_20251119', 'name' => 'tool_search_tool_regex'],
    ['name' => 'get_weather', 'description' => '...', 'inputSchema' => [...], 'deferLoading' => true],
    // ... 其他用户工具，设置 'deferLoading' => true
],
```

### Memory 工具（非 beta，客户端执行）

声明 `['type' => 'memory_20250818', 'name' => 'memory']`。通过读取/写入固定 `/memories` 目录下的文件来处理 `tool_use`。**验证每个模型提供的路径**：解析为其规范形式并确认它仍在 memory 目录内；拒绝目录穿越（`..`、符号链接）——参见 `shared/tool-use-concepts.md` 中"客户端工具"一节。
