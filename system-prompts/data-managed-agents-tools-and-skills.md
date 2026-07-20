<!--
name: 'Data: Managed Agents tools and skills'
description: 参考文档，涵盖托管代理 SDK 的工具类型（代理工具集、MCP、自定义）、权限策略、保管库凭证管理和用于构建专业代理的技能 API
ccVersion: 2.1.203
-->
# 托管代理 — 工具与技能

## 工具

### 服务端工具 vs 客户端工具

| 类型 | 谁执行 | 工作方式 |
|---|---|---|
| **预构建 Claude 代理工具**（`agent_toolset_20260401`） | Anthropic，在会话的容器中（对于 `cloud` 环境；对于 `self_hosted`，**你的**工作器提供并运行它们——参见 `shared/managed-agents-self-hosted-sandboxes.md`） | 文件操作、bash、网页搜索等。一次性全部启用或通过 `enabled: true/false` 单独配置。 |
| **MCP 工具**（`mcp_toolset`） | Anthropic 的编排层 | 已连接的 MCP 服务器暴露的能力。通过工具集按服务器授予访问权限。 |
| **自定义工具** | **你**——你的应用处理调用并返回结果 | 代理发出 `agent.custom_tool_use` 事件，会话变为 `idle`，你发回 `user.custom_tool_result` 事件。 |

**推荐：** 通过 `agent_toolset_20260401` 启用所有预构建工具，然后根据需要单独禁用。

**版本控制：** 工具集是版本化的静态资源。当底层工具发生变化时，会创建新的工具集版本（因此有 `_20260401`），这样你始终清楚自己获得的是什么。

### 代理工具集

`agent_toolset_20260401` 提供以下内置工具：

| 工具 | 描述 |
| ---------------------- | ---------------------------------------- |
| `bash` | 在 shell 会话中执行 bash 命令 |
| `read` | 从本地文件系统读取文件，包括文本、图片、PDF 和 Jupyter 笔记本 |
| `write` | 将文件写入本地文件系统 |
| `edit` | 在文件中执行字符串替换 |
| `glob` | 使用 glob 模式快速文件匹配 |
| `grep` | 使用正则模式搜索文本 |
| `web_fetch` | 从 URL 获取内容 |
| `web_search` | 搜索网页信息 |

启用完整工具集：

```json
{
  "tools": [
    { "type": "agent_toolset_20260401" }
  ]
}
```

### 每工具配置

覆盖单个工具的默认值。此示例启用除 bash 以外的所有工具：

```json
{
  "tools": [
    {
      "type": "agent_toolset_20260401",
      "default_config": { "enabled": true },
      "configs": [
        { "name": "bash", "enabled": false }
      ]
    }
  ]
}
```

| 字段 | 必填 | 描述 |
|---|---|---|
| `type` | ✅ | `"agent_toolset_20260401"` |
| `default_config` | ❌ | 应用于所有工具。`{ "enabled": bool, "permission_policy": {...} }` |
| `configs` | ❌ | 每工具覆盖：`[{ "name": "...", "enabled": bool, "permission_policy": {...} }]` |

### 权限策略

控制服务端执行的工具（代理工具集 + MCP）是自动运行还是等待审批。不适用于自定义工具。

| 策略 | 行为 |
|---|---|
| `always_allow` | 工具自动执行（默认） |
| `always_ask` | 会话发出 `session.status_idle` 并暂停，直到你发送 `tool_confirmation` 事件 |

```json
{
  "type": "agent_toolset_20260401",
  "default_config": {
    "enabled": true,
    "permission_policy": { "type": "always_allow" }
  },
  "configs": [
    { "name": "bash", "permission_policy": { "type": "always_ask" } }
  ]
}
```

**响应 `always_ask`：** 发送 `user.tool_confirmation` 事件，携带触发事件 `agent_tool_use`/`mcp_tool_use` 中的 `tool_use_id`：

