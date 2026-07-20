<!--
name: 'Data: Managed Agents events and steering'
description: 托管代理会话事件发送和接收参考指南，包括流式传输、轮询、重连、消息队列、中断和事件载荷详情
ccVersion: 2.1.197
-->
# 托管代理 — 事件与引导

## 事件

### 发送事件

通过 `POST /v1/sessions/{id}/events` 向会话发送事件。

| 事件类型 | 发送时机 |
| ------------------------- | --------------------------------------------------- |
| `user.message` | 发送用户消息 |
| `user.interrupt` | 在代理运行时中断它 |
| `user.tool_confirmation` | 批准/拒绝工具调用（当 `always_ask` 策略时） |
| `user.custom_tool_result` | 为自定义工具调用提供结果 |
| `user.define_outcome` | 启动评分迭代循环——参见 `shared/managed-agents-outcomes.md` |
| `system.message` | 在轮次之间更新代理的系统提示词——**仅限 Claude Opus 4.8**；参见§ 在会话中途更新系统提示词 |

#### 在会话中途更新系统提示词（`system.message`）

与代理定义上的 `system` 字段（在会话创建时固定）不同，`system.message` 事件在**会话进行过程中**更改系统提示词——不同的角色、修订的约束或运行时获取的上下文，用于塑造后续行为：

```python
client.beta.sessions.events.send(
    session.id,
    events=[
        {
            "type": "system.message",
            "content": [
                {"type": "text", "text": "The user's current timezone is America/New_York."},
            ],
        },
    ],
)
```

约束条件：

- **仅限 Claude Opus 4.8。** 如果代理上配置的任何模型不支持对话中途系统注入，该事件会被拒绝，返回 `model_does_not_support_mid_conversation_system` 验证错误。
- **不能在会话处于 `stop_reason: requires_action` 的 idle 状态时发送**（等待 `user.custom_tool_result` / `user.tool_confirmation`）。
- `content` 接受 1–1000 个文本条目。

### 接收事件

三种方法：

1. **流式传输（SSE）**：`GET /v1/sessions/{id}/events/stream` — 实时 Server-Sent Events。**长连接**——服务器发送周期性心跳以保持连接活跃。
2. **轮询**：`GET /v1/sessions/{id}/events` — 分页事件列表（查询参数：`limit` 默认 1000，`page`）。**立即返回**——这是一个普通的分页 GET，不是长轮询。
3. **Webhooks**：Anthropic 将会话状态转换 POST 到你的 HTTPS 端点——精简载荷（仅 ID），HMAC 签名，Console 注册。参见 `shared/managed-agents-webhooks.md`。

所有**持久化**事件携带 `id`、`type` 和 `processed_at`（ISO 8601；如果代理尚未处理则为 `null`）。仅流式的 `event_start` / `event_delta` 预览事件（参见§ 实时预览）仅携带它们预览的事件的 `id`。

> ⚠️ **健壮的轮询（原始 HTTP）。** 如果你绕过 SDK 并自己实现轮询循环，不要依赖 `requests` 或 `httpx` 的超时作为挂钟上限——它们是**每块**读取超时，每次收到字节时都会重置。涓流式响应（心跳、卡住的分块编码体、行为异常的代理）即使设置了 `timeout=(5, 60)` 或 `httpx.Timeout(120)` 也能让调用无限阻塞。两个库都没有内置的"总挂钟"超时。对于硬性截止时间：在循环级别跟踪 `time.monotonic()` 并在单次请求超出预算时中断/取消（例如通过看门狗线程，或异步 httpx 的 `asyncio.wait_for()`）。**优先使用 SDK**——`client.beta.sessions.events.stream()` 和 `client.beta.sessions.events.list()` 能合理处理超时 + 重试。
>
> 如果 `GET /v1/sessions/{id}/events`（分页）在响应头后挂起，你可能错误地调用了 `GET /v1/sessions/{id}/events` 或遇到了服务器端停滞——请报告此问题；不要将其视为客户端配置问题。

### 事件类型（接收）

事件类型使用点号表示法，按命名空间分组：

