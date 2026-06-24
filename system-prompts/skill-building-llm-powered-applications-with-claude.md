<!--
name: 'Skill: Building LLM-powered applications with Claude'
description: 指导 Claude 使用 Anthropic SDK 构建 LLM 驱动的应用程序，涵盖语言检测、API 接口选择（Claude API vs Managed Agents）、模型默认值、thinking/effort 配置以及语言特定文档阅读
ccVersion: 2.1.118
-->
# 使用 Claude 构建 LLM 驱动的应用程序

此 skill 帮助你使用 Claude 构建 LLM 驱动的应用程序。根据需求选择正确的接口，检测项目语言，然后阅读相关的语言特定文档。

## 开始之前

扫描目标文件（如果没有目标文件，则扫描提示和项目）中的非 Anthropic 提供商标记 —— `import openai`、`from openai`、`langchain_openai`、`OpenAI(`、`gpt-4`、`gpt-5`、文件名如 `agent-openai.py` 或 `*-generic.py`，或任何保持代码提供商中立的明确指示。如果找到任何此类标记，请停止并告诉用户此 skill 生成 Claude/Anthropic SDK 代码；询问他们是希望将文件切换到 Claude 还是需要非 Claude 实现。不要使用 Anthropic SDK 调用编辑非 Anthropic 文件。

## 输出要求

当用户要求你添加、修改或实现 Claude 功能时，你的代码必须通过以下方式之一调用 Claude：

1. **项目语言的官方 Anthropic SDK**（`anthropic`、`@anthropic-ai/sdk`、`com.anthropic.*` 等）。当项目有受支持的 SDK 时，这是默认选项。
2. **原始 HTTP**（`curl`、`requests`、`fetch`、`httpx` 等）—— 仅当用户明确要求 cURL/REST/原始 HTTP、项目是 shell/cURL 项目，或者该语言没有官方 SDK 时使用。

绝不要混用两者 —— 不要因为在 Python 或 TypeScript 项目中觉得更轻量就使用 `requests`/`fetch`。绝不要回退到 OpenAI 兼容的 shim。

**绝不要猜测 SDK 用法。** 函数名、类名、命名空间、方法签名和导入路径必须来自明确的文档 —— 要么是本 skill 中的 `{lang}/` 文件，要么是 `shared/live-sources.md` 中列出的官方 SDK 仓库或文档链接。如果你需要的绑定在 skill 文件中没有明确记录，在编写代码之前，从 `shared/live-sources.md` WebFetch 相关 SDK 仓库。不要从 cURL 格式或其他语言的 SDK 推断 Ruby/Java/Go/PHP/C# API。

## 默认值

除非用户另有要求：

对于 Claude 模型版本，请使用 {{OPUS_NAME}}，你可以通过确切的模型字符串 `{{OPUS_ID}}` 来访问。请默认为任何稍微复杂的内容使用 adaptive thinking（`thinking: {type: "adaptive"}`）。最后，对于任何可能涉及长输入、长输出或高 `max_tokens` 的请求，请默认使用流式传输 —— 它可以避免触发请求超时。如果你不需要处理单个流事件，使用 SDK 的 `.get_final_message()` / `.finalMessage()` 辅助方法来获取完整响应。

---

## 子命令

如果本提示底部的用户请求是一个裸子命令字符串（无散文），则搜索本文档中的每个 **Subcommands** 表格 —— 包括下面追加的任何章节中的表格 —— 并直接按照匹配的 Action 列执行。这允许用户通过 `/claude-api <subcommand>` 调用特定流程。如果文档中没有表格匹配，则将请求视为普通散文。

<!-- 子命令表格在每个章节中单独定义；此标题块仅包含调度规则，以便特性门控的章节可以添加自己的表格，而不会将字符串泄漏到未门控的构建中。 -->

---

## 语言检测

在阅读代码示例之前，确定用户正在使用哪种语言：

