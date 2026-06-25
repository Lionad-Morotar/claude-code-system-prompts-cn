<!--
name: 'Data: Managed Agents reference — TypeScript'
description: 使用 Anthropic TypeScript SDK 创建和管理智能体、会话、环境、流式传输、自定义工具、文件上传及 MCP 服务器集成的参考指南
ccVersion: 2.1.154
-->
# Managed Agents — TypeScript

> **此处未展示的绑定：** 本 README 涵盖 TypeScript 最常见的 managed-agents 流程。如果需要未展示的类、方法、命名空间、字段或行为，请从 `shared/live-sources.md` WebFetch TypeScript SDK 仓库**或相关文档页面**，而不是猜测。不要从 cURL 形式或其他语言的 SDK 推断。

> **代理是持久化的——创建一次，按 ID 引用。** 存储 `agents.create` 返回的代理 ID，并将其传递给后续每次 `sessions.create`；不要在请求路径中调用 `agents.create`。Anthropic CLI 是从版本控制的 YAML 创建代理和环境的便捷方式——其 URL 在 `shared/live-sources.md` 中。以下示例为完整性展示代码内创建；在生产环境中，create 调用应放在设置中，而非请求路径中。

## 安装

```bash
npm install @anthropic-ai/sdk
```

## 客户端初始化

```typescript
import Anthropic from "@anthropic-ai/sdk";

// 默认 —— 从环境解析凭据：
// ANTHROPIC_API_KEY，或 ANTHROPIC_AUTH_TOKEN，或 `ant auth login` profile。
// 本地开发时优先使用此方式；不要硬编码密钥。
const client = new Anthropic();

// 显式 API key（仅在必须注入特定密钥时使用）
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

> ⚠️ **不存在内联代理配置。** `model`/`system`/`tools` 存在于代理对象上，而非会话。始终从 `agents.create()` 开始——会话只接受 `agent: { type: "agent", id: agent.id }`。

### 最简示例

```typescript
// 1. 创建代理（可复用，带版本管理）
const agent = await client.beta.agents.create(
  {
    name: "Coding Assistant",
    model: "{{OPUS_ID}}",
    tools: [{ type: "agent_toolset_20260401", default_config: { enabled: true } }],
  },
);

// 2. 启动会话
const session = await client.beta.sessions.create(
  {
    agent: { type: "agent", id: agent.id, version: agent.version },
    environment_id: environment.id,
  },
);
console.log(session.id, session.status);
```

### 带系统提示词和自定义工具

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

> 💡 **流优先：** 在发送消息*之前*（或同时）打开流。流只传递打开后发生的事件——发送后再打开流意味着早期事件会缓冲在一批中到达。参见 [操控模式](../../shared/managed-agents-events.md#steering-patterns)。

---

## 流式事件（SSE）

```typescript
// 流优先：同时打开流和发送
const [events] = await Promise.all([
  collectStream(session.id),
  client.beta.sessions.events.send(
    session.id,
    { events: [{ type: "user.message", content: [{ type: "text", text: "..." }] }] },
  ),
]);

// 独立的流迭代：
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
      // 自定义工具调用——会话现在处于 idle 状态
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

## 完整的带自定义工具的流式循环

```typescript
function runCustomTool(toolName: string, toolInput: unknown): string {
  if (toolName === "run_tests") {
    // 你的工具实现放这里
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

    // 处理自定义工具调用
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

// 在会话中使用
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

// 列出与某个会话关联的文件
const files = await client.beta.files.list({
  scope_id: session.id,
  betas: ["managed-agents-2026-04-01"],
});
for (const f of files.data) {
  console.log(f.filename, f.size_bytes);

  // 下载并保存到磁盘
  const resp = await client.beta.files.download(f.id);
  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(f.filename, buffer);
}
```

> 💡 `session.status_idle` 和输出文件出现在 `files.list` 之间有短暂的索引延迟（约 1~3 秒）。如果列表为空，重试一到两次。

---

## 会话管理

```typescript
// 获取会话详情
const session = await client.beta.sessions.retrieve("sesn_011CZxAbc123Def456");
console.log(session.status, session.usage);

// 列出会话
const sessions = await client.beta.sessions.list();

// 删除会话
await client.beta.sessions.delete("sesn_011CZxAbc123Def456");

// 归档会话
await client.beta.sessions.archive("sesn_011CZxAbc123Def456");
```

---

## MCP 服务器集成

```typescript
// 代理声明 MCP 服务器（这里不涉及认证——认证放在 vault 中）
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

// 会话附加包含这些 MCP 服务器 URL 凭据的 vault(s)
const session = await client.beta.sessions.create({
  agent: agent.id,
  environment_id: environment.id,
  vault_ids: [vault.id],
});
```

参见 `shared/managed-agents-tools.md` §Vaults 了解创建 vault 和添加凭据。