| 事件类型 | 描述 |
| --- | --- |
| `agent.message` | 代理文本输出 |
| `agent.thinking` | 扩展思考块 |
| `agent.tool_use` | 代理使用了内置工具（`agent_toolset_20260401`） |
| `agent.tool_result` | 内置工具的结果 |
| `agent.mcp_tool_use` | 代理使用了 MCP 工具 |
| `agent.mcp_tool_result` | MCP 工具的结果 |
| `agent.custom_tool_use` | 代理调用了自定义工具——会话变为 idle，你用 `user.custom_tool_result` 响应 |
| `agent.thread_context_compacted` | 对话上下文已被压缩 |
| `session.status_idle` | 代理已完成当前任务，正在等待输入。它在等待通过 `user.message` 继续工作的输入，或被阻塞等待 `user.custom_tool_result` 或 `user.tool_confirmation`。附带的 `stop_reason` 包含有关代理停止工作的原因的更多信息。 |
| `session.status_running` | 会话已开始运行，代理正在积极工作。 |
| `session.status_rescheduled` | 会话在可重试错误发生后正在（重新）调度，准备被编排系统接管。 |
| `session.status_terminated` | 会话已终止，进入不可逆且不可用的状态。 |
| `session.error` | 处理过程中发生错误 |
| `span.model_request_start` | 模型推理已开始 |
| `span.model_request_end` | 模型推理已完成 |
| `span.outcome_evaluation_start` / `_ongoing` / `_end` | 面向结果会话的评分器进度——参见 `shared/managed-agents-outcomes.md` |
| `session.thread_created` | 子代理线程已生成（多代理）——参见 `shared/managed-agents-multiagent.md` |
| `session.thread_status_running` / `_idle` / `_rescheduled` / `_terminated` | 子代理线程状态转换（多代理）。`_idle` 携带 `stop_reason`。 |
| `agent.thread_message_sent` / `_received` | 跨线程消息，携带 `to_session_thread_id` / `from_session_thread_id`（多代理） |

流还会回显用户发送的事件（`user.message`、`user.interrupt`、`user.tool_confirmation`、`user.custom_tool_result`、`user.define_outcome`）。

仅流式的增量预览事件（`event_start`、`event_delta`）是 `{domain}.{action}` 命名约定的唯一例外——参见下方§ 实时预览；它们永远不会出现在 `GET /v1/sessions/{id}/events` 中。

---

## 实时预览

默认情况下，助手文本以缓冲的 `agent.message` 事件形式到达流——仅在生成它们的模型请求完成后才发出。**实时预览**让你在模型仍在生成时增量渲染该文本。缓冲的 `agent.message` 始终是权威记录；忽略预览的客户端仍然会收到完整、正确的流。线路格式**不是** Messages API 流式传输：增量类型是 `content_delta`，不是 `content_block_delta`，因此 Messages API 的累加器代码不能直接照搬。

**按流连接选择加入**，在 `GET /v1/sessions/{id}/events/stream` 上添加 `event_deltas[]` 查询参数，每个要预览的事件类型重复一次。接受的值：`agent.message`、`agent.thinking`（任何其他值 → 400）。仅会话级流支持——每线程流（`/threads/{tid}/stream`）会拒绝此参数。

```python
stream = client.beta.sessions.events.stream(
    session_id=session.id,
    event_deltas=["agent.message"],
)
```

当预览事件开始时，流发出一个 `event_start`，携带即将开始的事件的 `type` 和 `id`；对于 `agent.message`，后面跟着携带增量文本的 `event_delta` 事件：

```json
{"type": "event_start", "event": {"type": "agent.message", "id": "sevt_01abc..."}}
{"type": "event_delta", "event_id": "sevt_01abc...", "delta": {"type": "content_delta", "index": 0, "content": {"type": "text", "text": "Here is the summary"}}}
```

`event_start` 和 `event_delta` 没有自己的 `id` 或 `processed_at`——它们携带的唯一标识符是它们预览的事件的 `id`。对于 `agent.thinking`，**仅**发出 `event_start`（"思考已开始"信号）——后面没有增量；请从缓冲的 `agent.thinking` 事件中读取内容。

**累加-协调模式。** 将预览视为以 `(event_id, index)` 为键的暂存缓冲区。收到 `event_start` 时，为宣布的 `id` 创建一个空条目。收到每个 `event_delta` 时，将 `delta.content.text` 追加到 `(event_id, delta.index)` 并渲染运行文本。当缓冲的 `agent.message` 到达时，通过 `id` 匹配，**丢弃累加的预览**，改为渲染消息的内容。标识符始终对齐：`event_start.event.id`、每个 `event_delta.event_id` 和缓冲事件的 `id` 是相同的值。在正常轮次中，顺序是固定的：`session.status_running` → `span.model_request_start` → `event_start` → `event_delta`* → 缓冲的 `agent.message` → `span.model_request_end`。如果轮次出错或被中断，缓冲事件可能永远不会到达，但 `span.model_request_end` 仍然会——在看到它时关闭任何未协调的预览。Python/TypeScript/Go SDK 提供了实现此功能的累加器辅助工具；在其他 SDK 中，对生成的事件类型应用手动模式。

**限制：**
- **尽力而为**——在负载下，服务器可能会丢弃某个事件的增量；你会收到一个连续的前缀，然后不再收到该事件的增量。缓冲的 `agent.message` 仍然会完整到达。永远不要将累加的预览视为最终结果。
- **重连时不重放**——增量仅投递到选择加入的连接，在连接打开期间。断开连接后，请按照§ 断开流后的重连中的合并模式操作——历史获取会返回在间隔期间发出的任何缓冲事件；丢失的增量无法重新请求。
- **仅限主线程，仅文本**——工具使用、工具结果、MCP 结果和子代理线程活动不会被预览。
- **永不持久化**——`event_start` / `event_delta` 仅存在于实时 SSE 流中，永远不会出现在 `GET /v1/sessions/{id}/events` 中。

