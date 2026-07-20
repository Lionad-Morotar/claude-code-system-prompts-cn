<!--
name: 'Data: Managed Agents Webhooks'
description: 托管代理 Webhook 指南，包括注册端点、验证 HMAC 签名、处理事件载荷和处理重试。
ccVersion: 2.1.197
-->
# 托管代理 — Webhooks

Anthropic 可以在托管代理资源状态变更时向你的 HTTPS 端点发送 POST 请求——这是持有 SSE 流或轮询的替代方案。载荷是**精简的**（仅包含事件类型和资源 ID）；收到后，请获取资源以获取当前状态。每次投递都会进行 HMAC 签名。

> **方向很重要。** 本页面涵盖*Anthropic → 你*的关于会话/保管库状态的通知。它**不**涵盖*第三方 → 你*的用于*触发*会话的 webhook（例如调用 `sessions.create()` 的 GitHub push 处理器）——那是你侧的普通应用代码，没有 Anthropic 特定的线路格式。

---

## 注册端点（仅限 Console）

Console → **Manage → Webhooks**。目前没有编程式的端点管理 API。密钥轮换在同一页面支持。

| 字段 | 约束 |
|---|---|
| URL | 443 端口上的 HTTPS，公开可解析的主机名 |
| 事件类型 | 按 `data.type` 订阅——你只会收到已订阅的类型（加上测试事件） |
| 签名密钥 | `whsec_` 前缀，32 字节，**创建时仅显示一次**——请妥善保存 |

---

## 验证签名

每次投递都会进行 HMAC 签名。**使用 SDK 的 `client.beta.webhooks.unwrap()`**——它会验证签名、拒绝超过约 5 分钟前的载荷，并返回解析后的事件。它从 `ANTHROPIC_WEBHOOK_SIGNING_KEY` 读取 `whsec_` 密钥。

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

    if event.id in seen_event_ids:  # 去重重试——id 是每事件唯一的，不是每投递
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

将**原始请求体**传递给 `unwrap()`——会重新序列化 JSON 的框架（Express 的 `.json()`、Flask 的 `.get_json()`）会改变字节并破坏 MAC。对于其他语言，请在 SDK 仓库中查找 `beta.webhooks.unwrap` 绑定（`shared/live-sources.md`）；不要手动实现验证。

---

## 载荷信封

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

根据 `data.type` 进行分支处理，通过 `data.id` 获取资源，返回任何 **2xx** 状态码确认。`created_at` 是*状态转换*发生的时间，不是 webhook 触发的时间。

---

## 支持的 `data.type` 值

| `data.type` | 触发时机 |
|---|---|
| `session.status_scheduled` | 会话已创建并准备好接受事件 |
| `session.status_run_started` | 代理执行开始（每次转换为 `running`） |
| `session.status_idled` | 代理等待输入（工具审批、自定义工具结果或下一条消息） |
| `session.status_terminated` | 会话遇到终端错误 |
| `session.thread_created` | 多代理：协调者开启了新的子代理线程 |
| `session.thread_idled` | 多代理：子代理线程正在等待输入 |
| `session.outcome_evaluation_ended` | 结果评分器完成一次迭代 |
| `vault.archived` | 保管库已归档 |
| `vault.created` | 保管库已创建 |
| `vault.deleted` | 保管库已删除 |
| `vault_credential.archived` | 保管库凭证已归档 |
| `vault_credential.created` | 保管库凭证已创建 |
| `vault_credential.deleted` | 保管库凭证已删除 |
| `vault_credential.refresh_failed` | MCP OAuth 保管库凭证刷新失败 |
| `agent.created` | 代理已创建 |
| `agent.updated` | 新的代理版本已发布。不创建新版本的更新**不会**触发此事件。 |
| `agent.archived` | 代理已归档 |
| `agent.deleted` | 代理已永久删除——没有可获取的对象；将事件本身视为最终状态 |
| `deployment.created` | 定时部署已创建 |
| `deployment.updated` | 部署属性已更改（例如调度已编辑） |
| `deployment.paused` | 部署已暂停——手动暂停，或在定时运行遇到**不可恢复**错误（代理已归档、环境缺失）时自动暂停。可恢复的失败（包括速率限制）**不会**自动暂停。 |
| `deployment.unpaused` | 部署已恢复；调度继续 |
| `deployment.archived` | 部署已归档——直接归档，或因代理归档/删除而导致 |
| `deployment.deleted` | 部署已永久删除——没有可获取的对象；将事件本身视为最终状态 |
| `deployment_run.started` | **定时**运行已开始。手动运行**不会**发出 `deployment_run.*` 事件。 |
| `deployment_run.succeeded` | 定时运行已创建会话。与运行的 `.started` 事件相同的 `data.id`（运行 ID）——获取部署运行以获取 `session_id`，然后订阅会话事件以跟踪工作。 |
| `deployment_run.failed` | 定时运行未创建会话。与运行的 `.started` 事件相同的 `data.id`——获取部署运行以获取 `error.type` / `error.message`。 |

> 这些是 **webhook** 的 `data.type` 值——与 SSE 事件类型（`shared/managed-agents-events.md` 中的 `session.status_idle`、`span.outcome_evaluation_end` 等）是不同的命名空间。不要在 webhook 处理器中复用 SSE 常量。

---

## 投递行为与常见陷阱

- **无顺序保证。** 即使评估先完成，`session.status_idled` 也可能在 `session.outcome_evaluation_ended` 之前到达。如果顺序重要，请按信封中的 `created_at` 排序。
- **重试携带相同的 `event.id`。** 非 2xx 响应至少会重试一次。根据 `event.id` 去重。
- **3xx 视为失败。** 不会跟随重定向——如果端点迁移了，请在 Console 中更新 URL。
- **自动禁用** 在约 20 次连续投递失败后，或立即在主机名解析到私有 IP 或返回重定向时。在 Console 中手动重新启用。
- **精简载荷是有意为之。** 不要在 webhook 正文中期望 `stop_reason`、`outcome_evaluations`、凭证密钥等——请获取资源。
