<!--
name: 'Data: Managed Agents reference — TypeScript'
description: 使用 Anthropic TypeScript SDK 创建和管理代理、会话、环境、流式传输、自定义工具、文件上传和 MCP 服务器集成的参考指南
ccVersion: 2.1.203
-->
# Managed Agents — TypeScript

> **此处未展示的绑定：** 本 README 涵盖了 TypeScript 最常见的 managed-agents 流程。如果你需要未展示的类、方法、命名空间、字段或行为，请 WebFetch TypeScript SDK 仓库 **或 `shared/live-sources.md` 中的相关文档页面**，而不是猜测。不要从 cURL 形态或其他语言的 SDK 推断。

> **代理是持久化的 — 创建一次，通过 ID 引用。** 存储 `agents.create` 返回的代理 ID，并将其传递给每个后续的 `sessions.create`；不要在请求路径中调用 `agents.create`。Anthropic CLI 是从版本控制 YAML 创建代理和环境的便捷方式之一 — 其 URL 在 `shared/live-sources.md` 中。以下示例展示了代码内创建以保证完整性；在生产环境中，创建调用属于设置阶段，而非请求路径。

## 安装

```bash
npm install @anthropic-ai/sdk
```

## 客户端初始化

```typescript
import Anthropic from "@anthropic-ai/sdk";

// Default — resolves credentials from the environment:
// ANTHROPIC_API_KEY, or ANTHROPIC_AUTH_TOKEN, or an `ant auth login` profile.
// Prefer this for local dev; don't hardcode a key.
const client = new Anthropic();

// Explicit API key (only when you must inject a specific key)
const client = new Anthropic({ apiKey: "your-api-key" });
```

---

## 创建环境

```typescript
const environment = await client.beta.environments.create(
  {
    name: "my-dev-env",
    config: {
      type: "cloud",
      networking: { type: "unrestricted" },
    },
  },
);
console.log(environment.id); // env_...
```

---

## 创建代理（必需的第一步）

> ⚠️ **没有内联代理配置。** `model`/`system`/`tools` 位于代理对象上，而非会话上。始终以 `agents.create()` 开始 — 会话只接受 `agent: { type: "agent", id: agent.id }`。

### 最小示例

```typescript
// 1. Create the agent (reusable, versioned)
const agent = await client.beta.agents.create(
  {
    name: "Coding Assistant",
    model: "{{OPUS_ID}}",
    tools: [{ type: "agent_toolset_20260401", default_config: { enabled: true } }],
  },
);

// 2. Start a session
const session = await client.beta.sessions.create(
  {
    agent: { type: "agent", id: agent.id, version: agent.version },
    environment_id: environment.id,
  },
);
console.log(session.id, session.status);
console.log(`Trace: https://platform.claude.com/workspaces/default/sessions/${session.id}`);
```

### 使用系统提示词和自定义工具

```typescript
const agent = await client.beta.agents.create(
  {
    name: "Code Reviewer",
    model: "{{OPUS_ID}}",
    system: "You are a senior code reviewer.",
    tools: [
      { type: "agent_toolset_20260401", default_config: { enabled: true } },
      {
        type: "custom",
        name: "run_tests",
        description: "Run the test suite",
        input_schema: {
          type: "object",
          properties: {
            test_path: { type: "string", description: "Path to test file" },
          },
          required: ["test_path"],
        },
      },
    ],
  },
);

const session = await client.beta.sessions.create(
  {
    agent: { type: "agent", id: agent.id, version: agent.version },
    environment_id: environment.id,
    title: "Code review session",
    resources: [
      {
        type: "github_repository",
        url: "https://github.com/owner/repo",
        mount_path: "/workspace/repo",
        authorization_token: process.env.GITHUB_TOKEN,
        branch: "main",
      },
    ],
  },
);
```

---

## 发送用户消息

```typescript
await client.beta.sessions.events.send(
  session.id,
  {
    events: [
      {
        type: "user.message",
        content: [{ type: "text", text: "Review the auth module" }],
      },
    ],
  },
);
```

> 💡 **流优先：** 在发送消息*之前*（或同时）打开流。流只传递打开后发生的事件 — 发送后再打开流意味着早期事件会作为一个批次缓冲到达。参见[引导模式](../../shared/managed-agents-events.md#steering-patterns)。

---

## 流式事件（SSE）

```typescript
// Stream-first: open stream and send concurrently
const [events] = await Promise.all([
  collectStream(session.id),
  client.beta.sessions.events.send(
    session.id,
    { events: [{ type: "user.message", content: [{ type: "text", text: "..." }] }] },
  ),
]);

// Standalone stream iteration:
const stream = await client.beta.sessions.events.stream(
  session.id,
);