```json
{ "type": "tool_confirmation", "tool_use_id": "sevt_abc123", "result": "allow" }
{ "type": "tool_confirmation", "tool_use_id": "sevt_def456", "result": "deny", "message": "Read .env.example instead" }
```

拒绝时的可选 `message` 会传递给代理，以便其调整方法。

要仅启用特定工具，将默认值关闭并按工具选择加入：

```json
{
  "tools": [
    {
      "type": "agent_toolset_20260401",
      "default_config": { "enabled": false },
      "configs": [
        { "name": "bash", "enabled": true },
        { "name": "read", "enabled": true }
      ]
    }
  ]
}
```

### 自定义工具（客户端）

自定义工具由**你的应用**执行，而非 Anthropic。流程：

1. 代理决定使用工具 → 会话发出 `agent.custom_tool_use` 事件及输入
2. 会话变为 `idle` 等待你
3. 你的应用执行工具
4. 你发回 `user.custom_tool_result` 事件及输出
5. 会话恢复 `running`

无需权限策略——因为是你自己在执行。

```json
{
  "tools": [
    {
      "type": "custom",
      "name": "get_weather",
      "description": "Fetch current weather for a city.",
      "input_schema": {
        "type": "object",
        "properties": {
          "city": { "type": "string", "description": "City name" }
        },
        "required": ["city"]
      }
    }
  ]
}
```

### MCP 服务器

MCP（模型上下文协议）服务器暴露标准化的第三方能力（例如 Asana、GitHub、Linear）。**配置分为代理和保管库两部分：**

1. **代理创建**声明要连接哪些服务器（`type`、`name`、`url`——无认证）。代理的 `mcp_servers` 数组没有 auth 字段。
2. **保管库**存储 OAuth 凭证。通过会话创建时的 `vault_ids` 附加。

这将密钥排除在可复用的代理定义之外。每个保管库凭证与一个 MCP 服务器 URL 关联；Anthropic 通过 URL 将凭证匹配到服务器。

**代理侧——声明服务器（无认证）：**

| 字段 | 必填 | 描述 |
|---|---|---|
| `type` | ✅ | `"url"` |
| `name` | ✅ | 唯一名称——通过 `mcp_toolset.mcp_server_name` 引用 |
| `url` | ✅ | MCP 服务器的端点 URL（Streamable HTTP 传输） |

```json
{
  "mcp_servers": [
    { "type": "url", "name": "linear", "url": "https://mcp.linear.app/mcp" }
  ],
  "tools": [
    { "type": "mcp_toolset", "mcp_server_name": "linear" }
  ]
}
```

**会话侧——附加保管库：**

```json
{
  "agent": "agent_abc123",
  "environment_id": "env_abc123",
  "vault_ids": ["vlt_abc123"]
}
```

> 💡 **按工具启用（经验观察）：** 已观察到 `mcp_toolset` 接受 `default_config: {enabled: false}` + `configs: [{name, enabled: true}]` 用于白名单模式。API 参考仅显示最小的 `{type, mcp_server_name}` 形式。

> 💡 **在运行中的会话上更改工具/MCP 服务器：** `sessions.update()` 可以在会话处于 `idle` 时替换 `agent.tools`、`agent.mcp_servers` 和 `vault_ids`——会话本地覆盖，不触及代理对象。参见 `shared/managed-agents-core.md` → 在会话中途更新代理配置。

**大型 MCP 工具输出。** 如果 MCP 工具返回超过 **100K token**，输出会自动卸载到沙箱中的文件——代理收到截断的预览加上文件路径，可以 `read` 完整内容。无需配置。

**无效的保管库凭证不会阻止会话创建。** 如果保管库凭证对声明的 MCP 服务器无效，会话仍然成功创建；`session.error` 事件描述 MCP 认证失败，认证在下一次 `session.status_idle` → `session.status_running` 转换时重试。

