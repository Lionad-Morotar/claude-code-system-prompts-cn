<!--
name: 'Data: Managed Agents reference — PHP'
description: 使用 Anthropic PHP SDK 创建和管理代理、环境和会话的参考指南
ccVersion: 2.1.203
-->
# Managed Agents — PHP

> **此处未展示的绑定：** 本 README 涵盖了 PHP 最常见的 managed-agents 流程。如果你需要未展示的类、方法、命名空间、字段或行为，请 WebFetch PHP SDK 仓库 **或 `shared/live-sources.md` 中的相关文档页面**，而不是猜测。不要从 cURL 形态或其他语言的 SDK 推断。

> **代理是持久化的 — 创建一次，通过 ID 引用。** 存储 `$client->beta->agents->create` 返回的代理 ID，并将其传递给每个后续的 `->sessions->create`；不要在请求路径中调用 `agents->create`。Anthropic CLI 是从版本控制 YAML 创建代理和环境的便捷方式之一 — 其 URL 在 `shared/live-sources.md` 中。以下示例展示了代码内创建以保证完整性；在生产环境中，创建调用属于设置阶段，而非请求路径。

## 安装

```bash
composer require "anthropic-ai/sdk" "guzzlehttp/guzzle:^7"
```

## 客户端初始化

```php
use Anthropic\Client;

// Default (uses ANTHROPIC_API_KEY env var)
$client = new Client();

// Explicit API key
$client = new Client(apiKey: 'your-api-key');
```

---

## 创建环境

```php
$environment = $client->beta->environments->create(
    name: 'my-dev-env',
    config: ['type' => 'cloud', 'networking' => ['type' => 'unrestricted']],
);
echo "Environment ID: {$environment->id}\
"; // env_...
```

---

## 创建代理（必需的第一步）

> ⚠️ **没有内联代理配置。** `model`/`system`/`tools` 位于代理对象上，而非会话上。始终以 `$client->beta->agents->create()` 开始 — 会话接受 `agent: $agent->id` 或类型化的 `BetaManagedAgentsAgentParams::with(type: 'agent', id: $agent->id, version: $agent->version)`。

### 最小示例

```php
use Anthropic\Beta\Agents\BetaManagedAgentsAgentToolset20260401Params;

// 1. Create the agent (reusable, versioned)
$agent = $client->beta->agents->create(
    name: 'Coding Assistant',
    model: '{{OPUS_ID}}',
    system: 'You are a helpful coding assistant.',
    tools: [
        BetaManagedAgentsAgentToolset20260401Params::with(
            type: 'agent_toolset_20260401',
        ),
    ],
);

// 2. Start a session
$session = $client->beta->sessions->create(
    agent: ['type' => 'agent', 'id' => $agent->id, 'version' => $agent->version],
    environmentID: $environment->id,
    title: 'Quickstart session',
);
echo "Session ID: {$session->id}\
";
echo "Trace: https://platform.claude.com/workspaces/default/sessions/{$session->id}\
";
```

### 更新代理

更新会创建新版本；代理对象在每个版本中是不可变的。

```php
$updatedAgent = $client->beta->agents->update(
    $agent->id,
    version: $agent->version,
    system: 'You are a helpful coding agent. Always write tests.',
);
echo "New version: {$updatedAgent->version}\
";

// List all versions
foreach ($client->beta->agents->versions->list($agent->id)->pagingEachItem() as $version) {
    echo "Version {$version->version}: {$version->updatedAt->format(DateTimeInterface::ATOM)}\
";
}

// Archive the agent
$archived = $client->beta->agents->archive($agent->id);
echo "Archived at: {$archived->archivedAt->format(DateTimeInterface::ATOM)}\
";
```

---

## 发送用户消息

```php
$client->beta->sessions->events->send(
    $session->id,
    events: [
        [
            'type' => 'user.message',
            'content' => [['type' => 'text', 'text' => 'Review the auth module']],
        ],
    ],
);
```