for await (const event of stream) {
  switch (event.type) {
    case "agent.message":
      for (const block of event.content) {
        if (block.type === "text") {
          process.stdout.write(block.text);
        }
      }
      break;
    case "agent.custom_tool_use":
      // Custom tool invocation — session is now idle
      console.log(`\
Custom tool call: ${event.name}`);
      console.log(`Input: ${JSON.stringify(event.input)}`);
      break;
    case "session.status_idle":
      console.log("\
--- Agent idle ---");
      break;
    case "session.status_terminated":
      console.log("\
--- Session terminated ---");
      break;
  }
}
```

---

## 提供自定义工具结果

```typescript
await client.beta.sessions.events.send(
  session.id,
  {
    events: [
      {
        type: "user.custom_tool_result",
        custom_tool_use_id: "sevt_abc123",
        content: [{ type: "text", text: "All 42 tests passed." }],
      },
    ],
  },
);
```

---

## 轮询事件

```typescript
const events = await client.beta.sessions.events.list(
  session.id,
);
for (const event of events.data) {
  console.log(`${event.type}: ${event.id}`);
}
```

---

## 使用自定义工具的完整流式循环

```typescript
function runCustomTool(toolName: string, toolInput: unknown): string {
  if (toolName === "run_tests") {
    // Your tool implementation here
    return "All tests passed.";
  }
  return `Unknown tool: ${toolName}`;
}

async function runSession(client: Anthropic, sessionId: string) {
  while (true) {
    const stream = await client.beta.sessions.events.stream(
      sessionId,
    );

    const toolCalls: Anthropic.Beta.Sessions.BetaManagedAgentsAgentCustomToolUseEvent[] = [];

    for await (const event of stream) {
      if (event.type === "agent.message") {
        for (const block of event.content) {
          if (block.type === "text") {
            process.stdout.write(block.text);
          }
        }
      } else if (event.type === "agent.custom_tool_use") {
        toolCalls.push(event);
      } else if (event.type === "session.status_idle") {
        break;
      } else if (event.type === "session.status_terminated") {
        return;
      }
    }

    if (toolCalls.length === 0) break;

    // Process custom tool calls
    const results = toolCalls.map((call) => ({
      type: "user.custom_tool_result" as const,
      custom_tool_use_id: call.id,
      content: [{ type: "text" as const, text: runCustomTool(call.name, call.input) }],
    }));

    await client.beta.sessions.events.send(
      sessionId,
      { events: results },
    );
  }
}
```

---

## 上传文件

```typescript
import fs from "fs";

const file = await client.beta.files.upload({
  file: fs.createReadStream("data.csv"),
  purpose: "agent",
});

// Use in a session
const session = await client.beta.sessions.create(
  {
    agent: { type: "agent", id: agent.id, version: agent.version },
    environment_id: environment.id,
    resources: [{ type: "file", file_id: file.id, mount_path: "/workspace/data.csv" }],
  },
);
```

---

## 列出和下载会话文件

列出代理在会话期间写入 `/mnt/session/outputs/` 的文件，然后下载它们。

```typescript
import fs from "fs";

// List files associated with a session
const files = await client.beta.files.list({
  scope_id: session.id,
  betas: ["managed-agents-2026-04-01"],
});
for (const f of files.data) {
  console.log(f.filename, f.size_bytes);

  // Download and save to disk
  const resp = await client.beta.files.download(f.id);
  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(f.filename, buffer);
}
```

> 💡 `session.status_idle` 和输出文件出现在 `files.list` 之间存在短暂的索引延迟（约 1-3 秒）。如果列表为空，请重试一两次。

---

## 会话管理

```typescript
// Get session details
const session = await client.beta.sessions.retrieve("sesn_011CZxAbc123Def456");
console.log(session.status, session.usage);

// List sessions
const sessions = await client.beta.sessions.list();

// Delete a session
await client.beta.sessions.delete("sesn_011CZxAbc123Def456");

// Archive a session
await client.beta.sessions.archive("sesn_011CZxAbc123Def456");
```

---

## MCP 服务器集成

```typescript
// Agent declares MCP server (no auth here — auth goes in a vault)
const agent = await client.beta.agents.create({
  name: "MCP Agent",
  model: "{{OPUS_ID}}",
  mcp_servers: [
    { type: "url", name: "my-tools", url: "https://my-mcp-server.example.com/sse" },
  ],
  tools: [
    { type: "agent_toolset_20260401", default_config: { enabled: true } },
    { type: "mcp_toolset", mcp_server_name: "my-tools" },
  ],
});