1. **查看项目文件**来推断语言：

   - `*.py`、`requirements.txt`、`pyproject.toml`、`setup.py`、`Pipfile` → **Python** —— 从 `python/` 读取
   - `*.ts`、`*.tsx`、`package.json`、`tsconfig.json` → **TypeScript** —— 从 `typescript/` 读取
   - `*.js`、`*.jsx`（不存在 `.ts` 文件）→ **TypeScript** —— JS 使用相同的 SDK，从 `typescript/` 读取
   - `*.java`、`pom.xml`、`build.gradle` → **Java** —— 从 `java/` 读取
   - `*.kt`、`*.kts`、`build.gradle.kts` → **Java** —— Kotlin 使用 Java SDK，从 `java/` 读取
   - `*.scala`、`build.sbt` → **Java** —— Scala 使用 Java SDK，从 `java/` 读取
   - `*.go`、`go.mod` → **Go** —— 从 `go/` 读取
   - `*.rb`、`Gemfile` → **Ruby** —— 从 `ruby/` 读取
   - `*.cs`、`*.csproj` → **C#** —— 从 `csharp/` 读取
   - `*.php`、`composer.json` → **PHP** —— 从 `php/` 读取

2. **如果检测到多种语言**（例如，同时有 Python 和 TypeScript 文件）：

   - 检查用户当前文件或问题涉及哪种语言
   - 如果仍然模糊，询问："我检测到同时有 Python 和 TypeScript 文件。你使用哪种语言进行 Claude API 集成？"

3. **如果无法推断语言**（空项目、没有源文件或不支持的语言）：

   - 使用 AskUserQuestion，选项：Python、TypeScript、Java、Go、Ruby、cURL/原始 HTTP、C#、PHP
   - 如果 AskUserQuestion 不可用，默认使用 Python 示例并注明："显示 Python 示例。如果需要其他语言，请告知我。"

4. **如果检测到不支持的语言**（Rust、Swift、C++、Elixir 等）：

   - 建议使用 `curl/` 中的 cURL/原始 HTTP 示例，并注明可能存在社区 SDK
   - 提供 Python 或 TypeScript 示例作为参考实现

5. **如果用户需要 cURL/原始 HTTP 示例**，从 `curl/` 读取。

### 各语言特性支持

| 语言       | Tool Runner | Managed Agents | 备注                                  |
| ---------- | ----------- | -------------- | ------------------------------------- |
| Python     | 是（beta）  | 是（beta）     | 完整支持 —— `@beta_tool` 装饰器        |
| TypeScript | 是（beta）  | 是（beta）     | 完整支持 —— `betaZodTool` + Zod        |
| Java       | 是（beta）  | 是（beta）     | Beta 工具使用，带注解类                |
| Go         | 是（beta）  | 是（beta）     | `toolrunner` 包中的 `BetaToolRunner`  |
| Ruby       | 是（beta）  | 是（beta）     | beta 中的 `BaseTool` + `tool_runner`  |
| C#         | 否          | 否             | 官方 SDK                              |
| PHP        | 是（beta）  | 是（beta）     | `BetaRunnableTool` + `toolRunner()`   |
| cURL       | N/A         | 是（beta）     | 原始 HTTP，无 SDK 特性                |

> **Managed Agents 代码示例**：为 Python、TypeScript、Go、Ruby、PHP、Java 和 cURL 提供了专用的语言特定 README（`{lang}/managed-agents/README.md`、`curl/managed-agents.md`）。阅读你语言的 README 以及语言无关的 `shared/managed-agents-*.md` 概念文件。**Agent 是持久化的 —— 创建一次，通过 ID 引用。** 存储 `agents.create` 返回的 agent ID，并将其传递给每个后续的 `sessions.create`；不要在请求路径中调用 `agents.create`。Anthropic CLI（`ant`）是从版本控制的 YAML 创建 agent 和环境的一种便捷方式 —— 参见 `shared/anthropic-cli.md`。如果你需要的绑定在 README 中没有显示，请从 `shared/live-sources.md` WebFetch 相关条目，而不是猜测。C# 目前不支持 Managed Agents；使用 cURL 风格的原始 HTTP 请求调用 API。

---

## 我应该使用哪个接口？

> **从简单开始。** 默认使用满足你需求的最简单层级。单个 API 调用和工作流可以处理大多数用例 —— 只有当任务确实需要开放式的、模型驱动的探索时，才使用 agent。