> ⚠️ **MCP 认证令牌 ≠ REST API 令牌。** 托管 MCP 服务器（`mcp.notion.com`、`mcp.linear.app` 等）通常需要 **OAuth 持有者令牌**，而非服务本身的原生 API 密钥。Notion 的 `ntn_` 集成令牌用于 Notion REST API 认证，但**不能**用作 Notion MCP 服务器的保管库凭证。这是两套不同的认证系统。

### 保管库——凭证存储

**保管库**存储由 Anthropic 代你管理的凭证。两类凭证：

- **MCP 凭证**（`mcp_oauth`、`static_bearer`）——以 `mcp_server_url` 为键。当代代理连接到该 URL 的服务器时，令牌会自动注入。`mcp_oauth` 令牌通过标准 OAuth 2.0 `refresh_token` 授权自动刷新。这是认证 MCP 服务器的唯一方式。
- **环境变量**（`environment_variable`）——以 `secret_name`（环境变量名）为键。沙箱只看到**不透明占位符**；真实密钥在出站请求**出口处**替换。用于任何通过环境变量认证的服务：CLI（`aws`、`gcloud`、`stripe`）、SDK 或 `bash` 工具的直接 `curl` 调用。

你提供的密钥字段（`token`、`access_token`、`refresh_token`、`client_secret`、`secret_value`）是只写的——永远不会在 API 响应中返回。

#### 凭证与沙箱

保管库存储凭证；这些凭证**永远不会进入沙箱**。这是一个有意的安全边界——沙箱中运行的代码（包括代理编写的任何内容）无法读取或泄露保管库凭证，即使在提示注入下也是如此。相反，凭证由 Anthropic 侧代理在请求**离开沙箱后**注入：

- **MCP 工具调用**通过 Anthropic 侧代理路由，该代理从保管库获取凭证并添加到出站请求。
- **附加 GitHub 仓库上的 Git 操作**（`git pull`、`git push`、GitHub REST 调用）通过 git 代理路由，以相同方式注入 `github_repository` 资源的 `authorization_token`。
- **环境变量凭证**在沙箱中以不透明占位符形式出现；真实值在出口处替换占位符，仅限对凭证允许的主机的请求。替换仅覆盖请求**头和正文**——嵌入在 **URL 路径**中的密钥不会被替换，因此路径密钥端点（例如 Slack 传入 webhook URL）无法使用保管库；请改用基于头的认证（对于 Slack：通过 `Authorization` 中的 bot 令牌使用 `chat.postMessage`）。

**当保管库凭证不适用时**（例如自托管沙箱——`environment_variable` 在那里尚不支持），**注册自定义工具：** 代理发出 `agent.custom_tool_use`，你的编排器（已持有凭证）执行调用并通过同一认证事件流返回 `user.custom_tool_result`。不暴露公共端点；沙箱永远看不到密钥。参见 `shared/managed-agents-client-patterns.md` → 模式 9。

**不要将 API 密钥放在系统提示词或用户消息中作为变通方案**——它们会持久存在于会话的事件历史中。

> 内部曾称为 TAT（工具/租户访问令牌）。

**流程：**

1. 创建保管库（`client.beta.vaults.create(...)`）——每个租户/用户一个，或共享一个，取决于你的模型
2. 向其中添加凭证（`client.beta.vaults.credentials.create(...)`）——MCP 凭证以 MCP 服务器 URL 为键；环境变量凭证以 `secret_name` 为键
3. 在会话创建时通过 `vault_ids: ["vlt_..."]` 引用保管库
4. Anthropic 在 OAuth 令牌过期前自动刷新，并在运行时替换密钥

**MCP OAuth 凭证格式**：

```json
{
  "display_name": "Notion (workspace-foo)",
  "auth": {
    "type": "mcp_oauth",
    "mcp_server_url": "https://mcp.notion.com/mcp",
    "access_token": "<当前访问令牌>",
    "expires_at": "2026-04-02T14:00:00Z",
    "refresh": {
      "refresh_token": "<刷新令牌>",
      "client_id": "<你的 OAuth client_id>",
      "token_endpoint": "https://api.notion.com/v1/oauth/token",
      "token_endpoint_auth": { "type": "none" }
    }
  }
}
```

