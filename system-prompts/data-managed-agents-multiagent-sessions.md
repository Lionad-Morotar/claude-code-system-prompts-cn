<!--
name: 'Data: Managed Agents multiagent sessions'
description: 托管代理多代理会话的参考文档，包括协调器名册、线程、会话流事件、子代理工具权限及常见陷阱
ccVersion: 2.1.132
-->
# 托管代理 — 多代理会话

一个协调器代理可以在单个会话中委托给其他代理。所有代理**共享容器和文件系统**；每个代理在其自己的**线程**中运行 — 一个上下文隔离的事件流，拥有自己的对话历史、模型、系统提示词、工具、MCP 服务器和技能（来自该代理自身的配置）。线程是持久化的：协调器可以向之前调用的子代理发送后续消息，该子代理会保留其先前的轮次。

SDK 会自动在所有 `client.beta.{agents,sessions}.*` 调用上设置 `managed-agents-2026-04-01` beta 头；多代理无需额外的头。

---

## 在协调器上声明名册

`multiagent` 是 `agents.create()` / `agents.update()` 上的**顶级字段** — **不是** `tools[]` 条目。`agents` 列出 1–20 个名册条目。`sessions.create()` 上没有任何变化 — 名册从协调器的配置中解析。

```python
orchestrator = client.beta.agents.create(
    name="Engineering Lead",
    model="{{OPUS_ID}}",
    system="You coordinate engineering work. Delegate code review to the reviewer and test writing to the test agent.",
    tools=[{"type": "agent_toolset_20260401"}],
    multiagent={
        "type": "coordinator",
        "agents": [
            reviewer.id,                                            # 裸字符串 — 最新版本
            {"type": "agent", "id": test_writer.id, "version": 4},  # 固定版本
            {"type": "self"},                                       # 协调器自身
        ],
    },
)

session = client.beta.sessions.create(agent=orchestrator.id, environment_id=env.id)
```

| 名册条目 | 形状 | 说明 |
|---|---|---|
| 字符串简写 | `"agent_abc123"` | 引用已存储代理的最新版本。 |
| 代理引用 | `{type: "agent", id, version?}` | 省略 `version` 可在协调器保存时固定最新版本。 |
| 自身 | `{type: "self"}` | 协调器可以派生出自身的副本。 |

名册中最多 **20 个唯一代理**；协调器可以为每个代理派生**多个副本**。**仅支持一层委托** — 深度 > 1 将被忽略。

---

## 线程

会话级事件流是**主线程** — 它显示协调器的跟踪记录以及子代理活动的浓缩视图（线程状态转换和跨线程消息，而非每个子代理的工具调用）。通过各线程端点深入查看特定子代理：

| 操作 | HTTP | SDK (`client.beta.sessions.threads.*`) |
|---|---|---|
| 列出线程 | `GET /v1/sessions/{sid}/threads` | `.list(session_id)` |
| 检索单个线程 | `GET /v1/sessions/{sid}/threads/{tid}` | `.retrieve(thread_id, session_id=...)` |
| 归档 | `POST /v1/sessions/{sid}/threads/{tid}/archive` | `.archive(thread_id, session_id=...)` |
| 列出线程事件 | `GET /v1/sessions/{sid}/threads/{tid}/events` | `.events.list(thread_id, session_id=...)` |
| 流式传输线程事件 | `GET /v1/sessions/{sid}/threads/{tid}/stream` | `.events.stream(thread_id, session_id=...)` |

每个 `SessionThread` 携带 `id`、`status`（`running` | `idle` | `rescheduling` | `terminated`）、`agent`（代理配置的已解析快照 — `id`、`name`、`model`、`system`、`tools`、`skills`、`mcp_servers`、`version`）、`parent_thread_id`（主线程为 null，主线程包含在列表中）、`archived_at` 以及可选的 `stats`/`usage`。**会话状态聚合线程状态** — 如果有任何线程为 `running`，则 `session.status` 为 `running`。最大 **25 个并发线程**。在消费各线程流时，当遇到 `session.thread_status_idle` 时中断（并检查其 `stop_reason`，与检查会话级 idle 的方式相同）。

---

## 多代理事件（在会话流上）

| 事件 | 负载要点 | 含义 |
|---|---|---|
| `session.thread_created` | `session_thread_id`, `agent_name` | 创建了新线程。 |
| `session.thread_status_running` | `session_thread_id`, `agent_name` | 线程开始活动。 |
| `session.thread_status_idle` | `session_thread_id`, `agent_name`, **`stop_reason`** | 线程正在等待输入。检查 `stop_reason`（与 `session.status_idle.stop_reason` 相同形状）。 |
| `session.thread_status_rescheduled` | `session_thread_id`, `agent_name` | 线程在可重试错误后正在重新调度。 |
| `session.thread_status_terminated` | `session_thread_id`, `agent_name` | 线程已被归档或遇到致命错误。 |
| `agent.thread_message_sent` | `to_session_thread_id`, `to_agent_name`, `content` | 协调器向另一个线程发送了后续消息。 |
| `agent.thread_message_received` | `from_session_thread_id`, `from_agent_name`, `content` | 代理将其结果传递给协调器。 |

---

## 来自子代理线程的工具权限和自定义工具

当子代理需要你的客户端（`always_ask` 确认或自定义工具结果）时，请求会被**交叉投递到主线程**，并附带标识发起线程的 `session_thread_id` — 因此你只需监听会话流。以 `user.tool_confirmation`（携带 `tool_use_id`）或 `user.custom_tool_result`（携带 `custom_tool_use_id`）回复，并**回传发起事件中的 `session_thread_id`**（SDK 参数类型和文档字符串期望该字段）。服务器也会根据工具使用 ID 进行路由，因此回传是双重保障而非关键依赖 — 但仍需包含它。

```python
for event_id in stop.event_ids:
    pending = events_by_id[event_id]
    confirmation = {
        "type": "user.tool_confirmation",
        "tool_use_id": event_id,
        "result": "allow",
    }
    if pending.session_thread_id is not None:
        confirmation["session_thread_id"] = pending.session_thread_id
    client.beta.sessions.events.send(session.id, events=[confirmation])
```

同样的模式适用于 `user.custom_tool_result`。

---

## 常见陷阱

- **不要将名册放在 `sessions.create()` 或 `tools[]` 中。** `multiagent` 是代理的顶级字段；更新协调器，然后启动引用它的会话。
- **不要假设共享上下文。** 线程共享文件系统，但不共享对话历史或工具。如果协调器需要子代理对某事进行操作，必须在委托消息中说明（或将其写入磁盘）。
- **深度 > 1 将被忽略。** 子代理自身的 `multiagent` 名册（如果有）不会级联 — 只有会话的协调器进行委托。

关于 Python 之外各语言的绑定，请通过 WebFetch 获取 `https://platform.claude.com/docs/en/managed-agents/multi-agent.md`（参见 `shared/live-sources.md`）。