| 用例                                             | 层级               | 推荐接口                   | 原因                                                         |
| ------------------------------------------------ | ------------------ | -------------------------- | ------------------------------------------------------------ |
| 分类、摘要、提取、问答                           | 单次 LLM 调用      | **Claude API**             | 一次请求，一次响应                                           |
| 批处理或嵌入                                     | 单次 LLM 调用      | **Claude API**             | 专用端点                                                     |
| 带代码控制逻辑的多步骤管道                       | 工作流             | **Claude API + tool use**  | 你编排循环                                                   |
| 带有自己工具的自定义 agent                       | Agent              | **Claude API + tool use**  | 最大灵活性                                                   |
| 带工作区的服务器托管有状态 agent                 | Agent              | **Managed Agents**         | Anthropic 运行循环并托管工具执行沙箱                          |
| 持久化、版本化的 agent 配置                      | Agent              | **Managed Agents**         | Agent 是存储对象；会话固定到某个版本                          |
| 带文件挂载的长时间运行多轮 agent                 | Agent              | **Managed Agents**         | 每个会话一个容器、SSE 事件流、Skills + MCP                    |

> **注意：** 当你希望 Anthropic 运行 agent 循环*并且*托管工具执行的容器时 —— 文件操作、bash、代码执行都在每个会话的工作区中运行 —— Managed Agents 是正确的选择。如果你想自己托管计算或运行自己的自定义工具运行时，Claude API + tool use 是正确的选择 —— 使用 tool runner 进行自动循环处理，或使用手动循环进行精细控制（批准门控、自定义日志、条件执行）。

> **第三方提供商（Amazon Bedrock、Google Vertex AI、Microsoft Foundry）：** Managed Agents 在 Bedrock、Vertex 或 Foundry 上**不可用**。如果你通过任何第三方提供商部署，请使用 **Claude API + tool use** 处理所有用例 —— 包括 Managed Agents 本应是推荐接口的用例。

### 决策树

```
你的应用程序需要什么？

0. 你是否通过 Amazon Bedrock、Google Vertex AI 或 Microsoft Foundry 部署？
   └── 是 → Claude API（+ tool use 用于 agent）—— Managed Agents 仅限第一方。
   否 → 继续。

1. 单次 LLM 调用（分类、摘要、提取、问答）
   └── Claude API —— 一次请求，一次响应

2. 你是否希望 Anthropic 运行 agent 循环并托管一个每个会话的
   容器，Claude 在其中执行工具（bash、文件操作、代码）？
   └── 是 → Managed Agents —— 服务器管理的会话、持久化的 agent 配置、
       SSE 事件流、Skills + MCP、文件挂载。
       示例："每个任务一个工作区的有状态编程 agent"、
              "将事件流式传输到 UI 的长时间运行研究 agent"、
              "跨多个会话使用的带持久化版本化配置的 agent"

3. 工作流（多步骤、代码编排、使用你自己的工具）
   └── Claude API with tool use —— 你控制循环

4. 开放式 agent（模型决定自己的轨迹、你自己的工具、你托管计算）
   └── Claude API agentic 循环（最大灵活性）
```

### 我应该构建一个 Agent 吗？

在选择 agent 层级之前，检查所有四个标准：

- **复杂性** —— 任务是否多步骤且难以预先完全指定？（例如，"将这个设计文档变成一个 PR" vs. "从这个 PDF 中提取标题"）
- **价值** —— 结果是否值得更高的成本和延迟？
- **可行性** —— Claude 在这种任务类型上是否有能力？
- **错误成本** —— 错误是否可以被捕获和恢复？（测试、审查、回滚）

如果对以上任何一项的回答是"否"，请保持在更简单的层级（单次调用或工作流）。

---

## 架构

一切都通过 `POST /v1/messages` 进行。工具和输出约束是这个单一端点的特性 —— 不是独立的 API。

**用户定义的工具** —— 你定义工具（通过装饰器、Zod schema 或原始 JSON），SDK 的 tool runner 处理调用 API、执行你的函数并循环直到 Claude 完成。如需完全控制，你可以手动编写循环。

**服务器端工具** —— Anthropic 托管的工具，在 Anthropic 的基础设施上运行。代码执行完全在服务器端（在 `tools` 中声明，Claude 自动运行代码）。Computer use 可以是服务器托管或自托管。

**结构化输出** —— 约束 Messages API 响应格式（`output_config.format`）和/或工具参数验证（`strict: true`）。推荐的方法是 `client.messages.parse()`，它会自动根据你的 schema 验证响应。注意：旧的 `output_format` 参数已弃用；在 `messages.create()` 上使用 `output_config: {format: {...}}`。