---

## 引导模式

通过事件接口驱动会话的实用模式。

### 流优先排序

**先打开流再发送事件。** 流仅投递打开*后*发生的事件——它不会重放当前状态或历史事件。如果你先发送消息再打开流，早期事件（包括快速的状态转换）会以单个批次缓冲到达，你会失去实时响应它们的能力。

```ts
// ✅ 正确——流和发送并发进行
const [response] = await Promise.all([
  streamEvents(sessionId),   // 打开 SSE 连接
  sendMessage(sessionId, text),
]);

// ❌ 错误——流打开前的事件以单个缓冲批次到达
await sendMessage(sessionId, text);
const response = await streamEvents(sessionId);
```

**获取完整历史，**使用 `GET /v1/sessions/{id}/events`（分页列表）——流只提供从连接开始的实时事件。

### 断开流后的重连

**SSE 流没有重放。** 如果你的连接断开（httpx 读取超时、网络波动）并重新连接，你只会收到重连*后*发出的事件。在间隔期间发出的任何事件都会从流中丢失。

**合并模式：** 在每次（重新）连接时，将流与历史获取重叠，并按事件 ID 去重：

```python
def connect_with_consolidation(client, session_id):
    # 1. 先打开 SSE 流
    stream = client.beta.sessions.events.stream(session_id=session_id)

    # 2. 获取历史以覆盖任何间隔
    history = client.beta.sessions.events.list(
        session_id=session_id,
    )

    # 3. 先产出历史，再产出流——按 event.id 去重
    seen = set()
    for ev in history.data:
        seen.add(ev.id)
        yield ev
    for ev in stream:
        if ev.id not in seen:
            seen.add(ev.id)
            yield ev
```

### 消息队列

**不必等待响应再发送下一条消息。** 用户事件在服务端排队并按顺序处理。这对于用户快速连续发送消息的聊天桥接很有用：

```ts
// 所有三条消息进入同一个会话；代理按顺序处理
await sendMessage(sessionId, "Summarize the README");
await sendMessage(sessionId, "Actually also check the CONTRIBUTING guide");
await sendMessage(sessionId, "And compare the two");
// 流式传输一次——代理将三条消息作为一个连贯的轮次响应
```

事件可以在任何时候发送到会话。无需等待特定的会话状态来通过 `client.beta.sessions.events.send()` 排队新事件。

### 中断

`interrupt` 事件**插队**（跳在任何待处理的用户消息之前）并强制会话变为 `idle`。用于"停止"/"算了"/"取消"命令：

```ts
await client.beta.sessions.events.send(sessionId, {
  events: [{ type: 'interrupt' }],
});
```

代理在任务中途停止。它不会将中断视为消息——它只是停止。发送后续的 `user` 事件来说明接下来该做什么。如果有活跃的结果评估，中断还会标记 `span.outcome_evaluation_end.result: "interrupted"`（参见 `shared/managed-agents-outcomes.md`）。

> **注意**：中断事件在当前实现中可能有空 ID。排查问题时，请使用 `processed_at` 时间戳和周围的事件 ID。

### 事件载荷

一些事件携带状态变更本身之外的有用元数据：

`session.status_idle` — 包含 `stop_reason` 字段，详细说明会话停止的原因以及用户需要什么类型的进一步操作。
```json
{
  "id": "sevt_456",
  "processed_at": "2026-04-07T04:27:43.197Z",
  "stop_reason": {
    "event_ids": [
      "sevt_123"
    ],
    "type": "requires_action"
  },
  "type": "status_idle"
}
```

`span.model_request_end` 包含用于成本跟踪和效率分析的 `model_usage` 字段：

```json
{
  "type": "span.model_request_end",
  "id": "sevt_456",
  "is_error": false,
  "model_request_start_id": "sevt_123",
  "model_usage": {
    "cache_creation_input_tokens": 0,
    "cache_read_input_tokens": 6656,
    "input_tokens": 3571,
    "output_tokens": 727
  },
  "processed_at": "2026-04-07T04:11:32.189Z"
}
```

**`agent.thread_context_compacted`** — 当对话历史被摘要以适应上下文时发出。包含 `pre_compaction_tokens`，让你知道压缩了多少：

```json
{
  "id": "sevt_abc123",
  "processed_at": "2026-03-24T14:05:15.787Z",
  "type": "agent.thread_context_compacted"
}
```

### 归档

会话完成后，归档它以释放资源：

```ts
await client.beta.sessions.archive(sessionId);
```

> 归档**会话**是常规清理——会话是每次运行且可丢弃的。**不要将此推广到代理或环境**：那些是持久的、可重复使用的资源，归档它们是永久的（无法取消归档；新会话无法引用它们）。参见 `shared/managed-agents-overview.md` → 常见陷阱。