// Session attaches vault(s) containing credentials for those MCP server URLs
const session = await client.beta.sessions.create({
  agent: agent.id,
  environment_id: environment.id,
  vault_ids: [vault.id],
});
```

参见 `shared/managed-agents-tools.md` §Vaults 以了解创建保管库和添加凭据。
<!--
name: 'Data: Managed Agents reference — TypeScript'
description: Reference guide for using the Anthropic TypeScript SDK to create and manage agents, sessions, environments, streaming, custom tools, file uploads, and MCP server integration
ccVersion: 2.1.203
-->
# Managed Agents — TypeScript

> **Bindings not shown here:** This README covers the most common managed-agents flows for TypeScript. If you need a class, method, namespace, field, or behavior that isn't shown, WebFetch the TypeScript SDK repo **or the relevant docs page** from `shared/live-sources.md` rather than guess. Do not extrapolate from cURL shapes or another language's SDK.

> **Agents are persistent — create once, reference by ID.** Store the agent ID returned by `agents.create` and pass it to every subsequent `sessions.create`; do not call `agents.create` in the request path. The Anthropic CLI is one convenient way to create agents and environments from version-controlled YAML — its URL is in `shared/live-sources.md`. The examples below show in-code creation for completeness; in production the create call belongs in setup, not in the request path.

## Installation

```bash
npm install @anthropic-ai/sdk
```

## Client Initialization

```typescript
import Anthropic from "@anthropic-ai/sdk";

// Default — resolves credentials from the environment:
// ANTHROPIC_API_KEY, or ANTHROPIC_AUTH_TOKEN, or an `ant auth login` profile.
// Prefer this for local dev; don't hardcode a key.
const client = new Anthropic();

// Explicit API key (only when you must inject a specific key)
const client = new Anthropic({ apiKey: "your-api-key" });
```

---

## Create an Environment

```typescript
const environment = await client.beta.environments.create(
  {
    name: "my-dev-env",
    config: {
      type: "cloud",
      networking: { type: "unrestricted" },
    },
  },
);
console.log(environment.id); // env_...
```

---

## Create an Agent (required first step)

> ⚠️ **There is no inline agent config.** `model`/`system`/`tools` live on the agent object, not the session. Always start with `agents.create()` — the session only takes `agent: { type: "agent", id: agent.id }`.

### Minimal

```typescript
// 1. Create the agent (reusable, versioned)
const agent = await client.beta.agents.create(
  {
    name: "Coding Assistant",
    model: "{{OPUS_ID}}",
    tools: [{ type: "agent_toolset_20260401", default_config: { enabled: true } }],
  },
);

// 2. Start a session
const session = await client.beta.sessions.create(
  {
    agent: { type: "agent", id: agent.id, version: agent.version },
    environment_id: environment.id,
  },
);
console.log(session.id, session.status);
console.log(`Trace: https://platform.claude.com/workspaces/default/sessions/${session.id}`);
```

### With system prompt and custom tools

```typescript
const agent = await client.beta.agents.create(
  {
    name: "Code Reviewer",
    model: "{{OPUS_ID}}",
    system: "You are a senior code reviewer.",
    tools: [
      { type: "agent_toolset_20260401", default_config: { enabled: true } },
      {
        type: "custom",
        name: "run_tests",
        description: "Run the test suite",
        input_schema: {
          type: "object",
          properties: {
            test_path: { type: "string", description: "Path to test file" },
          },
          required: ["test_path"],
        },
      },
    ],
  },
);

const session = await client.beta.sessions.create(
  {
    agent: { type: "agent", id: agent.id, version: agent.version },
    environment_id: environment.id,
    title: "Code review session",
    resources: [
      {
        type: "github_repository",
        url: "https://github.com/owner/repo",
        mount_path: "/workspace/repo",
        authorization_token: process.env.GITHUB_TOKEN,
        branch: "main",
      },
    ],
  },
);
```

---

## Send a User Message

```typescript
await client.beta.sessions.events.send(
  session.id,
  {
    events: [
      {
        type: "user.message",
        content: [{ type: "text", text: "Review the auth module" }],
      },
    ],
  },
);
```

> 💡 **Stream-first:** Open the stream *before* (or concurrently with) sending the message. The stream only delivers events that occur after it opens — stream-after-send means early events arrive buffered in one batch. See [Steering Patterns](../../shared/managed-agents-events.md#steering-patterns).

---

## Stream Events (SSE)

```typescript
// Stream-first: open stream and send concurrently
const [events] = await Promise.all([
  collectStream(session.id),
  client.beta.sessions.events.send(
    session.id,
    { events: [{ type: "user.message", content: [{ type: "text", text: "..." }] }] },
  ),
]);

// Standalone stream iteration:
const stream = await client.beta.sessions.events.stream(
  session.id,
);

