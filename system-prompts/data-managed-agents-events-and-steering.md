<!--
name: '数据：Managed Agents 事件与操控'
description: 发送和接收 managed agent session 事件的参考指南，包括流式传输、轮询、重连、消息排队、中断和事件载荷详情
ccVersion: 2.1.132
-->
# Managed Agents — 事件与操控

## Events

### 发送事件

通过 `POST /v1/sessions/{id}/events` 向 session 发送事件。

| 事件类型                | 何时发送                                        |
| ------------------------- | --------------------------------------------------- |
| `user.message`            | 发送用户消息 |
| `user.interrupt`          | Agent 运行时中断它 |
| `user.tool_confirmation`  | 批准/拒绝工具调用（当 `always_ask` 策略时） |
| `user.custom_tool_result` | 提供自定义工具调用的结果 |
| `user.define_outcome`     | 启动评分标准驱动的迭代循环——参见 `shared/managed-agents-outcomes.md` |

### 接收事件

三种方式：

1. **流式传输（SSE）**：`GET /v1/sessions/{id}/events/stream`——实时服务器推送事件。**长连接**——服务器定期发送心跳以保持连接存活。
2. **轮询**：`GET /v1/sessions/{id}/events`——分页事件列表（查询参数：`limit` 默认 1000，`page`）。**立即返回**——这是一个普通的分页 GET，而非长轮询。
3. **Webhook**：Anthropic 向你的 HTTPS 端点 POST session 状态转换——精简载荷（仅 ID），HMAC 签名，通过 Console 注册。参见 `shared/managed-agents-webhooks.md`。

所有接收到的事件都携带 `id`、`type` 和 `processed_at`（ISO 8601；如果 agent 尚未处理则为 `null`）。

> ⚠️ **稳健的轮询（原始 HTTP）。** 如果你绕过 SDK 自行编写轮询循环，不要依赖 `requests` 或 `httpx` 超时作为墙上时钟上限——它们是**每个数据块**的读取超时，每收到一个字节就重置。一个持续滴漏的响应（心跳、卡住的分块编码体、行为异常的代理）即使设置了 `timeout=(5, 60)` 或 `httpx.Timeout(120)` 也会无限期地阻塞调用。这两个库都没有内置"总墙上时钟"超时。要实现硬性截止：在循环级别跟踪 `time.monotonic()`，如果单次请求超出预算则中断/取消（例如通过看门狗线程，或围绕异步 httpx 使用 `asyncio.wait_for()`）。**推荐使用 SDK**——`client.beta.sessions.events.stream()` 和 `client.beta.sessions.events.list()` 会妥善处理超时和重试。
>
> 如果 `GET /v1/sessions/{id}/events`（分页）在收到头后挂起，你很可能误用了 `GET /v1/sessions/{id}/events` 或遇到了服务器端停滞——报告它；不要将其视为客户端配置问题。

### 事件类型（接收）

事件类型使用点号表示法，按命名空间分组：

| 事件类型 | 描述 |
| --- | --- |
| `agent.message` | Agent 文本输出 |
| `agent.thinking` | 扩展思考块 |
| `agent.tool_use` | Agent 使用了内置工具（`agent_toolset_20260401`） |
| `agent.tool_result` | 内置工具的结果 |
| `agent.mcp_tool_use` | Agent 使用了 MCP 工具 |
| `agent.mcp_tool_result` | MCP 工具的结果 |
| `agent.custom_tool_use` | Agent 调用了自定义工具——session 进入 idle，你以 `user.custom_tool_result` 响应 |
| `agent.thread_context_compacted` | 对话上下文被压缩 |
| `session.status_idle` | Agent 已完成当前任务，正在等待输入。它要么在等待输入以通过 `user.message` 继续工作，要么被 `user.custom_tool_result` 或 `user.tool_confirmation` 阻塞。附带的 `stop_reason` 包含 agent 停止工作的更多原因信息。 |
| `session.status_running` | Session 已开始运行，agent 正在积极工作。 |
| `session.status_rescheduled` | Session 在发生可重试错误后正在（重新）调度，准备由编排系统接管。 |
| `session.status_terminated` | Session 已终止，进入不可逆且不可用的状态。 |
| `session.error` | 处理过程中发生错误 |
| `span.model_request_start` | 模型推理开始 |
| `span.model_request_end` | 模型推理完成 |
| `span.outcome_evaluation_start` / `_ongoing` / `_end` | 面向结果的 session 的评分器进度——参见 `shared/managed-agents-outcomes.md` |
| `session.thread_created` | 子 agent 线程已生成（多 agent）——参见 `shared/managed-agents-multiagent.md` |
| `session.thread_status_running` / `_idle` / `_rescheduled` / `_terminated` | 子 agent 线程状态转换（多 agent）。`_idle` 携带 `stop_reason`。 |
| `agent.thread_message_sent` / `_received` | 跨线程消息，携带 `to_session_thread_id` / `from_session_thread_id`（多 agent） |

