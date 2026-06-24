<!--
name: 'Data: Managed Agents client patterns'
description: Reference guide of common client-side patterns for driving Managed Agent sessions, including stream reconnection, idle-break gating, tool confirmations, interrupts, and custom tools
ccVersion: 2.1.105
-->
# Managed Agents — 常见客户端模式

驱动 Managed Agent session 时需要在客户端编写的模式，基于可运行的 SDK 示例。

代码示例为 TypeScript——Python 和 cURL 遵循相同结构；参见 `python/managed-agents/README.md` 和 `curl/managed-agents.md`。

---

## 1. 无损流重连

**问题：** SSE 没有重放功能。如果连接在 session 中途断开，天真的重连方式会从"此刻"重新打开流，你会静默丢失期间发出的所有事件。

**解决方案：** 重连时，在消费实时流**之前**通过 `events.list()` 获取完整事件历史，并在实时流追上时按事件 ID 去重。

```ts
const seenEventIds = new Set<string>()
const stream = await client.beta.sessions.events.stream(session.id)

// 流现已打开并在服务端缓冲。先读取历史。
for await (const event of client.beta.sessions.events.list(session.id)) {
  seenEventIds.add(event.id)
  handle(event)
}

// 尾随实时流。去重仅限制 handle()——终止检查必须对已见过的事件也执行，
// 否则历史响应中的终止事件会被 `continue` 跳过，循环永远不会退出。
for await (const event of stream) {
  if (!seenEventIds.has(event.id)) {
    seenEventIds.add(event.id)
    handle(event)
  }
  if (event.type === 'session.status_terminated') break
  if (event.type === 'session.status_idle' && event.stop_reason.type !== 'requires_action') break
}
```

---

## 2. `processed_at` — 已排队 vs 已处理

流上的每个事件都携带 `processed_at`（ISO 8601）。对于客户端发送的事件（`user.message`、`user.interrupt`、`user.tool_confirmation`、`user.custom_tool_result`），当事件已排队但尚未被 agent 接手时为 `null`，一旦 agent 处理完成则填充时间戳。同一事件在流上出现两次——一次 `processed_at: null`，一次带时间戳。

```ts
for await (const event of stream) {
  if (event.type === 'user.message') {
    if (event.processed_at == null) onQueued(event.id)
    else onProcessed(event.id, event.processed_at)
  }
}
```

用此机制驱动任何你发送内容的"待处理 → 已确认"UI 状态。如何将本地渲染的乐观消息映射到服务端分配的 `event.id` 取决于具体应用（通常通过 `events.send()` 的返回值或 FIFO 排序）。

---

## 3. 中断正在运行的 session

将 `user.interrupt` 作为普通事件发送。Session 继续运行直到到达安全边界，然后进入 idle。

```ts
await client.beta.sessions.events.send(session.id, {
  events: [{ type: 'user.interrupt' }],
})

// 持续排空直到 session 真正完成——完整门控参见模式 5。
for await (const event of stream) {
  if (event.type === 'session.status_terminated') break
  if (
    event.type === 'session.status_idle' &&
    event.stop_reason.type !== 'requires_action'
  ) break
}
```

参考：`interrupt.ts` — 在看到 `span.model_request_start` 的瞬间发送中断，排空至 idle，然后通过 `sessions.retrieve()` 验证。

---

## 4. `tool_confirmation` 往返

当 agent 配置了 `permission_policy: { type: 'always_ask' }`，对该工具的任何调用都会触发 `agent.tool_use` 事件，其中 `evaluated_permission === 'ask'`，session 进入 idle 等待决策。用 `user.tool_confirmation` 响应。

```ts
for await (const event of stream) {
  if (event.type === 'agent.tool_use' && event.evaluated_permission === 'ask') {
    await client.beta.sessions.events.send(session.id, {
      events: [{
        type: 'user.tool_confirmation',
        tool_use_id: event.id,         // 不是 toolu_ ID——使用 event.id
        result: 'allow',               // 或 'deny'
        // deny_message: '...',        // 可选，仅与 result: 'deny' 一起使用
      }],
    })
  }
}
```

要点：
- `tool_use_id` 是 `event.id`（通常为 `sevt_...`），**不是** `toolu_...` ID。
- `result` 为 `'allow' | 'deny'`。使用 `deny_message` 告知模型你拒绝的*原因*——它会传回给 agent。
- 多个待处理工具：对每个 `evaluated_permission === 'ask'` 的 `agent.tool_use` 事件各响应一次。

参考：`tool-permissions.ts`。

---

## 5. 正确的 idle-break 门控

不要在仅收到 `session.status_idle` 时就退出。Session 会短暂进入 idle——例如在并行工具执行之间、等待 `user.tool_confirmation` 时、或等待 `user.custom_tool_result` 时。当 idle 带有终止性的 `stop_reason`，或收到 `session.status_terminated` 时才退出。

