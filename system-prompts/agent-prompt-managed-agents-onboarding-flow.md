<!--
name: 'Agent Prompt: Managed Agents onboarding flow'
description: 引导用户从零配置 Managed Agent 的交互式访谈脚本 —— 选择工具、技能、文件、环境设置 —— 并生成设置和运行时代码
ccVersion: 2.1.146
-->
# Managed Agents — 引导流程

> **通过 `/claude-api managed-agents-onboard` 调用的？** 你找对地方了。执行下面的访谈流程 —— 不要把它总结后返回给用户，直接提问。

当用户想从零搭建 Managed Agent 时使用：**先判断"已知还是探索" → 配置模板 → 设置会话 → 启动前可行性检查 → 生成可运行代码。** 启动前检查（§3）不是可选项 —— 缺少工具、凭据或数据访问权限的配置会在运行中途失败，而这些缺口在设置阶段通常就能发现。

> 请同时阅读 `shared/managed-agents-core.md` —— 其中包含每个配置项的完整细节。本文是访谈脚本，而非参考手册。

---

Claude Managed Agents 是一个托管式智能体（hosted agent）：Anthropic 在其编排层运行智能体循环（agent loop），并为每个会话分配一个沙箱容器（sandboxed container），智能体的工具在其中执行（或者使用 `self_hosted` 环境，由你自己的 worker 运行工具 —— 参见 `shared/managed-agents-self-hosted-sandboxes.md`）。你负责提供智能体配置和环境配置；系统则为你处理执行框架 —— 事件流、沙箱编排、提示词缓存（prompt caching）、上下文压缩（context compaction）以及扩展思考（extended thinking）。

**你需要提供：**
- **智能体配置** —— 工具、技能、模型、系统提示词。可复用且带版本控制。
- **环境配置** —— 智能体工具执行的沙箱环境（`cloud`：网络、软件包；或 `self_hosted`：你自己的基础设施）。可在多个智能体之间复用。

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

**第 A 轮 — 工具。** 从这里开始，这是最具体的部分。三种类型；询问用户想要哪些（可多选）：

| 类型 | 说明 | 引导方式 |
|---|---|---|
| **预置 Claude Agent 工具**（`agent_toolset_20260401`） | 开箱即用：`bash`、`read`、`write`、`edit`、`glob`、`grep`、`web_fetch`、`web_search`。可以一次性全部启用，也可以通过 `enabled: true/false` 逐个启用。 | 推荐启用完整工具集。列出这 8 个工具让用户了解具体内容。完整细节：`shared/managed-agents-tools.md` → Agent Toolset。 |
| **MCP 工具** | 通过 `mcp_toolset` 接入的第三方集成（GitHub、Linear、Asana 等）。凭据存储在 vault 中，不在配置中明文出现。 | 询问需要哪些服务。对每个服务，引导用户提供 MCP 服务器 URL + vault 凭据。完整细节：`shared/managed-agents-tools.md` → MCP Servers + Vaults。 |
| **自定义工具** | 用户自己的应用处理这些工具调用 —— 智能体触发 `agent.custom_tool_use`，应用发送结果消息回应。 | 对每个工具询问：名称、描述、输入 schema。处理事件的应用代码是**用户自己的**代码 —— 不要生成。完整细节：`shared/managed-agents-tools.md` → Custom Tools。 |

**第 B 轮 — 技能、文件和仓库。** 智能体启动时手头有哪些资源。

*技能* —— 两种类型；工作方式相同 —— Claude 自动在相关场景下使用它们。每个智能体最多 20 个。
- [ ] **预置 Agent 技能**：`xlsx`、`docx`、`pptx`、`pdf`。按名称引用。
- [ ] **自定义技能**：通过 Skills API 上传到用户组织的技能。通过 `skill_id` + 可选 `version` 引用。如果技能尚不存在，引导用户完成 `POST /v1/skills` + `POST /v1/skills/{id}/versions`（beta header `skills-2025-10-02`）。完整细节：`shared/managed-agents-tools.md` → Skills + Skills API。

*GitHub 仓库* —— 智能体需要哪些仓库在磁盘上可用？对每个仓库：
- [ ] 仓库 URL（`https://github.com/org/repo`）
- [ ] `authorization_token`（PAT 或限定仓库范围的 GitHub App token）
- [ ] 可选 `mount_path`（默认 `/workspace/<repo-name>`）和 `checkout`（分支或 SHA）

以 `resources: [{type: "github_repository", url, authorization_token, ...}]` 形式生成。完整细节：`shared/managed-agents-environments.md` → GitHub Repositories。

