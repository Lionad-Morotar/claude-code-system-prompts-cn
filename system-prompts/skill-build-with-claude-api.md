<!--
name: 'Skill: 使用 Claude 构建 LLM 驱动的应用程序'
description: 指导 Claude 使用 Anthropic SDK 构建 LLM 驱动的应用程序，涵盖语言检测、API 界面选择（Claude API 与 Managed Agents）、模型默认值、思考/effort 配置，以及语言特定的文档阅读
ccVersion: 2.1.108
-->
# 使用 Claude 构建 LLM 驱动的应用程序

本 skill 帮助你使用 Claude 构建 LLM 驱动的应用程序。根据你的需求选择合适的界面，检测项目语言，然后阅读相关的语言特定文档。

## 开始之前

扫描目标文件（如果没有目标文件，则扫描提示词和项目）中是否存在非 Anthropic 提供商标记 —— `import openai`、`from openai`、`langchain_openai`、`OpenAI(`、`gpt-4`、`gpt-5`、类似 `agent-openai.py` 或 `*-generic.py` 的文件名，或任何明确要求保持代码与提供商无关的指令。如果发现任何此类标记，请停止并告知用户此 skill 生成的是 Claude/Anthropic SDK 代码；询问他们是希望将文件切换到 Claude，还是需要非 Claude 的实现。不要使用 Anthropic SDK 调用来编辑非 Anthropic 文件。

## 输出要求

当用户要求你添加、修改或实现 Claude 功能时，你的代码必须通过以下方式之一调用 Claude：

1. **项目语言的官方 Anthropic SDK**（`anthropic`、`@anthropic-ai/sdk`、`com.anthropic.*` 等）。当项目有受支持的 SDK 时，这是默认选择。
2. **原始 HTTP**（`curl`、`requests`、`fetch`、`httpx` 等）—— 仅在用户明确要求 cURL/REST/原始 HTTP、项目是 shell/cURL 项目，或该语言没有官方 SDK 时使用。

永远不要混合使用这两种方式 —— 不要仅仅因为觉得更轻便就在 Python 或 TypeScript 项目中使用 `requests`/`fetch`。永远不要退回到 OpenAI 兼容的 shim。

**永远不要猜测 SDK 用法。** 函数名、类名、命名空间、方法签名和导入路径必须来自明确的文档 —— 要么来自此 skill 中的 `{lang}/` 文件，要么来自 `shared/live-sources.md` 中列出的官方 SDK 仓库或文档链接。如果你需要的绑定在 skill 文件中没有明确记录，请在编写代码之前通过 WebFetch 从 `shared/live-sources.md` 获取相关的 SDK 仓库。不要从 cURL 形式或其他语言的 SDK 推断 Ruby/Java/Go/PHP/C# API。

## 默认值

除非用户另有要求：

对于 Claude 模型版本，请使用 {{OPUS_NAME}}，你可以通过确切的模型字符串 `{{OPUS_ID}}` 访问它。对于任何稍微复杂的任务，请默认使用自适应思考 (`thinking: {type: "adaptive"}`)。最后，对于任何可能涉及长输入、长输出或高 `max_tokens` 的请求，请默认使用流式传输 —— 这可以防止请求超时。如果你不需要处理单独的流事件，可以使用 SDK 的 `.get_final_message()` / `.finalMessage()` 辅助方法来获取完整响应

---

## 子命令

如果此提示词底部的用户请求是裸子命令字符串（无散文），则搜索本文档中的所有 **子命令** 表 —— 包括下面追加的任何部分 —— 并直接遵循匹配的 Action 列。这允许用户通过 `/claude-api <subcommand>` 调用特定流程。如果文档中没有表匹配，则将请求视为普通散文。

<!-- 子命令表在每个部分下方定义；此标头块仅包含调度规则，以便功能门控的部分可以添加自己的表，而不会将字符串泄漏到未门控的构建中。 -->

---

## 语言检测

在阅读代码示例之前，确定用户正在使用哪种语言：

