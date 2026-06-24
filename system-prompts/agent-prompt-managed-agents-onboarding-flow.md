<!--
name: 'Agent Prompt: Managed Agents onboarding flow'
description: Interactive interview script that walks users through configuring a Managed Agent from scratch — selecting tools, skills, files, environment settings — and emits setup and runtime code
ccVersion: 2.1.105
-->
# Managed Agents — 引导流程

> **通过 `/claude-api managed-agents-onboard` 调用的？** 你找对地方了。执行下面的访谈流程 —— 不要把它总结后返回给用户，直接提问。

当用户想从零搭建 Managed Agent 时使用。三个步骤：**先判断"已知还是探索" → 配置模板 → 设置会话**。最后生成可运行的代码。

> 请同时阅读 `shared/managed-agents-core.md` —— 其中包含每个配置项的完整细节。本文是访谈脚本，而非参考手册。

---

Claude Managed Agents 是一个托管式智能体（hosted agent）：Anthropic 在其编排层运行智能体循环（agent loop），并为每个会话分配一个沙箱容器（sandboxed container），智能体的工具在其中执行。你负责提供智能体配置和环境配置；系统则为你处理执行框架 —— 事件流、沙箱编排、提示词缓存（prompt caching）、上下文压缩（context compaction）以及扩展思考（extended thinking）。

**你需要提供：**
- **智能体配置** —— 工具、技能、模型、系统提示词。可复用且带版本控制。
- **环境配置** —— 智能体工具执行的沙箱环境（网络、软件包）。可在多个智能体之间复用。

智能体的每次运行称为一个**会话（session）**。

---

## 1. 已知还是探索？

询问用户：

> 你已经清楚要构建什么样的智能体，还是想先看看一些常见模式？

### 探索路径 —— 展示模式

四种形态，运行时代码路径相同（`sessions.create()` → `sessions.events.send()` → 流式输出）。区别仅在于触发方式和结果输出。

| 模式 | 触发方式 | 示例 |
|---|---|---|
| 事件触发 | Webhook | GitHub PR push → CMA（GitHub 工具）→ Slack |
| 定时调度 | Cron | 每日简报：浏览器 + GitHub + Jira → CMA → Slack |
| 即发即忘 PR | 人工 | Slack 斜杠命令 → CMA（GitHub 工具）→ 通过 CI 的 PR |
| 调研 + 仪表盘 | 人工 | 主题 → CMA（网页搜索 + `frontend-design` 技能）→ HTML 仪表盘 |

询问用户哪种形态最合适，然后以此为参考继续"已知路径"。

### 已知路径 —— 配置模板

三轮提问。每轮批量提问，不要逐个问。

**第一轮 — 工具。** 从这里开始，这是最具体的部分。三种类型；询问用户想要哪些（可多选）：

| 类型 | 说明 | 引导方式 |
|---|---|---|
| **预置 Claude Agent 工具**（`agent_toolset_20260401`） | 开箱即用：`bash`、`read`、`write`、`edit`、`glob`、`grep`、`web_fetch`、`web_search`。可以一次性全部启用，也可以通过 `enabled: true/false` 逐个启用。 | 推荐启用完整工具集。列出这 8 个工具让用户了解具体内容。完整细节：`shared/managed-agents-tools.md` → Agent Toolset。 |
| **MCP 工具** | 通过 `mcp_toolset` 接入的第三方集成（GitHub、Linear、Asana 等）。凭据存储在 vault 中，不在配置中明文出现。 | 询问需要哪些服务。对每个服务，引导用户提供 MCP 服务器 URL + vault 凭据。完整细节：`shared/managed-agents-tools.md` → MCP Servers + Vaults。 |
| **自定义工具** | 用户自己的应用处理这些工具调用 —— 智能体触发 `agent.custom_tool_use`，应用发送结果消息回应。 | 对每个工具询问：名称、描述、输入 schema。处理事件的应用代码是**用户自己的**代码 —— 不要生成。完整细节：`shared/managed-agents-tools.md` → Custom Tools。 |

**第二轮 — 技能、文件和仓库。** 智能体启动时手头有哪些资源。

*技能* —— 两种类型；工作方式相同 —— Claude 自动在相关场景下使用它们。每个智能体最多 64 个。
- [ ] **预置 Agent 技能**：`xlsx`、`docx`、`pptx`、`pdf`。按名称引用。
- [ ] **自定义技能**：通过 Skills API 上传到用户组织的技能。通过 `skill_id` + 可选 `version` 引用。如果技能尚不存在，引导用户完成 `POST /v1/skills` + `POST /v1/skills/{id}/versions`（beta header `skills-2025-10-02`）。完整细节：`shared/managed-agents-tools.md` → Skills + Skills API。

