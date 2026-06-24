<!--
name: 技能：使用 Claude 构建 LLM 驱动的应用程序
description: 指导 Claude 使用 Anthropic SDK 构建 LLM 驱动的应用程序，涵盖语言检测、API 接口选择（Claude API vs Managed Agents）、模型默认值、thinking/effort 配置以及语言特定文档阅读
ccVersion: 2.1.145
-->
# 使用 Claude 构建 LLM 驱动的应用程序

此技能帮助你使用 Claude 构建 LLM 驱动的应用程序。根据需求选择合适的接口，检测项目语言，然后阅读相关的语言特定文档。

## 开始之前

扫描目标文件（如果没有目标文件，则扫描提示词和项目）中是否存在非 Anthropic 提供商标记——`import openai`、`from openai`、`langchain_openai`、`OpenAI(`、`gpt-4`、`gpt-5`，文件名如 `agent-openai.py` 或 `*-generic.py`，或任何要求保持代码与提供商无关的明确指示。如果发现任何此类标记，停止操作并告知用户此技能生成的是 Claude/Anthropic SDK 代码；询问他们是想将文件切换为 Claude 实现，还是需要非 Claude 的实现。不要使用 Anthropic SDK 调用编辑非 Anthropic 的文件。

## 输出要求

当用户要求你添加、修改或实现一个 Claude 功能时，你的代码必须通过以下方式之一调用 Claude：

1. **项目语言对应的官方 Anthropic SDK**（`anthropic`、`@anthropic-ai/sdk`、`com.anthropic.*` 等）。只要项目有对应的官方 SDK，这就是默认选择。
2. **原始 HTTP**（`curl`、`requests`、`fetch`、`httpx` 等）——仅当用户明确要求 cURL/REST/原始 HTTP，或项目是 shell/cURL 项目，或该语言没有官方 SDK 时才使用。

永远不要混合使用这两种方式——不要因为觉得 `requests`/`fetch` 更轻量就在 Python 或 TypeScript 项目中使用它们。永远不要退回到 OpenAI 兼容的填充层。

**永远不要猜测 SDK 用法。**函数名、类名、命名空间、方法签名和导入路径必须来自明确的文档——要么是本技能中的 `{lang}/` 文件，要么是 `shared/live-sources.md` 中列出的官方 SDK 仓库或文档链接。如果你需要的绑定在本技能文件中没有明确记录，请在编写代码之前通过 WebFetch 从 `shared/live-sources.md` 获取相关的 SDK 仓库信息。不要从 cURL 格式或其他语言的 SDK 推断 Ruby/Java/Go/PHP/C# API。

**如果 WebFetch 或仓库访问失败**（网络受限、超时、克隆被阻止）：不要反复重试——根据 `{lang}/` 文件中的模式和命名空间/包表格编写代码，运行编译器或解释器，并根据错误输出迭代修复。对于静态类型 SDK（C#、Java、Go），通过编译-修复循环针对本地错误迭代，比被阻止的网络研究更快达到可运行代码。

## 默认值

除非用户另有要求：

对于 Claude 模型版本，请使用 {{OPUS_NAME}}，你可以通过精确的模型字符串 `{{OPUS_ID}}` 访问它。对于任何稍微复杂的任务，请默认使用自适应思考（`thinking: {type: "adaptive"}`）。最后，对于任何可能涉及长输入、长输出或高 `max_tokens` 值的请求，请默认使用流式传输——它可以防止请求超时。如果你不需要处理单个流事件，请使用 SDK 的 `.get_final_message()` / `.finalMessage()` 辅助方法来获取完整响应。

## API 漂移——你的训练先验可能已过时

几个常见的 Claude API 形态在 2025–2026 年发生了变化。如果你从训练数据中回忆起某个模式，请在编写代码之前对照本技能中的 `{lang}/` 文件进行验证——下表是最常见的漂移点：

| 领域 | 过时的先验 | 当前 API |
|---|---|---|
| 扩展思考 | `thinking: {type: "enabled", budget_tokens: N}` | 在 Claude 4.6+ 模型上：`thinking: {type: "adaptive"}`。`budget_tokens` 在 Opus 4.6 / Sonnet 4.6 上已弃用，在 Fable 5 / Opus 4.8 / 4.7 上会**返回 400 被拒绝**。4.6 之前的模型仍使用 `budget_tokens`。 |
| 网页搜索 / 网页抓取工具类型 | `web_search_20250305`、`web_fetch_20250910` | 在 Opus 4.8/4.7/4.6 和 Sonnet 4.6 上使用 `web_search_20260209`、`web_fetch_20260209`（动态过滤）。旧模型保留基础变体；在 Vertex AI 上仅基础 `web_search_20250305` 可用（网页抓取不在 Vertex 上）——参见下方的服务端工具快速参考。 |
| PHP 参数名称 | 使用蛇形命名法的命名参数（`max_tokens`） | 顶层命名参数使用驼峰命名法（`maxTokens`）。嵌套数组键因功能而异（例如 `'taskBudget'`、`'skillID'`、`'mcp_server_name'`）——从文档示例中复制确切的键名；不要批量转换。 |

本技能中的 `{lang}/` 文件比回忆的模式更具权威性。

---

## 子命令

如果本提示词底部的用户请求是裸子命令字符串（无正文），则搜索本文档中的所有**子命令**表格——包括下方追加的任何部分——并直接按照匹配的操作列执行。这允许用户通过 `/claude-api <subcommand>` 调用特定流程。如果文档中没有匹配的表格，则将请求视为普通正文处理。

| 子命令 | 操作 |
|---|---|
| `migrate` | 将现有 Claude API 代码迁移到较新的模型。**立即阅读 `shared/model-migration.md`** 并按顺序执行：步骤 0（确认范围——在任何编辑之前询问要迁移的文件/目录），步骤 1（分类每个文件），然后按每个目标的破坏性变更部分处理。不要总结指南——执行它。如果用户没有指定目标模型，在询问范围问题的同一轮次中询问要迁移到哪个模型。 |

---

## 语言检测

在阅读代码示例之前，确定用户正在使用哪种语言：

1. **查看项目文件**以推断语言：

   - `*.py`、`requirements.txt`、`pyproject.toml`、`setup.py`、`Pipfile` → **Python**——从 `python/` 读取
   - `*.ts`、`*.tsx`、`package.json`、`tsconfig.json` → **TypeScript**——从 `typescript/` 读取
   - `*.js`、`*.jsx`（不存在 `.ts` 文件）→ **TypeScript**——JS 使用相同的 SDK，从 `typescript/` 读取
   - `*.java`、`pom.xml`、`build.gradle` → **Java**——从 `java/` 读取
   - `*.kt`、`*.kts`、`build.gradle.kts` → **Java**——Kotlin 使用 Java SDK，从 `java/` 读取
   - `*.scala`、`build.sbt` → **Java**——Scala 使用 Java SDK，从 `java/` 读取
   - `*.go`、`go.mod` → **Go**——从 `go/` 读取
   - `*.rb`、`Gemfile` → **Ruby**——从 `ruby/` 读取
   - `*.cs`、`*.csproj` → **C#**——从 `csharp/` 读取
   - `*.php`、`composer.json` → **PHP**——从 `php/` 读取

2. **如果检测到多种语言**（例如，同时存在 Python 和 TypeScript 文件）：

   - 检查用户的当前文件或问题与哪种语言相关
   - 如果仍然模糊不清，询问："我检测到同时存在 Python 和 TypeScript 文件。你打算用哪种语言进行 Claude API 集成？"

3. **如果无法推断语言**（空项目、无源文件或不支持的语言）：

   - 使用 AskUserQuestion，选项为：Python、TypeScript、Java、Go、Ruby、cURL/原始 HTTP、C#、PHP
   - 如果 AskUserQuestion 不可用，默认使用 Python 示例并注明："显示 Python 示例。如需其他语言请告知。"

4. **如果检测到不支持的语言**（Rust、Swift、C++、Elixir 等）：

   - 建议使用 `curl/` 中的 cURL/原始 HTTP 示例，并说明可能存在社区 SDK
   - 提供 Python 或 TypeScript 示例作为参考实现

5. **如果用户需要 cURL/原始 HTTP 示例**，从 `curl/` 读取。

### 语言特定功能支持

| 语言       | Tool Runner | Managed Agents | 备注                                      |
| ---------- | ----------- | -------------- | ----------------------------------------- |
| Python     | 是（beta）  | 是（beta）     | 完整支持——`@beta_tool` 装饰器              |
| TypeScript | 是（beta）  | 是（beta）     | 完整支持——`betaZodTool` + Zod              |
| Java       | 是（beta）  | 是（beta）     | 带注解类的 Beta 工具使用                   |
| Go         | 是（beta）  | 是（beta）     | `toolrunner` 包中的 `BetaToolRunner`       |
| Ruby       | 是（beta）  | 是（beta）     | Beta 中的 `BaseTool` + `tool_runner`       |
| C#         | 是（beta）  | 是（beta）     | `BetaToolRunner` + 原始 JSON schema        |
| PHP        | 是（beta）  | 是（beta）     | `BetaRunnableTool` + `toolRunner()`        |
| cURL       | 不适用      | 是（beta）     | 原始 HTTP，无 SDK 功能                     |

