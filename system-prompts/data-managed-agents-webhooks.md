<!--
name: 'Data: Managed Agents webhooks'
description: 托管代理 Webhook 的参考文档，包括端点注册、签名验证、负载信封、支持的事件类型、投递行为及常见陷阱
ccVersion: 2.1.132
-->
# 托管代理 — Webhook

当托管代理资源状态发生变化时，Anthropic 可以向你的 HTTPS 端点发送 POST 请求 — 作为保持 SSE 流或轮询的替代方案。负载是**精简的**（仅事件类型 + 资源 ID）；收到后，获取资源以获取当前状态。每次投递均经过 HMAC 签名。

> **方向很重要。** 本页涵盖 *Anthropic → 你* 关于会话/保管库状态的通知。它**不**涵盖*触发*会话的*第三方 → 你* Webhook（例如调用 `sessions.create()` 的 GitHub push 处理器）— 那是你端的普通应用程序代码，没有 Anthropic 特定的传输格式。

---

## 注册端点（仅限控制台）

控制台 → **管理 → Webhook**。目前尚无编程式端点管理 API。密钥轮换在同一页面支持。

| 字段 | 约束 |
|---|---|
| URL | HTTPS 端口 443，公开可解析的主机名 |
| 事件类型 | 按 `data.type` 订阅 — 你只接收已订阅的类型（加上测试事件） |
| 签名密钥 | `whsec_` 前缀，32 字节，**创建时仅显示一次** — 保存好 |

---

## 验证签名

每次投递均经过 HMAC 签名。**使用 SDK 的 `client.beta.webhooks.unwrap()`** — 它验证签名，拒绝超过约 5 分钟的负载，并返回解析后的事件。它从 `ANTHROPIC_WEBHOOK_SIGNING_KEY` 读取 `whsec_` 密钥。

```python
import anthropic
from flask import Flask, request

client = anthropic.Anthropic()  # 从环境变量读取 ANTHROPIC_WEBHOOK_SIGNING_KEY
app = Flask(__name__)


@app.route("/webhook", methods=["POST"])
def webhook():
    try:
        event = client.beta.webhooks.unwrap(
            request.get_data(as_text=True),
            headers=dict(request.headers),
        )
    except Exception:
        return "invalid signature", 400

    if event.id in seen_event_ids:  # 去重重试 — id 是每个事件唯一，而非每次投递唯一
        return "", 204
    seen_event_ids.add(event.id)

    match event.data.type:
        case "session.status_idled":
            session = client.beta.sessions.retrieve(event.data.id)
            notify_user(session)
        case "vault_credential.refresh_failed":
            alert_oncall(event.data.id)

    return "", 204
```

将**原始请求体**传递给 `unwrap()` — 重新序列化 JSON 的框架（Express `.json()`、Flask `.get_json()`）会改变字节并破坏 MAC。对于其他语言，在 SDK 仓库中查找 `beta.webhooks.unwrap` 绑定（`shared/live-sources.md`）；不要手动实现验证。

---

## 负载信封

```json
{
  "type": "event",
  "id": "event_01ABC...",
  "created_at": "2026-03-18T14:05:22Z",
  "data": {
    "type": "session.status_idled",
    "id": "session_01XYZ...",
    "organization_id": "8a3d2f1e-...",
    "workspace_id": "c7b0e4d9-..."
  }
}
```

根据 `data.type` 进行分支，通过 `data.id` 获取资源，返回任何 **2xx** 以确认。`created_at` 是*状态转换*发生的时间，而非 Webhook 触发的时间。

---

## 支持的 `data.type` 值

| `data.type` | 触发时机 |
|---|---|
| `session.status_scheduled` | 会话已创建并准备好接受事件 |
| `session.status_run_started` | 代理执行已启动（每次转换到 `running`） |
| `session.status_idled` | 代理正在等待输入（工具审批、自定义工具结果或下一条消息） |
| `session.status_terminated` | 会话遇到致命错误 |
| `session.thread_created` | 多代理：协调器打开了新的子代理线程 |
| `session.thread_idled` | 多代理：子代理线程正在等待输入 |
| `session.outcome_evaluation_ended` | 成果评分器完成了一次迭代 |
| `vault.archived` | 保管库已被归档 |
| `vault.created` | 保管库已创建 |
| `vault.deleted` | 保管库已删除 |
| `vault_credential.archived` | 保管库凭证已被归档 |
| `vault_credential.created` | 保管库凭证已创建 |
| `vault_credential.deleted` | 保管库凭证已删除 |
| `vault_credential.refresh_failed` | MCP OAuth 保管库凭证刷新失败 |

> 这些是 **Webhook** 的 `data.type` 值 — 与 SSE 事件类型（`session.status_idle`、`span.outcome_evaluation_end` 等，位于 `shared/managed-agents-events.md`）是不同的命名空间。不要在 Webhook 处理器中复用 SSE 常量。

---

## 投递行为与常见陷阱

- **无顺序保证。** `session.status_idled` 可能在 `session.outcome_evaluation_ended` 之前到达，即使评估先完成。如果顺序很重要，按信封 `created_at` 排序。
- **重试携带相同的 `event.id`。** 非 2xx 时至少重试一次。按 `event.id` 去重。
- **3xx 视为失败。** 不会跟随重定向 — 如果端点迁移，请在控制台中更新 URL。
- **自动禁用**，在连续投递失败约 20 次后，或当主机名解析为私有 IP 或返回重定向时立即禁用。在控制台中手动重新启用。
- **精简负载是设计意图。** 不要期望 Webhook 体上包含 `stop_reason`、`outcome_evaluations`、凭证密钥等 — 请获取资源。