```ts
for await (const event of stream) {
  handle(event)
  if (event.type === 'session.status_terminated') break
  if (event.type === 'session.status_idle') {
    if (event.stop_reason.type === 'requires_action') continue // 正在等你处理——处理它
    break // end_turn 或 retries_exhausted——两者都是终止性的
  }
}
```

`session.status_idle` 上的 `stop_reason.type` 值：
- `requires_action` — agent 正在等待客户端事件（工具确认、自定义工具结果）。处理它，不要退出。
- `retries_exhausted` — 终止性失败。退出，然后检查 `sessions.retrieve()` 获取错误状态。
- `end_turn` — 正常完成。

---

## 6. idle 后的状态写入竞态

SSE 流发出 `session.status_idle` 的时间略早于 session 的可查询状态反映该变化。在 idle 时退出并立即调用 `sessions.delete()` 或 `sessions.archive()` 的客户端会间歇性地收到 400 错误："cannot delete/archive while running."

清理前先轮询：

```ts
let s
for (let i = 0; i < 10; i++) {
  s = await client.beta.sessions.retrieve(session.id)
  if (s.status !== 'running') break
  await new Promise(r => setTimeout(r, 200))
}
if (s?.status !== 'running') {
  await client.beta.sessions.archive(session.id)
} // 否则：2 秒后仍在运行——不要归档，等待其稳定或升级处理
```

---

## 7. 先开流，再发送

始终在发送启动事件**之前**打开流。否则 agent 可能在你的消费者挂载之前就已处理事件并发出首批事件，你将丢失它们。

```ts
const stream = await client.beta.sessions.events.stream(session.id)
await client.beta.sessions.events.send(session.id, {
  events: [{ type: 'user.message', content: [{ type: 'text', text: 'Hello' }] }],
})
for await (const event of stream) { /* ... */ }
```

`Promise.all([stream, send])` 形式也可以，但先开流更简单且效果相同——流在打开的那一刻就开始缓冲。

---

## 8. 文件挂载陷阱

**挂载的资源的 `file_id` 与你上传的文件不同。** Session 创建时会生成一个 session 范围的副本。

```ts
const uploaded = await client.beta.files.upload({ file, purpose: 'agent_resource' })
// uploaded.id         → 原始文件
const session = await client.beta.sessions.create({
  /* ... */
  resources: [{ type: 'file', file_id: uploaded.id, mount_path: '/workspace/data.csv' }],
})
// session.resources[0].file_id !== uploaded.id  ← 不同的 ID
```

通过 `files.delete(uploaded.id)` 删除原始文件；session 范围的副本随 session 被垃圾回收。`mount_path` 必须是绝对路径——参见 `shared/managed-agents-environments.md`。

---

## 9. 非 MCP API 和 CLI 的密钥——通过自定义工具将其保留在主机侧

**问题：** 你希望 agent 调用需要密钥（API key、token、服务账号凭证）的第三方 API 或运行 CLI，但目前无法在 session 容器内设置环境变量，且 vault 目前仅持有 MCP 凭证——它们不会暴露给容器的 shell。因此，通过 `bash` 工具运行的 `curl`、已安装的 CLI 或 SDK 客户端没有一等的位置来读取密钥。

**解决方案：** 将经过认证的调用移到你这一侧。在 agent 上声明一个自定义工具；当 agent 发出 `agent.custom_tool_use` 时，你的编排器（读取 SSE 流的进程）使用自己的凭证执行调用，并以 `user.custom_tool_result` 响应。容器永远不会看到密钥。

```ts
// Agent 模板：声明工具，不含凭证
tools: [{ type: 'custom', name: 'linear_graphql', input_schema: { /* query, vars */ } }]

// 编排器：使用主机侧凭证处理调用
for await (const event of stream) {
  if (event.type === 'agent.custom_tool_use' && event.name === 'linear_graphql') {
    const result = await linear.request(event.input.query, event.input.vars) // 主机的 key
    await client.beta.sessions.events.send(session.id, {
      events: [{ type: 'user.custom_tool_result', tool_use_id: event.id, result }],
    })
  }
}
```

相同的模式适用于 `gh` CLI、本地 eval 脚本或任何需要主机侧认证或二进制文件的内容。

**安全说明：** 这不会暴露公开端点。`agent.custom_tool_use` 通过你的编排器已持有的、使用你的 Anthropic API key 打开的 SSE 流到达，`user.custom_tool_result` 通过同一 key 下的 `events.send()` 返回。你的编排器是客户端，而非服务器——没有任何未认证的监听方。

**不要将 API key 嵌入 system prompt 或用户消息中作为变通方案。** Prompt 和消息存储在 session 的事件历史中，可通过 `events.list()` 返回，并包含在压缩摘要中——放在那里的密钥会被持久存储，且在该 session 的整个生命周期内可通过 API 读取。