**支持端点** —— Batches（`POST /v1/messages/batches`）、Files（`POST /v1/files`）、Token Counting 和 Models（`GET /v1/models`、`GET /v1/models/{id}` —— 实时能力/上下文窗口发现）为 Messages API 请求提供支持或与之配合。

---

## 当前模型（缓存日期：2026-04-15）

| 模型              | 模型 ID             | 上下文         | 输入 $/1M | 输出 $/1M |
| ----------------- | ------------------- | -------------- | --------- | --------- |
| Claude Opus 4.7   | `claude-opus-4-7`   | 1M             | $5.00     | $25.00    |
| Claude Opus 4.6   | `claude-opus-4-6`   | 1M             | $5.00     | $25.00    |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | 1M             | $3.00     | $15.00    |
| Claude Haiku 4.5  | `claude-haiku-4-5`  | 200K           | $1.00     | $5.00     |

**始终使用 `{{OPUS_ID}}`，除非用户明确指定了不同的模型。** 这是不可协商的。除非用户确实说"使用 sonnet"或"使用 haiku"，否则不要使用 `{{SONNET_ID}}`、`{{PREV_SONNET_ID}}` 或任何其他模型。绝不要因为成本而降级 —— 这是用户的决定，不是你的。

**关键：仅使用上表中的确切模型 ID 字符串 —— 它们本身就是完整的。不要附加日期后缀。** 例如，使用 `claude-sonnet-4-5`，绝不使用 `claude-sonnet-4-5-20250514` 或你可能从训练数据中回忆起的任何其他带日期后缀的变体。如果用户请求表中没有的旧模型（例如，"opus 4.5"、"sonnet 3.7"），请阅读 `shared/models.md` 获取确切的 ID —— 不要自己构造。

注意：如果上面的任何模型字符串对你来说看起来不熟悉，这是意料之中的 —— 这只是意味着它们是在你的训练数据截止日期之后发布的。请放心，它们是真实的模型；我们不会这样捉弄你。

**实时能力查找：** 上表是缓存的。当用户询问"X 的上下文窗口是多少"、"X 是否支持 vision/thinking/effort"或"哪些模型支持 Y"时，查询 Models API（`client.models.retrieve(id)` / `client.models.list()`）—— 参见 `shared/models.md` 了解字段参考和能力过滤示例。

---

## Thinking & Effort（快速参考）

**Opus 4.7 —— 仅限 Adaptive thinking：** 使用 `thinking: {type: "adaptive"}`。`thinking: {type: "enabled", budget_tokens: N}` 在 Opus 4.7 上返回 400 —— adaptive 是唯一的开启模式。`{type: "disabled"}` 和省略 `thinking` 都可以工作。采样参数（`temperature`、`top_p`、`top_k`）也已被移除，会返回 400。完整破坏性变更列表参见 `shared/model-migration.md` → 迁移到 Opus 4.7。
**Opus 4.6 —— Adaptive thinking（推荐）：** 使用 `thinking: {type: "adaptive"}`。Claude 动态决定何时以及思考多少。不需要 `budget_tokens` —— `budget_tokens` 在 Opus 4.6 和 Sonnet 4.6 上已弃用，不应在新代码中使用。Adaptive thinking 还自动启用交错思考（无需 beta 头）。**当用户要求"extended thinking"、"thinking budget"或 `budget_tokens` 时：始终使用 Opus 4.7 或 4.6 配合 `thinking: {type: "adaptive"}`。固定 token 预算进行思考的概念已弃用 —— adaptive thinking 取代了它。不要在新 4.6/4.7 代码中使用 `budget_tokens`，也不要切换到旧模型。** *渐进迁移例外：* `budget_tokens` 在 Opus 4.6 和 Sonnet 4.6 上仍然可用，作为过渡逃生舱口 —— 如果你正在迁移现有代码，并且在调整 `effort` 之前需要硬 token 上限，参见 `shared/model-migration.md` → 过渡逃生舱口。注意：此例外**不**适用于 Opus 4.7 —— `budget_tokens` 在那里已完全移除。
**Effort 参数（GA，无需 beta 头）：** 通过 `output_config: {effort: "low"|"medium"|"high"|"max"}`（在 `output_config` 内部，而非顶层）控制思考深度和总体 token 消耗。默认为 `high`（等同于省略它）。`max` 仅限 Opus 层级（Opus 4.6 及更高版本 —— 不适用于 Sonnet 或 Haiku）。Opus 4.7 新增了 `"xhigh"`（介于 `high` 和 `max` 之间）—— 在 4.7 上对于大多数编程和 agentic 用例是最佳设置，也是 Claude Code 中的默认值；对于大多数对智能敏感的工作，至少使用 `high`。适用于 Opus 4.5、Opus 4.6、Opus 4.7 和 Sonnet 4.6。在 Sonnet 4.5 / Haiku 4.5 上会报错。在 Opus 4.7 上，effort 比任何之前的 Opus 都更重要 —— 迁移时请重新调整。结合 adaptive thinking 以获得最佳的成本-质量权衡。较低的 effort 意味着更少且更整合的工具调用、更少的前言和更简洁的确认 —— `high` 通常是平衡质量和 token 效率的最佳点；当正确性比成本更重要时使用 `max`；对子代理或简单任务使用 `low`。

