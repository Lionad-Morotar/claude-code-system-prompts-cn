<!--
name: 'Data: Managed Agents outcomes'
description: 托管代理成果的参考文档，包括 user.define_outcome 事件、评分标准、成果评估事件、交付物及交互规则
ccVersion: 2.1.132
-->
# 托管代理 — 成果

一个**成果**将会话从*对话*提升为*工作*：你声明"完成"的含义，工具链运行 迭代 → 评分 → 修改 循环，直到产物满足评分标准、达到 `max_iterations` 或被中断。一个独立的**评分器**（独立的上下文窗口）根据你的评分标准对每次迭代进行评分，并将各标准的差距反馈给代理。

SDK 会自动在所有 `client.beta.sessions.*` 调用上设置 `managed-agents-2026-04-01` beta 头；成果无需额外的头。

---

## `user.define_outcome` 事件

成果不是 `sessions.create()` 的字段。你创建一个普通会话，然后发送一个 `user.define_outcome` 事件。代理在收到时开始工作 — **不要同时发送 `user.message`** 来启动它。

```python
session = client.beta.sessions.create(
    agent=AGENT_ID,
    environment_id=ENVIRONMENT_ID,
    title="Financial analysis on Costco",
)

client.beta.sessions.events.send(
    session_id=session.id,
    events=[
        {
            "type": "user.define_outcome",
            "description": "Build a DCF model for Costco in .xlsx",
            "rubric": {"type": "text", "content": RUBRIC_MD},
            # 或： "rubric": {"type": "file", "file_id": rubric.id}
            "max_iterations": 5,  # 可选；默认 3，最大 20
        }
    ],
)
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `type` | `"user.define_outcome"` | |
| `description` | string | 任务描述。代理围绕此目标工作 — 无需单独的 `user.message`。 |
| `rubric` | `{type: "text", content}` \| `{type: "file", file_id}` | **必需。** 带有明确的、可独立评分标准的 Markdown。通过 `client.beta.files.upload(...)`（beta `files-api-2025-04-14`）上传一次即可在多个会话中复用。 |
| `max_iterations` | int | 可选。默认 **3**，最大 **20**。 |

该事件会在流上回显，带有服务器分配的 `outcome_id` 和 `processed_at`。

> **编写评分标准。** 使用明确的、可评分的标准（"CSV 有一个数值型的 `price` 列"），而非模糊的感觉（"数据看起来不错"）— 评分器会独立对每个标准评分，因此模糊的标准会产生嘈杂的循环。如果你没有评分标准，可以让 Claude 分析一个已知良好的产物，然后将该分析转化为评分标准。

---

## 成果特定事件

这些事件出现在标准事件流（`sessions.events.stream` / `.list`）上，与通常的 `agent.*` / `session.*` 事件并列。

| 事件 | 负载要点 | 含义 |
|---|---|---|
| `span.outcome_evaluation_start` | `outcome_id`, `iteration`（从 0 开始） | 评分器开始对第 *N* 次迭代评分。 |
| `span.outcome_evaluation_ongoing` | `outcome_id` | 评分器运行期间的心跳。评分器的推理是不透明的 — 你只能看到它*正在*工作，而非它在*想*什么。 |
| `span.outcome_evaluation_end` | `outcome_evaluation_start_id`, `outcome_id`, `iteration`, `result`, `explanation`, `usage` | 评分器完成一次迭代。`result` 决定接下来发生什么（见下表）。 |

### `span.outcome_evaluation_end.result`

| `result` | 下一步 |
|---|---|
| `satisfied` | 会话 → `idle`。本次成果的终态。 |
| `needs_revision` | 代理开始另一次迭代。 |
| `max_iterations_reached` | 不再进行评分周期。代理可能运行一次最终修订，然后会话 → `idle`。 |
| `failed` | 会话 → `idle`。评分标准从根本上与任务不匹配（例如描述和评分标准矛盾）。 |
| `interrupted` | 仅在 `_start` 已触发后 `user.interrupt` 到达时发出。 |

```json
{
  "type": "span.outcome_evaluation_end",
  "id": "sevt_01jkl...",
  "outcome_evaluation_start_id": "sevt_01def...",
  "outcome_id": "outc_01a...",
  "result": "satisfied",
  "explanation": "All 12 criteria met: revenue projections use 5 years of historical data, ...",
  "iteration": 0,
  "usage": { "input_tokens": 2400, "output_tokens": 350, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 1800 },
  "processed_at": "2026-03-25T14:03:00Z"
}
```

---

## 检查状态与获取交付物

**状态** — 要么监听流中的 `span.outcome_evaluation_end`，要么轮询会话并读取 `outcome_evaluations`：

```python
session = client.beta.sessions.retrieve(session.id)
for ev in session.outcome_evaluations:
    print(f"{ev.outcome_id}: {ev.result}")  # outc_01a...: satisfied
```

**交付物** — 代理写入 `/mnt/session/outputs/`。一旦 idle，通过 Files API 使用 `scope_id=session.id` 获取。这与 `shared/managed-agents-environments.md` → 会话输出（包括 `files.list` 上的双 beta 头要求）中记录的会话输出机制相同。

---

## 交互规则与常见陷阱

- **一次一个成果。** 仅在前一个成果的终态 `span.outcome_evaluation_end`（`satisfied` / `max_iterations_reached` / `failed` / `interrupted`）之后，才发送下一个 `user.define_outcome`。会话在链式成果之间保留历史记录。
- **允许但不强制引导。** 你*可以*在成果进行中发送 `user.message` 事件来调整方向，但代理已经知道要继续工作直到终态 — 不要发送"继续"提示。
- **`user.interrupt` 暂停当前成果** — 它将 `result` 标记为 `"interrupted"` 并使会话进入 `idle`，准备好接受新成果或对话轮次。
- **终态后，会话可复用** — 继续对话或定义新成果。
- **成果不是 session-create 字段。** 不要将 `outcome`、`rubric` 或 `description` 放在 `sessions.create()` 上 — 成果始终作为 `user.define_outcome` 事件发送。
- **idle 中断门槛不变。** 在你的消费循环中，继续使用 `event.type === 'session.status_idle' && event.stop_reason?.type !== 'requires_action'` — **不要**仅用 `span.outcome_evaluation_end` 作为门槛（在 `needs_revision` 时会话仍在运行）。参见 `shared/managed-agents-client-patterns.md` 模式 5。

关于原始 HTTP 形状和 Python 之外各语言 SDK 绑定，请通过 WebFetch 获取 `https://platform.claude.com/docs/en/managed-agents/define-outcomes.md`（参见 `shared/live-sources.md`）。