1. **查看项目文件**以推断语言：

   - `*.py`、`requirements.txt`、`pyproject.toml`、`setup.py`、`Pipfile` → **Python** — 从 `python/` 读取
   - `*.ts`、`*.tsx`、`package.json`、`tsconfig.json` → **TypeScript** — 从 `typescript/` 读取
   - `*.js`、`*.jsx`（没有 `.ts` 文件存在）→ **TypeScript** — JS 使用相同的 SDK，从 `typescript/` 读取
   - `*.java`、`pom.xml`、`build.gradle` → **Java** — 从 `java/` 读取
   - `*.kt`、`*.kts`、`build.gradle.kts` → **Java** — Kotlin 使用 Java SDK，从 `java/` 读取
   - `*.scala`、`build.sbt` → **Java** — Scala 使用 Java SDK，从 `java/` 读取
   - `*.go`、`go.mod` → **Go** — 从 `go/` 读取
   - `*.rb`、`Gemfile` → **Ruby** — 从 `ruby/` 读取
   - `*.cs`、`*.csproj` → **C#** — 从 `csharp/` 读取
   - `*.php`、`composer.json` → **PHP** — 从 `php/` 读取

2. **如果检测到多种语言**（例如，同时存在 Python 和 TypeScript 文件）：

   - 检查用户当前文件或问题与哪种语言相关
   - 如果仍然不明确，询问："我检测到同时存在 Python 和 TypeScript 文件。你正在使用哪种语言进行 Claude API 集成？"

3. **如果无法推断语言**（空项目、没有源文件或不支持的语言）：

   - 使用 AskUserQuestion 提供选项：Python、TypeScript、Java、Go、Ruby、cURL/raw HTTP、C#、PHP
   - 如果 AskUserQuestion 不可用，默认显示 Python 示例并注明："显示 Python 示例。如果你需要其他语言，请告诉我。"

4. **如果检测到不支持的语言**（Rust、Swift、C++、Elixir 等）：

   - 建议从 `curl/` 获取 cURL/raw HTTP 示例，并说明可能存在社区 SDK
   - 提供显示 Python 或 TypeScript 示例作为参考实现

5. **如果用户需要 cURL/raw HTTP 示例**，从 `curl/` 读取。

### 语言特定功能支持

| 语言       | Tool Runner | Managed Agents | 说明                                 |
| ---------- | ----------- | -------------- | ------------------------------------- |
| Python     | 是 (beta)   | 是 (beta)      | 完整支持 — `@beta_tool` 装饰器 |
| TypeScript | 是 (beta)   | 是 (beta)      | 完整支持 — `betaZodTool` + Zod    |
| Java       | 是 (beta)   | 是 (beta)      | 使用注解类的 Beta tool use  |
| Go         | 是 (beta)   | 是 (beta)      | `toolrunner` 包中的 `BetaToolRunner`  |
| Ruby       | 是 (beta)   | 是 (beta)      | beta 中的 `BaseTool` + `tool_runner`    |
| C#         | 否          | 否             | 官方 SDK                          |
| PHP        | 是 (beta)   | 是 (beta)      | `BetaRunnableTool` + `toolRunner()`    |
| cURL       | N/A         | 是 (beta)      | 原始 HTTP，无 SDK 功能             |

> **Managed Agents 代码示例**：为 Python、TypeScript、Go、Ruby、PHP、Java 和 cURL 提供了专门的语言特定 README（`{lang}/managed-agents/README.md`、`curl/managed-agents.md`）。请阅读你的语言的 README 以及语言无关的 `shared/managed-agents-*.md` 概念文件。**Agent 是持久化的 —— 创建一次，通过 ID 引用。** 存储 `agents.create` 返回的 agent ID，并将其传递给每次后续的 `sessions.create`；不要在请求路径中调用 `agents.create`。Anthropic CLI 是从版本控制的 YAML 创建 agent 和 environment 的一种便捷方式 —— 其 URL 在 `shared/live-sources.md` 中。如果你需要的绑定在 README 中没有显示，请通过 WebFetch 从 `shared/live-sources.md` 获取相关条目，而不是猜测。C# 目前不支持 Managed Agents；使用 cURL 风格的原始 HTTP 请求来调用 API。

---

## 我应该使用哪个界面？

> **从简单开始。** 默认使用满足你需求的最简单层级。单个 API 调用和工作流处理大多数用例 —— 只在任务真正需要开放式、模型驱动的探索时才使用智能体。