`refresh` 块启用自动刷新——`token_endpoint` 是 Anthropic 发送 `refresh_token` 授权的目标。`token_endpoint_auth` 是判别联合类型：

| `type` | 格式 | 使用时机 |
|---|---|---|
| `"none"` | `{type: "none"}` | 公共 OAuth 客户端（无密钥） |
| `"client_secret_basic"` | `{type: "client_secret_basic", client_secret: "..."}` | 机密客户端，通过 HTTP Basic auth 传递密钥 |
| `"client_secret_post"` | `{type: "client_secret_post", client_secret: "..."}` | 机密客户端，密钥在请求体中 |

如果你只有访问令牌而没有刷新能力，完全省略 `refresh`——它会工作到过期，然后代理失去访问权限。

> 💡 **获取 OAuth 令牌。** 如何获取初始访问令牌和刷新令牌取决于 MCP 服务器——请查阅其文档。获取后，使用上述格式将其存储在保管库凭证中；Anthropic 会从那里通过 `refresh.token_endpoint` 自动刷新。

**环境变量凭证格式**：

```json
{
  "display_name": "Twilio API key for sandbox",
  "auth": {
    "type": "environment_variable",
    "secret_name": "TWILIO_API_KEY",
    "secret_value": "sk-your-secret-here",
    "networking": {
      "type": "limited",
      "allowed_hosts": ["api.twilio.com", "*.twilio.com"]
    }
  }
}
```

`networking.allowed_hosts` 控制密钥可以替换到哪些出站主机——`{"type": "limited", "allowed_hosts": [...]}` 或 `{"type": "unrestricted"}`（如果你无法提前枚举域名）。强烈建议限制：它防止密钥被发送到未授权的主机。

**`injection_location`**（可选，`networking` 的兄弟字段）控制密钥在出站请求中**替换的位置**——`{header: bool, body: bool}`。两者是独立的：`allowed_hosts` 限定替换请求可以指向*哪些主机*；`injection_location` 限定在所有这些主机上密钥替换到请求的*哪些部分*。大多数服务从请求头读取 API 密钥，因此 `{"header": true}` 是更窄的配置——请求正文通常由代理正在处理的内容组装，使正文成为更大的暴露面。禁用位置的占位符**既不会被替换也不会被剥离**——字面的不透明占位符字符串会在该位置发送给第三方。

| 操作 | `injection_location` 语义 |
|---|---|
| 创建凭证 | 完全省略该字段 → 两个位置都启用。提供对象 → 省略的任何字段默认为 `false`（`{"header": true}` 创建仅头的凭证）。 |
| 更新凭证 | 字段**逐个合并**——`{"body": false}` 禁用正文替换并保持 `header` 不变。对于运行中的会话，更新在会话的下一个操作生效。 |

凭证必须至少启用一个位置；创建或更新如果会禁用两者则返回 400，显式 `null` 的对象或任一字段也一样（请省略）。响应始终返回两个字段及其解析值。

> ⚠️ **两个网络层，都需要。** 凭证上的 `networking.allowed_hosts` 控制哪些请求*使用密钥*，而非哪些请求被*允许*。代理还必须能够在**环境级别**到达域（`unrestricted`，或环境的 `allowed_hosts` 中列出的主机——参见 `shared/managed-agents-environments.md`）。任一层缺少域名都意味着密钥替换请求会失败。

> ⚠️ **客户端验证注意事项。** 替换发生在出口处，而非沙箱内部——在发出网络请求*之前*验证凭证*格式*的客户端（例如检查密钥以 `sk-` 开头的 CLI）会看到不透明占位符并可能在启动时失败。如果客户端在任何网络调用之前拒绝凭证，那就是原因。

> 💡 **最小化密钥范围。** 代理可以执行密钥允许的任何操作；权限超出任务需要的密钥会增加代理行为异常时的爆炸半径。