> **Managed Agents 代码示例**：为 Python、TypeScript、Go、Ruby、PHP、Java 和 cURL 提供了专用的语言特定 README（`{lang}/managed-agents/README.md`，`curl/managed-agents.md`）。阅读你所用语言的 README 以及语言无关的 `shared/managed-agents-*.md` 概念文件。**Agent 是持久化的——创建一次，按 ID 引用。**存储 `agents.create` 返回的 agent ID，并在每次后续 `sessions.create` 时传入；不要在请求路径中调用 `agents.create`。Anthropic CLI（`ant`）是一种从版本控制的 YAML 创建 agent 和环境的便捷方式——参见 `shared/anthropic-cli.md`。如果你需要的绑定未在 README 中显示，请通过 WebFetch 获取 `shared/live-sources.md` 中的相关条目，而不是猜测。C# 通过 `client.Beta.Agents` 及相关命名空间支持 Beta 版的 Managed Agents。

---

## 我应该使用哪个接口？

> **从简单开始。**默认使用满足你需求的最简单层级。单个 API 调用和工作流可以处理大多数用例——只有在任务真正需要开放式、模型驱动的探索时才使用 agent。

| 用例                                             | 层级            | 推荐接口                   | 原因                                                         |
| ------------------------------------------------ | --------------- | -------------------------- | ------------------------------------------------------------ |
| 分类、摘要、提取、问答                           | 单次 LLM 调用   | **Claude API**             | 一次请求，一次响应                                           |
| 批处理或嵌入                                     | 单次 LLM 调用   | **Claude API**             | 专用端点                                                     |
| 由代码控制逻辑的多步骤流水线                     | 工作流          | **Claude API + 工具使用**  | 由你来编排循环                                               |
| 使用自有工具的自定义 agent                       | Agent           | **Claude API + 工具使用**  | 最大灵活性                                                   |
| 服务端管理的有状态 agent（带工作空间）            | Agent           | **Managed Agents**         | Anthropic 运行循环并托管工具执行沙箱                          |
| 持久化、版本化的 agent 配置                      | Agent           | **Managed Agents**         | Agent 是存储的对象；session 绑定到特定版本                    |
| 长时间运行的多轮 agent（带文件挂载）              | Agent           | **Managed Agents**         | 每个 session 一个容器，SSE 事件流，Skills + MCP               |

> **注意：**当你希望 Anthropic 运行 agent 循环*并且*托管工具执行的容器时——文件操作、bash、代码执行都在每个 session 的工作空间中运行——Managed Agents 是正确的选择。如果你想自己托管计算环境或运行自己的自定义工具运行时，Claude API + 工具使用是正确的选择——使用 tool runner 进行自动循环处理，或使用手动循环进行细粒度控制（审批关卡、自定义日志、条件执行）。

> **云提供商访问。** **AWS 上的 Claude 平台**由 Anthropic 运营，具有当日 API 同步——客户端设置参见 `shared/claude-platform-on-aws.md`。关于 **AWS 上的 Claude 平台**、**Amazon Bedrock**、**Google Vertex AI** 和 **Microsoft Foundry** 的每个功能可用性，参见 `shared/platform-availability.md`——该表格是本技能中的唯一权威来源；不要从任何其他地方推断可用性。

### 决策树

```
你的应用需要什么？

0. 使用哪个提供商？
   ├── 第一方 API 或 AWS 上的 Claude 平台 → 继续（完整接口可用；每个功能的例外见 shared/platform-availability.md）。
   └── Amazon Bedrock、Google Vertex AI 或 Microsoft Foundry → Claude API（+ 工具使用用于 agent）；每个功能的支持见 shared/platform-availability.md。

1. 单次 LLM 调用（分类、摘要、提取、问答）
   └── Claude API——一次请求，一次响应

2. 你是否希望 Anthropic 运行 agent 循环并托管一个每个 session 独立的
   容器，让 Claude 在其中执行工具（bash、文件操作、代码）？
   └── 是 → Managed Agents——服务端管理的 session，持久化的 agent 配置，
       SSE 事件流，Skills + MCP，文件挂载。
       示例："每个任务一个工作空间的有状态编码 agent"、
             "将事件流式传输到 UI 的长时间运行研究 agent"、
             "具有持久化、版本化配置的 agent，跨多个 session 使用"

3. 工作流（多步骤，由代码编排，使用自有工具）
   └── Claude API 配合工具使用——由你控制循环

4. 开放式 agent（模型自行决定执行轨迹，使用自有工具，你托管计算环境）
   └── Claude API agentic 循环（最大灵活性）
```

### 我应该构建一个 Agent 吗？

在选择 agent 层级之前，检查以下四个标准：

- **复杂性**——任务是否多步骤且难以提前完全指定？（例如，"将这个设计文档变成 PR" vs. "从这个 PDF 中提取标题"）
- **价值**——结果是否值得更高的成本和延迟？
- **可行性**——Claude 是否具备完成此类任务的能力？
- **错误成本**——错误是否可以被捕获和恢复？（测试、审查、回滚）

如果上述任何一项的答案是"否"，请保持在更简单的层级（单次调用或工作流）。

---

## 架构

所有操作都通过 `POST /v1/messages` 进行。工具和输出约束是此单一端点的功能——不是独立的 API。

**用户自定义工具**——你定义工具（通过装饰器、Zod schema 或原始 JSON），SDK 的 tool runner 负责调用 API、执行你的函数并循环直到 Claude 完成。如需完全控制，你可以手动编写循环。

**服务端工具**——Anthropic 托管的工具，在 Anthropic 的基础设施上运行。代码执行完全在服务端（在 `tools` 中声明，Claude 自动运行代码）。Computer use 可以在服务端托管或自行托管。

**结构化输出**——约束 Messages API 响应格式（`output_config.format`）和/或工具参数验证（`strict: true`）。推荐的方法是 `client.messages.parse()`，它会自动根据你的 schema 验证响应。注意：旧的 `output_format` 参数已弃用；请在 `messages.create()` 上使用 `output_config: {format: {...}}`。

**支持端点**——批处理（`POST /v1/messages/batches`）、文件（`POST /v1/files`）、Token 计数（`POST /v1/messages/count_tokens`——参见 `shared/token-counting.md`）和模型（`GET /v1/models`、`GET /v1/models/{id}`——实时能力/上下文窗口查询）为 Messages API 请求提供支持。

---

## 当前模型（缓存日期：2026-06-04）

| 模型              | 模型 ID             | 上下文         | 输入 $/1M  | 输出 $/1M |
| ----------------- | ------------------- | -------------- | ---------- | --------- |
| {{FABLE_NAME}}    | `{{FABLE_ID}}`      | 1M             | $10.00     | $50.00    |
| {{MYTHOS_NAME}}（仅限 Project Glasswing） | `{{MYTHOS_ID}}` | 1M | $10.00     | $50.00    |
| Claude Opus 4.8   | `claude-opus-4-8`   | 1M             | $5.00      | $25.00    |
| Claude Opus 4.7   | `claude-opus-4-7`   | 1M             | $5.00      | $25.00    |
| Claude Opus 4.6   | `claude-opus-4-6`   | 1M             | $5.00      | $25.00    |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | 1M             | $3.00      | $15.00    |
| Claude Haiku 4.5  | `claude-haiku-4-5`  | 200K           | $1.00      | $5.00     |

**始终使用 `{{OPUS_ID}}`，除非用户明确指定了不同的模型。**这是不可协商的。不要使用 `{{SONNET_ID}}`、`{{PREV_SONNET_ID}}` 或任何其他模型，除非用户确实说了"使用 sonnet"或"使用 haiku"。永远不要因为成本而降级——这是用户的决定，不是你的。仅在用户明确要求 {{FABLE_NAME}}、"fable" 或 Anthropic 最强大的模型时才使用 `{{FABLE_ID}}`——它的 API 行为与 Opus 系列不同（见下文），定价也超过 Opus 层级。

### {{FABLE_NAME}}（`{{FABLE_ID}}`）——最强大的广泛发布模型

{{FABLE_NAME}} 是 Anthropic 最强大的广泛发布模型，适用于最复杂的推理和长时间跨度的 agentic 工作。**{{MYTHOS_NAME}}**（`{{MYTHOS_ID}}`）通过 Project Glasswing 提供相同的能力、定价和 API 接口（参与是唯一的访问方式），接替了仅限邀请的 Claude Mythos Preview（`claude-mythos-preview`）——以下所有内容适用于两个模型。1M 上下文窗口（最大值也是默认值），128K 最大输出。与 Opus 层级的关键 API 差异——详见 `shared/model-migration.md` → 迁移到 {{FABLE_NAME}}：

