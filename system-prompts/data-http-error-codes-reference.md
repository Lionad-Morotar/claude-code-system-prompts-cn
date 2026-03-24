<!--
name: 'Data: HTTP error codes reference'
description: Reference for HTTP error codes returned by the Claude API with common causes and handling strategies
ccVersion: 2.1.73
-->
# HTTP 错误代码参考

本文档记录了 Claude API 返回的 HTTP 错误代码、常见原因及处理方法。如需查看特定语言的错误处理示例，请参阅 `python/` 或 `typescript/` 文件夹。

## 错误代码摘要

| 代码 | 错误类型              | 可重试 | 常见原因                         |
| ---- | ----------------------- | --------- | ------------------------------------ |
| 400  | `invalid_request_error` | 否        | 请求格式或参数无效 |
| 401  | `authentication_error`  | 否        | API 密钥无效或缺失           |
| 403  | `permission_error`      | 否        | API 密钥权限不足             |
| 404  | `not_found_error`       | 否        | 端点或模型 ID 无效         |
| 413  | `request_too_large`     | 否        | 请求超出大小限制          |
| 429  | `rate_limit_error`      | 是       | 请求过多                    |
| 500  | `api_error`             | 是       | Anthropic 服务问题              |
| 529  | `overloaded_error`      | 是       | API 暂时过载        |

## 详细错误信息

### 400 错误请求

**原因：**

- 请求体中的 JSON 格式错误
- 缺少必需参数（`model`、`max_tokens`、`messages`）
- 参数类型无效（例如，期望整数但提供了字符串）
- 消息数组为空
- 消息未按用户/助手交替排列

**错误示例：**

```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "messages: roles must alternate between \"user\" and \"assistant\""
  },
  "request_id": "req_011CSHoEeqs5C35K2UUqR7Fy"
}
```

**解决方法：** 在发送前验证请求结构。检查：

- `model` 是有效的模型 ID
- `max_tokens` 是正整数
- `messages` 数组非空且正确交替

---

### 401 未授权

**原因：**

- 缺少 `x-api-key` 头或 `Authorization` 头
- API 密钥格式无效
- API 密钥已撤销或删除

**解决方法：** 确保 `ANTHROPIC_API_KEY` 环境变量设置正确。

---

### 403 禁止访问

**原因：**

- API 密钥没有访问请求模型的权限
- 组织级别限制
- 尝试访问未开通测试权限的测试功能

**解决方法：** 在控制台中检查 API 密钥权限。您可能需要使用不同的 API 密钥或申请访问特定功能。

---

### 404 未找到

**原因：**

- 模型 ID 拼写错误（例如，`claude-sonnet-4.6` 而非 `claude-sonnet-4-6`）
- 使用了已弃用的模型 ID
- API 端点无效

**解决方法：** 使用模型文档中的确切模型 ID。您可以使用别名（例如 `{{OPUS_ID}}`）。

---

### 413 请求过大

**原因：**

- 请求体超过最大大小
- 输入中的 token 过多
- 图像数据过大

**解决方法：** 减小输入大小 — 截断对话历史、压缩/调整图像大小，或将大文档拆分为多个块。

---

### 400 验证错误

某些 400 错误专门与参数验证相关：

- `max_tokens` 超过模型限制
- `temperature` 值无效（必须为 0.0-1.0）
- 扩展思考中 `budget_tokens` >= `max_tokens`
- 工具定义模式无效

**扩展思考的常见错误：**

```
# 错误：budget_tokens 必须小于 max_tokens
thinking: budget_tokens=10000, max_tokens=1000  → 错误！

# 正确
thinking: budget_tokens=10000, max_tokens=16000
```

---

### 429 速率限制

**原因：**

- 超过每分钟请求数（RPM）
- 超过每分钟 token 数（TPM）
- 超过每日 token 数（TPD）

**需要检查的头信息：**

- `retry-after`：重试前等待的秒数
- `x-ratelimit-limit-*`：您的限制
- `x-ratelimit-remaining-*`：剩余配额

**解决方法：** Anthropic SDK 会自动使用指数退避重试 429 和 5xx 错误（默认：`max_retries=2`）。如需自定义重试行为，请参阅特定语言的错误处理示例。

---

### 500 内部服务器错误

**原因：**

- 临时的 Anthropic 服务问题
- API 处理中的错误

**解决方法：** 使用指数退避重试。如果问题持续，请检查 [status.anthropic.com](https://status.anthropic.com)。

---

### 529 过载

**原因：**

- API 需求过高
- 服务容量已达上限

**解决方法：** 使用指数退避重试。考虑使用其他模型（Haiku 通常负载较低）、分散请求时间或实现请求队列。

---

## 常见错误及解决方法

| 错误                         | 错误代码            | 解决方法                                                     |
| ------------------------------- | ---------------- | ------------------------------------------------------- |
| `budget_tokens` >= `max_tokens` | 400              | 确保 `budget_tokens` < `max_tokens`                   |
| 模型 ID 拼写错误                | 404              | 使用有效的模型 ID，如 `{{OPUS_ID}}`               |
| 第一条消息是 `assistant`    | 400              | 第一条消息必须是 `user`                            |
| 连续相同角色的消息  | 400              | 交替使用 `user` 和 `assistant`                        |
| 代码中包含 API 密钥                 | 401（密钥泄露） | 使用环境变量                                |
| 需要自定义重试                 | 429/5xx          | SDK 自动重试；使用 `max_retries` 自定义 |

## SDK 中的类型化异常

**始终使用 SDK 的类型化异常类**，而不是使用字符串匹配检查错误消息。每个 HTTP 错误代码都映射到特定的异常类：

| HTTP 代码 | TypeScript 类                  | Python 类                      |
| --------- | --------------------------------- | --------------------------------- |
| 400       | `Anthropic.BadRequestError`       | `anthropic.BadRequestError`       |
| 401       | `Anthropic.AuthenticationError`   | `anthropic.AuthenticationError`   |
| 403       | `Anthropic.PermissionDeniedError` | `anthropic.PermissionDeniedError` |
| 404       | `Anthropic.NotFoundError`         | `anthropic.NotFoundError`         |
| 429       | `Anthropic.RateLimitError`        | `anthropic.RateLimitError`        |
| 500+      | `Anthropic.InternalServerError`   | `anthropic.InternalServerError`   |
| 任意       | `Anthropic.APIError`              | `anthropic.APIError`              |

```typescript
// ✅ 正确：使用类型化异常
try {
  const response = await client.messages.create({...});
} catch (error) {
  if (error instanceof Anthropic.RateLimitError) {
    // 处理速率限制
  } else if (error instanceof Anthropic.APIError) {
    console.error(`API 错误 ${error.status}:`, error.message);
  }
}

// ❌ 错误：不要使用字符串匹配检查错误消息
try {
  const response = await client.messages.create({...});
} catch (error) {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("429") || msg.includes("rate_limit")) { ... }
}
```

所有异常类都继承自 `Anthropic.APIError`，它具有 `status` 属性。使用 `instanceof` 检查时，从最具体的到最不具体的顺序进行（例如，在 `APIError` 之前检查 `RateLimitError`）。