| 用例                                        | 层级            | 推荐的界面               | 原因                                                          |
| ----------------------------------------------- | --------------- | ------------------------- | ------------------------------------------------------------ |
| 分类、摘要、提取、问答  | 单一大语言模型调用 | **Claude API**            | 一个请求，一个响应                                    |
| 批处理或嵌入                  | 单一大语言模型调用 | **Claude API**            | 专用端点                                        |
| 具有代码控制逻辑的多步骤流水线 | 工作流        | **Claude API + tool use** | 你编排循环                                     |
| 带有你自己工具的自定义智能体                | 智能体           | **Claude API + tool use** | 最大灵活性                                          |
| 服务端托管的有状态智能体，带工作区    | 智能体           | **Managed Agents**        | Anthropic 运行循环并托管工具执行沙箱 |
| 持久化、版本化的 agent 配置              | 智能体           | **Managed Agents**        | Agent 是存储的对象；session 固定到某个版本         |
| 长时间运行的多轮智能体，带文件挂载  | 智能体           | **Managed Agents**        | 每 session 容器、SSE 事件流、Skills + MCP       |

> **注意：** 当你希望 Anthropic 运行 agent 循环*并*托管工具执行的容器时，Managed Agents 是正确的选择 —— 文件操作、bash、代码执行都在每 session 的工作区中运行。如果你想自己托管计算或运行自己的自定义工具运行时，Claude API + tool use 是正确的选择 —— 使用 tool runner 进行自动循环处理，或使用手动循环进行细粒度控制（审批门、自定义日志、条件执行）。

> **第三方提供商（Amazon Bedrock、Google Vertex AI、Microsoft Foundry）：** Managed Agents **不适用于** Bedrock、Vertex 或 Foundry。如果你通过任何第三方提供商部署，请对所有用例使用 **Claude API + tool use** —— 包括那些 Managed Agents 本来是推荐界面的用例。

### 决策树

```
你的应用程序需要什么？

0. 你是否通过 Amazon Bedrock、Google Vertex AI 或 Microsoft Foundry 部署？
   └── 是 → Claude API（+ 用于智能体的 tool use）—— Managed Agents 仅限第一方。
   否 → 继续。

1. 单一大语言模型调用（分类、摘要、提取、问答）
   └── Claude API — 一个请求，一个响应

2. 你是否希望 Anthropic 运行 agent 循环并托管每 session 的
   容器，让 Claude 在其中执行工具（bash、文件操作、代码）？
   └── 是 → Managed Agents — 服务端托管的 session、持久化的 agent 配置，
       SSE 事件流、Skills + MCP、文件挂载。
       示例："每个任务带工作区的有状态编码 agent"、
                 "将事件流式传输到 UI 的长时间运行研究 agent"、
                 "具有持久化、版本化配置的 agent，跨多个 session 使用"

3. 工作流（多步骤、代码编排、使用你自己的工具）
   └── Claude API with tool use — 你控制循环

4. 开放式智能体（模型决定自己的轨迹、你自己的工具、你托管计算）
   └── Claude API agentic 循环（最大灵活性）
```

### 我应该构建智能体吗？

在选择智能体层级之前，检查以下四个标准：

- **复杂性** — 任务是否是多步骤的且难以提前完全指定？（例如，"将此设计文档转换为 PR" vs "从此 PDF 中提取标题"）
- **价值** — 结果是否值得更高的成本和延迟？
- **可行性** — Claude 是否擅长此类任务？
- **错误成本** — 是否可以捕获和恢复错误？（测试、审查、回滚）

如果其中任何一个答案是"否"，请留在更简单的层级（单次调用或工作流）。

---

## 架构

所有内容都通过 `POST /v1/messages`。工具和输出约束是此单一端点的功能 —— 不是单独的 API。

**用户定义的工具** — 你定义工具（通过装饰器、Zod schema 或原始 JSON），SDK 的 tool runner 处理调用 API、执行你的函数和循环直到 Claude 完成。为了完全控制，你可以手动编写循环。

**服务端工具** — 在 Anthropic 基础设施上运行的 Anthropic 托管工具。代码执行完全是服务端（在 `tools` 中声明，Claude 自动运行代码）。计算机使用可以是服务端托管或自托管的。

**结构化输出** — 约束 Messages API 响应格式 (`output_config.format`) 和/或工具参数验证 (`strict: true`)。推荐的方法是 `client.messages.parse()`，它会自动根据你的 schema 验证响应。注意：旧的 `output_format` 参数已弃用；在 `messages.create()` 上使用 `output_config: {format: {...}}`。

**支持端点** — Batches (`POST /v1/messages/batches`)、Files (`POST /v1/files`)、Token Counting 和 Models (`GET /v1/models`、`GET /v1/models/{id}` — 实时能力/上下文窗口发现) 用于支持或输入 Messages API 请求。