- **思考始终开启**——完全省略 `thinking` 参数（或发送 `{type: "adaptive"}`）。任何其他显式配置都会被拒绝：`{type: "disabled"}` 和 `{type: "enabled", budget_tokens: N}` 都会返回 400。通过 `output_config.effort` 控制深度（支持 `low` 到 `xhigh` 以及 `max`）。
- **原始思考链永不返回**——响应携带常规的 `thinking` 块（而非 `redacted_thinking`）：`display: "summarized"` 返回可读摘要，`"omitted"`（默认值）将 `thinking` 字段留为空字符串。回放规则：在同一模型上将 thinking 块原样传回（包括空文本块——API 拒绝*修改过的*块，而非读取过的块）；**不同**模型会**丢弃**它们（通常是静默的——不是错误；丢弃发生在计费之前，因此被丢弃的块不计费，也无需剥离）。其他模型的常规 thinking 块可在模型间自由回放。
- **分词器**——与 Opus 4.8 相同的分词器（随 Opus 4.7 引入）。从 Opus 4.7/4.8 迁移时 token 计数大致不变；每个 token 的定价不同。从 Opus 4.6、Sonnet、Haiku 或更早版本迁移时，需通过 `count_tokens` 重新建立基线。
- **`refusal` 停止原因——处理它，并默认选择加入回退**——安全分类器可能拒绝请求（HTTP 200，`stop_reason: "refusal"`，附带 `stop_details` 类别）。输出前的拒绝具有空的 `content` 数组，完全不收费；流式传输中发生的拒绝，已流式传输的输出会收费——丢弃部分输出。始终在读取 `content` 之前检查 `stop_reason`。恢复是 **API 上的选择加入**：大多数 Claude 消费者界面内置了 {{OPUS_NAME}} 回退，但未选择加入的 API 请求会在拒绝时直接停止——而良性相邻工作（安全工具、生命科学任务）确实会发生误报。**当你编写 `{{FABLE_ID}}` 代码时，默认包含服务端 `fallbacks` 参数**（`betas: ["server-side-fallback-2026-06-01"]` + `fallbacks: [{"model": "{{OPUS_ID}}"}]`；Claude API 和 AWS 上的 Claude 平台）：被拒绝的请求在同一调用中由回退模型透明地重新处理，并自动应用信用式重新定价（输出前的拒绝不收费；救援按回退模型自身的费率计费）。告知用户你已启用此功能；仅在用户拒绝时才移除。GA SDK 的客户端 `BetaRefusalFallbackMiddleware` + `BetaFallbackState` 在服务端回退不受支持的任何地方（包括 Amazon Bedrock、Vertex AI、Microsoft Foundry）处理重试；回退信用可退还客户端重试的缓存切换成本。代码示例：你所用语言的 claude-api 文档中的 Refusal Fallbacks 部分；完整语义见迁移指南的 refusal 部分。
- **无 assistant prefill**——与 4.6+ 系列的其他模型相同。
- **需要 30 天数据保留**——{{FABLE_NAME}} 在零数据保留下不可用；来自保留配置不符合要求的组织的请求返回 `400 invalid_request_error`。
- **更长的轮次，不同的提示方式**——困难任务上的单次请求可能运行数分钟（规划超时/流式传输/进度 UX）；effort 扫描应包括 low/medium 用于常规工作；为先前模型编写的提示词往往过于指令性，会降低输出质量。参见 `shared/model-migration.md` → 迁移到 {{FABLE_NAME}} → 行为变化（可通过提示调优）了解推荐的提示词片段（反过度规划、不整理、有依据的进度声明、边界、异步子代理、内存、`send_to_user`）。

**关键：仅使用上表中的精确模型 ID 字符串——它们本身就是完整的。不要附加日期后缀。**例如，使用 `claude-sonnet-4-6`，永远不要使用 `claude-sonnet-4-6-20251114` 或任何你可能从训练数据中回忆起的带日期后缀的变体。如果用户请求表中没有的旧模型（例如"opus 4.5"、"sonnet 3.7"），请阅读 `shared/models.md` 获取精确 ID——不要自己构造。

注意：如果上述任何模型字符串对你来说看起来陌生，这是正常的——这只是意味着它们是在你的训练数据截止日期之后发布的。请放心，它们是真实的模型；我们不会这样捉弄你。

**实时能力查询：**上表是缓存的。当用户询问"X 的上下文窗口是多少"、"X 是否支持 vision/thinking/effort"或"哪些模型支持 Y"时，查询 Models API（`client.models.retrieve(id)` / `client.models.list()`）——参见 `shared/models.md` 了解字段参考和能力过滤示例。

---

## Thinking & Effort（快速参考）

**Fable 5 / Opus 4.8 / 4.7——仅支持自适应思考：**使用 `thinking: {type: "adaptive"}`。`thinking: {type: "enabled", budget_tokens: N}` 会返回 400——adaptive 是唯一的开启模式。在 Opus 4.8 和 4.7 上，`{type: "disabled"}` 和省略 `thinking` 都可以正常工作；在 Fable 5 上，显式的 `{type: "disabled"}` 返回 400——改为完全省略 `thinking` 参数。采样参数（`temperature`、`top_p`、`top_k`）也已被移除，使用它们会返回 400。Opus 4.8 保持与 4.7 相同的请求接口（无新的破坏性变更）——参见 `shared/model-migration.md` → 迁移到 Opus 4.8 了解行为重新调优，以及 → 迁移到 Opus 4.7 了解从 4.6 或更早版本迁移时的完整破坏性变更列表。注意：在禁用 `thinking` 的情况下，Opus 4.8 可能在可见响应中写入更长的推理——保持自适应思考开启，或添加仅最终答案的指令（参见迁移指南）。
**Opus 4.6——自适应思考（推荐）：**使用 `thinking: {type: "adaptive"}`。Claude 动态决定何时思考以及思考多少。不需要 `budget_tokens`——`budget_tokens` 在 Opus 4.6 和 Sonnet 4.6 上已弃用，新代码不应使用。自适应思考还会自动启用交错思考（无需 beta 头）。**当用户要求"extended thinking"、"thinking budget"或 `budget_tokens` 时：始终使用 Fable 5、Opus 4.8、4.7 或 4.6 配合 `thinking: {type: "adaptive"}`。固定 token 预算的思考概念已弃用——自适应思考取代了它。不要为新 4.6/4.7/4.8 代码使用 `budget_tokens`，也不要切换到旧模型。***渐进迁移例外：*`budget_tokens` 在 Opus 4.6 和 Sonnet 4.6 上仍然可用，作为过渡性逃生舱——如果你正在迁移现有代码，在调优 `effort` 之前需要硬 token 上限，参见 `shared/model-migration.md` → 过渡性逃生舱。注意：此例外**不**适用于 Fable 5、Opus 4.7 或 4.8——`budget_tokens` 在那里已完全移除。
**Effort 参数（GA，无需 beta 头）：**通过 `output_config: {effort: "low"|"medium"|"high"|"max"}` 控制思考深度和总体 token 消耗（位于 `output_config` 内部，而非顶层）。默认值为 `high`（等同于省略）。`max` 支持 Fable 5、Opus 4.6 及更高版本以及 Sonnet 4.6（不支持 Haiku 或更早的 Sonnet）。Opus 4.7 新增了 `"xhigh"`（介于 `high` 和 `max` 之间）——这是 Fable 5 / Opus 4.7/4.8 上大多数编码和 agentic 用例的最佳设置，也是 Claude Code 中的默认值；对于大多数对智能敏感的工作，至少使用 `high`。适用于 Fable 5、Opus 4.5、Opus 4.6、Opus 4.7、Opus 4.8 和 Sonnet 4.6。在 Sonnet 4.5 / Haiku 4.5 上会报错。在 Fable 5、Opus 4.7 和 4.8 上，effort 比任何之前的 Opus 都更重要——迁移时需重新调优，并在 `high`/`xhigh` 下运行长时间跨度/agentic 任务，并将完整任务规范一次性给出。结合自适应思考以获得最佳的成本-质量权衡。较低的 effort 意味着更少且更整合的工具调用、更少的前言和更简洁的确认——`high` 通常是平衡质量和 token 效率的最佳选择；当正确性比成本更重要时使用 `max`；对于子代理或简单任务使用 `low`。

**思考内容显示——在 Fable 5 / Mythos 5 / Opus 4.8 / 4.7 上默认为 `"omitted"`：**`display: "summarized"` 返回推理的可读摘要；`"omitted"`（所有四个模型上的默认值——这是 Opus 4.6 上默认为 `"summarized"` 的静默变更）流式传输带有空文本的 `thinking` 块。`display` 仅控制可见性——在所有设置下，思考都会发生并同样计费；原始思考链在任何模型上都从不暴露。如果你向用户流式传输推理过程，默认行为看起来像是输出前有很长的停顿——显式设置 `thinking: {type: "adaptive", display: "summarized"}`。（与 display 无关，在同一模型上继续时原样回传 thinking 块；其他模型静默忽略它们——参见迁移指南。）

**Task Budgets（beta，Fable 5 / Opus 4.7 / 4.8）：**`output_config: {task_budget: {type: "tokens", total: N}}` 告诉模型它在完整的 agentic 循环中有多少 token——它会看到一个运行的倒计时并进行自我调节（最小值 20,000；beta 头 `task-budgets-2026-03-13`）。这与 `max_tokens` 不同，`max_tokens` 是一个强制性的每次响应上限，模型并不知道。参见 `shared/model-migration.md` → Task Budgets。

**Sonnet 4.6：**支持自适应思考（`thinking: {type: "adaptive"}`）。`budget_tokens` 在 Sonnet 4.6 上已弃用——请改用自适应思考。

**旧模型（仅在明确请求时）：**如果用户特别要求 Sonnet 4.5 或其他旧模型，使用 `thinking: {type: "enabled", budget_tokens: N}`。`budget_tokens` 必须小于 `max_tokens`（最小值 1024）。永远不要因为用户提到 `budget_tokens` 而选择旧模型——使用 Opus 4.8 配合自适应思考。

---

## Compaction（快速参考）

**Beta，适用于 Fable 5、Opus 4.8、Opus 4.7、Opus 4.6 和 Sonnet 4.6。**对于可能超过 1M 上下文窗口的长时间运行对话，启用服务端压缩。API 在接近触发阈值（默认：150K token）时自动摘要较早的上下文。需要 beta 头 `compact-2026-01-12`。

