<!--
name: 'Data: Managed Agents events and steering'
description: Reference guide for sending and receiving events on managed agent sessions, including streaming, polling, reconnection, message queuing, interrupts, and event payload details
ccVersion: 2.1.105
-->
# Managed Agents — Events 与 Steering

## Events

### 发送 Events

通过 `POST /v1/sessions/{id}/events` 向 session 发送 events。

| Event Type                | 发送时机                                        |
| ------------------------- | --------------------------------------------------- |
| `user.message`            | 发送用户消息 |
| `user.interrupt`          | 在 agent 运行时中断它 |
| `user.tool_confirmation`  | 批准/拒绝工具调用（当 `always_ask` 策略生效时） |
| `user.custom_tool_result` | 为自定义工具调用提供结果 |

### 接收 Events

两种方式：

1. **流式（SSE）**：`GET /v1/sessions/{id}/events/stream`——实时 Server-Sent Events。**长连接**——服务器会发送周期性心跳以保持连接活跃。
2. **轮询**：`GET /v1/sessions/{id}/events`——分页事件列表（查询参数：`limit` 默认 1000，`page`）。**立即返回**——这是普通的 GET 分页请求，不是长轮询。

所有接收到的事件都带有 `id`、`type` 和 `processed_at`（ISO 8601；如果 agent 尚未处理则为 `null`）。

> ⚠️ **健壮的轮询（裸 HTTP）。** 如果你绕过 SDK 自行实现轮询循环，不要依赖 `requests` 或 `httpx` 的 timeout 参数作为墙上时钟上限——它们是**按数据块**的读取超时，每收到一个字节就会重置。流式响应（心跳、卡住的分块编码响应体、行为异常的代理）即使设置了 `timeout=(5, 60)` 或 `httpx.Timeout(120)` 也可能无限期阻塞。这两个库都没有内置"总墙上时钟"超时。要实现硬性截止：在循环层面跟踪 `time.monotonic()`，如果单次请求超出预算则中断/取消（例如通过看门狗线程，或异步 httpx 外围的 `asyncio.wait_for()`）。**推荐使用 SDK**——`client.beta.sessions.events.stream()` 和 `client.beta.sessions.events.list()` 能合理处理超时和重试。
>
> 如果 `GET /v1/sessions/{id}/events`（分页）在返回响应头之后挂起，你可能误用了 `GET /v1/sessions/{id}/events` 或遇到了服务端停滞——请报告此问题，不要将其视为客户端配置问题。

### Event Types（接收到的）

Event 类型使用点号命名法，按命名空间分组：

| Event Type | 描述 |
| --- | --- |
| `agent.message` | Agent 文本输出 |
| `agent.thinking` | Extended thinking 块 |
| `agent.tool_use` | Agent 使用了内置工具（`agent_toolset_20260401`） |
| `agent.tool_result` | 内置工具的结果 |
| `agent.mcp_tool_use` | Agent 使用了 MCP 工具 |
| `agent.mcp_tool_result` | MCP 工具的结果 |
| `agent.custom_tool_use` | Agent 调用了自定义工具——session 进入 idle，你以 `user.custom_tool_result` 响应 |
| `agent.thread_context_compacted` | 对话上下文被压缩 |
| `session.status_idle` | Agent 已完成当前任务，等待输入。它要么在等待通过 `user.message` 继续工作，要么被阻塞等待 `user.custom_tool_result` 或 `user.tool_confirmation`。附加的 `stop_reason` 包含 Agent 停止工作的更多原因信息。 |
| `session.status_running` | Session 已开始运行，Agent 正在执行工作。 |
| `session.status_rescheduled` | Session 在发生可重试错误后正在（重新）调度，等待编排系统接管。 |
| `session.status_terminated` | Session 已终止，进入不可逆且不可用的状态。 |
| `session.error` | 处理过程中发生错误 |
| `span.model_request_start` | 模型推理开始 |
| `span.model_request_end` | 模型推理完成 |