**自托管沙箱不支持**——`environment_variable` 凭证需要 Anthropic 管理的出口。参见 `shared/managed-agents-self-hosted-sandboxes.md`。

**约束（所有凭证类型）：**

- **每个保管库唯一键。** `mcp_server_url`（MCP 凭证）和 `secret_name`（环境变量凭证）在保管库的活动凭证中必须唯一；重复返回 409。
- **键不可变。** 密钥值、`display_name` 以及（环境变量凭证的）`injection_location` 可以更新；要更改 `mcp_server_url`、`secret_name`、`token_endpoint` 或 `client_id`，请归档凭证并创建新的。归档会清除密钥并释放键以供替换。
- **每个保管库最多 20 个凭证。**
- 凭证按提供时存储，**在会话运行时之前不验证**——无效凭证在会话期间表现为认证或下游错误，该错误会被发出但不会阻止会话继续。

**作用域：** 保管库是工作区作用域的。API 工作区中拥有 developer+ 角色的任何人都可以创建、读取（仅元数据——密钥是只写的）和附加保管库。`vault_ids` 可以在会话**创建**时设置，但不能通过会话更新设置（SDK 文档字符串说"尚不支持；设置此字段的请求会被拒绝"）。

---

## 技能

技能是可复用的、基于文件系统的资源，为代理提供领域特定的专业知识：工作流、上下文和最佳实践，将通用代理转变为专家。与提示词（一次性任务的对话级指令）不同，技能按需加载，消除在多个对话中重复提供相同指导的需要。

两种类型——工作方式相同；代理在与当前任务相关时自动使用它们：

| 类型 | 说明 |
|---|---|
| **预构建 Anthropic 技能** | 常见文档任务（PowerPoint、Excel、Word、PDF）。按名称引用（例如 `xlsx`）。 |
| **自定义技能** | 你通过技能 API 在组织中创建的技能。通过 `skill_id` + 可选 `version` 引用。 |

**每个代理最多 20 个技能。** 代理创建使用 `managed-agents-2026-04-01`；独立的技能 API（用于管理自定义技能定义）使用 `skills-2025-10-02`。

### 在会话上启用技能

技能通过 `agents.create()` 附加到**代理**定义：

```ts
const agent = await client.beta.agents.create(
  {
    name: "Financial Agent",
    model: "{{OPUS_ID}}",
    system: "You are a financial analysis agent.",
    skills: [
      { type: "anthropic", skill_id: "xlsx" },
      { type: "custom", skill_id: "skill_abc123", version: "latest" },
    ],
  }
);
```

Python：

```python
agent = client.beta.agents.create(
    name="Financial Agent",
    model="{{OPUS_ID}}",
    system: "You are a financial analysis agent.",
    skills=[
        {"type": "anthropic", "skill_id": "xlsx"},
        {"type": "custom", "skill_id": "skill_abc123", "version": "latest"},
    ]
)
```

**技能引用字段：**

| 字段 | Anthropic 技能 | 自定义技能 |
|---|---|---|
| `type` | `"anthropic"` | `"custom"` |
| `skill_id` | 技能名称（例如 `"xlsx"`、`"docx"`、`"pptx"`、`"pdf"`） | 技能 API 的技能 ID（例如 `"skill_abc123"`） |
| `version` | — | `"latest"` 或特定版本号 |

### 技能 API

| 操作 | 方法 | 路径 |
| --------------------- | -------- | ----------------------------------------------- |
| 创建技能 | `POST` | `/v1/skills` |
| 列出技能 | `GET` | `/v1/skills` |
| 获取技能 | `GET` | `/v1/skills/{id}` |
| 删除技能 | `DELETE` | `/v1/skills/{id}` |
| 创建版本 | `POST` | `/v1/skills/{id}/versions` |
| 列出版本 | `GET` | `/v1/skills/{id}/versions` |
| 获取版本 | `GET` | `/v1/skills/{id}/versions/{version}` |
| 删除版本 | `DELETE` | `/v1/skills/{id}/versions/{version}` |