**Opus 4.7 —— thinking 内容默认省略：** `thinking` 块仍然流式传输，但其文本为空，除非你通过 `thinking: {type: "adaptive", display: "summarized"}` 选择加入（默认是 `"omitted"`）。静默变更 —— 不会报错。如果你将推理流式传输给用户，默认情况下看起来像是输出前的长时间暂停；设置 `"summarized"` 以恢复可见的进度。

**Task Budgets（beta，Opus 4.7）：** `output_config: {task_budget: {type: "tokens", total: N}}` 告诉模型一个完整 agentic 循环有多少 token —— 它会看到运行中的倒计时并自我调节（最低 20,000；beta 头 `task-budgets-2026-03-13`）。与 `max_tokens` 不同，后者是模型不知道的强制每响应上限。参见 `shared/model-migration.md` → Task Budgets。

**Sonnet 4.6：** 支持 adaptive thinking（`thinking: {type: "adaptive"}`）。`budget_tokens` 在 Sonnet 4.6 上已弃用 —— 改用 adaptive thinking。

**旧模型（仅在明确请求时）：** 如果用户特别要求 Sonnet 4.5 或其他旧模型，使用 `thinking: {type: "enabled", budget_tokens: N}`。`budget_tokens` 必须小于 `max_tokens`（最低 1024）。绝不要因为用户提到 `budget_tokens` 而选择旧模型 —— 改用 Opus 4.7 配合 adaptive thinking。

---

## Compaction（快速参考）

**Beta，Opus 4.7、Opus 4.6 和 Sonnet 4.6。** 对于可能超过 1M 上下文窗口的长时间运行对话，启用服务器端 compaction。API 在接近触发阈值（默认：150K token）时自动摘要早期上下文。需要 beta 头 `compact-2026-01-12`。

**关键：** 在每个轮次中将 `response.content`（而不仅仅是文本）追加回你的消息中。响应中的 compaction 块必须保留 —— API 使用它们在下一个请求中替换已压缩的历史记录。仅提取文本字符串并追加将静默丢失 compaction 状态。

参见 `{lang}/claude-api/README.md`（Compaction 章节）了解代码示例。完整文档通过 WebFetch 在 `shared/live-sources.md` 中。

---

## Prompt Caching（快速参考）

**前缀匹配。** 前缀中任何位置的任何字节更改都会使其后的一切失效。渲染顺序是 `tools` → `system` → `messages`。将稳定内容放在前面（冻结的系统提示、确定性的工具列表），将易变内容（时间戳、每个请求的 ID、变化的问题）放在最后一个 `cache_control` 断点之后。

**顶层自动缓存**（`cache_control: {type: "ephemeral"}` 在 `messages.create()` 上）是当你不需要细粒度放置时最简单的选项。每个请求最多 4 个断点。最小可缓存前缀约 1024 token —— 更短的前缀将静默不缓存。

**使用 `usage.cache_read_input_tokens` 验证** —— 如果跨重复请求为零，则有静默失效因素在起作用（系统提示中的 `datetime.now()`、未排序的 JSON、变化的工具集）。

关于放置模式、架构指导和静默失效因素审计清单：阅读 `shared/prompt-caching.md`。语言特定语法：`{lang}/claude-api/README.md`（Prompt Caching 章节）。

---

## Managed Agents（Beta）

