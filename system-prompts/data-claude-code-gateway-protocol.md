<!--
name: 'Data: Claude Code gateway protocol'
description: Markdown 参考文档，记录 Claude Code 网关的线路协议，包括 OAuth 2.0 设备流程、RFC 8414 发现、Messages API 推理、托管设置、模型发现、OTLP 遥测、错误信封、TLS 证书固定，以及代理到 Bedrock、Vertex 和 Foundry
ccVersion: 2.1.211
-->
# Claude Code 网关协议

这是 Claude Code CLI 用于与此网关通信的线路协议：
登录、推理、托管设置和遥测。它由网关本身提供，
因此始终与你运行的版本匹配。

> **稳定性：** 此协议的存在是为了给你一个比代理原始 CLI
> 流量更稳定的目标。认证使用标准 OAuth 2.0，推理使用
> Messages API，标头是跨后端的最低公共子集。我们在合理范围内
> 保持向后兼容以支持旧客户端，但不是永久的——预计会有变更，
> 尤其是托管设置，会提前通知。

开发者通过 `/login` 将 Claude Code 指向你的网关基础 URL，
客户端完成其余操作。以下所有路径均相对于该基础 URL，
客户端不跟随跨域重定向。

## 流程

1. 客户端获取 `GET {base}/.well-known/oauth-authorization-server`。
2. 首次接触时，客户端指纹识别你的 TLS 证书并要求用户信任它。
3. 客户端运行 RFC 8628 设备流程：`POST device_authorization_endpoint`
   -> 用户在 `verification_uri` 的浏览器中批准 -> 客户端轮询
   `token_endpoint` 直到获得 bearer 令牌。
4. 客户端在后续每个请求中发送 `Authorization: Bearer <token>`。
5. 客户端使用 `{base}` 下的固定路径进行推理 (`/v1/messages`)、
   策略 (`/managed/settings`)、模型发现 (`/v1/models`) 和
   遥测 (`/v1/{metrics,logs,traces}`)。
6. 在令牌过期前，客户端静默调用 `token_endpoint`，
   `grant_type=refresh_token`。如果你未颁发刷新令牌，用户
   将被送回浏览器流程。

## 发现 — 必需

`GET /.well-known/oauth-authorization-server`（未认证）

RFC 8414 授权服务器元数据。客户端读取
`device_authorization_endpoint` 和 `token_endpoint` 并忽略其余；
两者必须与 `{base}` 同源。`authorization_endpoint` 故意缺失。

    {
      "issuer": "https://gw.corp.example.com",
      "device_authorization_endpoint": "https://gw.corp.example.com/device",
      "token_endpoint": "https://gw.corp.example.com/token"
    }

客户端对缺失的字段不报错；只使用存在的字段。

## 设备授权 — 必需

`POST {device_authorization_endpoint}`（未认证，
`application/x-www-form-urlencoded`）

RFC 8628。接受 `client_id` 和可选的 `scope`；返回
`{"device_code","user_code","verification_uri","expires_in","interval"?}`。
客户端按 `interval`（默认 5 秒）轮询令牌端点。

`GET/POST {verification_uri}`（浏览器端；客户端从不调用此端点）

接受用户代码，针对你的 IdP 认证用户，并标记
匹配的 `device_code` 已批准，以便下一次令牌轮询成功。应用
每 IP 速率限制（RFC 8628 §5.1），不要自动提交预填充的代码
（§5.4）。

## 令牌 — 必需

`POST {token_endpoint}`（未认证，
`application/x-www-form-urlencoded`）

**设备授权**（`grant_type=urn:ietf:params:oauth:grant-type:device_code`）：

| 状态 | 响应体 | 客户端反应 |
|---|---|---|
| 200 | `{"access_token","token_type":"Bearer","expires_in","refresh_token"?}` | 登录完成。`refresh_token` 可选；省略它则客户端在过期时重新运行设备流程。 |
| 400 | `{"error":"authorization_pending"}` | 继续轮询。 |
| 400/429 | `{"error":"slow_down"}` | 将轮询间隔增加 5 秒。 |
| 400 | `{"error":"access_denied"}` | 停止。 |
| 400 | `{"error":"expired_token"}` | 停止。 |

**刷新授权**（`grant_type=refresh_token`）：200 时返回新的
`{"access_token","token_type","expires_in","refresh_token"}`。返回
`401 {"error":"invalid_grant"}` 以强制重新登录——这是你的
取消配置钩子。

## Messages — 必需

`POST /v1/messages` 和 `POST /v1/messages/count_tokens`（bearer 认证）