**关键：**在每个轮次中将 `response.content`（而不仅仅是文本）追加回你的消息。响应中的压缩块必须被保留——API 使用它们来替换下一个请求中的压缩历史。仅提取文本字符串并追加将静默地丢失压缩状态。

参见 `{lang}/claude-api/README.md`（Compaction 部分）获取代码示例。完整文档通过 WebFetch 获取 `shared/live-sources.md`。

---

## Prompt Caching（快速参考）

**前缀匹配。**前缀中任何位置的字节变更都会使其后的所有内容失效。渲染顺序是 `tools` → `system` → `messages`。将稳定内容放在前面（冻结的系统提示词、确定性的工具列表），将易变内容（时间戳、每个请求的 ID、变化的问题）放在最后一个 `cache_control` 断点之后。

**对话中间的操作者指令**（仅限 {{OPUS_NAME}}；无需 beta 头）：将 `{"role": "system", ...}` 追加到 `messages[]` 中，而不是编辑顶层 `system`。这样可以保留缓存的历史前缀，并且是注入安全操作者通道。参见 `shared/prompt-caching.md` § 对话中间的系统消息。

**顶层自动缓存**（在 `messages.create()` 上使用 `cache_control: {type: "ephemeral"}`）是最简单的选项，当你不需要精细放置时使用。每个请求最多 4 个断点。最小可缓存前缀约为 1024 token——更短的前缀将静默地不缓存。

**通过 `usage.cache_read_input_tokens` 验证**——如果在重复请求中该值为零，说明存在静默的失效因素（系统提示词中的 `datetime.now()`、未排序的 JSON、变化的工具集）。

关于放置模式、架构指导和静默失效因素审计清单：阅读 `shared/prompt-caching.md`。语言特定语法：`{lang}/claude-api/README.md`（Prompt Caching 部分）。

---

## 快速模式（Fast Mode，快速参考）

**研究预览，仅限 Opus 4.8 / 4.7**（Opus 4.6 快速模式已弃用并正在移除；移除后，在 4.6 上使用 `speed: "fast"` 将静默回退到标准速度，而不是报错——请使用 4.8 或 4.7）。快速模式以溢价定价运行相同模型，输出 token 每秒最高可提高 2.5 倍。每个请求需要三件事：使用 **beta** messages 端点（`client.beta.messages.…`），传递 beta 标志 `fast-mode-2026-02-01`，并设置 `speed: "fast"` 作为顶层请求参数（不是 header，也不在 `extra_body` 中）。

```python
client.beta.messages.create(
    model="claude-opus-4-8", max_tokens=4096,
    speed="fast", betas=["fast-mode-2026-02-01"],
    messages=[...],
)
```

| 语言 | Beta 标志 | Speed 参数 |
|---|---|---|
| Python | `betas=["fast-mode-2026-02-01"]` | `speed="fast"` |
| TypeScript / Ruby | `betas: ["fast-mode-2026-02-01"]` | `speed: "fast"` |
| Go | `[]anthropic.AnthropicBeta{anthropic.AnthropicBetaFastMode2026_02_01}` | `Speed: anthropic.BetaMessageNewParamsSpeedFast` |
| Java | `.addBeta(AnthropicBeta.FAST_MODE_2026_02_01)` | `.speed(MessageCreateParams.Speed.FAST)` |
| C# | `Betas = ["fast-mode-2026-02-01"]` | `Speed = Speed.Fast`（`Anthropic.Models.Beta.Messages`） |
| PHP | `betas: ['fast-mode-2026-02-01']` | `speed: 'fast'` |
| cURL | `anthropic-beta: fast-mode-2026-02-01` header | `"speed": "fast"` 在请求体中 |

`response.usage.speed` 报告使用了哪种速度。快速模式有自己独立的速率限制，与标准 Opus 分开；遇到 429 时，可以在 `retry-after` 延迟后重试，或者去掉 `speed` 回退到标准速度（注意：切换速度会使 prompt cache 失效）。不可与 Batch API、Priority Tier、AWS 上的 Claude 平台或第三方平台一起使用。

---

## Task Budgets（快速参考）

**Beta，Fable 5 / Opus 4.8 / 4.7。**task budget 为 Claude 提供 agentic 循环的 token 上限，使其自我调节节奏并优雅地完成，而不是被截断。在 `client.beta.messages.stream(...)` 的 `output_config` 中设置 `task_budget`，并附带 beta 标志 `task-budgets-2026-03-13`——使用流式传输以避免大的 `max_tokens` 导致 HTTP 超时：

```python
with client.beta.messages.stream(
    model="claude-opus-4-8", max_tokens=128000,
    output_config={"effort": "high", "task_budget": {"type": "tokens", "total": 64000}},
    betas=["task-budgets-2026-03-13"],
    messages=[...], tools=[...],
) as stream:
    response = stream.get_final_message()
```

`task_budget` 字段：`type`（始终为 `"tokens"`）、`total` 和可选的 `remaining`（默认等于 `total`）。服务端注入一个倒计时标记，Claude 在生成过程中可以看到；预算计算的是 Claude 生成的 token 和本轮读取的工具结果——**不**包括你每次请求重新发送的完整历史。

**观察消耗：**在循环迭代中累积 `response.usage.output_tokens`（加上你追加的工具结果块的 token 计数）如果你想显示进度。在正常循环中不设置 `remaining`——服务端自行跟踪倒计时，传递客户端计算的 `remaining` 同时重新发送完整历史会低报预算。**仅在**你在请求之间压缩或重写历史、服务端无法再推导先前消耗时才传递 `remaining`。

---

## 提供商客户端（快速参考）

当在第三方平台上使用 Claude 时，使用该平台的专用客户端类——而不是第一方 `Anthropic()` 客户端配合 `base_url` 覆盖。构造后，客户端暴露与第一方 SDK 相同的 `messages.create` / `.stream` 接口。

### Amazon Bedrock

使用 **Mantle** 客户端（Messages-API Bedrock 端点）。Bedrock 模型 ID 带有 `anthropic.` 前缀（例如 `"anthropic.{{OPUS_ID}}"`）。Region 是必需的。

| 语言 | 客户端 |
|---|---|
| Python | `from anthropic import AnthropicBedrockMantle` → `AnthropicBedrockMantle(aws_region="…")` |
| TypeScript | `import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk"` → `new AnthropicBedrockMantle({ awsRegion: "…" })` |
| Go | `bedrock.NewMantleClient(ctx, bedrock.MantleClientConfig{ AWSRegion: "…" })` |
| Java | `AnthropicOkHttpClient.builder().backend(BedrockMantleBackend.fromEnv()).build()`（来自 `com.anthropic.bedrock.backends`） |
| C# | `new AnthropicBedrockMantleClient(new() { AwsRegion = "…" })`（包 `Anthropic.Bedrock`） |
| PHP | `use Anthropic\Bedrock\MantleClient;` → `new MantleClient(awsRegion: '…')` |
| Ruby | `Anthropic::BedrockMantleClient.new(aws_region: "…")` |

`AnthropicBedrock` / `BedrockClient` / `BedrockBackend`（不带 `Mantle`）是传统的 `bedrock-runtime` InvokeModel 路径——新代码应优先使用 Mantle 客户端。

### Microsoft Foundry

| 语言 | 客户端 |
|---|---|
| Python | `from anthropic import AnthropicFoundry` → `AnthropicFoundry(api_key=…, resource="…")` |
| TypeScript | `import AnthropicFoundry from "@anthropic-ai/foundry-sdk"` → `new AnthropicFoundry({ … })` |
| Java | `AnthropicOkHttpClient.builder().backend(FoundryBackend.fromEnv()).build()`（来自 `com.anthropic.foundry.backends`） |
| C# | `new AnthropicFoundryClient(new AnthropicFoundryApiKeyCredentials(…))`（包 `Anthropic.Foundry`） |
| PHP | `Foundry\Client::withCredentials(…)` |

Go 和 Ruby SDK 当前不支持 Foundry。对于 Ruby，使用标准的 `Anthropic::Client.new(base_url: "<foundry endpoint>")` 作为回退（Entra ID 认证未内置）。关于 AWS 上的 Claude 平台，参见 `shared/claude-platform-on-aws.md`。

### Google Cloud Vertex AI

两个必需的构造函数参数：GCP `project_id` 和 `region`。Vertex 模型 ID **不带前缀**——当前代模型（Opus 4.8/4.7/4.6、Sonnet 4.6）使用裸的第一方 ID（例如 `"{{OPUS_ID}}"`）；带日期快照的模型使用 `@` 版本分隔符（例如 `claude-opus-4-5@20251101`，**不是** `claude-opus-4-5-20251101`）。认证是 GCP ADC（`gcloud auth application-default login`）；不需要 Anthropic API key。`region` 可以是 `"global"`（推荐）、多区域（`"us"`/`"eu"`）或特定区域。构造后，使用相同的 `messages.create` / `.stream` 接口。