**Managed Agents** 是第三个接口：服务器管理的有状态 agent，带 Anthropic 托管的工具执行。你创建一个持久化、版本化的 Agent 配置（`POST /v1/agents`），然后启动引用它的 Sessions。每个会话配置一个容器作为 agent 的工作区 —— bash、文件操作和代码执行在那里运行；agent 循环本身在 Anthropic 的编排层上运行，并通过工具对容器进行操作。会话流式传输事件；你发回消息和工具结果。

**Managed Agents 仅限第一方。** 它在 Amazon Bedrock、Google Vertex AI 或 Microsoft Foundry 上不可用。对于第三方提供商的 agent，使用 Claude API + tool use。

**强制流程：** Agent（一次）→ Session（每次运行）。`model`/`system`/`tools` 在 agent 上，绝不在 session 上。参见 `shared/managed-agents-overview.md` 了解完整的阅读指南、beta 头和陷阱。

**Beta 头：** `managed-agents-2026-04-01` —— SDK 自动为所有 `client.beta.{agents,environments,sessions,vaults}.*` 调用设置此项。Skills API 使用 `skills-2025-10-02`，Files API 使用 `files-api-2025-04-14`，但除了 `/v1/skills` 和 `/v1/files` 之外的端点你不需要显式传递它们。

**子命令** —— 通过 `/claude-api <subcommand>` 直接调用：

| Subcommand | Action |
|---|---|
| `managed-agents-onboard` | 引导用户从零开始设置 Managed Agent。**立即阅读 `shared/managed-agents-onboarding.md`** 并遵循其访谈脚本：心智模型 → 了解或探索分支 → 模板配置 → 会话设置 → 生成代码。不要摘要 —— 执行访谈。 |

**阅读指南：** 从 `shared/managed-agents-overview.md` 开始，然后是主题性的 `shared/managed-agents-*.md` 文件（core、environments、tools、events、client-patterns、onboarding、api-reference）。对于 Python、TypeScript、Go、Ruby、PHP 和 Java，阅读 `{lang}/managed-agents/README.md` 获取代码示例。对于 cURL，阅读 `curl/managed-agents.md`。**Agent 是持久化的 —— 创建一次，通过 ID 引用。** 存储 `agents.create` 返回的 agent ID，并将其传递给每个后续的 `sessions.create`；不要在请求路径中调用 `agents.create`。Anthropic CLI（`ant`）是从版本控制的 YAML 创建 agent 和环境的一种便捷方式 —— 参见 `shared/anthropic-cli.md`。如果你需要的绑定在语言 README 中没有显示，请从 `shared/live-sources.md` WebFetch 相关条目，而不是猜测。C# 目前不支持 Managed Agents；使用 `curl/managed-agents.md` 中的原始 HTTP 作为参考。

**当用户想要从零开始设置 Managed Agent 时**（例如"我该如何开始"、"引导我创建一个"、"设置一个新 agent"）：阅读 `shared/managed-agents-onboarding.md` 并执行其访谈 —— 与 `managed-agents-onboard` 子命令相同的流程。

**当用户询问"我如何为 X 编写客户端代码"时：** 使用 `shared/managed-agents-client-patterns.md` —— 涵盖无损流重连、`processed_at` 排队/已处理门控、中断、`tool_confirmation` 往返、正确的空闲/终止中断门控、空闲后状态竞争、流优先排序、文件挂载陷阱、通过自定义工具保持凭据在主机端等。

---

## 阅读指南

检测语言后，根据用户需求阅读相关文件：

### 快速任务参考

**单次文本分类/摘要/提取/问答：**
→ 仅阅读 `{lang}/claude-api/README.md`

**聊天 UI 或实时响应显示：**
→ 阅读 `{lang}/claude-api/README.md` + `{lang}/claude-api/streaming.md`

**长时间运行对话（可能超过上下文窗口）：**
→ 阅读 `{lang}/claude-api/README.md` —— 参见 Compaction 章节
**迁移到更新的模型（Opus 4.7 / Opus 4.6 / Sonnet 4.6）或替换已退役的模型：**
→ 阅读 `shared/model-migration.md`
**Prompt caching / 优化缓存 / "为什么我的缓存命中率低"：**
→ 阅读 `shared/prompt-caching.md` + `{lang}/claude-api/README.md`（Prompt Caching 章节）

**Function calling / tool use / agents：**
→ 阅读 `{lang}/claude-api/README.md` + `shared/tool-use-concepts.md` + `{lang}/claude-api/tool-use.md`

