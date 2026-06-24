<!--
name: '数据：Managed Agents 工具与技能'
description: Managed Agents SDK 的参考文档，涵盖工具类型（agent 工具集、MCP、自定义）、权限策略、vault 凭证管理和用于构建专用 agent 的技能 API
ccVersion: 2.1.145
-->
# Managed Agents — 工具与技能

## 工具

### 服务端工具 vs 客户端工具

| 类型 | 谁运行 | 如何工作 |
|---|---|---|
| **预构建的 Claude Agent 工具**（`agent_toolset_20260401`） | Anthropic，在 session 的容器上（对于 `cloud` 环境；对于 `self_hosted`，**你的** worker 提供并运行它们——参见 `shared/managed-agents-self-hosted-sandboxes.md`） | 文件操作、bash、网络搜索等。一次性全部启用或通过 `enabled: true/false` 单独配置。 |
| **MCP 工具**（`mcp_toolset`） | Anthropic 的编排层 | 由连接的 MCP 服务器暴露的能力。通过工具集按服务器授予访问权限。 |
| **自定义工具** | **你**——你的应用程序处理调用并返回结果 | Agent 发出 `agent.custom_tool_use` 事件，session 进入 `idle`，你发回 `user.custom_tool_result` 事件。 |

**建议：** 通过 `agent_toolset_20260401` 启用所有预构建工具，然后根据需要单独禁用。

**版本管理：** 工具集是一个版本化的静态资源。当底层工具变更时，会创建新的工具集版本（因此有 `_20260401`），这样你始终确切知道获得了什么。

### Agent 工具集

`agent_toolset_20260401` 提供以下内置工具：

| 工具                   | 描述                              |
| ---------------------- | ---------------------------------------- |
| `bash` | 在 shell 会话中执行 bash 命令 |
| `read` | 从本地文件系统读取文件，包括文本、图片、PDF 和 Jupyter notebook |
| `write` | 将文件写入本地文件系统 |
| `edit` | 在文件中执行字符串替换 |
| `glob` | 使用 glob 模式快速匹配文件 |
| `grep` | 使用正则表达式模式搜索文本 |
| `web_fetch` | 从 URL 获取内容 |
| `web_search` | 在网络上搜索信息 |

启用完整工具集：

```json
{
  "tools": [
    { "type": "agent_toolset_20260401" }
  ]
}
```

### 按工具配置

为单个工具覆盖默认值。此示例启用除 bash 外的所有工具：

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
| `configs` | ❌ | 按工具覆盖：`[{ "name": "...", "enabled": bool, "permission_policy": {...} }]` |

### 权限策略

控制服务端执行的工具（agent 工具集 + MCP）何时自动运行 vs 等待审批。不适用于自定义工具。

| 策略 | 行为 |
|---|---|
| `always_allow` | 工具自动执行（默认） |
| `always_ask` | Session 发出 `session.status_idle` 并暂停，直到你发送 `tool_confirmation` 事件 |

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

**响应 `always_ask`：** 发送 `user.tool_confirmation` 事件，附带来自触发的 `agent_tool_use`/`mcp_tool_use` 事件的 `tool_use_id`：

```json
{ "type": "tool_confirmation", "tool_use_id": "sevt_abc123", "result": "allow" }
{ "type": "tool_confirmation", "tool_use_id": "sevt_def456", "result": "deny", "message": "Read .env.example instead" }
```

拒绝时的可选 `message` 会传递给 agent，以便它调整方法。

要仅启用特定工具，关闭默认值并按工具选择加入：

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

自定义工具由**你的应用程序**执行，而非 Anthropic。流程：

1. Agent 决定使用工具 → session 发出带输入的 `agent.custom_tool_use` 事件
2. Session 进入 `idle` 等待你
3. 你的应用程序执行该工具
4. 你发回带输出的 `user.custom_tool_result` 事件
5. Session 恢复 `running`

无需权限策略——是你在执行。

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