| 语言 | 客户端 |
|---|---|
| Python | `from anthropic import AnthropicVertex` → `AnthropicVertex(project_id="…", region="…")`（安装 `"anthropic[vertex]"`） |
| TypeScript | `import { AnthropicVertex } from "@anthropic-ai/vertex-sdk"` → `new AnthropicVertex({ projectId, region })` |
| Go | `import "github.com/anthropics/anthropic-sdk-go/vertex"` → `anthropic.NewClient(vertex.WithGoogleAuth(ctx, region, projectID))` |
| Java | `AnthropicOkHttpClient.builder().backend(VertexBackend.builder().region("…").project("…").build()).build()`（来自 `com.anthropic.vertex.backends`） |
| C# | `new AnthropicClient { Backend = new VertexBackend(projectId, region) }`（包 `Anthropic.Vertex`） |
| PHP | `use Anthropic\Vertex;` → `Vertex\Client::fromEnvironment(location: '…', projectId: '…')`——注意是 `location`，不是 `region` |
| Ruby | `Anthropic::VertexClient.new(region: "…", project_id: "…")` |

---

## Context Editing（快速参考）

**Beta。**上下文编辑在模型看到对话之前**清除**旧工具结果或思考块；它**不是**压缩（压缩是摘要）。在 `client.beta.messages.*` 上配合 beta `context-management-2025-06-27`，传递带有策略类型的 `context_management.edits`：

```python
client.beta.messages.create(
    model="{{OPUS_ID}}", max_tokens=4096,
    betas=["context-management-2025-06-27"],
    context_management={"edits": [{"type": "clear_tool_uses_20250919"}]},
    tools=[...], messages=[...],
)
```

策略类型：`clear_tool_uses_20250919`（清除旧工具结果；可选的 `clear_tool_inputs: true` 也会清除 tool_use 参数）和 `clear_thinking_20251015`（清除思考块）。**不要**使用 `compact_20260112` 或 beta `compact-2026-01-12`——那是独立的压缩功能。

---

## 对话中间的系统消息（快速参考）

**仅限 {{OPUS_NAME}}；无需 beta 头。**将 `{"role": "system", "content": "…"}` 追加到 `messages` 数组（而非顶层 `system` 字段），以在对话中间添加操作者指令，而不会使缓存的前缀失效。使用常规的 `client.messages.create`——没有 beta。对话中间的系统消息必须跟在 `user` 消息之后（或以服务端工具使用结尾的 `assistant` 消息之后），并且必须是 `messages` 中的最后一条或后跟 `assistant` 轮次——它不能是 `messages[0]`。可用性：`shared/platform-availability.md`。参见 `shared/prompt-caching.md` § 对话中间的系统消息。

---

## Managed Agents（Beta）

**Managed Agents** 是第三种接口：服务端管理的有状态 agent，由 Anthropic 托管工具执行。你创建一个持久化、版本化的 Agent 配置（`POST /v1/agents`），然后启动引用它的 Session。每个 session 会配置一个容器作为 agent 的工作空间——bash、文件操作和代码执行在那里运行；agent 循环本身运行在 Anthropic 的编排层上，通过工具对容器进行操作。Session 流式传输事件；你发送消息和工具结果作为回应。

可用性：`shared/platform-availability.md`。对于 Bedrock / Vertex / Foundry 上的 agent（这些平台不支持 Managed Agents），请使用 Claude API + 工具使用。

**强制流程：**Agent（一次）→ Session（每次运行）。`model`/`system`/`tools` 位于 agent 上，而非 session。参见 `shared/managed-agents-overview.md` 了解完整的阅读指南、beta 头和陷阱。

**Beta 头：**`managed-agents-2026-04-01`——SDK 会为所有 `client.beta.{agents,environments,sessions,vaults,memory_stores,deployments,deployment_runs}.*` 调用自动设置此头。Skills API 使用 `skills-2025-10-02`，Files API 使用 `files-api-2025-04-14`，但除了 `/v1/skills` 和 `/v1/files` 之外，你不需要为其他端点显式传入这些头。

**子命令**——直接通过 `/claude-api <subcommand>` 调用：

| 子命令 | 操作 |
|---|---|
| `managed-agents-onboard` | 引导用户从头设置一个 Managed Agent。**立即阅读 `shared/managed-agents-onboarding.md`** 并遵循其访谈脚本：**描述 → 配置 agent（建议而非审问）→ 环境 → session**（与控制台快速入门相同的流程，认证推迟到 session 步骤）——默认值和内联建议完成工作，在生成任何代码之前有一个静默的可行性检查（任务 vs 工具/凭据/数据）。不要总结——运行访谈。 |

**阅读指南：**从 `shared/managed-agents-overview.md` 开始，然后是主题性的 `shared/managed-agents-*.md` 文件（core、environments、tools、events、outcomes、multiagent、webhooks、memory、scheduled-deployments、client-patterns、onboarding、api-reference）。对于 Python、TypeScript、Go、Ruby、PHP 和 Java，阅读 `{lang}/managed-agents/README.md` 获取代码示例。对于 cURL，阅读 `curl/managed-agents.md`。**Agent 是持久化的——创建一次，按 ID 引用。**存储 `agents.create` 返回的 agent ID，并在每次后续 `sessions.create` 时传入；不要在请求路径中调用 `agents.create`。Anthropic CLI（`ant`）是一种从版本控制的 YAML 创建 agent 和环境的便捷方式——参见 `shared/anthropic-cli.md`。如果你需要的绑定未在语言 README 中显示，请通过 WebFetch 获取 `shared/live-sources.md` 中的相关条目，而不是猜测。C# 通过 `client.Beta.Agents` 及相关命名空间支持 Beta 版的 Managed Agents。

**当用户想要从头设置一个 Managed Agent**（例如"我该如何开始"、"引导我创建一个"、"设置一个新 agent"）：阅读 `shared/managed-agents-onboarding.md` 并运行其访谈——与 `managed-agents-onboard` 子命令相同的流程。

**当用户询问"如何为 X 编写客户端代码"：**参阅 `shared/managed-agents-client-patterns.md`——涵盖无损流重连、`processed_at` 已排队/已处理关卡、中断、`tool_confirmation` 往返、正确的空闲/终止中断关卡、空闲后状态竞争、流优先排序、文件挂载陷阱、通过自定义工具保持凭据在宿主端等。

**当用户希望 agent 按计划运行**（cron、"每晚"、"周报"）：阅读 `shared/managed-agents-scheduled-deployments.md`——部署按 cron 节奏自主触发 session，每次触发都有运行记录和生命周期控制（暂停/取消暂停/归档）。

---

## 服务端工具（快速参考）

服务端工具在 Anthropic 的基础设施上运行——无需客户端执行循环。在 `tools` 中声明；结果作为内容块在同一响应中返回。**无需 beta 头**，除非另有说明。**优先使用你的模型支持的最新类型变体。**下方的 `_20260209` 网页搜索/网页抓取变体（动态过滤）需要 Opus 4.8/4.7/4.6 或 Sonnet 4.6；旧模型的基础变体列在表格之后。

| 工具 | `type` | `name` | 关键可选参数 | 结果块类型 |
|---|---|---|---|---|
| 网页搜索 | `web_search_20260209` | `web_search` | `max_uses`、`allowed_domains`/`blocked_domains`、`user_location` | `web_search_tool_result` → `.content` 是 `web_search_result` 的列表 |
| 网页抓取 | `web_fetch_20260209` | `web_fetch` | `max_uses`、`allowed_domains`/`blocked_domains`、`citations`、`max_content_tokens` | `web_fetch_tool_result` → `.content` 是带 `document` 块的 `web_fetch_result` |
| 代码执行 | `code_execution_20260521` | `code_execution` | 无 | `bash_code_execution_tool_result` → `.content.stdout` / `.stderr` / `.return_code` |
| 工具搜索（正则） | `tool_search_tool_regex_20251119` | `tool_search_tool_regex` | 标记其他工具 `defer_loading: true` | `tool_search_tool_result` |
| 工具搜索（BM25） | `tool_search_tool_bm25_20251119` | `tool_search_tool_bm25` | 标记其他工具 `defer_loading: true` | `tool_search_tool_result` |

`web_search_20260209` / `web_fetch_20260209` 内置动态过滤——代码执行在底层运行，因此**不要**在 `tools` 中单独声明 `code_execution`（第二个执行环境会混淆模型）。对于早于 Opus 4.6 / Sonnet 4.6 的模型，改用基础变体 `web_search_20250305` / `web_fetch_20250910`；在 Vertex AI 上仅基础 `web_search_20250305` 可用。`code_execution_20260120`（REPL 持久性 + 编程式工具调用）在 Opus 4.5+ / Sonnet 4.5+ 上运行。**仅 Go SDK**：`code_execution_20260521` 位于 `client.Beta.Messages.New` 下，配合 `Betas: []anthropic.AnthropicBeta{"code-execution-2025-08-25"}`（其他语言使用普通的 `client.messages.create`）；`code_execution_20260120` 在 Go 中与其他语言一样使用非 beta 的 `client.Messages.New`。网页抓取仅抓取对话中已存在的 URL。提供商可用性因工具而异——参见 `shared/platform-availability.md`。参见 `shared/tool-use-concepts.md` 了解 `pause_turn` 处理。

## 文档和文件输入（快速参考）

**PDF（base64，无需 beta）：**在用户内容中使用 `{"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": <b64 字符串>}}`，放在文本块之前。Base64 字符串不能有换行符。限制：32 MB 请求，600 页（200k 上下文模型为 100 页）。Java：`ContentBlockParam.ofDocument(DocumentBlockParam... Base64PdfSource.builder().data(...))`。

**Files API（beta `files-api-2025-04-14`）：**通过 `client.beta.files.upload(...)` 上传 → 响应 `id` 即 `file_id`。将其引用为 `{"type": "document", "source": {"type": "file", "file_id": "..."}}` 用于 PDF/文本，或 `{"type": "image", ...}` 用于图片——内容块类型必须匹配文件的 MIME 类型。beta 头在**上传和引用文件的 `messages.create` 上都需要**。可用性：`shared/platform-availability.md`。