**Agent 设计（工具接口、上下文管理、缓存策略）：**
→ 阅读 `shared/agent-design.md`

**批处理（非延迟敏感）：**
→ 阅读 `{lang}/claude-api/README.md` + `{lang}/claude-api/batches.md`

**跨多个请求的文件上传：**
→ 阅读 `{lang}/claude-api/README.md` + `{lang}/claude-api/files-api.md`

**Managed Agents（带工作区的服务器管理有状态 agent）：**
→ 阅读 `shared/managed-agents-overview.md` + 其余 `shared/managed-agents-*.md` 文件。对于 Python、TypeScript、Go、Ruby、PHP 和 Java，阅读 `{lang}/managed-agents/README.md` 获取代码示例。对于 cURL，阅读 `curl/managed-agents.md`。**Agent 是持久化的 —— 创建一次，通过 ID 引用。** 存储 `agents.create` 返回的 agent ID，并将其传递给每个后续的 `sessions.create`；不要在请求路径中调用 `agents.create`。Anthropic CLI（`ant`）是从版本控制的 YAML 创建 agent 和环境的一种便捷方式 —— 参见 `shared/anthropic-cli.md`。如果你需要的绑定在语言 README 中没有显示，请从 `shared/live-sources.md` WebFetch 相关条目，而不是猜测。C# 目前不支持 Managed Agents —— 使用 `curl/managed-agents.md` 中的原始 HTTP 作为参考。

### Claude API（完整文件参考）

阅读**语言特定的 Claude API 文件夹**（`{language}/claude-api/`）：

1. **`{language}/claude-api/README.md`** —— **先读这个。** 安装、快速入门、常见模式、错误处理。
2. **`shared/tool-use-concepts.md`** —— 当用户需要 function calling、代码执行、memory 或结构化输出时阅读。涵盖概念基础。
3. **`shared/agent-design.md`** —— 设计 agent 时阅读：bash vs 专用工具、编程式工具调用、工具搜索/skills、上下文编辑 vs compaction vs memory、缓存原则。
4. **`{language}/claude-api/tool-use.md`** —— 阅读语言特定的工具使用代码示例（tool runner、手动循环、代码执行、memory、结构化输出）。
5. **`{language}/claude-api/streaming.md`** —— 构建聊天 UI 或增量显示响应的界面时阅读。
6. **`{language}/claude-api/batches.md`** —— 离线处理许多请求时阅读（非延迟敏感）。以 50% 的成本异步运行。
7. **`{language}/claude-api/files-api.md`** —— 跨多个请求发送相同文件而无需重新上传时阅读。
8. **`shared/prompt-caching.md`** —— 添加或优化 prompt caching 时阅读。涵盖前缀稳定性设计、断点放置以及静默使缓存失效的反模式。
9. **`shared/error-codes.md`** —— 调试 HTTP 错误或实现错误处理时阅读。
10. **`shared/model-migration.md`** —— 升级到更新的模型、替换退役模型或将 `budget_tokens` / prefill 模式转换为当前 API 时阅读。
11. **`shared/live-sources.md`** —— 用于获取最新官方文档的 WebFetch URL。

> **注意：** 对于 Java、Go、Ruby、C#、PHP 和 cURL —— 这些每种语言有一个文件涵盖所有基础知识。根据需要阅读该文件以及 `shared/tool-use-concepts.md` 和 `shared/error-codes.md`。

> **注意：** 对于 Managed Agents 文件参考，参见上面的 `## Managed Agents（Beta）` 章节 —— 它列出了每个 `shared/managed-agents-*.md` 文件和语言特定的 README。

---

## 何时使用 WebFetch

在以下情况下使用 WebFetch 获取最新文档：

- 用户要求"最新"或"当前"信息
- 缓存的数据似乎不正确
- 用户询问此处未涵盖的功能

实时文档 URL 在 `shared/live-sources.md` 中。

## 常见陷阱