---

## 当前模型（缓存时间：2026-02-17）

| 模型             | 模型 ID            | 上下文        | 输入 $/1M | 输出 $/1M |
| ----------------- | ------------------- | -------------- | ---------- | ----------- |
| Claude Opus 4.6   | `claude-opus-4-6`   | 200K (1M beta) | $5.00      | $25.00      |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | 200K (1M beta) | $3.00      | $15.00      |
| Claude Haiku 4.5  | `claude-haiku-4-5`  | 200K           | $1.00      | $5.00       |

**始终使用 `{{OPUS_ID}}`，除非用户明确指定了不同的模型。** 这是不可协商的。不要使用 `{{SONNET_ID}}`、`{{PREV_SONNET_ID}}` 或任何其他模型，除非用户明确说"使用 sonnet"或"使用 haiku"。永远不要为了成本而降级 —— 这是用户的决定，不是你的。

**重要：仅使用上表中的确切模型 ID 字符串 —— 它们按原样完整。不要附加日期后缀。** 例如，使用 `claude-sonnet-4-5`，永远不要使用 `claude-sonnet-4-5-20250514` 或你可能从训练数据中回忆起的任何其他带日期后缀的变体。如果用户请求表中不存在的旧模型（例如，"opus 4.5"、"sonnet 3.7"），请阅读 `shared/models.md` 获取确切的 ID —— 不要自己构造一个。

注意：如果上述任何模型字符串对你来说不熟悉，这是意料之中的 —— 这只意味着它们是在你的训练数据截止日期之后发布的。请放心，它们是真实的模型；我们不会那样捉弄你。

**实时能力查询：** 上表是缓存的。当用户询问"X 的上下文窗口是多少"、"X 是否支持视觉/思考/effort"或"哪些模型支持 Y"时，请查询 Models API (`client.models.retrieve(id)` / `client.models.list()`) —— 有关字段引用和能力过滤示例，请参见 `shared/models.md`。

---

## 思考与努力（快速参考）

**Opus 4.6 — 自适应思考（推荐）：** 使用 `thinking: {type: "adaptive"}`。Claude 动态决定何时以及思考多少。不需要 `budget_tokens` —— `budget_tokens` 在 Opus 4.6 和 Sonnet 4.6 上已弃用，不应用于新代码。自适应思考还自动启用交错思考（不需要 beta header）。**当用户要求"扩展思考"、"思考预算"或 `budget_tokens` 时：始终使用 Opus 4.6 配合 `thinking: {type: "adaptive"}`。固定 token 预算的概念已弃用 —— 自适应思考取代了它。不要在新的 4.6 代码中使用 `budget_tokens`，也不要切换到旧模型。**

**Effort 参数（GA，无需 beta header）：** 通过 `output_config: {effort: "low"|"medium"|"high"|"max"}` 控制思考深度和整体 token 消耗（在 `output_config` 内部，不是顶级）。默认是 `high`（相当于省略）。`max` 仅限 Opus 级别（Opus 4.6 及更高版本 —— 不适用于 Sonnet 或 Haiku）。适用于 Opus 4.5、Opus 4.6 和 Sonnet 4.6。在 Sonnet 4.5 / Haiku 4.5 上会报错。与自适应思考结合使用以获得最佳的成本-质量权衡。较低的 effort 意味着更少且更紧凑的工具调用、更少的前置说明和更简洁的确认信息 —— `medium` 通常是较好的平衡点；当正确性比成本更重要时使用 `max`；对子智能体或简单任务使用 `low`。

**Sonnet 4.6：** 支持自适应思考 (`thinking: {type: "adaptive"}`)。`budget_tokens` 在 Sonnet 4.6 上已弃用 —— 改用自适应思考。

**旧模型（仅当明确请求时）：** 如果用户特别要求 Sonnet 4.5 或其他旧模型，使用 `thinking: {type: "enabled", budget_tokens: N}`。`budget_tokens` 必须小于 `max_tokens`（最小 1024）。永远不要仅仅因为用户提到 `budget_tokens` 就选择旧模型 —— 改用 Opus 4.6 配合自适应思考。

---

## 压缩（快速参考）