流也会回显用户发送的 events（`user.message`、`user.interrupt`、`user.tool_confirmation`、`user.custom_tool_result`）。

---

## Steering 模式

通过 events 接口驱动 session 的实用模式。

### 流优先顺序

**在发送 events 之前打开流。** 流只会传递在它打开*之后*发生的事件——它不会回放当前状态或历史事件。如果你先发送消息再打开流，早期事件（包括快速的状态转换）会缓冲在单个批次中到达，你将失去实时响应它们的能力。

```ts
// ✅ 正确——流和发送并发执行
const [response] = await Promise.all([
  streamEvents(sessionId),   // 打开 SSE 连接
  sendMessage(sessionId, text),
]);

// ❌ 错误——流打开之前的事件作为单个缓冲批次到达
await sendMessage(sessionId, text);
const response = await streamEvents(sessionId);
```

**获取完整历史，** 使用 `GET /v1/sessions/{id}/events`（分页列表）——流只提供从连接时刻起的实时事件。

### 流断开后重连

**SSE 流没有重放功能。** 如果你的连接断开（httpx 读取超时、网络抖动）后重连，你只能获得重连*之后*发出的事件。断开期间发出的任何事件都会从流中丢失。

**合并模式：** 每次（重新）连接时，将流与历史获取重叠，通过 event ID 去重：

```python
def connect_with_consolidation(client, session_id):
    # 1. 先打开 SSE 流
    stream = client.beta.sessions.events.stream(session_id=session_id)

    # 2. 获取历史以覆盖任何间隔
    history = client.beta.sessions.events.list(
        session_id=session_id,
    )

    # 3. 先产出历史，再产出流——通过 event.id 去重
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

**你不需要等待响应再发送下一条消息。** 用户 events 在服务端排队，按顺序处理。这对聊天桥接场景很有用，当用户快速发送后续消息时：

```ts
// 三条消息全部进入同一个 session；agent 按顺序处理
await sendMessage(sessionId, "Summarize the README");
await sendMessage(sessionId, "Actually also check the CONTRIBUTING guide");
await sendMessage(sessionId, "And compare the two");
// 流式接收一次——agent 将三条消息作为一个连贯的 turn 来响应
```

Events 可以随时发送到 Session。不需要等待特定的 session 状态就可以通过 `client.beta.sessions.events.send()` 入队新事件。

### Interrupt

`interrupt` 事件**跳过队列**（排在任何待处理的用户消息之前），强制 session 进入 `idle`。用于"停止"/"算了"/"取消"命令：

```ts
await client.beta.sessions.events.send(sessionId, {
  events: [{ type: 'interrupt' }],
});
```

Agent 在任务中途停止。它不会将 interrupt 视为消息——只是暂停。发送后续 `user` 事件来说明接下来该做什么。

> **注意**：在当前实现中，Interrupt 事件的 ID 可能为空。排查问题时，请使用 `processed_at` 时间戳结合周围事件 ID 来判断。

### Event 载荷

部分事件携带了超出状态变更本身的有用元数据：

`session.status_idle`——包含 `stop_reason` 字段，详细说明 session 为何停止以及需要用户采取什么类型的进一步操作。
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

**`agent.thread_context_compacted`**——当对话历史被摘要压缩以适应上下文时发出。包含 `pre_compaction_tokens` 以便了解压缩了多少内容：

```json
{
  "id": "sevt_abc123",
  "processed_at": "2026-03-24T14:05:15.787Z",
  "type": "agent.thread_context_compacted"
}
```

### Archive

完成 session 后，将其归档以释放资源：

```ts
await client.beta.sessions.archive(sessionId);
```

> 归档 **session** 是常规清理操作——session 是按次运行、可丢弃的。**不要将此推广到 agent 或 environment**：这些是持久化、可复用的资源，归档它们是永久性的（不可 unarchive；新 session 无法引用它们）。参见 `shared/managed-agents-overview.md` → Common Pitfalls。