MCP（Model Context Protocol，模型上下文协议）服务器暴露标准化的第三方能力（如 Asana、GitHub、Linear）。**配置分散在 agent 和 vault 之间：**

1. **Agent 创建**时声明要连接到哪些服务器（`type`、`name`、`url`——无认证信息）。Agent 的 `mcp_servers` 数组没有 auth 字段。
2. **Vault** 存储 OAuth 凭证。通过 session 创建时的 `vault_ids` 挂载。

这样可以将密钥排除在可复用的 agent 定义之外。每个 vault 凭证绑定到一个 MCP 服务器 URL；Anthropic 按 URL 将凭证与服务器匹配。

**Agent 端——声明服务器（无认证）：**

| 字段 | 必填 | 描述 |
|---|---|---|
| `type` | ✅ | `"url"` |
| `name` | ✅ | 唯一名称——由 `mcp_toolset.mcp_server_name` 引用 |
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

**Session 端——挂载 vault：**

```json
{
  "agent": "agent_abc123",
  "environment_id": "env_abc123",
  "vault_ids": ["vlt_abc123"]
}
```

> 💡 **按工具启用（经验性观察）：** 已观察到 `mcp_toolset` 接受 `default_config: {enabled: false}` + `configs: [{name, enabled: true}]` 的允许列表模式。API 参考仅显示最小化的 `{type, mcp_server_name}` 形式。

> 💡 **在运行中的会话上更改工具/MCP 服务器：** `sessions.update()` 可以在会话处于 `idle` 状态时替换 `agent.tools`、`agent.mcp_servers` 和 `vault_ids`——这是一个会话级别的覆盖，不会触及 agent 对象。参见 `shared/managed-agents-core.md` → 在会话中途更新 agent 配置。

**大型 MCP 工具输出。** 如果 MCP 工具返回超过 **100K token**，输出会自动转存到沙箱中的一个文件——agent 收到截断预览加上文件路径，然后可以通过 `read` 读取完整内容。无需配置。

**无效的 vault 凭证不会阻止会话创建。** 如果 vault 凭证对于声明的 MCP 服务器无效，会话仍然会成功创建；`session.error` 事件会描述 MCP 认证失败，并在下次 `session.status_idle` → `session.status_running` 转换时重试认证。

> ⚠️ **MCP 认证 token ≠ REST API token。** 托管的 MCP 服务器（`mcp.notion.com`、`mcp.linear.app` 等）通常需要 **OAuth bearer token**，而非服务本身的 API 密钥。Notion 的 `ntn_` 集成 token 对 Notion REST API 进行认证，但**不能**作为 Notion MCP 服务器的 vault 凭证使用。这些是不同的认证系统。

### Vaults——凭证存储

**Vault** 存储凭证，由 Anthropic 代你管理。两类凭证：

- **MCP 凭证**（`mcp_oauth`、`static_bearer`）——以 `mcp_server_url` 为键。当 agent 连接到该 URL 的服务器时，token 会自动注入。`mcp_oauth` token 通过标准 OAuth 2.0 `refresh_token` 授权方式自动刷新。这是认证 MCP 服务器的唯一方式。
- **环境变量**（`environment_variable`）——以 `secret_name`（环境变量名）为键。沙箱中仅看到一个**不透明占位符**；真实密钥在**出口处**替换到出站请求中。适用于任何通过环境变量认证的服务：CLI（`aws`、`gcloud`、`stripe`）、SDK 或通过 `bash` 工具发出的直接 `curl` 调用。

你提供的密钥字段（`token`、`access_token`、`refresh_token`、`client_secret`、`secret_value`）是只写的——绝不会在 API 响应中返回。

#### 凭证与沙箱

Vault 存储凭证；这些凭证**绝不会进入沙箱**。这是一个有意设计的安全边界——沙箱中运行的代码（包括 agent 编写的任何内容）无法读取或泄露已存入 vault 的凭证，即使在提示注入攻击下也是如此。相反，凭证在请求*离开*沙箱**之后**由 Anthropic 端的代理注入：