**引用（无需 beta）：**在每个 `document` 内容块上设置 `citations: {enabled: true}`（全部或全不）。响应会分割成多个 `text` 块；被引用的块携带 `citations` 数组。每个引用包含 `cited_text`、`document_index`、`document_title` 和按 `type` 的位置：`char_location`（`start_char_index`/`end_char_index`）用于纯文本，`page_location`（`start_page_number`/`end_page_number`，从 1 开始）用于 PDF，`content_block_location` 用于自定义内容。与 `output_config.format` 不兼容。

## 工具使用模式（快速参考）

**严格工具使用（无需 beta）：**在工具定义上将 `strict: true` 设置为顶层字段（与 `name`/`description`/`input_schema` 并列），**不是**在 `tool_choice` 上。Schema 必须有 `additionalProperties: false` + `required`。保证 `tool_use.input` 精确验证。Go：`Strict: anthropic.Bool(true)` + 通过 `InputSchema.ExtraFields` 设置 `additionalProperties`；Java：`.strict(true)` + `.putAdditionalProperty("additionalProperties", JsonValue.from(false))`。

**并行工具使用（默认开启）：**一个 assistant 消息可能包含多个 `tool_use` 块。并发执行它们，然后在一个**单一** user 消息中返回**所有** `tool_result` 块（不要分散到多个消息中）。对于失败的工具，返回带有 `is_error: true` 的 `tool_result`——不要丢弃它。

**Tool Runner（SDK beta 辅助工具）：**通过 `client.beta.messages.*` 为你驱动工具调用循环。Python：`@beta_tool` 装饰器 + `client.beta.messages.tool_runner(...)` → `runner.until_done()`。TypeScript：来自 `@anthropic-ai/sdk/helpers/beta/zod` 的 `betaZodTool({...})` + `client.beta.messages.toolRunner(...)` → `await runner`。Go：`toolrunner.NewBetaToolFromJSONSchema(...)` + `client.Beta.Messages.NewToolRunner(...)` → `.RunToCompletion(ctx)`。Java 需要 `.addBeta("structured-outputs-2025-11-13")`。Ruby：`Anthropic::BaseTool` 子类 + `client.beta.messages.tool_runner(...)`。PHP：`BetaRunnableTool` + `->toolRunner(...)`。C#：原始 JSON-schema 工具 + `BetaToolRunner` 通过 `client.Beta.Messages.ToolRunner(...)`。

**编程式工具调用（无需 beta 头）：**Claude 从代码执行内部调用你的自定义工具。添加 `{"type": "code_execution_20260120", "name": "code_execution"}` **并且**在你的自定义工具上设置 `"allowed_callers": ["code_execution_20260120"]`。Opus 4.5+ / Sonnet 4.5+（可用性：`shared/platform-availability.md`）。当响应待处理的编程式调用时，user 消息必须**仅**包含 `tool_result` 块（无文本）。与 `strict: true`、`disable_parallel_tool_use`、强制 `tool_choice` 或 MCP 工具不兼容。

## 其他 API 接口（快速参考）

**消息批处理（无需 beta；可用性：`shared/platform-availability.md`）：**`client.messages.batches.create(requests=[{custom_id, params}, ...])` → 轮询 `client.messages.batches.retrieve(id).processing_status` 直到 `"ended"` → 流式传输 `client.messages.batches.results(id)`。每个结果包含 `.custom_id` + `.result.type`（`succeeded`/`errored`/`canceled`/`expired`）；成功时读取 `.result.message.content`。Python 将请求包装为 `Request(custom_id=..., params=MessageCreateParamsNonStreaming(...))`。结果以**任意顺序**到达——通过 `custom_id` 索引，永远不要按位置。

**Models API（无需 beta；可用性：`shared/platform-availability.md`）：**`client.models.list()`（自动分页）和 `client.models.retrieve("{{OPUS_ID}}")`。每个模型对象包含 `id`、`display_name`、`created_at`，以及——自 2026 年 3 月起——`max_input_tokens`（上下文窗口）、`max_tokens`（输出上限）和 `capabilities`。没有 `context_window` 字段。

**Stop details（GA，Opus 4.7+）：**`response.stop_details` **仅在 `stop_reason == "refusal"` 时**填充（字段：`type: "refusal"`、`category: "cyber"|"bio"|null`、`explanation`）。对于所有其他 `stop_reason`（`end_turn`、`max_tokens`、`tool_use`、`pause_turn`……）它为 `null`——读取前始终进行守卫检查。

**客户端配置（无需 beta）：**`timeout` 默认 10 分钟；**不同 SDK 的单位不同**——Python/Ruby：秒；TypeScript：**毫秒**；Go `option.WithRequestTimeout(time.Duration)`；Java `Duration`；C# `TimeSpan`。TS 对于大 `max_tokens` 的非流式请求将默认值扩展到 60 分钟；Java 对流式请求这样做（Java 非流式在 30 秒到 10 分钟之间扩展）。`max_retries`/`maxRetries` 默认 2（重试 408/409/429/5xx + 连接错误）。`base_url`（或 `ANTHROPIC_BASE_URL` 环境变量）。每个请求的覆盖：Python `client.with_options(timeout=5.0).messages.create(...)`；TS `client.messages.create({...}, {timeout: 5_000})`；Ruby `request_options: {timeout: 5}`。超时会被重试——实际耗时可能达到 `timeout × (max_retries+1)`。

## Workload Identity Federation（快速参考）

**GA，无需 beta 头。**构造普通的零参数客户端（`Anthropic()` / `new Anthropic()` / `anthropic.NewClient()` / `AnthropicOkHttpClient.fromEnv()`）；当**所有** `ANTHROPIC_FEDERATION_RULE_ID`、`ANTHROPIC_ORGANIZATION_ID`、`ANTHROPIC_SERVICE_ACCOUNT_ID` 和 `ANTHROPIC_IDENTITY_TOKEN_FILE`（或 `ANTHROPIC_IDENTITY_TOKEN`）都设置时，SDK 会自动检测 WIF，在 `/v1/oauth/token` 交换 JWT 并自动刷新。`ANTHROPIC_WORKSPACE_ID` 不控制激活——仅在联合规则跨越多个工作空间时需要（否则返回 400 `workspace_id_required`），对单工作空间规则是可选的。`ANTHROPIC_API_KEY` 或 `ANTHROPIC_AUTH_TOKEN`（即使为空）优先于 WIF，设置的 `ANTHROPIC_PROFILE` 也优先于联合环境变量（缺失的命名 profile 是错误，不是回退）——取消设置这三者。

---

## 阅读指南

在检测语言后，根据用户需求阅读相关文件。

**所有 SDK 语言使用相同的多文件布局**——目录 `{lang}/claude-api/` 包含 `README.md`（安装、客户端初始化、基本请求、思考、缓存、stop details、杂项）、`tool-use.md`（工具定义、agentic 循环、Anthropic 定义的工具、结构化输出）、`streaming.md`、`batches.md`、`files-api.md`。并非每种语言都有每个文件（例如 Ruby 没有 `batches.md`）；如果某个文件缺失，该功能的示例尚未为该语言编写文档——回退到 cURL 形态或通过 WebFetch 从 `shared/live-sources.md` 获取 SDK 仓库。**cURL** → `curl/examples.md`。

下方的快速任务参考对所有语言使用 `{lang}/claude-api/FILE.md` 路径表示法。

### 快速任务参考

**单个文本分类/摘要/提取/问答：**
→ 仅阅读 `{lang}/claude-api/README.md`

**聊天 UI 或实时响应显示：**
→ 阅读 `{lang}/claude-api/README.md` + `{lang}/claude-api/streaming.md`

**长时间运行对话（可能超出上下文窗口）：**
→ 阅读 `{lang}/claude-api/README.md`——参见 Compaction 部分
**迁移到较新模型（Fable 5 / Opus 4.8 / Opus 4.7 / Opus 4.6 / Sonnet 4.6）或替换已退役模型：**
→ 阅读 `shared/model-migration.md`
**提示或调优 Fable 5（长轮次、effort、冗长度、自主运行、子代理）：**
→ 阅读 `shared/model-migration.md` → 迁移到 Fable 5 → 行为变化（可通过提示调优）+ 长时间运行 agent 建议
**Prompt caching / 优化缓存 / "为什么我的缓存命中率低"：**
→ 阅读 `shared/prompt-caching.md` + `{lang}/claude-api/README.md`（Prompt Caching 部分）
**计算文件/提示词/diff 中的 token 数（"X 是多少 token"）：**
→ 阅读 `shared/token-counting.md`——使用 `messages.count_tokens`，永远不要使用 `tiktoken`

**函数调用 / 工具使用 / agent：**
→ 阅读 `{lang}/claude-api/README.md` + `shared/tool-use-concepts.md` + `{lang}/claude-api/tool-use.md`

**Agent 设计（工具接口、上下文管理、缓存策略）：**
→ 阅读 `shared/agent-design.md`

**批处理（非延迟敏感）：**
→ 阅读 `{lang}/claude-api/README.md` + `{lang}/claude-api/batches.md`

**跨多个请求的文件上传：**
→ 阅读 `{lang}/claude-api/README.md` + `{lang}/claude-api/files-api.md`