Anthropic Messages API (https://platform.claude.com/docs/en/api/messages)，
不变。代理到你的上游并流式返回响应。在此处执行你的
模型白名单，对被拒绝的模型返回 `400 invalid_request_error`。
不要在 `stream: true` 路径上缓冲 SSE。客户端始终设置
`Content-Length`，因此你可以拒绝无 CL 的 chunked 请求（`411`）并限制请求体
大小（`413`）。客户端不假设服务端工具可用。客户端
还发送 `x-app` 和 `x-stainless-*` 标头——传递它们或
丢弃它们，但不要因此拒绝请求。

## 托管设置 — 可选

`GET /managed/settings`（bearer 认证）

已认证用户的 Claude Code `managed-settings.json`；参见
https://code.claude.com/docs/en/settings 了解键参考。客户端
大约每小时轮询一次；支持 `ETag`/`If-None-Match` -> `304` 以
降低开销。返回 `404` 表示"无托管策略"；`200 {}` 表示"此用户
有空白策略"——它们不一样。**这是最可能变更的端点。**

## 模型 — 可选

`GET /v1/models`（bearer 认证）

Anthropic 模型列表格式：`{"data":[{"id","display_name"},...]}`。使用
Anthropic 风格的 ID（`claude-{family}-{major}-{minor}`）——客户端的
模型系列逻辑依赖这种格式。客户端仅在
客户端设置了 `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY` 时调用此端点，
你可以通过 `/managed/settings` 的 `env` 块推送此设置。返回 `404` 以
回退到客户端的内置列表。

## 遥测 — 可选

`POST /v1/metrics`、`/v1/logs`、`/v1/traces`（bearer 认证）

OTLP/HTTP（protobuf 或 JSON）。连接到网关时，客户端将
遥测发送到这里并忽略 `OTEL_EXPORTER_OTLP_*` 环境变量。无论
你是转发还是丢弃都返回 `200`——`404` 会让客户端的导出器在每次
刷新时记录错误。

## 错误

OAuth 端点使用 `{"error":"...","error_description":"..."}`
（RFC 6749/8628）。Bearer 认证的端点使用 Anthropic 信封，以便
SDK 将消息展示给用户：

    {"type":"error","error":{"type":"authentication_error","message":"..."}}

| HTTP | error.type | 用途 |
|---|---|---|
| 400 | `invalid_request_error` | 被拒绝的模型、格式错误的请求体、策略违规 |
| 401 | `authentication_error` | 缺失/过期/无效的 bearer；客户端提示重新登录 |
| 403 | `permission_error` | 已认证但不被允许 |
| 413 | `request_too_large` | 请求体超过你的上限 |
| 429 | `rate_limit_error` | 限流；包含 `Retry-After` |
| 501 | `not_supported` | 此后端不支持该端点 |
| 529 | `overloaded_error` | 上游已满；客户端退避并重试 |
| 5xx | `api_error` | 其他任何情况 |

## Bearer 令牌

你的 `access_token` 对客户端是不透明的——它存储、发送并在
`expires_in` 之前刷新，但从不检查载荷。在令牌中编码
用户身份和组（或在其键控的服务端状态中），
以便你可以在 `/v1/messages` 应用每用户 RBAC，在
`/managed/settings` 应用每组策略。同一个令牌必须在每个
bearer 认证的端点上有效。

## TLS

`https://` 是必需的；`http://` 仅在开发期间的环回地址上被接受。
客户端在用户首次连接确认后，按主机名固定你的 TLS 叶子
证书的 SHA-256 指纹，并在不匹配时重新提示——轮换你的证书会让每个用户多一次
确认提示。

## 客户端保证

- OAuth 端点路径来自你的发现文档；客户端从不
  硬编码 `/oauth/token`。
- 固定路径端点相对于 `{base}` 解析，从不跟随重定向。
- 每个请求体都有 `Content-Length`。
- OTLP 导出器锁定到 `{base}/v1/{signal}`，不受用户
  环境影响。
- `/v1/models` 或 `/managed/settings` 的 `404` 是干净的"未
  实现"，不会引发重试风暴。

## 代理到 Bedrock、Vertex 或 Foundry

代理到 `api.anthropic.com` 是直通的。代理到云
提供商的 Claude 端点需要转换：

- **模型 ID。** 客户端发送 Anthropic 风格的 ID，如
  `claude-sonnet-4-5`；转换为上游的格式（Bedrock 模型 ID 或
  inference-profile ARN；Vertex `@` 版本化 ID），或从 `/v1/models` 发布
  上游原生 ID。
- **`anthropic-beta`。** Bedrock 拒绝 *标头* 中的某些 beta；将它们
  移入请求体作为 `"anthropic_beta": [...]`。Vertex 和 Foundry
  接受标头。
- **流式传输。** Bedrock 的原生流是 AWS 二进制事件流，不是 SSE；
  解码并重新发射 Anthropic 格式的 `text/event-stream`。提供商 SDK
  会处理这个。
- **`count_tokens`。** Bedrock 没有 count-tokens API。返回
  `501 not_supported`；客户端回退到 Haiku `max_tokens:1` 探测。
- **标头。** 转发 `content-type`、`accept`、`accept-encoding`、
  `anthropic-version`、`anthropic-beta`、`user-agent` 和 `x-stainless-*`；
  剥离客户端的 `Authorization` 并应用上游自身的
  凭据。在响应上，剥离逐跳标头
  （`content-encoding`、`content-length`、`transfer-encoding`、`connection`）。
- **错误。** 上游错误消息可能包含你的云账户
  ID/ARN/项目 ID——为操作员记录它们，返回通用
  消息，但保留 `error.type` 以便客户端的重试逻辑仍然有效。

## 参考

RFC 6749（OAuth 2.0）、RFC 8414（AS 元数据）、RFC 8628（设备授权）、
Anthropic Messages API、Claude Code 设置参考、OTLP 规范。
