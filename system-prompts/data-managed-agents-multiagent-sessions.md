<!--
name: 'Data: Managed Agents multiagent sessions'
description: 托管代理多代理会话参考文档，包括协调者名册、线程、会话流事件、子代理工具权限和常见陷阱
ccVersion: 2.1.197
-->
# 托管代理 — 多代理会话

协调者代理可以在一个会话中将任务委派给其他代理。所有代理**共享容器和文件系统**；每个代理在自己的**线程**中运行——一个上下文隔离的事件流，拥有自己的对话历史、模型、系统提示词、工具、MCP 服务器和技能（来自该代理自身的配置）。线程是持久的：协调者可以向之前调用的子代理发送后续消息，该子代理会保留其之前的对话轮次。

SDK 会在所有 `client.beta.{agents,sessions}.*` 调用上自动设置 `managed-agents-2026-04-01` beta 头；多代理功能无需额外的头信息。

---

## 在协调者上声明名册

`multiagent` 是 `agents.create()` / `agents.update()` 上的**顶级字段**——**不是** `tools[]` 条目。`agents` 列出 1–20 个名册条目。`sessions.create()` 上无需任何更改——名册从协调者的配置中解析。

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
            {"type": "self"},                                       # 协调者自身
        ],
    },
)

session = client.beta.sessions.create(agent=orchestrator.id, environment_id=env.id)
```

| 名册条目 | 形式 | 说明 |
|---|---|---|
| 字符串简写 | `"agent_abc123"` | 引用已存储代理的最新版本。 |
| 代理引用 | `{type: "agent", id, version?}` | 省略 `version` 则固定协调者保存时的最新版本。 |
| 自身 | `{type: "self"}` | 协调者可以生成自身的副本。 |

如果会话是使用 `agent_with_overrides` 创建的（参见 `shared/managed-agents-core.md` → 覆盖会话的代理配置），这些覆盖适用于**协调者及其 `self` 副本**。通过 ID 引用的名册代理始终使用其自身的创建配置——覆盖不会传播到它们。

名册中最多 **20 个唯一代理**；协调者可以为每个代理生成**多个副本**。**仅支持一级委派**——深度 > 1 会被忽略。

---

## 线程

会话级事件流是**主线程**——它显示协调者的追踪以及子代理活动的概览（线程状态转换和跨线程消息，而非每个子代理的工具调用）。通过每线程端点钻取特定子代理：

| 操作 | HTTP | SDK (`client.beta.sessions.threads.*`) |
|---|---|---|
| 列出线程 | `GET /v1/sessions/{sid}/threads` | `.list(session_id)` |
| 获取单个 | `GET /v1/sessions/{sid}/threads/{tid}` | `.retrieve(thread_id, session_id=...)` |
| 归档 | `POST /v1/sessions/{sid}/threads/{tid}/archive` | `.archive(thread_id, session_id=...)` |
| 列出线程事件 | `GET /v1/sessions/{sid}/threads/{tid}/events` | `.events.list(thread_id, session_id=...)` |
| 流式传输线程事件 | `GET /v1/sessions/{sid}/threads/{tid}/stream` | `.events.stream(thread_id, session_id=...)` |

每个 `SessionThread` 包含 `id`、`status`（`running` | `idle` | `rescheduling` | `terminated`）、`agent`（代理配置的解析快照——`id`、`name`、`model`、`system`、`tools`、`skills`、`mcp_servers`、`version`）、`parent_thread_id`（主线程为 null，主线程也包含在列表中）、`archived_at`，以及可选的 `stats`/`usage`。**会话状态聚合线程状态**——如果任何线程为 `running`，则 `session.status` 为 `running`。最多 **25 个并发线程**。排空每线程流时，在 `session.thread_status_idle` 处中断（并像处理会话级 idle 一样检查其 `stop_reason`）。

---

## 多代理事件（在会话流上）

| 事件 | 载荷要点 | 含义 |
|---|---|---|
| `session.thread_created` | `session_thread_id`、`agent_name` | 新线程已创建。 |
| `session.thread_status_running` | `session_thread_id`、`agent_name` | 线程开始活动。 |
| `session.thread_status_idle` | `session_thread_id`、`agent_name`、**`stop_reason`** | 线程正在等待输入。检查 `stop_reason`（与 `session.status_idle.stop_reason` 形状相同）。 |
| `session.thread_status_rescheduled` | `session_thread_id`、`agent_name` | 线程在可重试错误后重新调度。 |
| `session.thread_status_terminated` | `session_thread_id`、`agent_name` | 线程已归档或遇到终端错误。 |
| `agent.thread_message_sent` | `to_session_thread_id`、`to_agent_name`、`content` | 协调者向另一个线程发送了后续消息。 |
| `agent.thread_message_received` | `from_session_thread_id`、`from_agent_name`、`content` | 代理将其结果传递给了协调者。 |

---

## 子代理线程的工具权限和自定义工具

当子代理需要你的客户端参与时（`always_ask` 确认或自定义工具结果），请求会被**跨线程发布到主线程**，并带有 `session_thread_id` 标识发起线程——因此你只需监视会话流。使用 `user.tool_confirmation`（携带 `tool_use_id`）或 `user.custom_tool_result`（携带 `custom_tool_use_id`）回复，并**回显发起事件中的 `session_thread_id`**（SDK 参数类型和文档字符串期望如此）。服务器也通过工具使用 ID 进行路由，所以回显是双重保险——但请包含它。

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

`user.custom_tool_result` 也遵循相同模式。

---

## 常见陷阱

- **不要将名册放在 `sessions.create()` 或 `tools[]` 中。** `multiagent` 是顶级代理字段；先更新协调者，再启动引用它的会话。
- **不要假设共享上下文。** 线程共享文件系统但不共享对话历史或工具。如果协调者需要子代理对某些内容执行操作，必须在委派消息中明确说明（或将其写入磁盘）。
- **深度 > 1 会被忽略。** 子代理自身的 `multiagent` 名册（如果有）不会级联——只有会话的协调者进行委派。

如需 Python 以外的语言绑定详情，请 WebFetch `https://platform.claude.com/docs/en/managed-agents/multi-agent.md`（参见 `shared/live-sources.md`）。