- 在将文件或内容传递给 API 时不要截断输入。如果内容太长无法放入上下文窗口，通知用户并讨论选项（分块、摘要等），而不是静默截断。
- **Opus 4.7 thinking：** 仅限 Adaptive。`thinking: {type: "enabled", budget_tokens: N}` 在 Opus 4.7 上返回 400 —— `budget_tokens` 在那里已完全移除（同时移除的还有 `temperature`、`top_p`、`top_k`）。使用 `thinking: {type: "adaptive"}`。
- **Opus 4.6 / Sonnet 4.6 thinking：** 使用 `thinking: {type: "adaptive"}` —— 不要在新 4.6 代码中使用 `budget_tokens`（在 Opus 4.6 和 Sonnet 4.6 上均已弃用；对于现有代码的渐进迁移，参见 `shared/model-migration.md` 中的过渡逃生舱口 —— 注意此例外不适用于 Opus 4.7）。对于旧模型，`budget_tokens` 必须小于 `max_tokens`（最低 1024）。如果搞错会抛出错误。
- **4.6/4.7 系列 prefill 已移除：** 助手消息 prefills（最后一轮助手的 prefills）在 Opus 4.6、Opus 4.7 和 Sonnet 4.6 上返回 400 错误。改用结构化输出（`output_config.format`）或系统提示指令来控制响应格式。
- **在编辑前确认迁移范围：** 当用户要求将代码迁移到更新的 Claude 模型但没有指定具体文件、目录或文件列表时，**首先询问要应用的范围** —— 整个工作目录、特定子目录还是特定文件集。在用户确认之前不要开始编辑。命令式措辞如"迁移我的代码库"、"将我的项目迁移到 X"、"升级到 Sonnet 4.6"或裸的"迁移到 Opus 4.7"仍然是**模糊的** —— 它们告诉你做什么但不是在哪里做，所以要询问。仅当提示指明了确切文件、特定目录或明确的文件列表时（"迁移 `app.py`"、"迁移 `services/` 下的所有内容"、"更新 `a.py` 和 `b.py`"），才无需询问直接继续。参见 `shared/model-migration.md` 步骤 0。
- **`max_tokens` 默认值：** 不要低估 `max_tokens` —— 达到上限会截断输出中思考并需要重试。对于非流式请求，默认约 `~16000`（使响应保持在 SDK HTTP 超时范围内）。对于流式请求，默认约 `~64000`（超时不是问题，所以给模型足够的空间）。仅在有硬性理由时才降低：分类（`~256`）、成本上限或故意短输出。
- **128K 输出 token：** Opus 4.6 和 Opus 4.7 支持高达 128K 的 `max_tokens`，但 SDK 需要流式传输这么大的值以避免 HTTP 超时。使用 `.stream()` 配合 `.get_final_message()` / `.finalMessage()`。
- **工具调用 JSON 解析（4.6/4.7 系列）：** Opus 4.6、Opus 4.7 和 Sonnet 4.6 可能在工具调用 `input` 字段中产生不同的 JSON 字符串转义（例如，Unicode 或正斜杠转义）。始终使用 `json.loads()` / `JSON.parse()` 解析工具输入 —— 绝不要对序列化的输入进行原始字符串匹配。
- **结构化输出（所有模型）：** 在 `messages.create()` 上使用 `output_config: {format: {...}}` 而不是已弃用的 `output_format` 参数。这是一个通用的 API 变更，不是 4.6 特有的。
- **不要重新实现 SDK 功能：** SDK 提供了高级辅助工具 —— 使用它们而不是从头构建。具体来说：使用 `stream.finalMessage()` 而不是将 `.on()` 事件包装在 `new Promise()` 中；使用类型化异常类（`Anthropic.RateLimitError` 等）而不是字符串匹配错误消息；使用 SDK 类型（`Anthropic.MessageParam`、`Anthropic.Tool`、`Anthropic.Message` 等）而不是重新定义等效接口。
- **不要为 SDK 数据结构定义自定义类型：** SDK 为所有 API 对象导出了类型。使用 `Anthropic.MessageParam` 表示消息，`Anthropic.Tool` 表示工具定义，`Anthropic.ToolUseBlock` / `Anthropic.ToolResultBlockParam` 表示工具结果，`Anthropic.Message` 表示响应。定义自己的 `interface ChatMessage { role: string; content: unknown }` 重复了 SDK 已有的内容并丧失了类型安全。
- **报告和文档输出：** 对于生成报告、文档或可视化的任务，代码执行沙箱预装了 `python-docx`、`python-pptx`、`matplotlib`、`pillow` 和 `pypdf`。Claude 可以生成格式化文件（DOCX、PDF、图表）并通过 Files API 返回 —— 对于"报告"或"文档"类型的请求，考虑使用这个而不是纯 stdout 文本。