> 💡 **流优先：** 在发送消息*之前*（或同时）打开流。流只传递打开后发生的事件 — 发送后再打开流意味着早期事件会作为一个批次缓冲到达。参见[引导模式](../../shared/managed-agents-events.md#steering-patterns)。

---

## 流式事件（SSE）

> ℹ️ **流传输器：** PHP 默认的缓冲 PSR-18 客户端永远不会为开放式会话事件流返回。对 `streamStream()` 调用使用流式 Guzzle 传输器 — 其他调用保留默认客户端。

```php
$streamingClient = new GuzzleHttp\Client(['stream' => true]);

// Open the stream first, then send the user message
$stream = $client->beta->sessions->events->streamStream(
    $session->id,
    requestOptions: ['transporter' => $streamingClient],
);
$client->beta->sessions->events->send(
    $session->id,
    events: [
        [
            'type' => 'user.message',
            'content' => [['type' => 'text', 'text' => 'Summarize the repo README']],
        ],
    ],
);

foreach ($stream as $event) {
    match ($event->type) {
        'agent.message' => array_walk(
            $event->content,
            static fn($block) => $block->type === 'text' ? print($block->text) : null,
        ),
        'agent.tool_use' => print("\
[Using tool: {$event->name}]\
"),
        'session.error' => printf("\
[Error: %s]", $event->error?->message ?? 'unknown'),
        default => null,
    };
    if ($event->type === 'session.status_idle' || $event->type === 'session.error') {
        break;
    }
}
$stream->close();
```

### 重连和追踪

当在会话中途重连时，先列出过去的事件以去重，然后追踪实时事件：

```php
$stream = $client->beta->sessions->events->streamStream(
    $session->id,
    requestOptions: ['transporter' => $streamingClient],
);

// Stream is open and buffering. List history before tailing live.
$seenEventIds = [];
foreach ($client->beta->sessions->events->list($session->id)->pagingEachItem() as $event) {
    $seenEventIds[$event->id] = true;
}

// Tail live events, skipping anything already seen
foreach ($stream as $event) {
    if (isset($seenEventIds[$event->id])) {
        continue;
    }
    $seenEventIds[$event->id] = true;
    match ($event->type) {
        'agent.message' => array_walk(
            $event->content,
            static fn($block) => $block->type === 'text' ? print($block->text) : null,
        ),
        default => null,
    };
    if ($event->type === 'session.status_idle') {
        break;
    }
}
$stream->close();
```

---

## 提供自定义工具结果

> ℹ️ PHP 的 `user.custom_tool_result` managed-agents 绑定尚未在本技能或应用源代码示例中记录。请参阅 `shared/managed-agents-events.md` 了解线路格式，以及 `anthropic-ai/sdk` PHP 仓库了解相应的参数。

---

## 轮询事件

```php
foreach ($client->beta->sessions->events->list($session->id)->pagingEachItem() as $event) {
    echo "{$event->type}: {$event->id}\
";
}
```

---

## 上传文件

> ℹ️ **PHP 文件上传：** PHP SDK 的 beta managed-agents 文件上传绑定未在应用源代码示例中展示；规范的 PHP 示例使用原始 cURL 对 `POST /v1/files`。如果你的代码库更倾向于 SDK，请在编写代码前 WebFetch `anthropic-ai/sdk` PHP 仓库获取最新绑定。

```php
use Anthropic\Beta\Sessions\BetaManagedAgentsFileResourceParams;

// Raw cURL upload (canonical example from the apps source)
$csvPath = 'data.csv';
$ch = curl_init('https://api.anthropic.com/v1/files');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'x-api-key: ' . getenv('ANTHROPIC_API_KEY'),
        'anthropic-version: 2023-06-01',
        'anthropic-beta: files-api-2025-04-14',
    ],
    CURLOPT_POSTFIELDS => ['file' => new CURLFile($csvPath, 'text/csv', 'data.csv')],
]);
$file = json_decode(curl_exec($ch));
echo "File ID: {$file->id}\
";

// Mount in a session
$session = $client->beta->sessions->create(
    agent: $agent->id,
    environmentID: $environment->id,
    resources: [
        BetaManagedAgentsFileResourceParams::with(
            type: 'file',
            fileID: $file->id,
            mountPath: '/workspace/data.csv',
        ),
    ],
);
```

### 在现有会话上添加和管理资源

```php
// Attach an additional file to an open session
$resource = $client->beta->sessions->resources->add(
    $session->id,
    type: 'file',
    fileID: $file->id,
);
echo "{$resource->id}\
"; // "sesrsc_01ABC..."

// List resources on the session
$listed = $client->beta->sessions->resources->list($session->id);
foreach ($listed->data as $entry) {
    echo "{$entry->id} {$entry->type}\
";
}

// Detach a resource
$client->beta->sessions->resources->delete($resource->id, sessionID: $session->id);
```

---

## 列出和下载会话文件

```php
$files = $client->beta->files->list(
    scopeID: 'sesn_abc123',
    betas: ['managed-agents-2026-04-01'],
);
$content = $client->beta->files->download($files->data[0]->id);
file_put_contents('output.txt', $content);
```

---

## 会话管理

```php
// List environments
$environments = $client->beta->environments->list();

// Retrieve a specific environment
$env = $client->beta->environments->retrieve($environment->id);

// Archive an environment (read-only, existing sessions continue)
$client->beta->environments->archive($environment->id);

// Delete an environment (only if no sessions reference it)
$client->beta->environments->delete($environment->id);

// Delete a session
$client->beta->sessions->delete($session->id);
```

---

## MCP 服务器集成

```php
use Anthropic\Beta\Agents\BetaManagedAgentsAgentToolset20260401Params;
use Anthropic\Beta\Agents\BetaManagedAgentsMCPToolsetParams;
use Anthropic\Beta\Agents\BetaManagedAgentsURLMCPServerParams;
use Anthropic\Beta\Sessions\BetaManagedAgentsAgentParams;

// Agent declares MCP server (no auth here — auth goes in a vault)
$agent = $client->beta->agents->create(
    name: 'GitHub Assistant',
    model: '{{OPUS_ID}}',
    mcpServers: [
        BetaManagedAgentsURLMCPServerParams::with(
            type: 'url',
            name: 'github',
            url: 'https://api.githubcopilot.com/mcp/',
        ),
    ],
    tools: [
        BetaManagedAgentsAgentToolset20260401Params::with(type: 'agent_toolset_20260401'),
        BetaManagedAgentsMCPToolsetParams::with(
            type: 'mcp_toolset',
            mcpServerName: 'github',
        ),
    ],
);

// Session attaches vault(s) containing credentials for those MCP server URLs
$session = $client->beta->sessions->create(
    agent: BetaManagedAgentsAgentParams::with(
        type: 'agent',
        id: $agent->id,
        version: $agent->version,
    ),
    environmentID: $environment->id,
    vaultIDs: [$vault->id],
);
```

参见 `shared/managed-agents-tools.md` §Vaults 以了解创建保管库和添加凭据。

---

## 保管库

```php
// Create a vault
$vault = $client->beta->vaults->create(
    displayName: 'Alice',
    metadata: ['external_user_id' => 'usr_abc123'],
);
echo $vault->id . "\
"; // "vlt_01ABC..."

// Add an OAuth credential
$credential = $client->beta->vaults->credentials->create(
    vaultID: $vault->id,
    displayName: "Alice's Slack",
    auth: [
        'type' => 'mcp_oauth',
        'mcp_server_url' => 'https://mcp.slack.com/mcp',
        'access_token' => 'xoxp-...',
        'expires_at' => '2026-04-15T00:00:00Z',
        'refresh' => [
            'token_endpoint' => 'https://slack.com/api/oauth.v2.access',
            'client_id' => '1234567890.0987654321',
            'scope' => 'channels:read chat:write',
            'refresh_token' => 'xoxe-1-...',
            'token_endpoint_auth' => [
                'type' => 'client_secret_post',
                'client_secret' => 'abc123...',
            ],
        ],
    ],
);

// Rotate the credential (e.g., after a token refresh)
$client->beta->vaults->credentials->update(
    $credential->id,
    vaultID: $vault->id,
    auth: [
        'type' => 'mcp_oauth',
        'access_token' => 'xoxp-new-...',
        'expires_at' => '2026-05-15T00:00:00Z',
        'refresh' => ['refresh_token' => 'xoxe-1-new-...'],
    ],
);

// Archive a vault
$client->beta->vaults->archive($vault->id);
```

---

## GitHub 仓库集成

将 GitHub 仓库作为会话资源挂载（保管库持有 GitHub MCP 凭据）：

```php
$session = $client->beta->sessions->create(
    agent: $agent->id,
    environmentID: $environment->id,
    vaultIDs: [$vault->id],
    resources: [
        [
            'type' => 'github_repository',
            'url' => 'https://github.com/org/repo',
            'mount_path' => '/workspace/repo',
            'authorization_token' => 'ghp_your_github_token',
        ],
    ],
);
```

同一会话上的多个仓库：

```php
$resources = [
    [
        'type' => 'github_repository',
        'url' => 'https://github.com/org/frontend',
        'mount_path' => '/workspace/frontend',
        'authorization_token' => 'ghp_your_github_token',
    ],
    [
        'type' => 'github_repository',
        'url' => 'https://github.com/org/backend',
        'mount_path' => '/workspace/backend',
        'authorization_token' => 'ghp_your_github_token',
    ],
];
```

轮换仓库的授权令牌：

```php
$listed = $client->beta->sessions->resources->list($session->id);
$repoResourceId = $listed->data[0]->id;

$client->beta->sessions->resources->update(
    $repoResourceId,
    sessionID: $session->id,
    authorizationToken: 'ghp_your_new_github_token',
);
```
<!--
name: 'Data: Managed Agents reference — PHP'
description: Reference guide for using the Anthropic PHP SDK to create and manage agents, environments, and sessions
ccVersion: 2.1.203
-->
# Managed Agents — PHP

> **Bindings not shown here:** This README covers the most common managed-agents flows for PHP. If you need a class, method, namespace, field, or behavior that isn't shown, WebFetch the PHP SDK repo **or the relevant docs page** from `shared/live-sources.md` rather than guess. Do not extrapolate from cURL shapes or another language's SDK.

> **Agents are persistent — create once, reference by ID.** Store the agent ID returned by `$client->beta->agents->create` and pass it to every subsequent `->sessions->create`; do not call `agents->create` in the request path. The Anthropic CLI is one convenient way to create agents and environments from version-controlled YAML — its URL is in `shared/live-sources.md`. The examples below show in-code creation for completeness; in production the create call belongs in setup, not in the request path.

## Installation

```bash
composer require "anthropic-ai/sdk" "guzzlehttp/guzzle:^7"
```

## Client Initialization

```php
use Anthropic\Client;

// Default (uses ANTHROPIC_API_KEY env var)
$client = new Client();

// Explicit API key
$client = new Client(apiKey: 'your-api-key');
```

---

## Create an Environment

```php
$environment = $client->beta->environments->create(
    name: 'my-dev-env',
    config: ['type' => 'cloud', 'networking' => ['type' => 'unrestricted']],
);
echo "Environment ID: {$environment->id}\
"; // env_...
```

---

## Create an Agent (required first step)

> ⚠️ **There is no inline agent config.** `model`/`system`/`tools` live on the agent object, not the session. Always start with `$client->beta->agents->create()` — the session takes either `agent: $agent->id` or the typed `BetaManagedAgentsAgentParams::with(type: 'agent', id: $agent->id, version: $agent->version)`.

### Minimal

```php
use Anthropic\Beta\Agents\BetaManagedAgentsAgentToolset20260401Params;

// 1. Create the agent (reusable, versioned)
$agent = $client->beta->agents->create(
    name: 'Coding Assistant',
    model: '{{OPUS_ID}}',
    system: 'You are a helpful coding assistant.',
    tools: [
        BetaManagedAgentsAgentToolset20260401Params::with(
            type: 'agent_toolset_20260401',
        ),
    ],
);

// 2. Start a session
$session = $client->beta->sessions->create(
    agent: ['type' => 'agent', 'id' => $agent->id, 'version' => $agent->version],
    environmentID: $environment->id,
    title: 'Quickstart session',
);
echo "Session ID: {$session->id}\
";
echo "Trace: https://platform.claude.com/workspaces/default/sessions/{$session->id}\
";
```

### Updating an Agent

Updates create new versions; the agent object is immutable per version.

```php
$updatedAgent = $client->beta->agents->update(
    $agent->id,
    version: $agent->version,
    system: 'You are a helpful coding agent. Always write tests.',
);
echo "New version: {$updatedAgent->version}\
";

// List all versions
foreach ($client->beta->agents->versions->list($agent->id)->pagingEachItem() as $version) {
    echo "Version {$version->version}: {$version->updatedAt->format(DateTimeInterface::ATOM)}\
";
}

// Archive the agent
$archived = $client->beta->agents->archive($agent->id);
echo "Archived at: {$archived->archivedAt->format(DateTimeInterface::ATOM)}\
";
```

---

## Send a User Message

```php
$client->beta->sessions->events->send(
    $session->id,
    events: [
        [
            'type' => 'user.message',
            'content' => [['type' => 'text', 'text' => 'Review the auth module']],
        ],
    ],
);
```

> 💡 **Stream-first:** Open the stream *before* (or concurrently with) sending the message. The stream only delivers events that occur after it opens — stream-after-send means early events arrive buffered in one batch. See [Steering Patterns](../../shared/managed-agents-events.md#steering-patterns).

---

## Stream Events (SSE)

> ℹ️ **Streaming transporter:** PHP's default buffered PSR-18 client never returns for the open-ended session event stream. Use a streaming Guzzle transporter for `streamStream()` calls — other calls keep the default client.

```php
$streamingClient = new GuzzleHttp\Client(['stream' => true]);

// Open the stream first, then send the user message
$stream = $client->beta->sessions->events->streamStream(
    $session->id,
    requestOptions: ['transporter' => $streamingClient],
);
$client->beta->sessions->events->send(
    $session->id,
    events: [
        [
            'type' => 'user.message',
            'content' => [['type' => 'text', 'text' => 'Summarize the repo README']],
        ],
    ],
);

foreach ($stream as $event) {
    match ($event->type) {
        'agent.message' => array_walk(
            $event->content,
            static fn($block) => $block->type === 'text' ? print($block->text) : null,
        ),
        'agent.tool_use' => print("\
[Using tool: {$event->name}]\
"),
        'session.error' => printf("\
[Error: %s]", $event->error?->message ?? 'unknown'),
        default => null,
    };
    if ($event->type === 'session.status_idle' || $event->type === 'session.error') {
        break;
    }
}
$stream->close();
```

### Reconnecting and Tailing

When reconnecting mid-session, list past events first to dedupe, then tail live events:

```php
$stream = $client->beta->sessions->events->streamStream(
    $session->id,
    requestOptions: ['transporter' => $streamingClient],
);

// Stream is open and buffering. List history before tailing live.
$seenEventIds = [];
foreach ($client->beta->sessions->events->list($session->id)->pagingEachItem() as $event) {
    $seenEventIds[$event->id] = true;
}

// Tail live events, skipping anything already seen
foreach ($stream as $event) {
    if (isset($seenEventIds[$event->id])) {
        continue;
    }
    $seenEventIds[$event->id] = true;
    match ($event->type) {
        'agent.message' => array_walk(
            $event->content,
            static fn($block) => $block->type === 'text' ? print($block->text) : null,
        ),
        default => null,
    };
    if ($event->type === 'session.status_idle') {
        break;
    }
}
$stream->close();
```

---

## Provide Custom Tool Result

> ℹ️ The PHP managed-agents bindings for `user.custom_tool_result` are not yet documented in this skill or in the apps source examples. Refer to `shared/managed-agents-events.md` for the wire format and the `anthropic-ai/sdk` PHP repository for the corresponding params.

---

## Poll Events

```php
foreach ($client->beta->sessions->events->list($session->id)->pagingEachItem() as $event) {
    echo "{$event->type}: {$event->id}\
";
}
```

---

## Upload a File

> ℹ️ **PHP file upload:** The PHP SDK's beta managed-agents file upload binding is not shown in the apps source examples; the canonical PHP example uses raw cURL against `POST /v1/files`. If your codebase prefers the SDK, WebFetch the `anthropic-ai/sdk` PHP repository for the latest binding before writing code.

```php
use Anthropic\Beta\Sessions\BetaManagedAgentsFileResourceParams;

// Raw cURL upload (canonical example from the apps source)
$csvPath = 'data.csv';
$ch = curl_init('https://api.anthropic.com/v1/files');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'x-api-key: ' . getenv('ANTHROPIC_API_KEY'),
        'anthropic-version: 2023-06-01',
        'anthropic-beta: files-api-2025-04-14',
    ],
    CURLOPT_POSTFIELDS => ['file' => new CURLFile($csvPath, 'text/csv', 'data.csv')],
]);
$file = json_decode(curl_exec($ch));
echo "File ID: {$file->id}\
";

// Mount in a session
$session = $client->beta->sessions->create(
    agent: $agent->id,
    environmentID: $environment->id,
    resources: [
        BetaManagedAgentsFileResourceParams::with(
            type: 'file',
            fileID: $file->id,
            mountPath: '/workspace/data.csv',
        ),
    ],
);
```

### Add and Manage Resources on an Existing Session

```php
// Attach an additional file to an open session
$resource = $client->beta->sessions->resources->add(
    $session->id,
    type: 'file',
    fileID: $file->id,
);
echo "{$resource->id}\
"; // "sesrsc_01ABC..."

// List resources on the session
$listed = $client->beta->sessions->resources->list($session->id);
foreach ($listed->data as $entry) {
    echo "{$entry->id} {$entry->type}\
";
}

// Detach a resource
$client->beta->sessions->resources->delete($resource->id, sessionID: $session->id);
```

---

## List and Download Session Files

```php
$files = $client->beta->files->list(
    scopeID: 'sesn_abc123',
    betas: ['managed-agents-2026-04-01'],
);
$content = $client->beta->files->download($files->data[0]->id);
file_put_contents('output.txt', $content);
```

---

## Session Management

```php
// List environments
$environments = $client->beta->environments->list();

// Retrieve a specific environment
$env = $client->beta->environments->retrieve($environment->id);

// Archive an environment (read-only, existing sessions continue)
$client->beta->environments->archive($environment->id);

// Delete an environment (only if no sessions reference it)
$client->beta->environments->delete($environment->id);

// Delete a session
$client->beta->sessions->delete($session->id);
```

---

## MCP Server Integration

```php
use Anthropic\Beta\Agents\BetaManagedAgentsAgentToolset20260401Params;
use Anthropic\Beta\Agents\BetaManagedAgentsMCPToolsetParams;
use Anthropic\Beta\Agents\BetaManagedAgentsURLMCPServerParams;
use Anthropic\Beta\Sessions\BetaManagedAgentsAgentParams;

// Agent declares MCP server (no auth here — auth goes in a vault)
$agent = $client->beta->agents->create(
    name: 'GitHub Assistant',
    model: '{{OPUS_ID}}',
    mcpServers: [
        BetaManagedAgentsURLMCPServerParams::with(
            type: 'url',
            name: 'github',
            url: 'https://api.githubcopilot.com/mcp/',
        ),
    ],
    tools: [
        BetaManagedAgentsAgentToolset20260401Params::with(type: 'agent_toolset_20260401'),
        BetaManagedAgentsMCPToolsetParams::with(
            type: 'mcp_toolset',
            mcpServerName: 'github',
        ),
    ],
);

// Session attaches vault(s) containing credentials for those MCP server URLs
$session = $client->beta->sessions->create(
    agent: BetaManagedAgentsAgentParams::with(
        type: 'agent',
        id: $agent->id,
        version: $agent->version,
    ),
    environmentID: $environment->id,
    vaultIDs: [$vault->id],
);
```

See `shared/managed-agents-tools.md` §Vaults for creating vaults and adding credentials.

---

## Vaults

```php
// Create a vault
$vault = $client->beta->vaults->create(
    displayName: 'Alice',
    metadata: ['external_user_id' => 'usr_abc123'],
);
echo $vault->id . "\
"; // "vlt_01ABC..."

// Add an OAuth credential
$credential = $client->beta->vaults->credentials->create(
    vaultID: $vault->id,
    displayName: "Alice's Slack",
    auth: [
        'type' => 'mcp_oauth',
        'mcp_server_url' => 'https://mcp.slack.com/mcp',
        'access_token' => 'xoxp-...',
        'expires_at' => '2026-04-15T00:00:00Z',
        'refresh' => [
            'token_endpoint' => 'https://slack.com/api/oauth.v2.access',
            'client_id' => '1234567890.0987654321',
            'scope' => 'channels:read chat:write',
            'refresh_token' => 'xoxe-1-...',
            'token_endpoint_auth' => [
                'type' => 'client_secret_post',
                'client_secret' => 'abc123...',
            ],
        ],
    ],
);

// Rotate the credential (e.g., after a token refresh)
$client->beta->vaults->credentials->update(
    $credential->id,
    vaultID: $vault->id,
    auth: [
        'type' => 'mcp_oauth',
        'access_token' => 'xoxp-new-...',
        'expires_at' => '2026-05-15T00:00:00Z',
        'refresh' => ['refresh_token' => 'xoxe-1-new-...'],
    ],
);

// Archive a vault
$client->beta->vaults->archive($vault->id);
```

---

## GitHub Repository Integration

Mount a GitHub repository as a session resource (a vault holds the GitHub MCP credential):

```php
$session = $client->beta->sessions->create(
    agent: $agent->id,
    environmentID: $environment->id,
    vaultIDs: [$vault->id],
    resources: [
        [
            'type' => 'github_repository',
            'url' => 'https://github.com/org/repo',
            'mount_path' => '/workspace/repo',
            'authorization_token' => 'ghp_your_github_token',
        ],
    ],
);
```

Multiple repositories on the same session:

```php
$resources = [
    [
        'type' => 'github_repository',
        'url' => 'https://github.com/org/frontend',
        'mount_path' => '/workspace/frontend',
        'authorization_token' => 'ghp_your_github_token',
    ],
    [
        'type' => 'github_repository',
        'url' => 'https://github.com/org/backend',
        'mount_path' => '/workspace/backend',
        'authorization_token' => 'ghp_your_github_token',
    ],
];
```

Rotating a repository's authorization token:

```php
$listed = $client->beta->sessions->resources->list($session->id);
$repoResourceId = $listed->data[0]->id;

$client->beta->sessions->resources->update(
    $repoResourceId,
    sessionID: $session->id,
    authorizationToken: 'ghp_your_new_github_token',
);
```