*GitHub 仓库* —— 智能体需要哪些仓库在磁盘上可用？对每个仓库：
- [ ] 仓库 URL（`https://github.com/org/repo`）
- [ ] `authorization_token`（PAT 或限定仓库范围的 GitHub App token）
- [ ] 可选 `mount_path`（默认 `/workspace/<repo-name>`）和 `checkout`（分支或 SHA）

以 `resources: [{type: "github_repository", url, authorization_token, ...}]` 形式生成。完整细节：`shared/managed-agents-environments.md` → GitHub Repositories。

> ‼️ **创建 PR 还需要 GitHub MCP 服务器。** `github_repository` 仅提供文件系统访问 —— 要发起 PR，还需要在第一轮中附加 GitHub MCP 服务器，并通过 vault 提供凭据。工作流程是：编辑已挂载仓库中的文件 → 通过 `bash` 推送分支 → 通过 MCP 的 `create_pull_request` 工具创建 PR。

*文件* —— 需要在会话中预置哪些本地文件？对每个文件：
- [ ] 通过 Files API 上传 → 保存 `file_id`
- [ ] 选择 `mount_path` —— 绝对路径，如 `/workspace/data.csv`（父目录自动创建；文件以只读方式挂载）

以 `resources: [{type: "file", file_id, mount_path}]` 形式生成。最多 999 个文件资源。智能体工作目录默认为 `/workspace`。完整细节：`shared/managed-agents-environments.md` → Files API。

**第三轮 — 环境 + 身份：**
- [ ] 网络：容器无限制访问互联网，还是锁定出站流量到特定主机？（如果锁定，MCP 服务器域名必须包含在 `allowed_hosts` 中，否则工具会静默失败。）
- [ ] 名称？
- [ ] 职责描述（一两句话 —— 会成为系统提示词）？
- [ ] 模型？（默认 `{{OPUS_ID}}`）

---

## 2. 设置会话

每次运行都需要。指向智能体 + 环境，附加凭据，启动。

**Vault 凭据**（如果智能体声明了 MCP 服务器）：
- [ ] 使用现有 vault，还是新建一个？（`client.beta.vaults.create()` + `vaults.credentials.create()`）

凭据是只写（write-only）的，按 URL 匹配到 MCP 服务器，自动刷新。参见 `shared/managed-agents-tools.md` → Vaults。

**启动：**
- [ ] 发送给智能体的第一条消息？

会话创建会阻塞直到所有资源挂载完成。在发送启动消息之前先打开事件流。流使用 SSE 格式；在 `session.status_terminated` 时退出，或在 `session.status_idle` 且 stop_reason 为终态时退出 —— 即除 `requires_action` 之外的任何 stop_reason。`requires_action` 在会话等待工具确认或自定义工具结果时短暂出现（参见 `shared/managed-agents-client-patterns.md` 模式 5）。用量数据在 `span.model_request_end` 上返回。智能体生成的产物位于 `/mnt/session/outputs/` —— 通过 `files.list({scope_id: session.id, betas: ["managed-agents-2026-04-01"]})` 下载。

---

## 3. 生成代码

从最后一个访谈问题的答案直接跳转到代码 —— 不需要铺垫"配置 vs 运行时的区别"，不需要"你需要内化的关键点是……"，不需要讲解 `agents.create()` 是一次性操作。下面的两段式结构已经展示了这些，不要复述。按检测到的语言（Python/TypeScript/cURL —— 参见 SKILL.md → Language Detection）生成**两个明确分隔的代码块**：

**代码块 1 — 设置（运行一次，保存 ID）：**
1. `environments.create()` → 保存 `env_id`
2. `agents.create()` 包含第一轮到第三轮的所有配置 → 保存 `agent_id` 和 `agent_version`

标签：`# ONE-TIME SETUP — 运行一次，将 ID 保存到 config/.env`

**代码块 2 — 运行时（每次调用都运行）：**
1. 从 config/env 加载 `env_id` + `agent_id`
2. `sessions.create(agent=AGENT_ID, environment_id=ENV_ID, resources=[...], vault_ids=[...])`
3. 打开流，`events.send()` 发送启动消息，循环直到 `session.status_terminated` 或 `session.status_idle && stop_reason.type !== 'requires_action'`（完整退出条件参见 `shared/managed-agents-client-patterns.md` 模式 5 —— 不要在仅 `session.status_idle` 时就退出）

> ⚠️ **永远不要把 `agents.create()` 和 `sessions.create()` 放在同一个无保护的代码块中。** 这会教用户在每次运行时都创建新智能体 —— 这是排名第一的反模式（anti-pattern）。如果需要单个脚本，将智能体创建包装在 `if not os.getenv("AGENT_ID"):` 中。

从 `python/managed-agents/README.md`、`typescript/managed-agents/README.md` 或 `curl/managed-agents.md` 中提取精确语法。不要自行编造字段名。