- **MCP 工具调用**通过 Anthropic 端的代理路由，该代理从 vault 获取凭证并将其添加到出站请求中。
- **对挂载的 GitHub 仓库的 Git 操作**（`git pull`、`git push`、GitHub REST 调用）通过一个 git 代理路由，该代理以相同方式注入 `github_repository` 资源的 `authorization_token`。
- **环境变量凭证**在沙箱中显示为不透明占位符；真实值在出口处替换到请求中，且仅替换到凭证允许的主机。

**当 vault 凭证不适用时**（例如自托管沙箱——`environment_variable` 在那里尚不支持），**注册一个自定义工具：** agent 发出 `agent.custom_tool_use`，你的编排器（已经持有凭证）执行调用并通过相同经过认证的事件流返回 `user.custom_tool_result`。没有暴露公共端点；沙箱永远不会看到密钥。参见 `shared/managed-agents-client-patterns.md` → Pattern 9。

**不要将 API 密钥放在系统提示词或用户消息中作为变通方案**——它们会持久化在 session 的事件历史中。

> 内部曾称为 TAT（Tool/Tenant Access Tokens）。

**流程：**

1. 创建一个 vault（`client.beta.vaults.create(...)`）——每个租户/用户一个，或共享一个，取决于你的模型
2. 向其中添加凭证（`client.beta.vaults.credentials.create(...)`）——MCP 凭证以 MCP 服务器 URL 为键；环境变量凭证以 `secret_name` 为键
3. 在 session 创建时通过 `vault_ids: ["vlt_..."]` 引用该 vault
4. Anthropic 在 OAuth token 过期前自动刷新，并在运行时替换密钥

**MCP OAuth 凭证格式**：

```json
{
  "display_name": "Notion (workspace-foo)",
  "auth": {
    "type": "mcp_oauth",
    "mcp_server_url": "https://mcp.notion.com/mcp",
    "access_token": "<current access token>",
    "expires_at": "2026-04-02T14:00:00Z",
    "refresh": {
      "refresh_token": "<refresh token>",
      "client_id": "<your OAuth client_id>",
      "token_endpoint": "https://api.notion.com/v1/oauth/token",
      "token_endpoint_auth": { "type": "none" }
    }
  }
}
```

`refresh` 块是启用自动刷新的关键——`token_endpoint` 是 Anthropic 提交 `refresh_token` 授权的地方。`token_endpoint_auth` 是一个可区分联合类型：

| `type` | 格式 | 使用场景 |
|---|---|---|
| `"none"` | `{type: "none"}` | 公共 OAuth 客户端（无密钥） |
| `"client_secret_basic"` | `{type: "client_secret_basic", client_secret: "..."}` | 机密客户端，通过 HTTP Basic 认证传递密钥 |
| `"client_secret_post"` | `{type: "client_secret_post", client_secret: "..."}` | 机密客户端，在请求体中传递密钥 |

如果只有 access token 而没有刷新能力，完全省略 `refresh`——它会在过期前一直有效，之后 agent 将失去访问权限。

> 💡 **获取 OAuth token。** 如何获取初始 access token 和 refresh token 取决于 MCP 服务器——查阅其文档。获得后，使用上述格式将它们存储在 vault 凭证中；Anthropic 会通过 `refresh.token_endpoint` 自动刷新。

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

`networking.allowed_hosts` 控制密钥可以替换到哪些出站主机——`{"type": "limited", "allowed_hosts": [...]}` 或 `{"type": "unrestricted"}`（如果你无法提前枚举域名）。强烈建议使用限制模式：它可以防止密钥被发送到未授权的主机。

> ⚠️ **两层网络控制，缺一不可。** 凭证上的 `networking.allowed_hosts` 控制哪些请求*使用该密钥*，而非哪些请求*被允许*。Agent 还必须能够在**环境级别**访问该域名（`unrestricted`，或环境 `allowed_hosts` 中列出的主机——参见 `shared/managed-agents-environments.md`）。任一层面缺失的域名都会导致密钥替换请求失败。

