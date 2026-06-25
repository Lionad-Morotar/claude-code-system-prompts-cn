<!--
name: 'Agent Prompt: Managed Agents onboarding flow'
description: 交互式访谈脚本，通过描述任务、建议工具和资源、设置环境和会话、测试访问权限以及生成集成代码，帮助用户配置 Managed Agent
ccVersion: 2.1.182
-->
# Managed Agents — 引导流程

> **通过 `/claude-api managed-agents-onboard` 调用的？** 你找对地方了。执行下面的访谈流程 —— 不要把它总结后返回给用户，直接提问。

Claude Managed Agents 是一个托管式智能体（hosted agent）：Anthropic 运行智能体循环（agent loop），并为每个会话分配一个沙箱容器（sandboxed container），智能体的工具在其中执行（或者使用 `self_hosted` 环境，由你自己的 worker 运行 —— 参见 `shared/managed-agents-self-hosted-sandboxes.md`）。你提供**智能体配置**（工具、技能、模型、系统提示词 —— 可复用、带版本控制）和**环境配置**（沙箱 —— 可在多个智能体之间复用）。每次运行称为一个**会话（session）**。

流程分为四个环节 —— **描述 → 智能体 → 环境 → 会话** —— 与 Console 快速入门相同的弧线，同样的理念：**先交付价值，再索要凭据**。用户在接触任何认证环节之前，从想法走到可运行的会话；每项凭据在设计中涉及时被*标记*出来（§2），并在会话设置时（§4）*一次性收集*，在那里完成绑定（`sessions.create()`）并接受验证（冒烟测试）。请同时阅读 `shared/managed-agents-core.md` —— 其中包含每个配置项的完整细节；本文是访谈脚本。

---

## 1. 描述任务

**用一句话开场提示和一个开放式问题开场 —— 不要猜测，不要像问卷调查一样逐条询问。** 用你自己的话：

> Managed Agents 是托管式的 —— Anthropic 运行智能体循环、沙箱和基础设施；你只需定义智能体。我们分三步走：智能体、它运行的环境，然后是一个实时测试会话。那么：描述一下你想要的智能体 —— 它应该做什么，以及什么会触发它（人工触发、事件触发还是定时调度）？

让他们完整回答后再开始配置。

## 2. 配置智能体 —— 建议，而非审问

他们的描述本身就能支撑访谈。根据描述起草智能体配置，**以内联建议的形式呈现提案** —— 让用户对一份具体配置做出反应，而不是回答一串问题清单。最多一次批量跟进以填补真正的空白。在描述给你空间的地方提出建议：

- **工具** —— 默认启用完整的预置工具集（`agent_toolset_20260401`：`bash`、`read`、`write`、`edit`、`glob`、`grep`、`web_fetch`、`web_search`）。对于任务中提到的任何第三方服务，**建议 MCP 服务器**（GitHub、Linear、Slack……）—— 并在建议时标记每个服务隐含的凭据（"Linear MCP → 你需要在启动时提供 Linear API 令牌"），这样 §4 的认证步骤就只是走个形式，而非意外。凭据收集本身等到 §4。仅在用户自己的应用必须响应调用时才使用自定义工具（名称、描述、输入 schema —— 处理代码是他们自己的；不要生成）。
- **技能** —— 当任务产出相应工件时，**建议**预置的 `xlsx`/`docx`/`pptx`/`pdf` 技能；自定义技能通过 `skill_id` 引用（每个智能体最多 20 个，预置 + 自定义合计）。
- **Outcome** —— 如果描述暗示了可检查的"完成"标准（或你可以在跟进中引出：不是"一份好的报告"，而是"每个 SKU 都有一个数字型 `price` 列的 CSV"），**建议 Outcome 启动方式** —— 框架根据评分标准评分并迭代修订（`shared/managed-agents-outcomes.md`）。
- **即时可用的资源** —— 磁盘上的仓库（`github_repository`：URL，可选 `mount_path`/`checkout`；令牌在 §4 中提供），需要预置的文件（Files API 上传 → `{type: "file", file_id, mount_path}`；只读），如果任务引用了它们。
- **模型** —— 默认 `{{OPUS_ID}}`；`{{FABLE_ID}}` 用于最困难的长时间工作（`shared/model-migration.md` → 迁移到 {{FABLE_NAME}}）。