for await (const event of stream) {
  switch (event.type) {
    case "agent.message":
      for (const block of event.content) {
        if (block.type === "text") {
          process.stdout.write(block.text);
        }
      }
      break;
    case "agent.custom_tool_use":
      // Custom tool invocation — session is now idle
      console.log(`\
Custom tool call: ${event.name}`);
      console.log(`Input: ${JSON.stringify(event.input)}`);
      break;
    case "session.status_idle":
      console.log("\
--- Agent idle ---");
      break;
    case "session.status_terminated":
      console.log("\
--- Session terminated ---");
      break;
  }
}
```

---

## Provide Custom Tool Result

```typescript
await client.beta.sessions.events.send(
  session.id,
  {
    events: [
      {
        type: "user.custom_tool_result",
        custom_tool_use_id: "sevt_abc123",
        content: [{ type: "text", text: "All 42 tests passed." }],
      },
    ],
  },
);
```

---

## Poll Events

```typescript
const events = await client.beta.sessions.events.list(
  session.id,
);
for (const event of events.data) {
  console.log(`${event.type}: ${event.id}`);
}
```

---

## Full Streaming Loop with Custom Tools

```typescript
function runCustomTool(toolName: string, toolInput: unknown): string {
  if (toolName === "run_tests") {
    // Your tool implementation here
    return "All tests passed.";
  }
  return `Unknown tool: ${toolName}`;
}

async function runSession(client: Anthropic, sessionId: string) {
  while (true) {
    const stream = await client.beta.sessions.events.stream(
      sessionId,
    );

    const toolCalls: Anthropic.Beta.Sessions.BetaManagedAgentsAgentCustomToolUseEvent[] = [];

    for await (const event of stream) {
      if (event.type === "agent.message") {
        for (const block of event.content) {
          if (block.type === "text") {
            process.stdout.write(block.text);
          }
        }
      } else if (event.type === "agent.custom_tool_use") {
        toolCalls.push(event);
      } else if (event.type === "session.status_idle") {
        break;
      } else if (event.type === "session.status_terminated") {
        return;
      }
    }

    if (toolCalls.length === 0) break;

    // Process custom tool calls
    const results = toolCalls.map((call) => ({
      type: "user.custom_tool_result" as const,
      custom_tool_use_id: call.id,
      content: [{ type: "text" as const, text: runCustomTool(call.name, call.input) }],
    }));

    await client.beta.sessions.events.send(
      sessionId,
      { events: results },
    );
  }
}
```

---

## Upload a File

```typescript
import fs from "fs";

const file = await client.beta.files.upload({
  file: fs.createReadStream("data.csv"),
  purpose: "agent",
});

// Use in a session
const session = await client.beta.sessions.create(
  {
    agent: { type: "agent", id: agent.id, version: agent.version },
    environment_id: environment.id,
    resources: [{ type: "file", file_id: file.id, mount_path: "/workspace/data.csv" }],
  },
);
```

---

## List and Download Session Files

List files the agent wrote to `/mnt/session/outputs/` during a session, then download them.

```typescript
import fs from "fs";

// List files associated with a session
const files = await client.beta.files.list({
  scope_id: session.id,
  betas: ["managed-agents-2026-04-01"],
});
for (const f of files.data) {
  console.log(f.filename, f.size_bytes);

  // Download and save to disk
  const resp = await client.beta.files.download(f.id);
  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(f.filename, buffer);
}
```

> 💡 There's a brief indexing lag (~1–3s) between `session.status_idle` and output files appearing in `files.list`. Retry once or twice if the list is empty.

---

## Session Management

```typescript
// Get session details
const session = await client.beta.sessions.retrieve("sesn_011CZxAbc123Def456");
console.log(session.status, session.usage);

// List sessions
const sessions = await client.beta.sessions.list();

// Delete a session
await client.beta.sessions.delete("sesn_011CZxAbc123Def456");

// Archive a session
await client.beta.sessions.archive("sesn_011CZxAbc123Def456");
```

---

## MCP Server Integration

```typescript
// Agent declares MCP server (no auth here — auth goes in a vault)
const agent = await client.beta.agents.create({
  name: "MCP Agent",
  model: "{{OPUS_ID}}",
  mcp_servers: [
    { type: "url", name: "my-tools", url: "https://my-mcp-server.example.com/sse" },
  ],
  tools: [
    { type: "agent_toolset_20260401", default_config: { enabled: true } },
    { type: "mcp_toolset", mcp_server_name: "my-tools" },
  ],
});

// Session attaches vault(s) containing credentials for those MCP server URLs
const session = await client.beta.sessions.create({
  agent: agent.id,
  environment_id: environment.id,
  vault_ids: [vault.id],
});
```

See `shared/managed-agents-tools.md` §Vaults for creating vaults and adding credentials.