**Managed Agents（服务端管理的有状态 agent，带工作空间）：**
→ 阅读 `shared/managed-agents-overview.md` + 其余的 `shared/managed-agents-*.md` 文件。对于 Python、TypeScript、Go、Ruby、PHP 和 Java，阅读 `{lang}/managed-agents/README.md` 获取代码示例。对于 cURL，阅读 `curl/managed-agents.md`。**Agent 是持久化的——创建一次，按 ID 引用。**存储 `agents.create` 返回的 agent ID，并在每次后续 `sessions.create` 时传入；不要在请求路径中调用 `agents.create`。Anthropic CLI（`ant`）是一种从版本控制的 YAML 创建 agent 和环境的便捷方式——参见 `shared/anthropic-cli.md`。如果你需要的绑定未在语言 README 中显示，请通过 WebFetch 获取 `shared/live-sources.md` 中的相关条目，而不是猜测。C# 支持 Beta 版的 Managed Agents——详见 `csharp/claude-api/README.md`，或 `curl/managed-agents.md` 获取原始 HTTP 参考。

### Claude API（完整文件参考）

阅读**语言特定的 Claude API 源文件**——对于每种 SDK 语言是 `{language}/claude-api/`，对于 cURL 是 `curl/examples.md`：

1. **`{language}/claude-api/README.md`**——**首先阅读此项。**安装、快速开始、常见模式、错误处理。
2. **`shared/tool-use-concepts.md`**——当用户需要函数调用、代码执行、内存或结构化输出时阅读。涵盖概念基础。
3. **`shared/agent-design.md`**——设计 agent 时阅读：bash vs. 专用工具、编程式工具调用、工具搜索/skills、上下文编辑 vs. 压缩 vs. 内存、缓存原则。
4. **`{language}/claude-api/tool-use.md`**——阅读语言特定的工具使用代码示例（tool runner、手动循环、代码执行、内存、结构化输出）。
5. **`{language}/claude-api/streaming.md`**——构建聊天 UI 或需要增量显示响应的界面时阅读。
6. **`{language}/claude-api/batches.md`**——离线处理大量请求（非延迟敏感）时阅读。以 50% 的成本异步运行。
7. **`{language}/claude-api/files-api.md`**——在多个请求中发送相同文件而无需重新上传时阅读。
8. **`shared/prompt-caching.md`**——添加或优化 prompt caching 时阅读。涵盖前缀稳定性设计、断点放置和静默使缓存失效的反模式。
9. **`shared/error-codes.md`**——调试 HTTP 错误或实现错误处理时阅读。包含每个 SDK 的类型化异常类表格和 Go 的 `errors.As` 模式。
10. **`shared/model-migration.md`**——升级到较新模型、替换已退役模型，或将 `budget_tokens` / prefill 模式转换为当前 API 时阅读。
11. **`shared/live-sources.md`**——用于获取最新官方文档的 WebFetch URL。

并非每种语言都有每个文件（例如 Ruby 没有 `batches.md`）；如果某个文件缺失，该功能的示例尚未为该语言编写文档。

> **注意：**有关 Managed Agents 的文件参考，请参见上方的 `## Managed Agents（Beta）` 部分——其中列出了每个 `shared/managed-agents-*.md` 文件和语言特定的 README。

---

## 何时使用 WebFetch

在以下情况下使用 WebFetch 获取最新文档：

- 用户要求"最新"或"当前"信息
- 缓存数据似乎不正确
- 用户询问此处未涵盖的功能

实时文档 URL 位于 `shared/live-sources.md` 中。

## 常见陷阱