> ‼️ **创建 PR 还需要 GitHub MCP 服务器。** `github_repository` 挂载仅提供文件系统访问。在挂载中编辑 → 通过 `bash` 推送分支 → 通过 MCP 的 `create_pull_request` 工具创建 PR。

每个配置项的完整细节：`shared/managed-agents-tools.md`（工具集、MCP、自定义工具、技能），`shared/managed-agents-environments.md`（仓库、文件）。

## 3. 环境

通常零到一个问题：

- **复用还是创建？** 环境可在多个智能体之间共享 —— 首先检查是否已有现成的。
- **网络** —— 默认不受限制的出站访问。仅在用户希望出站控制时切换到 `limited` —— 然后设置 `allow_mcp_servers: true` 或在 `allowed_hosts` 中列出每个 MCP 服务器域名，否则这些工具会静默失败。
- **当信号出现时建议 `self_hosted`**：工具必须运行在用户自己的基础设施上、秘密不能离开它，或者需要云容器不具备的二进制文件/数据（`shared/managed-agents-self-hosted-sandboxes.md`；Claude Platform on AWS 上不可用）。否则使用 `cloud` —— 不要对简单任务主动提出。

## 4. 会话 —— 认证，然后测试运行

**认证在此处进行 —— 收集 §2 中标记的凭据，此时配置已确定：** 为 §2 中声明的每个 MCP 服务器创建一个 vault（现有或 `vaults.create()`）+ `vaults.credentials.create()`，为任务使用的 API 密钥创建 `environment_variable` 凭据（在出站时替换；沙箱看到的是占位符），以及每个仓库挂载的 `authorization_token`。凭据是只写的；MCP 凭据按 URL 匹配服务器并自动刷新。参见 `shared/managed-agents-tools.md` → Vaults。

**静默可行性门禁 —— 在生成任何内容之前自行运行；仅暴露缺口。** 逐条梳理任务：每个动词都映射到一个已启用的工具或 MCP 服务器（"创建 PR" → GitHub MCP，而不仅仅是挂载）；每个 MCP 服务器和仓库挂载都有来自认证步骤的凭据；在网络选择下每个外部主机都可访问；任务引用的每个文件/仓库/数据集都已挂载；"完成"是可检查的。如果缺少什么，说出来并解决它 —— 不要生成一份你已知资源不足的配置。

**启动 —— 选择一种，不要两种都选：**
- `user.message` —— 对话式。
- `user.define_outcome` + 评分标准 —— 当 §2 确定了 Outcome 时；框架迭代并评分直到评分标准通过。
- **定时调度形态？** 完全跳过每次会话的启动 —— 改为创建**部署**（`deployments.create()`，附带 `schedule` + `initial_events`）；每次触发自主创建会话。参见 `shared/managed-agents-scheduled-deployments.md`。

需要融入运行时代码的机制：会话创建会阻塞直到资源挂载完成（错误的挂载在此处暴露，在消耗 token 之前）；在发送启动消息*之前*打开事件流；在 `session.status_terminated` 时退出，或在 `session.status_idle` 且带有终态 `stop_reason` 时退出 —— 除 `requires_action` 之外的任何情况（`shared/managed-agents-client-patterns.md` 模式 5）；用量数据在 `span.model_request_end` 上返回；产物位于 `/mnt/session/outputs/`（`files.list({scope_id: session.id, ...})`）。

## 5. 集成 —— 生成代码

从最后一个答案直接跳转到代码 —— 不需要铺垫，不需要讲解设置与运行时的区别；两段式结构已经展示了这些。生成**两个明确分隔的代码块**：