> ‼️ **创建 PR 还需要 GitHub MCP 服务器。** `github_repository` 仅提供文件系统访问 —— 要发起 PR，还需要在第 A 轮中附加 GitHub MCP 服务器，并通过 vault 提供凭据。工作流程是：编辑已挂载仓库中的文件 → 通过 `bash` 推送分支 → 通过 MCP 的 `create_pull_request` 工具创建 PR。

*文件* —— 需要在会话中预置哪些本地文件？对每个文件：
- [ ] 通过 Files API 上传 → 保存 `file_id`
- [ ] 选择 `mount_path` —— 绝对路径，如 `/workspace/data.csv`（父目录自动创建；文件以只读方式挂载）

以 `resources: [{type: "file", file_id, mount_path}]` 形式生成。最多 999 个文件资源。智能体工作目录默认为 `/workspace`。完整细节：`shared/managed-agents-environments.md` → Files API。

**第 C 轮 — 身份、成功标准、环境：**
- [ ] 名称？
- [ ] 职责描述（一两句话 —— 会成为系统提示词）？
- [ ] **"完成"是什么样子的？** 推动用户给出具体、可验证的成功标准 —— 不是"一份好的报告"，而是"每个 SKU 都有一个数字型 `price` 列的 CSV"。明确的标准能让智能体有清晰目标，也让你能验证结果；模糊的标准会让智能体猜测"完成"的含义。如果标准可评分，计划在 §2 中配置 **Outcome**，让系统据此评分并迭代修订。参见 `shared/managed-agents-outcomes.md`。
- [ ] 网络：容器无限制访问互联网，还是锁定出站流量到特定主机？（如果锁定，MCP 服务器域名必须包含在 `allowed_hosts` 中，否则工具会静默失败。）
- [ ] 模型？（默认 `{{OPUS_ID}}`）

---

## 2. 设置会话

每次运行都需要。指向智能体 + 环境，附加凭据，启动。

**Vault 凭据**（如果智能体声明了 MCP 服务器）：
- [ ] 使用现有 vault，还是新建一个？（`client.beta.vaults.create()` + `vaults.credentials.create()`）

凭据是只写（write-only）的，按 URL 匹配到 MCP 服务器，自动刷新。参见 `shared/managed-agents-tools.md` → Vaults。

**启动 —— 选择一种：**
- [ ] **对话式：** 发送给智能体的第一条 `user.message`。
- [ ] **Outcome 评分式**（当第 C 轮产出了可验证标准时推荐）：发送 `user.define_outcome` 并附带评分标准，**取代** `user.message` —— 系统会根据评分标准迭代并评分，直到满意为止。不要同时发送两者。参见 `shared/managed-agents-outcomes.md`。

会话创建会阻塞直到所有资源挂载完成。在发送启动消息之前先打开事件流。流使用 SSE 格式；在 `session.status_terminated` 时退出，或在 `session.status_idle` 且 `stop_reason` 为终态时退出 —— 即除 `requires_action` 之外的任何 stop_reason。`requires_action` 在会话等待工具确认或自定义工具结果时短暂出现（参见 `shared/managed-agents-client-patterns.md` 模式 5）。用量数据在 `span.model_request_end` 上返回。智能体生成的产物位于 `/mnt/session/outputs/` —— 通过 `files.list({scope_id: session.id, betas: ["managed-agents-2026-04-01"]})` 下载。

**控制台逃生舱。** 在你生成的运行时代码块中，在 `sessions.create()` 之后立即打印会话的 Console URL，以便用户在迭代时可以在 UI 中观察：`print(f"在 Console 中查看: https://platform.claude.com/workspaces/default/sessions/{session.id}")`（如果用户有自定义命名的工作区，请将 `default` 替换为该工作区的 slug）。

---

## 3. 启动前可行性检查 —— 用资源清单核验任务

**在生成任何代码之前执行。** 一种常见且可避免的失败是资源不足的运行：任务要求很明确，但智能体缺少某个工具、凭据、数据访问权限或执行所需的上下文。智能体在运行几轮后发现缺口，反复尝试无果后放弃 —— 白白消耗预算却一无所获。这个缺口在设置阶段通常就能发现。在此处发现它，而不是等会话失败后。

逐条梳理用户提出的任务。对于智能体必须执行的每个操作，确认有对应的资源覆盖 —— 如果没有，明确指出缺口：