**Beta 版，适用于 Opus 4.6 和 Sonnet 4.6。** 对于可能超过 200K 上下文窗口的长对话，启用服务端压缩。当接近触发阈值（默认：150K token）时，API 会自动摘要较早的上下文。需要 beta header `compact-2026-01-12`。

**重要：** 在每一轮将 `response.content`（不仅仅是文本）追加回你的消息。响应中的压缩块必须被保留 —— API 使用它们在下次请求时替换被压缩的历史记录。仅提取文本字符串并追加会静默丢失压缩状态。

有关代码示例，请参阅 `{lang}/claude-api/README.md`（压缩部分）。完整文档通过 `shared/live-sources.md` 中的 WebFetch 获取。

---

## 提示缓存（快速参考）

**前缀匹配。** 前缀中任何位置的字节变更都会使之后的所有内容失效。渲染顺序为 `tools` → `system` → `messages`。将稳定内容放在前面（冻结的系统提示词、确定的工具列表），将易变内容（时间戳、每请求 ID、不同的问题）放在最后一个 `cache_control` 断点之后。

**顶级自动缓存**（在 `messages.create()` 上设置 `cache_control: {type: "ephemeral"}`）是在不需要细粒度放置时最简单的选项。每个请求最多 4 个断点。最小可缓存前缀约为 1024 token —— 更短的前缀静默地不会缓存。

**通过 `usage.cache_read_input_tokens` 验证** —— 如果跨重复请求为零，则存在静默无效因素（系统提示词中的 `datetime.now()`、未排序的 JSON、变化的工具集）。

有关放置模式、架构指南和静默无效因素审核清单：请阅读 `shared/prompt-caching.md`。语言特定语法：`{lang}/claude-api/README.md`（提示缓存部分）。

---

## Managed Agents (Beta)

**Managed Agents** 是第三种界面：服务端托管的有状态智能体，具有 Anthropic 托管的工具执行。你创建一个持久化、版本化的 Agent 配置 (`POST /v1/agents`)，然后启动引用它的 Session。每个 session 会配置一个容器作为 agent 的工作区 —— bash、文件操作和代码执行在其中运行；agent 循环本身运行在 Anthropic 的编排层上，并通过工具对容器进行操作。Session 以流式传输事件；你发回消息和工具结果。

**Managed Agents 仅限第一方。** 它不适用于 Amazon Bedrock、Google Vertex AI 或 Microsoft Foundry。对于第三方提供商的智能体，使用 Claude API + tool use。

**强制流程：** Agent（一次）→ Session（每次运行）。`model`/`system`/`tools` 在 agent 上，永远不在 session 上。有关完整的阅读指南、beta header 和陷阱，请参见 `shared/managed-agents-overview.md`。

**Beta header：** `managed-agents-2026-04-01` — SDK 会为所有 `client.beta.{agents,environments,sessions,vaults}.*` 调用自动设置此 header。Skills API 使用 `skills-2025-10-02`，Files API 使用 `files-api-2025-04-14`，但对于 `/v1/skills` 和 `/v1/files` 以外的端点，你不需要显式传递这些 header。

**子命令** — 通过 `/claude-api <subcommand>` 直接调用：

| 子命令 | Action |
|---|---|
| `managed-agents-onboard` | 引导用户从头设置 Managed Agent。**立即阅读 `shared/managed-agents-onboarding.md`** 并遵循其中的访谈脚本：心智模型 → 已知/探索分支 → 模板配置 → session 设置 → 生成代码。不要总结 —— 运行访谈。 |

**阅读指南：** 从 `shared/managed-agents-overview.md` 开始，然后阅读专题 `shared/managed-agents-*.md` 文件（core、environments、tools、events、client-patterns、onboarding、api-reference）。对于 Python、TypeScript、Go、Ruby、PHP 和 Java，阅读 `{lang}/managed-agents/README.md` 获取代码示例。对于 cURL，阅读 `curl/managed-agents.md`。**Agent 是持久化的 —— 创建一次，通过 ID 引用。** 存储 `agents.create` 返回的 agent ID，并将其传递给每次后续的 `sessions.create`；不要在请求路径中调用 `agents.create`。Anthropic CLI 是从版本控制的 YAML 创建 agent 和 environment 的一种便捷方式（URL 在 `shared/live-sources.md` 中）。如果你需要的绑定在语言 README 中没有显示，请通过 WebFetch 从 `shared/live-sources.md` 获取相关条目，而不是猜测。C# 目前不支持 Managed Agents；使用 `curl/managed-agents.md` 中的原始 HTTP 作为参考。