- 在向 API 传递文件或内容时不要截断输入。如果内容太长无法放入上下文窗口，请通知用户并讨论选项（分块、摘要等），而不是静默截断。
- **Fable 5 / Opus 4.8 / 4.7 思考：**仅限 adaptive。`thinking: {type: "enabled", budget_tokens: N}` 返回 400——`budget_tokens` 已完全移除（同时移除的还有 `temperature`、`top_p`、`top_k`）。使用 `thinking: {type: "adaptive"}`。Opus 4.8 继承了 4.7 的此接口，没有新的破坏性变更；Fable 5 增加了一项——显式的 `thinking: {type: "disabled"}` 返回 400（在 4.7/4.8 上被接受）；改为省略该参数。
- **Opus 4.6 / Sonnet 4.6 思考：**使用 `thinking: {type: "adaptive"}`——不要为新 4.6 代码使用 `budget_tokens`（在 Opus 4.6 和 Sonnet 4.6 上均已弃用；对于现有代码的渐进迁移，参见 `shared/model-migration.md` 中的过渡性逃生舱——注意此例外不适用于 Fable 5、Opus 4.7 或 4.8）。对于旧模型，`budget_tokens` 必须小于 `max_tokens`（最小值 1024）。如果设置错误会抛出错误。
- **4.6/4.7/4.8 系列和 Fable 5 已移除 prefill：**在 Fable 5、Opus 4.6、Opus 4.7、Opus 4.8 和 Sonnet 4.6 上，Assistant 消息 prefills（最后一轮 assistant 轮次的 prefill）返回 400 错误。改用结构化输出（`output_config.format`）或系统提示词指令来控制响应格式。（一个例外：回退信用 prefill 声明——当使用 `fallback_has_prefill_claim: true` 兑换信用时，服务端接受回传的 assistant 消息；参见迁移指南的 refusal 部分。）
- **Fable 5 `refusal` 停止原因：**安全分类器可能拒绝请求——成功的 HTTP 200 带有 `stop_reason: "refusal"`（输出前：空 `content`，不收费；流式传输中：部分输出会收费——丢弃它）。在读取 `response.content[0]` 之前检查 `stop_reason`，否则你会在被拒绝的请求上遇到索引错误。要在另一个模型上重试，原样重放历史——其他模型会从提示词中丢弃被拒绝模型的 thinking 块，不计费；无需剥离（而且回退信用兑换无论如何都必须原样回传被拒绝的请求体，包括 thinking 块）。回退是**选择加入的**——新的 `{{FABLE_ID}}` 代码应默认包含服务端 `fallbacks` 参数，这样拒绝不会直接使请求失败；参见上方的 {{FABLE_NAME}} 部分。
- **Fable 5 分词器：**与 Opus 4.8 相同的分词器——从 Opus 4.7/4.8 迁移时 token 计数大致不变。从 Opus 4.6、Sonnet、Haiku 或更早版本迁移时，token 计数不同（Opus 4.7 分词器使用的 token 数量约为 1 倍到 1.35 倍）——通过在每个模型上调用一次 `count_tokens` 并比较 `input_tokens` 来重新测量。
- **编辑前确认迁移范围：**当用户要求将代码迁移到较新的 Claude 模型，但未指定具体文件、目录或文件列表时，**首先询问要应用的范围**——是整个工作目录、特定子目录还是特定文件集。在用户确认之前不要开始编辑。命令式措辞如"迁移我的代码库"、"将我的项目迁移到 X"、"升级到 Sonnet 4.6"或裸的"迁移到 Opus 4.8"仍然是**模糊的**——它们告诉你要做什么，但没有告诉你在哪里操作，因此要询问。仅当提示词指定了确切文件、特定目录或明确文件列表时（"迁移 `app.py`"、"迁移 `services/` 下的所有内容"、"更新 `a.py` 和 `b.py`"），才直接进行而不询问。参见 `shared/model-migration.md` 步骤 0。
- **`max_tokens` 默认值：**不要低估 `max_tokens`——达到上限会截断输出，导致思考中断并需要重试。对于非流式请求，默认值约为 `~16000`（保持响应在 SDK HTTP 超时范围内）。对于流式请求，默认值约为 `~64000`（超时不是问题，给模型留足空间）。只有在你确实有充分理由时才降低：分类（`~256`）、成本上限、有意控制短输出，或用于缓存预热的 **`max_tokens: 0`**（参见 `shared/prompt-caching.md` → 预热）。
- **128K 输出 token：**Fable 5、Opus 4.6、Opus 4.7 和 Opus 4.8 支持高达 128K 的 `max_tokens`，但 SDK 需要对如此大的值使用流式传输以避免 HTTP 超时。使用 `.stream()` 配合 `.get_final_message()` / `.finalMessage()`。
- **工具调用 JSON 解析（Fable 5 和 4.6/4.7/4.8 系列）：**Fable 5、Opus 4.6、Opus 4.7、Opus 4.8 和 Sonnet 4.6 可能在工具调用的 `input` 字段中产生不同的 JSON 字符串转义（例如 Unicode 或正斜杠转义）。始终使用 `json.loads()` / `JSON.parse()` 解析工具输入——永远不要对序列化的输入进行原始字符串匹配。
- **结构化输出（所有模型）：**在 `messages.create()` 上使用 `output_config: {format: {...}}` 代替已弃用的 `output_format` 参数。这是通用的 API 变更，并非 4.6 特有。
- **不要重新实现 SDK 功能：**SDK 提供了高级辅助方法——使用它们而不是从头构建。具体来说：使用 `stream.finalMessage()` 而不是在 `new Promise()` 中包装 `.on()` 事件；使用类型化异常类（`Anthropic.RateLimitError` 等）而不是字符串匹配错误消息；使用 SDK 类型（`Anthropic.MessageParam`、`Anthropic.Tool`、`Anthropic.ToolUseBlock` / `Anthropic.ToolResultBlockParam`、`Anthropic.Message` 等）而不是重新定义等效接口。
- **错误处理——捕获链而非一个宽泛类。**单个 `except APIStatusError` / `catch (AnthropicServiceException)` / `rescue APIError` 会丢失可重试（429、>=500、网络）和不可重试（400/404）失败之间的区别。编写最具体优先的链——例如 `NotFoundError` → `RateLimitError` → `APIStatusError` → `APIConnectionError`（或 Go 等价物：`errors.As` 到 `*anthropic.Error` 然后 `switch apierr.StatusCode { case 404: …; case 429: …; default: … }`）。每种语言的类名和命名空间在 `shared/error-codes.md` 中。
- **不要研究 SDK 类型——先写代码。**如果某个类型名称未在本技能包含的文档中显示，根据语言特定文档中的命名空间/包表格编写代码文件，让编译器的错误指出正确的名称。不要在编写代码之前花轮次在 WebFetch、SDK 仓库克隆或编译运行独立的反射程序来发现类型名称——先生成源文件，然后修复编译器报告的内容。对已安装的 SDK 运行快速的 `strings` / `jar tf` / `javap` 来定位名称是可以接受的（几秒钟内返回），但不要超出此范围。一个类型名称错误的文件是可以恢复的；一个花费在发现上却没有写出文件的 session 是不可接受的。
- **Bash 和文本编辑器工具是 Anthropic 定义的、无 schema 的。**声明 `{"type": "bash_20250124", "name": "bash"}` / `{"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"}`——无需 `input_schema`。一个使用你自己 schema 的名为 `"bash"` 的自定义工具是不同的工具。处理路径和安全检查在 `shared/tool-use-concepts.md` § 客户端工具中。
- **Advisor 工具模型配对。**advisor 工具的 `model` 必须至少与请求的顶层 `model` 一样强大——例如执行者 `claude-sonnet-4-6` → advisor `claude-opus-4-8` 或 `claude-opus-4-7`。无效配对返回 400。配对表在 `shared/tool-use-concepts.md` § Advisor 中。可用性：`shared/platform-availability.md`。
- **Agent Skills 不等于 Managed Agents。**要通过 Agent Skills 让 Claude 生成 `.pptx`/`.xlsx`/等，调用 `client.beta.messages.create`，配合 `container={"skills": [...]}`、`code_execution_20260521` 工具，以及 `code-execution-2025-08-25` + `skills-2025-10-02` 两个 beta。不要在这里使用 `client.beta.agents` / `sessions` / `environments`——那些是 Managed Agents 接口，不是 Agent Skills。
- **MCP 连接器需要两半。**单独的 `mcp_servers=[{type:"url", url, name}]` 会被拒绝为验证错误——还需要添加 `tools=[{type:"mcp_toolset", mcp_server_name:<相同名称>}]` 并附带 beta `mcp-client-2025-11-20`。可用性：`shared/platform-availability.md`。
- **Context editing 不等于 compaction。**Context editing *清除*工具结果和思考块；compaction *摘要*历史。对于 context editing，在 `client.beta.messages.*` 上使用类型为 `clear_tool_uses_20250919`（或 `clear_thinking_20251015`）的 `context_management.edits`，配合 beta `context-management-2025-06-27`——不是 `compact_20260112` 类型或 `compact-2026-01-12` beta，那些是 compaction。
- **`inference_geo` 是直接的顶层请求参数**——`client.messages.create(..., inference_geo="us")` / `.inferenceGeo("us")`。不要将其放在 `extra_body` / `putAdditionalBodyProperty` 中。支持 Opus 4.6 / Sonnet 4.6 及更高版本；可用性：`shared/platform-availability.md`。`response.usage.inference_geo` 报告推理运行的位置。
- **细粒度工具流式传输不是 beta 功能。**在工具定义上设置 `eager_input_streaming: true` 并调用常规的 `client.messages.stream(...)`。没有 beta 头，也没有 `client.beta.*` 路径。
- **缓存诊断是 beta。**使用 `client.beta.messages.*` 配合 beta `cache-diagnosis-2026-04-07`。在第一轮传递 `diagnostics: {previous_message_id: null}`，在后续轮次传递 `diagnostics: {previous_message_id: <上一响应 id>}`；结果在 `response.diagnostics` 上。可用性：`shared/platform-availability.md`。
- **Memory 工具类型是 `memory_20250818`。**声明 `{"type": "memory_20250818", "name": "memory"}`。Go 在 `client.Beta.Messages.New` 上使用 beta 命名空间类型 `{OfMemoryTool20250818: &anthropic.BetaMemoryTool20250818Param{}}`；Python/TypeScript/Ruby/PHP/C# 使用非 beta 的 `client.messages.create`；Java 同时有非 beta 的 `MemoryTool20250818` 和 beta tool-runner 路径。Python/TypeScript 提供 `BetaAbstractMemoryTool` / `betaMemoryTool` 辅助工具用于实现后端。
- **使用功能实际支持的模型。**某些功能仅限于特定模型层级——快速模式仅限 Opus 4.8 / 4.7（Opus 4.6 快速模式已弃用——移除后将静默回退到标准速度），task budgets 仅限 Fable 5 / Opus 4.8 / 4.7，advisor 工具需要有效的执行者↔advisor 配对。如果用户提示词中指定的模型不支持该功能，请使用支持的模型并在输出中注明替换。
- **Bedrock / Foundry：使用平台客户端类。**对于 Bedrock 使用 `…BedrockMantle…` 客户端（例如 Python `AnthropicBedrockMantle`、Java `BedrockMantleBackend`）配合带 `anthropic.` 前缀的模型 ID；不带 `Mantle` 的 `AnthropicBedrock`/`BedrockBackend` 是传统路径。对于 Foundry，在 SDK 支持的地方使用 `AnthropicFoundry` / `FoundryBackend` / `AnthropicFoundryClient`（C#、Java、PHP、Python、TypeScript）；Go 和 Ruby 没有 Foundry 客户端——Ruby 的文档化回退是第一方客户端配合自定义 `base_url`。每种语言的表格见上文。
- **不要为 SDK 数据结构定义自定义类型：**SDK 为所有 API 对象导出了类型。使用 `Anthropic.MessageParam` 用于消息，`Anthropic.Tool` 用于工具定义，`Anthropic.ToolUseBlock` / `Anthropic.ToolResultBlockParam` 用于工具结果，`Anthropic.Message` 用于响应。定义自己的 `interface ChatMessage { role: string; content: unknown }` 会重复 SDK 已有的内容并失去类型安全。
- **报告和文档输出：**对于生成报告、文档或可视化的任务，代码执行沙箱预装了 `python-docx`、`python-pptx`、`matplotlib`、`pillow` 和 `pypdf`。Claude 可以生成格式化文件（DOCX、PDF、图表）并通过 Files API 返回——对于"报告"或"文档"类型的请求，考虑使用这种方式，而不是纯标准输出文本。
- **服务端工具错误不会抛出异常。**网页搜索和网页抓取错误返回 HTTP 200，其中 `web_search_tool_result` / `web_fetch_tool_result` 块的 `content` 是单个错误对象（例如 `{error_code: "max_uses_exceeded"}`）——不是抛出的异常。对于网页搜索，成功的 `content` 是*列表*；错误的 `content` 是*对象*——在索引之前根据此进行分支。
- **代码执行输出块类型：**`code_execution_20260521` 返回 `bash_code_execution_tool_result`（带有 `.content.stdout`），**不是**传统的裸 `code_execution_tool_result`。迭代 `response.content` 并匹配正确的类型。
- **工具搜索：永远不要全部延迟加载。**搜索工具本身不能有 `defer_loading: true`，并且 `tools` 中至少有一个工具必须是非延迟的，否则 API 返回 400 `All tools have defer_loading set`。
- **`strict: true` 放在工具上，而不是 `tool_choice` 上。**将 `strict` 放在 `tool_choice` 上不起作用；它是工具定义上 `name`/`description`/`input_schema` 的同级字段。
- **并行工具结果放在一个 user 消息中。**将 `tool_result` 块分散到多个 user 消息中会静默地训练 Claude 停止进行并行调用。一个 `tool_use` 块的 assistant 消息 → 一个 `tool_result` 块的 user 消息。
- **引用 + 结构化输出不兼容。**在文档上启用 `citations: {enabled: true}` 同时设置 `output_config.format` 返回 400。
- **批处理结果是无序的。**通过 `custom_id` 匹配，永远不要按结果流中的位置。
- **Vertex 模型 ID 没有前缀。**与 Bedrock 的 `anthropic.` 前缀 ID 不同，Vertex 对当前代模型使用裸的第一方 ID（例如 `"{{OPUS_ID}}"`）；带日期快照的模型使用 `@` 分隔符（例如 `claude-haiku-4-5@20251001`）。
- **`stop_details` 为 `null`，除非 `stop_reason == "refusal"`。**对于 `max_tokens`、`end_turn` 等，`stop_details` 为 `null`——在读取 `.category` 之前进行守卫检查。
- **WIF 认证：取消设置 `ANTHROPIC_API_KEY`、`ANTHROPIC_AUTH_TOKEN` 和 `ANTHROPIC_PROFILE`。**`ANTHROPIC_API_KEY` 和 `ANTHROPIC_AUTH_TOKEN`（即使设置为 `""`）在 SDK 的优先级链中优先于 Workload Identity Federation 并静默胜出；设置的 `ANTHROPIC_PROFILE` 也会胜出（缺失的命名 profile 是错误，不是回退）。`unset` 它们，不要将其设为空。