| 缺口类别 | 检查项 | 缺失时的处理 |
|---|---|---|
| **工具 / 集成**（最容易在前期发现 —— 配置可静态检查） | 任务中的每个动词都映射到一个已启用的工具或 MCP 服务器。"工单分类" → 工单 MCP 服务器；"创建 PR" → GitHub MCP 服务器（仅 `github_repository` 挂载无法创建 PR）；"搜索网络" → 工具集中启用了 `web_search`。 | 在第 A 轮中添加工具/MCP 服务器，或从任务中删减该需求。 |
| **凭据 / 访问** | 每个 MCP 服务器都附加了 vault 凭据（§2）。任务涉及的所有外部主机都可访问 —— 网络设置为 `unrestricted`，或主机在 `allowed_hosts` 中。 | 创建/附加 vault；扩大 `allowed_hosts` 范围。这些到运行时才会失败 —— §4 中的冒烟测试是以低成本发现它们的方式。 |
| **数据** | 任务引用的每个文件、数据集或仓库都作为 `resource`（文件、`github_repository` 或内存存储）挂载。 | 在第 B 轮中上传并挂载，或告诉智能体从哪里获取。 |
| **提示词质量 / 标准** | 任务描述足够具体可执行，且"完成"是可验证的（第 C 轮）。 | 收紧任务描述；配置 Outcome。 |

向用户说明所有未解决的缺口，并在生成代码前解决。不要生成你已经知道资源不足的配置 —— 缺少工具、凭据或数据的智能体无法完成任务。

---

## 4. 生成代码

从最后一个访谈问题的答案直接跳转到代码 —— 不需要铺垫"配置 vs 运行时的区别"，不需要"你需要内化的关键点是……"，不需要讲解 `agents.create()` 是一次性操作。下面的两段式结构已经展示了这些，不要复述。生成**两个明确分隔的代码块**：

**代码块 1 — 设置（运行一次，保存 ID）。** 优先以 **YAML 文件 + `ant` CLI 命令**的形式输出 —— 智能体和环境是受版本控制的定义，CLI 流程才是用户应当签入仓库并通过 CI 运行的方式。仅当用户明确要求用编程语言进行设置或 `ant` CLI 不可用时，才回退到 SDK 代码。

输出：
1. `<name>.agent.yaml`，包含第 A–C 轮的所有配置（扁平结构：`name`、`model`、`system`、`tools`、`mcp_servers`、`skills`）
2. `<name>.environment.yaml`，包含第 C 轮的网络配置
3. apply 命令：
   ```sh
   AGENT_ID=$(ant beta:agents create < <name>.agent.yaml --transform id -r)
   ENV_ID=$(ant beta:environments create < <name>.environment.yaml --transform id -r)
   # CI 同步：ant beta:agents update --agent-id "$AGENT_ID" --version N < <name>.agent.yaml
   ```

完整 CLI 参考参见 `shared/anthropic-cli.md`。如果改用 SDK 代码输出，则标注 `# ONE-TIME SETUP — 运行一次，将 ID 保存到 config/.env`，并调用 `environments.create()` → `agents.create()`。

**代码块 2 — 运行时（每次调用都运行）。** 此部分使用检测到的语言（Python/TypeScript/cURL —— 参见 SKILL.md → Language Detection）的 SDK 代码。运行时路径需要以编程方式响应事件（工具确认、自定义工具结果、重连），这属于 SDK 范畴 —— 不要在这里输出 shell 循环。
1. 从 config/env 加载 `env_id` + `agent_id`
2. `sessions.create(agent=AGENT_ID, environment_id=ENV_ID, resources=[...], vault_ids=[...])` —— 这会阻塞直到资源挂载完成，因此错误的文件/仓库挂载会在**此处**暴露，不会浪费任何 token。
3. **当任务依赖 MCP 服务器、凭据或可访问的主机时，先进行冒烟测试。** 凭据和 MCP 连接故障不会在 `sessions.create()` 时暴露 —— 只有智能体首次尝试使用时才会出现。先发送一轮低成本的探测消息（"确认你能访问 <service> 并列出 1–2 个项目；先不要开始任务"），确认成功后，**再**发送真正的启动消息。几百个 token 的验证远好于一个因缺少凭据而反复尝试后放弃的失控会话。对于没有外部依赖的智能体，可跳过此步骤。
4. 打开流，`events.send()` 发送启动消息（`user.message`，或如果 §2 选择了 Outcome 评分路径则发送 `user.define_outcome`），循环直到 `session.status_terminated` 或 `session.status_idle && stop_reason.type !== 'requires_action'`（完整退出条件参见 `shared/managed-agents-client-patterns.md` 模式 5 —— 不要在仅 `session.status_idle` 时就退出）

> ⚠️ **永远不要把 `agents.create()` 和 `sessions.create()` 放在同一个无保护的代码块中。** 这会教用户在每次运行时都创建新智能体 —— 这是排名第一的反模式（anti-pattern）。如果需要单个脚本，将智能体创建包装在 `if not os.getenv("AGENT_ID"):` 中。

从 `python/managed-agents/README.md`、`typescript/managed-agents/README.md` 或 `curl/managed-agents.md` 中提取精确语法。不要自行编造字段名。