**当用户想要从头设置 Managed Agent 时**（例如，"如何开始"、"带我创建一个"、"设置一个新 agent"）：阅读 `shared/managed-agents-onboarding.md` 并运行其访谈 —— 与 `managed-agents-onboard` 子命令相同的流程。

**当用户询问"如何为 X 编写客户端代码"时：** 使用 `shared/managed-agents-client-patterns.md` —— 涵盖无损流重连、`processed_at` 队列/已处理门控、中断、`tool_confirmation` 往返、正确的 idle/terminated 断开门控、post-idle 状态竞争、流优先排序、文件挂载陷阱、通过自定义工具在宿主端保留凭据等。

---

## 阅读指南

检测语言后，根据用户需求阅读相关文件：

### 快速任务参考

**单次文本分类/摘要/提取/问答：**
→ 仅阅读 `{lang}/claude-api/README.md`

**聊天 UI 或实时响应显示：**
→ 阅读 `{lang}/claude-api/README.md` + `{lang}/claude-api/streaming.md`

**长对话（可能超过上下文窗口）：**
→ 阅读 `{lang}/claude-api/README.md` —— 参见压缩部分
**提示缓存 / 优化缓存 / "为什么我的缓存命中率低"：**
→ 阅读 `shared/prompt-caching.md` + `{lang}/claude-api/README.md`（提示缓存部分）

**函数调用 / tool use / 智能体：**
→ 阅读 `{lang}/claude-api/README.md` + `shared/tool-use-concepts.md` + `{lang}/claude-api/tool-use.md`

**Agent 设计（工具面、上下文管理、缓存策略）：**
→ 阅读 `shared/agent-design.md`

**批处理（对延迟不敏感）：**
→ 阅读 `{lang}/claude-api/README.md` + `{lang}/claude-api/batches.md`

**跨多个请求的文件上传：**
→ 阅读 `{lang}/claude-api/README.md` + `{lang}/claude-api/files-api.md`

**Managed Agents（服务端托管的有状态智能体，带工作区）：**
→ 阅读 `shared/managed-agents-overview.md` + 其余 `shared/managed-agents-*.md` 文件。对于 Python、TypeScript、Go、Ruby、PHP 和 Java，阅读 `{lang}/managed-agents/README.md` 获取代码示例。对于 cURL，阅读 `curl/managed-agents.md`。**Agent 是持久化的 —— 创建一次，通过 ID 引用。** 存储 `agents.create` 返回的 agent ID，并将其传递给每次后续的 `sessions.create`；不要在请求路径中调用 `agents.create`。Anthropic CLI 是从版本控制的 YAML 创建 agent 和 environment 的一种便捷方式（URL 在 `shared/live-sources.md` 中）。如果你需要的绑定在语言 README 中没有显示，请通过 WebFetch 从 `shared/live-sources.md` 获取相关条目，而不是猜测。C# 目前不支持 Managed Agents —— 使用 `curl/managed-agents.md` 中的原始 HTTP 作为参考。

### Claude API（完整文件参考）

阅读**语言特定的 Claude API 文件夹** (`{language}/claude-api/`)：

1. **`{language}/claude-api/README.md`** —— **首先阅读此文件。** 安装、快速入门、常见模式、错误处理。
2. **`shared/tool-use-concepts.md`** —— 当用户需要函数调用、代码执行、内存或结构化输出时阅读。涵盖概念基础。
3. **`shared/agent-design.md`** —— 设计代理时阅读：bash 与专用工具的对比、程序化工具调用、工具搜索/技能、上下文编辑与压缩与记忆的对比、缓存原则。
4. **`{language}/claude-api/tool-use.md`** —— 阅读语言特定的 tool use 代码示例（tool runner、手动循环、代码执行、内存、结构化输出）。
5. **`{language}/claude-api/streaming.md`** —— 构建聊天 UI 或增量显示响应的界面时阅读。
6. **`{language}/claude-api/batches.md`** —— 离线处理大量请求时阅读（对延迟不敏感）。以 50% 的成本异步运行。
7. **`{language}/claude-api/files-api.md`** —— 在多个请求中发送相同文件而不重新上传时阅读。
8. **`shared/prompt-caching.md`** —— 添加或优化提示缓存时阅读。涵盖前缀稳定性设计、断点放置和静默使缓存失效的反模式。
9. **`shared/error-codes.md`** —— 调试 HTTP 错误或实现错误处理时阅读。
11. **`shared/live-sources.md`** —— 用于获取最新官方文档的 WebFetch URL。