> ⚠️ **客户端验证的注意事项。** 替换发生在出口处，而非沙箱内部——在发出网络请求之前在本地验证凭证*格式*的客户端（例如检查密钥是否以 `sk-` 开头的 CLI）会看到不透明占位符，可能在启动时失败。如果客户端在任何网络调用之前就拒绝了凭证，这就是原因。

> 💡 **使用最小权限密钥。** Agent 可以做密钥允许的任何事；权限超出任务需求的密钥会增加 agent 行为异常时的风险范围。

**自托管沙箱不支持**——`environment_variable` 凭证需要 Anthropic 管理的出口。参见 `shared/managed-agents-self-hosted-sandboxes.md`。

**约束条件（所有凭证类型）：**

- **每个 vault 内键必须唯一。** `mcp_server_url`（MCP 凭证）和 `secret_name`（环境变量凭证）在同一 vault 的有效凭证中必须唯一；重复会返回 409。
- **键是不可变的。** 密钥值和 `display_name` 可以更新（轮换）；要更改 `mcp_server_url`、`secret_name`、`token_endpoint` 或 `client_id`，需归档凭证并创建新的。归档会清除密钥并释放该键以供替换。
- **每个 vault 最多 20 个凭证。**
- 凭证按原样存储，**直到 session 运行时才验证**——无效凭证会在 session 期间表现为认证或下游错误，该错误会被发出但不阻止 session 继续运行。

**作用域：** Vault 是工作区范围的。API 工作区中具有 developer+ 角色的任何人都可以创建、读取（仅元数据——密钥是只写的）和挂载 vault。`vault_ids` 可以在 session **创建**时设置，但不能通过 session 更新设置（SDK 文档字符串说明"尚不支持；设置此字段的请求会被拒绝"）。

---

## 技能

技能是可复用的、基于文件系统的资源，为你的 agent 提供领域专长：工作流、上下文和最佳实践，将通用 agent 转变为专家。与提示词（对话级别的、用于一次性任务的指令）不同，技能按需加载，消除了在多次对话中重复提供相同指导的需求。

两种类型——两者工作方式相同；agent 在与当前任务相关时自动使用它们：

| 类型 | 含义 |
|---|---|
| **预构建的 Anthropic 技能** | 常见文档任务（PowerPoint、Excel、Word、PDF）。按名称引用（如 `xlsx`）。 |
| **自定义技能** | 你在组织中通过 Skills API 创建的技能。通过 `skill_id` + 可选的 `version` 引用。 |

**每个 agent 最多 20 个技能。** Agent 创建使用 `managed-agents-2026-04-01`；单独的 Skills API（用于管理自定义技能定义）使用 `skills-2025-10-02`。

### 在 session 上启用技能

技能通过 `agents.create()` 挂载到 **agent** 定义上：

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
    system="You are a financial analysis agent.",
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
| `skill_id` | 技能名称（如 `"xlsx"`、`"docx"`、`"pptx"`、`"pdf"`） | 来自 Skills API 的技能 ID（如 `"skill_abc123"`） |
| `version` | — | `"latest"` 或特定版本号 |

### Skills API

| 操作             | 方法   | 路径                                            |
| --------------------- | -------- | ----------------------------------------------- |
| 创建技能          | `POST`   | `/v1/skills`                                    |
| 列出技能           | `GET`    | `/v1/skills`                                    |
| 获取技能             | `GET`    | `/v1/skills/{id}`                               |
| 删除技能          | `DELETE` | `/v1/skills/{id}`                               |
| 创建版本        | `POST`   | `/v1/skills/{id}/versions`                      |
| 列出版本         | `GET`    | `/v1/skills/{id}/versions`                      |
| 获取版本           | `GET`    | `/v1/skills/{id}/versions/{version}`            |
| 删除版本        | `DELETE` | `/v1/skills/{id}/versions/{version}`            |