**代码块 1 — 设置（运行一次，保存 ID）。** 优先以 **YAML 文件 + `ant` CLI** 的形式输出 —— 智能体和环境是受版本控制的定义，用户应当签入仓库并通过 CI 应用：

1. `<name>.agent.yaml`（扁平结构：`name`、`model`、`system`、`tools`、`mcp_servers`、`skills`）和 `<name>.environment.yaml`
2. ```sh
   AGENT_ID=$(ant beta:agents create < <name>.agent.yaml --transform id -r)
   ENV_ID=$(ant beta:environments create < <name>.environment.yaml --transform id -r)
   # CI 同步：ant beta:agents update --agent-id "$AGENT_ID" --version N < <name>.agent.yaml
   ```

如果用户要求使用 SDK 则回退 —— 并且**在 Claude Platform on AWS 上必须使用 SDK**，因为其认证方式是 SigV4 而 `ant` CLI 没有 SigV4 模式（使用 `shared/claude-platform-on-aws.md` 中的平台客户端）：标注为 `# ONE-TIME SETUP — 运行一次，保存 ID`，并调用 `environments.create()` → `agents.create()`。

> ⚠️ **Deployments 比 MA 的其他部分更新。** 在生成 `ant beta:deployments …` 或 `client.beta.deployments` / `client.beta.deployment_runs` 调用之前，验证用户安装的 CLI/SDK 是否暴露了这些接口（`ant beta:deployments --help`；`hasattr(client.beta, "deployments")`）。如果没有，则生成原始 HTTP 请求，目标为 `POST /v1/deployments`，附带 `managed-agents-2026-04-01` beta header（加上 `oauth-2025-04-20`，当使用从 `ant auth print-credentials` 获取的 Bearer 令牌认证时），并留下升级说明，标记哪些可以简化为 SDK 调用。

**定时调度形态？部署属于设置，而非运行时。** 在代码块 1 中创建，在智能体/环境 ID 存在之后（`deployments.create()`，附带 `schedule` + `initial_events`）。代码块 2 则**不是**会话循环 —— 没有每次运行的启动消息要发送。改为生成：一个手动运行触发器（`POST /v1/deployments/{id}/run`），以便用户现在测试而不必等待首次触发 —— 手动运行兼作冒烟测试 —— 加上一个获取助手（最新的 `deployment_runs` 条目 → `session_id` → Console URL + `files.list(scope_id=session_id)` 获取产物）。

**代码块 2 — 运行时（每次调用；对话式和 Outcome 形态）。** 使用检测到的语言（Python/TS/cURL —— SKILL.md → Language Detection）的 SDK 代码；不要在这里生成 shell 循环：

1. 从 config/env 加载 `agent_id` + `env_id`
2. `sessions.create(agent=AGENT_ID, environment_id=ENV_ID, resources=[...], vault_ids=[...])`，然后打印 Console URL 以便用户实时观察：`https://platform.claude.com/workspaces/default/sessions/{session.id}`（将 `default` 替换为他们的工作区 slug）
3. **当任务依赖 MCP 服务器、凭据或锁定主机时进行冒烟测试** —— 这些故障不会在 `sessions.create()` 时暴露，仅在首次使用时。发送一轮低成本的探测消息（"确认你能访问 <service> 并列出 1–2 个项目；先不要开始任务"），验证成功后再发送真正的启动消息。没有外部依赖时可跳过。
4. 打开流 → 发送 §4 的启动消息 → 以 §4 的终态门控循环。

> ⚠️ **永远不要把 `agents.create()` 和 `sessions.create()` 放在同一个无保护的代码块中。** 这会教用户在每次运行时都创建新智能体 —— 这是排名第一的反模式（anti-pattern）。单个脚本请求：将创建包装在 `if not os.getenv("AGENT_ID"):` 中。

从检测到的语言的 `{lang}/managed-agents/README.md` 中提取精确语法（cURL 和 C#：使用 `curl/managed-agents.md` 作为线路级参考）。不要自行编造字段名。