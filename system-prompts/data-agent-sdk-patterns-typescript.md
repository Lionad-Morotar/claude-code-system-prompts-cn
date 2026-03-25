<!--
name: 'Data: Agent SDK patterns — TypeScript'
description: TypeScript Agent SDK patterns including basic agents, hooks, subagents, and MCP integration
ccVersion: 2.1.78
-->
# Agent SDK 模式 — TypeScript

## 基础 Agent

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  for await (const message of query({
    prompt: "Explain what this repository does",
    options: {
      cwd: "/path/to/project",
      allowedTools: ["Read", "Glob", "Grep"],
    },
  })) {
    if ("result" in message) {
      console.log(message.result);
    }
  }
}

main();
```

---

## 钩子 (Hooks)

### 工具使用后钩子 (After Tool Use Hook)

```typescript
import { query, HookCallback } from "@anthropic-ai/claude-agent-sdk";
import { appendFileSync } from "fs";

const logFileChange: HookCallback = async (input) => {
  const filePath = (input as any).tool_input?.file_path ?? "unknown";
  appendFileSync(
    "./audit.log",
    `${new Date().toISOString()}: modified ${filePath}\n`,
  );
  return {};
};

for await (const message of query({
  prompt: "Refactor utils.py to improve readability",
  options: {
    allowedTools: ["Read", "Edit", "Write"],
    permissionMode: "acceptEdits",
    hooks: {
      PostToolUse: [{ matcher: "Edit|Write", hooks: [logFileChange] }],
    },
  },
})) {
  if ("result" in message) console.log(message.result);
}
```

---

## 子代理 (Subagents)

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Use the code-reviewer agent to review this codebase",
  options: {
    allowedTools: ["Read", "Glob", "Grep", "Agent"],
    agents: {
      "code-reviewer": {
        description: "Expert code reviewer for quality and security reviews.",
        prompt: "Analyze code quality and suggest improvements.",
        tools: ["Read", "Glob", "Grep"],
      },
    },
  },
})) {
  if ("result" in message) console.log(message.result);
}
```

---

## MCP 服务器集成

### 浏览器自动化 (Playwright)

```typescript
for await (const message of query({
  prompt: "Open example.com and describe what you see",
  options: {
    mcpServers: {
      playwright: { command: "npx", args: ["@playwright/mcp@latest"] },
    },
  },
})) {
  if ("result" in message) console.log(message.result);
}
```

---

## 会话恢复

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

let sessionId: string | undefined;

// 第一次查询：捕获会话 ID
for await (const message of query({
  prompt: "Read the authentication module",
  options: { allowedTools: ["Read", "Glob"] },
})) {
  if (message.type === "system" && message.subtype === "init") {
    sessionId = message.session_id;
  }
}

// 使用第一次查询的完整上下文恢复会话
for await (const message of query({
  prompt: "Now find all places that call it",
  options: { resume: sessionId },
})) {
  if ("result" in message) console.log(message.result);
}
```

---

## 会话历史

```typescript
import { listSessions, getSessionMessages, getSessionInfo } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  // 列出过去的会话（支持通过 limit/offset 分页）
  const sessions = await listSessions();
  for (const session of sessions) {
    console.log(`Session ${session.sessionId} in ${session.cwd} (tag: ${session.tag})`);
  }

  // 获取单个会话的元数据
  if (sessions.length > 0) {
    const info = await getSessionInfo(sessions[0].sessionId);
    console.log(`Created: ${info.createdAt}, Tag: ${info.tag}`);
  }

  // 从最近的会话中检索消息
  if (sessions.length > 0) {
    const messages = await getSessionMessages(sessions[0].sessionId, { limit: 50 });
    for (const msg of messages) {
      console.log(msg);
    }
  }
}

main();
```

---

## 会话变更

```typescript
import { renameSession, tagSession, forkSession } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  const sessionId = "your-session-id";

  // 重命名会话
  await renameSession(sessionId, "重构认证模块");

  // 为会话添加标签以便筛选
  await tagSession(sessionId, "experiment-v2");

  // 清除标签
  await tagSession(sessionId, null);

  // 从某一点分叉对话
  const { sessionId: forkedId } = await forkSession(sessionId);
  console.log(`Forked session: ${forkedId}`);
}

main();
```

---

## 自定义系统提示词

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Review this code",
  options: {
    allowedTools: ["Read", "Glob", "Grep"],
    systemPrompt: `You are a senior code reviewer focused on:
1. Security vulnerabilities
2. Performance issues
3. Code maintainability

Always provide specific line numbers and suggestions for improvement.`,
  },
})) {
  if ("result" in message) console.log(message.result);
}
```