流还会回显用户发送的事件（`user.message`、`user.interrupt`、`user.tool_confirmation`、`user.custom_tool_result`、`user.define_outcome`）。

---

## 操控模式

通过事件接口驱动 session 的实用模式。

### 流优先排序

**在发送事件之前打开流。** 流仅传递在它打开*之后*发生的事件——它不会重放当前状态或历史事件。如果你先发送消息再打开流，早期事件（包括快速的状态转换）会缓冲后一次性到达，你将失去实时响应它们的能力。

```ts
// ✅ 正确——并发打开流并发送消息
const [response] = await Promise.all([
  streamEvents(sessionId),   // 打开 SSE 连接
  sendMessage(sessionId, text),
]);

// ❌ 错误——流打开之前的事件会作为单个缓冲批次到达
await sendMessage(sessionId, text);
const response = await streamEvents(sessionId);
```

**要获取完整历史记录，** 使用 `GET /v1/sessions/{id}/events`（分页列表）——流仅提供从连接开始后的实时事件。

### 流断开后的重连

**SSE 流没有重放功能。** 如果你的连接断开（httpx 读取超时、网络波动）然后重连，你只会收到重连*之后*发出的事件。断开期间发出的任何事件都会从流中丢失。

**合并模式：** 每次（重）连接时，将流与历史获取重叠并按事件 ID 去重：

```python
def connect_with_consolidation(client, session_id):
    # 1. 首先打开 SSE 流
    stream = client.beta.sessions.events.stream(session_id=session_id)

    # 2. 获取历史记录以覆盖任何间隙
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

### 消息排队

**你不必等待响应再发送下一条消息。** 用户事件在服务端排队并按顺序处理。这对于聊天桥接非常有用，用户可以快速发送后续消息：

```ts
// 三条消息进入同一个 session；agent 按顺序处理它们
await sendMessage(sessionId, "Summarize the README");
await sendMessage(sessionId, "Actually also check the CONTRIBUTING guide");
await sendMessage(sessionId, "And compare the two");
// 流式传输一次——agent 将所有三条消息作为一个连贯的回合响应
```

事件可以随时发送到 Session。无需等待特定的 session 状态即可通过 `client.beta.sessions.events.send()` 入队新事件。

### 中断

`interrupt` 事件**跳过队列**（优先于任何待处理的用户消息），强制 session 进入 `idle`。用于"停止"/"算了"/"取消"命令：

```ts
await client.beta.sessions.events.send(sessionId, {
  events: [{ type: 'interrupt' }],
});
```

Agent 在任务中途停止。它不会将中断视为消息——只是停止。发送后续的 `user` 事件来解释应该做什么。如果有活跃的 outcome，中断还会标记 `span.outcome_evaluation_end.result: "interrupted"`（参见 `shared/managed-agents-outcomes.md`）。

> **注意**：在当前实现中，中断事件的 ID 可能为空。进行故障排查时，使用 `processed_at` 时间戳及周围的事件 ID。

### 事件载荷

部分事件除了状态变更本身外还携带有用的元数据：

`session.status_idle`——包含 `stop_reason` 字段，详细说明 session 为何停止以及用户需要采取何种进一步行动。
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

`span.model_request_end` 包含 `model_usage` 字段，用于成本追踪和效率分析：

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

**`agent.thread_context_compacted`**——当对话历史被摘要以适应上下文时发出。包含 `pre_compaction_tokens` 以便你知道压缩了多少：

```json
{
  "id": "sevt_abc123",
  "processed_at": "2026-03-24T14:05:15.787Z",
  "type": "agent.thread_context_compacted"
}
```

### 归档

完成 session 后，将其归档以释放资源：

```ts
await client.beta.sessions.archive(sessionId);
```

> 归档 **session** 是常规清理——session 是每次运行一次性的。**不要将此推广到 agent 或 environment**：那些是持久的、可复用的资源，归档它们是永久的（没有取消归档；新 session 无法引用它们）。参见 `shared/managed-agents-overview.md` → 常见陷阱。