> **注意：** 对于 Java、Go、Ruby、C#、PHP 和 cURL —— 这些每种语言都有一个涵盖所有基础知识的文件。根据需要阅读该文件以及 `shared/tool-use-concepts.md` 和 `shared/error-codes.md`。

> **注意：** 有关 Managed Agents 文件参考，请参见上文 `## Managed Agents (Beta)` 部分 —— 其中列出了每个 `shared/managed-agents-*.md` 文件和语言特定的 README。

---

## 何时使用 WebFetch

在以下情况下使用 WebFetch 获取最新文档：

- 用户要求"最新"或"当前"信息
- 缓存数据似乎不正确
- 用户询问此处未涵盖的功能

实时文档 URL 在 `shared/live-sources.md` 中。

## 常见陷阱

- 向 API 传递文件或内容时不要截断输入。如果内容太长而无法放入上下文窗口，请通知用户并讨论选项（分块、摘要等），而不是静默截断。
- **Opus 4.6 / Sonnet 4.6 思考：** 使用 `thinking: {type: "adaptive"}` —— 不要在新的 4.6 代码中使用 `budget_tokens`（在 Opus 4.6 和 Sonnet 4.6 上均已弃用）。对于旧模型，`budget_tokens` 必须小于 `max_tokens`（最小 1024）。如果弄错了会抛出错误。
- **4.6 系列预填充已移除：** Assistant 消息预填充（最后一轮 assistant 预填充）在 Opus 4.6 和 Sonnet 4.6 上返回 400 错误。改用结构化输出 (`output_config.format`) 或系统提示词指令来控制响应格式。
- **`max_tokens` 默认值：** 不要低估 `max_tokens` —— 达到上限会在思考中途截断输出并需要重试。对于非流式请求，默认使用 `~16000`（保持响应在 SDK HTTP 超时范围内）。对于流式请求，默认使用 `~64000`（超时不是问题，所以给模型更多空间）。仅在以下情况下降低：分类（`~256`）、成本上限或故意缩短输出。
- **128K 输出 token：** Opus 4.6 支持最多 128K `max_tokens`，但 SDK 需要流式传输以避免如此大值的 HTTP 超时。使用 `.stream()` 配合 `.get_final_message()` / `.finalMessage()`。
- **Tool call JSON 解析（4.6 系列）：** Opus 4.6 和 Sonnet 4.6 可能在 tool call `input` 字段中产生不同的 JSON 字符串转义（例如 Unicode 或正斜杠转义）。始终使用 `json.loads()` / `JSON.parse()` 解析 tool 输入 —— 永远不要对序列化输入进行原始字符串匹配。
- **结构化输出（所有模型）：** 使用 `output_config: {format: {...}}` 而不是 `messages.create()` 上已弃用的 `output_format` 参数。这是一般的 API 更改，不是 4.6 特定的。
- **不要重新实现 SDK 功能：** SDK 提供高级辅助功能 —— 使用它们而不是从头构建。具体来说：使用 `stream.finalMessage()` 而不是将 `.on()` 事件包装在 `new Promise()` 中；使用类型化的异常类（`Anthropic.RateLimitError` 等）而不是字符串匹配错误消息；使用 SDK 类型（`Anthropic.MessageParam`、`Anthropic.Tool`、`Anthropic.Message` 等）而不是重新定义等效接口。
- **不要为 SDK 数据结构定义自定义类型：** SDK 导出所有 API 对象的类型。对消息使用 `Anthropic.MessageParam`，对工具定义使用 `Anthropic.Tool`，对工具结果使用 `Anthropic.ToolUseBlock` / `Anthropic.ToolResultBlockParam`，对响应使用 `Anthropic.Message`。定义你自己的 `interface ChatMessage { role: string; content: unknown }` 会重复 SDK 已提供的内容并失去类型安全。
- **报告和文档输出：** 对于生成报告、文档或可视化的任务，代码执行沙箱预装了 `python-docx`、`python-pptx`、`matplotlib`、`pillow` 和 `pypdf`。Claude 可以生成格式化文件（DOCX、PDF、图表）并通过 Files API 返回它们 —— 对于"报告"或"文档"类型的请求，请考虑这样做而不是纯 stdout 文本。
