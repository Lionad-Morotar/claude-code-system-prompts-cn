<!--
name: 'Skill: Building LLM-powered applications with Claude'
description: 指导 Claude 使用 Anthropic SDK 构建 LLM 驱动的应用，涵盖语言检测、API 接口选择（Claude API vs 托管代理）、模型默认值、思考/努力配置和特定语言的文档阅读
ccVersion: 2.1.203
-->
# 使用 Claude 构建 LLM 驱动的应用

此技能帮助你使用 Claude 构建 LLM 驱动的应用。根据你的需求选择合适的接口，检测项目语言，然后阅读相关的语言特定文档。

## 开始之前

扫描目标文件（或如果没有目标文件，扫描提示词和项目）中的非 Anthropic 提供商标记——`import openai`、`from openai`、`langchain_openai`、`OpenAI(`、`gpt-4`、`gpt-5`、文件名如 `agent-openai.py` 或 `*-generic.py`，或任何要求保持代码提供商中立的明确指令。如果你找到任何标记，停下来告诉用户此技能生成 Claude/Anthropic SDK 代码；询问他们是否想切换到 Claude 或想要非 Claude 的实现。不要用 Anthropic SDK 调用编辑非 Anthropic 文件。

## 输出要求

当用户要求你添加、修改或实现 Claude 功能时，你的代码必须通过以下方式之一调用 Claude：

1. **官方 Anthropic SDK**，用于项目的语言（`anthropic`、`@anthropic-ai/sdk`、`com.anthropic.*` 等）。这是项目有支持的 SDK 时的默认选择。
2. **原始 HTTP**（`curl`、`requests`、`fetch`、`httpx` 等）——仅当用户明确要求 cURL/REST/原始 HTTP、项目是 shell/cURL 项目或该语言没有官方 SDK 时。

永远不要混用两者——不要因为在 Python 或 TypeScript 项目中感觉更轻量就用 `requests`/`fetch`。永远不要退回到 OpenAI 兼容的 shim。

**永远不要猜测 SDK 用法。** 函数名、类名、命名空间、方法签名和导入路径必须来自明确的文档——要么是本技能中的 `{lang}/` 文件，要么是 `shared/live-sources.md` 中列出的官方 SDK 仓库或文档链接。如果你需要的绑定在技能文件中没有明确文档化，在编写代码之前从 `shared/live-sources.md` WebFetch 相关 SDK 仓库。不要从 cURL 形式或其他语言的 SDK 推断 Ruby/Java/Go/PHP/C# API。

**如果 WebFetch 或仓库访问失败**（网络受限、超时、克隆被阻止）：不要继续重试——根据 `{lang}/` 文件中的模式和命名空间/包表编写代码，在其上运行编译器或解释器，并在错误输出上迭代。对于静态类型 SDK（C#、Java、Go），针对本地错误的编译-修复循环比阻塞的网络研究更快达到可工作代码。

## 默认值

除非用户另有要求：

Claude 模型版本请使用 {{OPUS_NAME}}，可通过精确模型字符串 `{{OPUS_ID}}` 访问。请默认使用自适应思考（`thinking: {type: "adaptive"}`）处理任何 remotely 复杂的内容。最后，请对任何可能涉及长输入、长输出或高 `max_tokens` 的请求默认使用流式传输——它可以防止请求超时。使用 SDK 的 `.get_final_message()` / `.finalMessage()` 辅助工具获取完整响应（如果你不需要处理单个流事件）

## ⚠️ API 变化——你的训练知识可能已过时

2025-2026 年间多个常见 Claude API 形式发生了变化。如果你从训练中记得某个模式，在编写之前对照本技能中的 `{lang}/` 文件验证——以下行是最常见的变化点：

| 领域 | 过时的知识 | 当前 API |
|---|---|---|
| 扩展思考 | `thinking: {type: "enabled", budget_tokens: N}` | 在 Claude 4.6+ 模型上：`thinking: {type: "adaptive"}`。`budget_tokens` 在 Opus 4.6 / Sonnet 4.6 上已弃用，在 Fable 5 / Sonnet 5 / Opus 4.8 / 4.7 上**被 400 拒绝**。4.6 之前的模型仍使用 `budget_tokens`。 |
| 网页搜索/获取工具类型 | `web_search_20250305`、`web_fetch_20250910` | `web_search_20260209`、`web_fetch_20260209`（动态过滤）在 Opus 4.8/4.7/4.6、Sonnet 5 和 Sonnet 4.6 上。旧版模型保留基本变体；在 Vertex AI 上仅有基本 `web_search_20250305`（网页获取不在 Vertex 上）——参见下方服务器工具快速参考。 |
| PHP 参数名 | snake_case 线路名作为命名参数（`max_tokens`） | 顶级命名参数为 camelCase（`maxTokens`）。嵌套数组键因功能而异（例如 `'taskBudget'`、`'skillID'`、`'mcp_server_name'`）——从文档示例中复制精确键名；不要批量转换。 |
| 托管代理凭证 | 通过自定义工具在主机侧保存密钥（保管库之前的唯一选择） | 保管库 `environment_variable` 凭证——由 Anthropic 存储，在出口处替换，在沙箱中永远不可见（`shared/managed-agents-tools.md` → 保管库）。主机侧自定义工具仍是自托管沙箱的回退方案。 |

本技能中的 `{lang}/` 文件优先于记忆中的模式。

---

## 子命令

如果本提示词底部的用户请求是裸子命令字符串（无散文），搜索本文档中每个**子命令**表——包括以下追加部分中的——并直接按匹配的 Action 列执行。这允许用户通过 `/claude-api <子命令>` 调用特定流程。如果文档中没有表匹配，将请求作为正常散文处理。

| 子命令 | 操作 |
|---|---|
| `migrate` | 将现有 Claude API 代码迁移到更新模型。**立即阅读 `shared/model-migration.md`** 并按顺序执行：步骤 0（确认范围——在任何编辑之前询问哪些文件/目录），步骤 1（分类每个文件），然后是每目标破坏性变更部分。不要总结指南——执行它。如果用户没有指定目标模型，在与范围问题同一轮中询问迁移到哪个模型。 |

---

## 语言检测

在阅读代码示例之前，确定用户使用哪种语言：

1. **查看项目文件**以推断语言：

   - `*.py`、`requirements.txt`、`pyproject.toml`、`setup.py`、`Pipfile` → **Python** — 从 `python/` 阅读
   - `*.ts`、`*.tsx`、`package.json`、`tsconfig.json` → **TypeScript** — 从 `typescript/` 阅读
   - `*.js`、`*.jsx`（无 `.ts` 文件）→ **TypeScript** — JS 使用相同 SDK，从 `typescript/` 阅读
   - `*.java`、`pom.xml`、`build.gradle` → **Java** — 从 `java/` 阅读
   - `*.kt`、`*.kts`、`build.gradle.kts` → **Java** — Kotlin 使用 Java SDK，从 `java/` 阅读
   - `*.scala`、`build.sbt` → **Java** — Scala 使用 Java SDK，从 `java/` 阅读
   - `*.go`、`go.mod` → **Go** — 从 `go/` 阅读
   - `*.rb`、`Gemfile` → **Ruby** — 从 `ruby/` 阅读
   - `*.cs`、`*.csproj` → **C#** — 从 `csharp/` 阅读
   - `*.php`、`composer.json` → **PHP** — 从 `php/` 阅读

2. **如果检测到多种语言**（例如同时有 Python 和 TypeScript 文件）：

   - 检查用户当前文件或问题与哪种语言相关
   - 如果仍有歧义，询问："我检测到 Python 和 TypeScript 文件。你在 Claude API 集成中使用哪种语言？"

3. **如果无法推断语言**（空项目、无源文件或不支持的语言）：

   - 使用 AskUserQuestion 提供选项：Python、TypeScript、Java、Go、Ruby、cURL/原始 HTTP、C#、PHP
   - 如果 AskUserQuestion 不可用，默认使用 Python 示例并注明："显示 Python 示例。如果你需要其他语言请告诉我。"

4. **如果检测到不支持的语言**（Rust、Swift、C++、Elixir 等）：

   - 建议从 `curl/` 使用 cURL/原始 HTTP 示例，并注明社区 SDK 可能存在
   - 提供 Python 或 TypeScript 示例作为参考实现

5. **如果用户需要 cURL/原始 HTTP 示例**，从 `curl/` 阅读。

### 语言特定功能支持

上述每种 SDK 语言都支持 beta 工具运行器和托管代理（beta）——Python（`@beta_tool` 装饰器）、TypeScript（`betaZodTool` + Zod）、Java（注解类）、Go（`toolrunner` 包中的 `BetaToolRunner`）、Ruby（`BaseTool` + `tool_runner`）、C#（`BetaToolRunner` + 原始 JSON schema）、PHP（`BetaRunnableTool` + `toolRunner()`）；代码入口点在下方工具使用模式快速参考中。cURL 是原始 HTTP（无 SDK 功能）并支持托管代理。

> **托管代理代码示例**：参见下方 `## 托管代理（Beta）` 部分中的阅读指南。

---

## 应该使用哪个接口？

> **从简单开始。** 默认使用满足需求的最简单层级。单次 API 调用和工作流处理大多数用例——只有当任务真正需要开放式、模型驱动的探索时才使用代理。"最简单"意味着你拥有的最少代码：对于托管、定时或记忆支持的代理，托管代理通常是最简单的选项（无循环代码、无状态文件、无调度器），即使它是更大的平台。

| 用例 | 层级 | 推荐接口 | 原因 |
| ----------------------------------------------- | --------------- | ------------------------- | ------------------------------------------------------------ |
| 分类、摘要、提取、问答 | 单次 LLM 调用 | **Claude API** | 一个请求，一个响应 |
| 批处理或嵌入 | 单次 LLM 调用 | **Claude API** | 专用端点 |
| 代码控制逻辑的多步管道 | 工作流 | **Claude API + 工具使用** | 你编排循环 |
| 带自定义工具的代理 | 代理 | **Claude API + 工具使用** | 最大灵活性 |
| 服务端管理的有状态代理与工作区 | 代理 | **托管代理** | Anthropic 运行循环并托管工具执行沙箱 |
| 持久化、版本化的代理配置 | 代理 | **托管代理** | 代理是存储的对象；会话固定到版本 |
| 带文件挂载的长时间运行多轮代理 | 代理 | **托管代理** | 每会话容器、SSE 事件流、技能 + MCP |
| 按计划运行的代理（cron、"每晚"） | 代理 | **托管代理** — 定时部署 | 部署自主触发会话；无需客户端调度器 |

> **注意：** 当你想让 Anthropic 运行代理循环*并*托管工具执行的容器时，托管代理是正确选择——文件操作、bash、代码执行都在每会话工作区中运行。如果你想自己托管计算或运行自己的自定义工具运行时，Claude API + 工具使用是正确选择——使用工具运行器进行代理循环——其每轮钩子仍然给你审批门控、日志记录、错误拦截和条件执行（参见 `shared/tool-use-concepts.md`）——或当你想自己拥有整个循环时使用手动循环。

> **云提供商访问。** **AWS 上的 Claude 平台**由 Anthropic 运营，具有同日 API 对等——参见 `shared/claude-platform-on-aws.md` 了解客户端设置。有关 **AWS 上的 Claude 平台**、**Amazon Bedrock**、**Google Vertex AI** 和 **Microsoft Foundry** 的每功能可用性，参见 `shared/platform-availability.md`——该表是本技能中的唯一真实来源；不要从其他地方推断可用性。

### 构建代理：四种方法

一旦你确定实际需要代理（开放式、模型驱动的工具使用），有四种不同的构建方式。两个独立问题将它们分开：**谁提供框架**（代理循环 + 上下文管理）和**谁提供部署**（代理运行的基础设施）。工具运行器和 Claude 代理 SDK 都**只提供框架**——你仍然自己托管和部署——这就是为什么它们容易混淆。托管代理（CMA）是唯一同时提供**框架**和*托管部署*的选项；手动循环两者都不提供。

| # | 方法 | 你编写 | 框架和部署 | 可用工具 | 使用时机 |
|---|----------|-----------|----------------------|-----------------|----------|
| 1 | **Claude API — 手动循环** | `while stop_reason == "tool_use"` 循环 | 你构建框架；你托管 | 仅你定义的工具 | 你想拥有*整个*循环——无 beta 依赖，或工具运行器的每轮钩子不适合的控制流 |
| 2 | **Claude API — 工具运行器**（`client.beta.messages.tool_runner` + `@beta_tool` / `betaZodTool`） | 仅工具函数 | SDK 提供循环（**仅框架**）；你托管 | 仅你定义的工具 | 无需手写循环的自定义工具代理（大多数情况）。每轮钩子仍然给你审批门控、错误拦截、结果修改（例如 `cache_control`）、重试、流式传输和压缩 |
| 3 | **托管代理**（REST，beta） | 代理配置 + 你的工具结果 | Anthropic 提供框架**并**托管每会话沙箱（**框架 + 部署**） | Anthropic 托管沙箱（bash、文件、代码执行）+ 技能/MCP + 你的工具 | 你想让 Anthropic 运行循环*并*托管每会话工作区；持久化/版本化配置；长时间运行会话 |
| 4 | **Claude 代理 SDK** — *独立产品*（`claude-agent-sdk` / `@anthropic-ai/claude-agent-sdk`） | 提示词 + 选项 | SDK 提供 Claude Code 框架 + 内置工具（**仅框架**）；你托管 | 内置 Read/Write/Edit/Bash/Glob/Grep/WebSearch/WebFetch + MCP + 子代理 | 你想在自有基础设施上运行电池齐全的编码/文件系统代理 |

框架/部署分离是关键心智模型：选项 1、2 和 4 都**将部署留给你**；只有选项 3（CMA）添加托管部署。选项 1-3 是本技能生成的；选项 4 是具有自己文档的不同库——参见下方消歧义。

> **工具运行器 ≠ Claude 代理 SDK。** 这些听起来相似但是不同的包：
> - **工具运行器**是常规 Anthropic API SDK（`anthropic` / `@anthropic-ai/sdk`）的一部分，通过 `client.beta.messages.tool_runner` 访问。它自动化*你定义的工具*的请求 → 执行 → 循环。没有内置工具、没有文件系统访问、没有沙箱——你提供每个工具并托管计算。它是上方的选项 2，是 `POST /v1/messages` 上的薄辅助层。
> - **Claude 代理 SDK**（`claude-agent-sdk` / `@anthropic-ai/claude-agent-sdk`）是作为库打包的 Claude Code。它附带内置工具（文件读/写/编辑、bash、grep、网页搜索）、完整代理循环、上下文管理、钩子、子代理、权限和会话。你调用 `query(prompt, options)` 它驱动一切。
>
> 两者都是**仅框架——你托管和部署。** 区别在于框架范围：工具运行器循环*你*定义的工具（带有审批、拦截、结果修改和重试的每轮钩子——但没有内置工具）；代理 SDK 是带内置工具的完整 Claude Code 框架。两者都不提供托管部署——那是**托管代理（CMA）**添加的（Anthropic 托管循环和每会话沙箱）。
>
> **本技能涵盖 Claude API 和托管代理（选项 1-3）；它不生成 Claude 代理 SDK 代码。** 如果用户实际想要 Claude 代理 SDK，指向其文档（`code.claude.com/docs/en/agent-sdk`）——不要用 API 工具运行器替代它，反之亦然。

### 我应该构建代理吗？

在选择代理层级之前，检查所有四个标准：

- **复杂性** — 任务是否多步且难以提前完全指定？（例如"将此设计文档变成 PR" vs "从此 PDF 中提取标题"）
- **价值** — 结果是否证明更高的成本和延迟是合理的？
- **可行性** — Claude 是否擅长此类任务？
- **错误成本** — 错误是否可以被捕获和恢复？（测试、审查、回滚）

如果任何一个答案是"否"，保持在更简单的层级（单次调用或工作流）。

---

## 架构

一切都通过 `POST /v1/messages`。工具和输出约束是此单端点的功能——不是独立 API。

**用户定义的工具** — 你定义工具（通过装饰器、Zod schema 或原始 JSON），SDK 的工具运行器处理调用 API、执行你的函数和循环直到 Claude 完成。为了完全控制，你可以手动编写循环。

**服务端工具** — 在 Anthropic 基础设施上运行的 Anthropic 托管工具。代码执行完全在服务端（在 `tools` 中声明，Claude 自动运行代码）。计算机使用可以是服务端托管或自托管。

**结构化输出** — 约束 Messages API 响应格式（`output_config.format`）和/或工具参数验证（`strict: true`）。推荐方法是 `client.messages.parse()` 自动验证响应是否符合你的 schema。注意：旧的 `output_format` 参数已弃用；在 `messages.create()` 上使用 `output_config: {format: {...}}`。

**辅助端点** — 批次（`POST /v1/messages/batches`）、文件（`POST /v1/files`）、令牌计数（`POST /v1/messages/count_tokens`——参见 `shared/token-counting.md`）和模型（`GET /v1/models`、`GET /v1/models/{id}`——实时能力/上下文窗口发现）馈入或支持 Messages API 请求。

---

## 当前模型（缓存：2026-06-24）

| 模型 | 模型 ID | 上下文 | 输入 $/1M | 输出 $/1M |
| ----------------- | ------------------- | -------------- | ---------- | ----------- |
| {{FABLE_NAME}} | `{{FABLE_ID}}` | 1M | $10.00 | $50.00 |
| {{MYTHOS_NAME}}（仅限 Project Glasswing） | `{{MYTHOS_ID}}` | 1M | $10.00 | $50.00 |
| Claude Opus 4.8 | `claude-opus-4-8` | 1M | $5.00 | $25.00 |
| Claude Opus 4.7 | `claude-opus-4-7` | 1M | $5.00 | $25.00 |
| Claude Opus 4.6 | `claude-opus-4-6` | 1M | $5.00 | $25.00 |
| Claude Sonnet 5 | `claude-sonnet-5` | 1M | $3.00（$2.00 介绍价至 2026-08-31） | $15.00（$10.00 介绍价） |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | 1M | $3.00 | $15.00 |
| Claude Haiku 4.5 | `claude-haiku-4-5` | 200K | $1.00 | $5.00 |

**始终使用 `{{OPUS_ID}}` 除非用户明确指定不同模型。** 这是不可协商的。不要使用 `{{SONNET_ID}}`、`{{PREV_SONNET_ID}}` 或任何其他模型，除非用户明确说"use sonnet"或"use haiku"。永远不要为了成本而降级——那是用户的决定，不是你的。仅当用户明确要求 {{FABLE_NAME}}、"fable"或 Anthropic 最强大的模型时使用 `{{FABLE_ID}}`——它具有与 Opus 系列不同的 API 行为（参见下方）和超过 Opus 层级的定价。**仅使用表中的精确模型 ID 字符串——它们是完整的；永远不要追加日期后缀**（`claude-sonnet-4-6`，永远不是 `claude-sonnet-4-6-20251114` 或你可能从训练数据中记得的任何其他日期后缀变体）。如果用户请求表中不在的旧模型（例如"opus 4.5"、"sonnet 3.7"），阅读 `shared/models.md` 获取精确 ID——不要自己构造。

### {{FABLE_NAME}}（`{{FABLE_ID}}`）— 最强大的广泛发布模型

{{FABLE_NAME}} 是 Anthropic 最强大的广泛发布模型，适用于最苛刻的推理和长期代理工作；以下也适用于 **{{MYTHOS_NAME}}**（`{{MYTHOS_ID}}`，Project Glasswing——相同的能力、定价和 API 接口；仅限邀请的 `claude-mythos-preview` 的继任者）。1M 上下文窗口（最大值也是默认值），128K 最大输出。与 Opus 层级的关键 API 差异——参见 `shared/model-migration.md` → 迁移到 {{FABLE_NAME}} 了解详情：

- **思考始终开启** — 完全省略 `thinking` 参数（或发送 `{type: "adaptive"}`）。任何其他显式配置都会被拒绝：`{type: "disabled"}` 和 `{type: "enabled", budget_tokens: N}` 都返回 400。通过 `output_config.effort` 控制深度（支持 `low` 到 `xhigh` 和 `max`）。
- **原始思维链永不返回** — 响应携带常规 `thinking` 块（不是 `redacted_thinking`）：`display: "summarized"` 返回可读摘要，`"omitted"`（默认）将 `thinking` 字段留为空字符串。重放规则：在同一模型上原样传回思考块；其他模型静默丢弃它们（不计费——没有东西需要剥离）；详情在 `shared/model-migration.md` 中。
- **分词器** — 与 Opus 4.8 相同的分词器（随 Opus 4.7 引入）。从 Opus 4.7/4.8 迁移时分词计数大致不变；每 token 定价不同。来自 Opus 4.6、Sonnet、Haiku 或更旧版本，使用 `count_tokens` 重新基准（Opus 4.7 分词器使用约 1×–1.35× 倍的 token）。
- **`refusal` 停止原因——处理它，并默认选择回退** — 安全分类器可能拒绝请求（HTTP 200，`stop_reason: "refusal"`，带有 `stop_details` 类别）；在读取 `content` 之前始终检查 `stop_reason`。**当你编写 `{{FABLE_ID}}` 代码时，默认包含服务端 `fallbacks` 参数**（`betas: ["server-side-fallback-2026-06-01"]` + `fallbacks: [{"model": "{{OPUS_ID}}"}]`；Claude API 和 AWS 上的 Claude 平台——其他地方，包括 Bedrock/Vertex/Foundry，使用 SDK 的客户端 `BetaRefusalFallbackMiddleware` + `BetaFallbackState`）。告诉用户你已启用它；仅在他们拒绝时才移除。完整语义（计费、流中途拒绝、积分重新定价）在 `shared/model-migration.md` → 拒绝部分；代码示例在 `{lang}/claude-api/README.md` § 拒绝回退。
- **无助手预填充** — 与 4.6+ 系列的其余部分相同。
- **需要 30 天数据保留** — {{FABLE_NAME}} 在零数据保留下不可用；保留配置不满足要求的组织请求返回 `400 invalid_request_error`。
- **更长轮次，不同提示策略** — 困难任务的单个请求可能运行很多分钟（计划超时/流式传输/进度 UX）；努力扫描应包括常规工作的 low/medium；为旧模型编写的提示词通常过于规定性并降低输出质量。参见 `shared/model-migration.md` → 迁移到 {{FABLE_NAME}} → 行为变化（提示可调）获取推荐的提示片段。

如果以上任何模型字符串看起来不熟悉，那只是意味着它们在你训练数据截止日期之后发布——它们是真实模型。

**实时能力查找：** 上表是缓存的。当用户询问"X 的上下文窗口是多少"、"X 是否支持 vision/thinking/effort"或"哪些模型支持 Y"时，查询 Models API（`client.models.retrieve(id)` / `client.models.list()`）——参见 `shared/models.md` 了解字段参考和能力过滤示例。

---

## 认证（快速参考）

**未设置的 `ANTHROPIC_API_KEY` 不意味着没有凭证。** SDK 和 `ant` CLI 按以下顺序解析凭证（首次匹配获胜）：`ANTHROPIC_API_KEY` → `ANTHROPIC_AUTH_TOKEN` → `ANTHROPIC_PROFILE` 选择的或活跃的 OAuth 配置文件（来自 `ant auth login`）→ 工作负载身份联合环境变量 → 磁盘上的默认配置文件。在 `ant auth login` 之后，零参数客户端构造函数和每个 `ant …` 子命令自动获取配置文件——无需环境变量。

**当你需要调用 API 且 `ANTHROPIC_API_KEY` 未设置时，不要向用户要密钥。** 首先运行 `ant auth status`——它显示哪个凭证源和配置文件是活跃的。如果它报告活跃配置文件：

- **SDK 代码或 `ant` CLI：** 直接运行。零参数客户端构造函数和每个 `ant …` 子命令自动获取配置文件——无需环境变量。
- **原始 `curl` / HTTP：** 用 `ant auth print-credentials --access-token` 获取短期令牌并作为 `Authorization: Bearer <token>` 发送，**加上**头 `anthropic-beta: oauth-2025-04-20`（OAuth 令牌放在 `Authorization: Bearer` 上，不是 `x-api-key:`——从 API 密钥转换 curl 是头的更改，不是密钥的替换）。始终传递 `--access-token`；无标志形式打印 JSON，不是裸令牌。

仅当 `ant auth status` 报告没有活跃凭证源（或 `ant` 本身未安装）时才向用户要密钥。建议 `ant auth login` 作为首选——它在 `~/.config/anthropic/` 下存储 SDK 自动读取的配置文件——导出的 `ANTHROPIC_API_KEY` 作为替代。

完整认证详情（命名配置文件、作用域、API 密钥遮蔽配置文件陷阱、刷新令牌过期）：`shared/anthropic-cli.md`。

---

## 思考与努力（快速参考）

在每个当前模型上使用自适应思考（`thinking: {type: "adaptive"}`）——Claude 动态决定何时以及思考多少。每模型规则：

| 模型 | 思考配置 | 省略 `thinking` | `budget_tokens` | 采样（`temperature`/`top_p`/`top_k`） | 努力级别 |
|---|---|---|---|---|---|
| Fable 5 | `{type: "adaptive"}` 或省略；显式 `{type: "disabled"}` 返回 400——改为省略参数 | 运行自适应（思考始终开启） | 已移除——`{type: "enabled", budget_tokens: N}` 返回 400 | 已移除——400 | `low`/`medium`/`high`/`xhigh`/`max` |
| Opus 4.8 / 4.7 | `{type: "adaptive"}` 是唯一的开启模式；接受 `{type: "disabled"}` | **不**带思考运行——显式设置 `{type: "adaptive"}` | 已移除——400 | 已移除——400 | `low`/`medium`/`high`/`xhigh`/`max` |
| Sonnet 5 | `{type: "adaptive"}` 是唯一的开启模式；接受 `{type: "disabled"}` | 运行自适应 | 已移除——400 | 已移除——400 | `low`/`medium`/`high`/`xhigh`/`max` |
| Opus 4.6 / Sonnet 4.6 | `{type: "adaptive"}`（推荐；自动启用交错思考，无 beta 头） | 显式设置 `{type: "adaptive"}` | 已弃用——不要在新代码中使用；仅为过渡逃生口（参见下方） | 允许 | `low`/`medium`/`high`/`max`（`xhigh` 随 Opus 4.7 到来） |
| 旧版（Sonnet 4.5、Haiku 4.5 等）——仅在明确要求时 | `{type: "enabled", budget_tokens: N}` | 无思考 | 思考必填；必须小于 `max_tokens`，最小 1024——否则报错 | 允许 | `effort` 在 Opus 4.5 上可用（仅 `low`/`medium`/`high`——无 `xhigh`/`max`）；在 Sonnet 4.5 / Haiku 4.5 上报错 |

Opus 4.8 保持与 4.7 相同的请求接口（无新的破坏性变更）——参见 `shared/model-migration.md` → 迁移到 Opus 4.8 了解行为重新调优，→ 迁移到 Opus 4.7 了解从 4.6 或更早版本迁移时的完整破坏性变更列表。在 `thinking` 禁用的情况下，Opus 4.8 可能将更长的推理写入可见响应——保持自适应思考开启，或添加仅最终答案指令（参见迁移指南）。

- **努力（GA，无 beta 头）：** `output_config: {effort: "low"|"medium"|"high"|"xhigh"|"max"}` — 在 `output_config` 内，不是顶级；默认 `high`（等同于省略）。控制思考深度和总体 token 消耗；与自适应思考结合以获得最佳成本-质量权衡。`xhigh`（在 Opus 4.7 上添加，介于 `high` 和 `max` 之间）是 Fable 5 / Opus 4.7/4.8 / Sonnet 5 上大多数编码和代理用例的最佳设置，也是 Claude Code 中的默认值；努力在这些模型上比在同层级的任何旧模型上更重要——迁移时重新调优，并以 `high`/`xhigh` 运行长期/代理任务并在开始时给出完整任务规范。对智能敏感的工作使用至少 `high`，正确性比成本重要时使用 `max`，子代理或简单任务使用 `low`——更低的努力意味着更少和更合并的工具调用、更少的前言和更简洁的确认（`high` 通常是平衡质量和 token 效率的最佳点）。
- **思考显示——Fable 5 / Mythos 5 / Opus 4.8 / 4.7 / Sonnet 5 上默认 `"omitted"`：** `display: "summarized"` 返回推理的可读摘要；`"omitted"`（所有五个上的默认——从 Opus 4.6 和 Sonnet 4.6 的静默变更，那里是 `"summarized"`）流式传输空文本的 `thinking` 块。`display` 仅控制可见性——思考在任何设置下都发生并计费相同；原始思维链在任何模型上都不暴露。如果你将推理流式传输给用户，默认看起来像输出前的长暂停——显式设置 `thinking: {type: "adaptive", display: "summarized"}`。（独立于显示，在同一模型上继续时原样回显思考块；其他模型静默忽略它们——参见迁移指南。）
- **当用户要求"扩展思考"、"思考预算"或 `budget_tokens` 时：** 始终使用 Fable 5、Opus 4.8、4.7 或 4.6 配合 `thinking: {type: "adaptive"}` ——固定思考 token 预算概念已弃用，自适应思考替代它。不要为新 4.6/4.7/4.8 代码使用 `budget_tokens`，也不要仅因为用户提到就切换到旧模型。*逐步迁移例外：* `budget_tokens` 仅在 Opus 4.6 和 Sonnet 4.6 上仍然可用，作为已有代码需要硬 token 上限但在调优 `effort` 之前的过渡逃生口——参见 `shared/model-migration.md` → 过渡逃生口。它在 Fable 5、Opus 4.7/4.8 和 Sonnet 5 上已完全移除。

---

## 压缩（快速参考）

**Beta，Fable 5、Opus 4.8、Opus 4.7、Opus 4.6、Sonnet 5 和 Sonnet 4.6。** 对于可能超过 1M 上下文窗口的长时间对话，启用服务端压缩。当 API 接近触发阈值（默认：150K token）时自动摘要早期上下文。需要 beta 头 `compact-2026-01-12`。

**关键：** 每轮将 `response.content`（不仅仅是文本）追加回你的消息。响应中的压缩块必须保留——API 使用它们在下一个请求上替换压缩的历史。仅提取文本字符串并追加会静默丢失压缩状态。

参见 `{lang}/claude-api/README.md`（压缩部分）了解代码示例。完整文档通过 `shared/live-sources.md` 中的 WebFetch。

---

## 提示缓存（快速参考）

**前缀匹配。** 前缀中任何位置的任何字节变更都会使之后的所有内容失效。渲染顺序是 `tools` → `system` → `messages`。将稳定内容放在前面（冻结的系统提示词、确定性工具列表），将易变内容（时间戳、每请求 ID、变化的问题）放在最后一个 `cache_control` 断点之后。

**对话中途操作者指令**（仅限 {{OPUS_NAME}}；无 beta 头）：将 `{"role": "system", ...}` 追加到 `messages[]` 而非编辑顶级 `system`。保留缓存的历史前缀，并且是提示注入安全的操作者通道。参见 `shared/prompt-caching.md` § 对话中途系统消息。

**顶级自动缓存**（`messages.create()` 上的 `cache_control: {type: "ephemeral"}`）是当你不需要精细放置时最简单的选项。每个请求最多 4 个断点。最小可缓存前缀约 1024 token——更短的前缀静默不缓存。

**用 `usage.cache_read_input_tokens` 验证** — 如果在重复请求中为零，则有静默失效因素在工作（系统提示词中的 `datetime.now()`、未排序的 JSON、变化的工具集）。

放置模式、架构指导和静默失效因素审计清单：阅读 `shared/prompt-caching.md`。语言特定语法：`{lang}/claude-api/README.md`（提示缓存部分）。

---

## 快速模式（快速参考）

**研究预览，仅限 Opus 4.8 / 4.7。** Opus 4.7 快速模式已弃用——移除后，4.7 上的 `speed: "fast"` 返回错误。Opus 4.8 是持久的快速能力层级。快速模式以高达 2.5 倍的更高输出 token/秒运行相同模型，按溢价定价。每个请求需要三件事：使用 **beta** messages 端点（`client.beta.messages.…`），传递 beta 标志 `fast-mode-2026-02-01`，并设置 `speed: "fast"` 作为顶级请求参数（不是头，不在 `extra_body` 中）。

```python
client.beta.messages.create(
    model="claude-opus-4-8", max_tokens=4096,
    speed="fast", betas=["fast-mode-2026-02-01"],
    messages=[...],
)
```

| 语言 | Beta 标志 | 速度参数 |
|---|---|---|
| Python | `betas=["fast-mode-2026-02-01"]` | `speed="fast"` |
| TypeScript / Ruby | `betas: ["fast-mode-2026-02-01"]` | `speed: "fast"` |
| Go | `[]anthropic.AnthropicBeta{anthropic.AnthropicBetaFastMode2026_02_01}` | `Speed: anthropic.BetaMessageNewParamsSpeedFast` |
| Java | `.addBeta(AnthropicBeta.FAST_MODE_2026_02_01)` | `.speed(MessageCreateParams.Speed.FAST)` |
| C# | `Betas = ["fast-mode-2026-02-01"]` | `Speed = Speed.Fast`（`Anthropic.Models.Beta.Messages`） |
| PHP | `betas: ['fast-mode-2026-02-01']` | `speed: 'fast'` |
| cURL | `anthropic-beta: fast-mode-2026-02-01` 头 | 正文中的 `"speed": "fast"` |

`response.usage.speed` 报告使用了哪种速度。快速模式有独立于标准 Opus 的速率限制；在 429 时，在 `retry-after` 延迟后重试或移除 `speed` 回退到标准（注意：切换速度使提示缓存失效）。不可用于 Batch API、优先层级、AWS 上的 Claude 平台或第三方平台。

---

## 任务预算（快速参考）

**Beta，Fable 5 / Sonnet 5 / Opus 4.8 / 4.7。** 任务预算给 Claude 一个代理循环的 token 上限，使其自行调节节奏并优雅完成，而非被截断——与 `max_tokens` 不同，后者是模型不知道的强制每响应上限。最小 `total`：20,000。在 `client.beta.messages.stream(...)` 上设置 `task_budget` 在 `output_config` 内，配合 beta 标志 `task-budgets-2026-03-13`——使用流式传输以避免大 `max_tokens` 触发 HTTP 超时（完整详情：`shared/model-migration.md` → 任务预算）：

```python
with client.beta.messages.stream(
    model="claude-opus-4-8", max_tokens=128000,
    output_config={"effort": "high", "task_budget": {"type": "tokens", "total": 64000}},
    betas=["task-budgets-2026-03-13"],
    messages=[...], tools=[...],
) as stream:
    response = stream.get_final_message()
```

`task_budget` 字段：`type`（始终为 `"tokens"`）、`total`，以及可选 `remaining`（默认为 `total`）。服务器注入 Claude 在生成过程中看到的倒计时标记；预算计算 Claude 生成的内容和它在此轮读取的工具结果——**不是**你每次请求重新发送的完整历史。

**观察消耗：** 如果你想在显示进度，跨循环迭代累加 `response.usage.output_tokens`（加上你追加的工具结果块的 token 计数）。在正常循环中不设置 `remaining`——服务器自己跟踪倒计时，在同时传递客户端计算的 `remaining` 并重新发送完整历史时会少报预算。**仅在**你在请求之间压缩或重写历史且服务器无法再推导先前消耗时才传递 `remaining`。

---

## 提供商客户端（快速参考）

当在第三方平台上使用 Claude 时，使用该平台的专用客户端类——不是带 `base_url` 覆盖的第一方 `Anthropic()` 客户端。构造后，客户端暴露与第一方 SDK 相同的 `messages.create` / `.stream` 接口。

### Amazon Bedrock

使用 **Mantle** 客户端（Messages API Bedrock 端点）。Bedrock 模型 ID 使用 `anthropic.` 前缀（例如 `"anthropic.{{OPUS_ID}}"`）。区域为必填。

| 语言 | 客户端 |
|---|---|
| Python | `from anthropic import AnthropicBedrockMantle` → `AnthropicBedrockMantle(aws_region="…")` |
| TypeScript | `import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk"` → `new AnthropicBedrockMantle({ awsRegion: "…" })` |
| Go | `bedrock.NewMantleClient(ctx, bedrock.MantleClientConfig{ AWSRegion: "…" })` |
| Java | `AnthropicOkHttpClient.builder().backend(BedrockMantleBackend.fromEnv()).build()`（来自 `com.anthropic.bedrock.backends`） |
| C# | `new AnthropicBedrockMantleClient(new() { AwsRegion = "…" })`（包 `Anthropic.Bedrock`） |
| PHP | `use Anthropic\Bedrock\MantleClient;` → `new MantleClient(awsRegion: '…')` |
| Ruby | `Anthropic::BedrockMantleClient.new(aws_region: "…")` |

`AnthropicBedrock` / `BedrockClient` / `BedrockBackend`（不带 `Mantle`）是旧的 `bedrock-runtime` InvokeModel 路径——新代码优先使用 Mantle 客户端。

### Microsoft Foundry

| 语言 | 客户端 |
|---|---|
| Python | `from anthropic import AnthropicFoundry` → `AnthropicFoundry(api_key=…, resource="…")` |
| TypeScript | `import AnthropicFoundry from "@anthropic-ai/foundry-sdk"` → `new AnthropicFoundry({ … })` |
| Java | `AnthropicOkHttpClient.builder().backend(FoundryBackend.fromEnv()).build()`（来自 `com.anthropic.foundry.backends`） |
| C# | `new AnthropicFoundryClient(new AnthropicFoundryApiKeyCredentials(…))`（包 `Anthropic.Foundry`） |
| PHP | `Foundry\Client::withCredentials(…)` |

Go 和 Ruby SDK 目前不支持 Foundry。对于 Ruby，使用标准 `Anthropic::Client.new(base_url: "<foundry endpoint>")` 作为回退（Entra ID 认证不内置）。对于 AWS 上的 Claude 平台，参见 `shared/claude-platform-on-aws.md`。

### Google Cloud Vertex AI

两个必填构造参数：GCP `project_id` 和 `region`。Vertex 模型 ID **不带前缀**——当前代模型（Opus 4.8/4.7/4.6、Sonnet 5、Sonnet 4.6）使用裸第一方 ID（例如 `"{{OPUS_ID}}"`）；日期快照模型使用 `@` 版本分隔符（例如 `claude-opus-4-5@20251101`，**不是** `claude-opus-4-5-20251101`）。认证为 GCP ADC（`gcloud auth application-default login`）；无需 Anthropic API 密钥。`region` 可以是 `"global"`（推荐）、多区域（`"us"`/`"eu"`）或特定区域。构造后，使用相同的 `messages.create` / `.stream` 接口。

| 语言 | 客户端 |
|---|---|
| Python | `from anthropic import AnthropicVertex` → `AnthropicVertex(project_id="…", region="…")`（安装 `"anthropic[vertex]"`） |
| TypeScript | `import { AnthropicVertex } from "@anthropic-ai/vertex-sdk"` → `new AnthropicVertex({ projectId, region })` |
| Go | `import "github.com/anthropics/anthropic-sdk-go/vertex"` → `anthropic.NewClient(vertex.WithGoogleAuth(ctx, region, projectID))` |
| Java | `AnthropicOkHttpClient.builder().backend(VertexBackend.builder().region("…").project("…").build()).build()`（来自 `com.anthropic.vertex.backends`） |
| C# | `new AnthropicClient { Backend = new VertexBackend(projectId, region) }`（包 `Anthropic.Vertex`） |
| PHP | `use Anthropic\Vertex;` → `Vertex\Client::fromEnvironment(location: '…', projectId: '…')` — 注意是 `location`，不是 `region` |
| Ruby | `Anthropic::VertexClient.new(region: "…", project_id: "…")` |

---

## 上下文编辑（快速参考）

**Beta。** 上下文编辑在模型看到之前**清除**对话中的旧工具结果或思考块；它**不是压缩**（压缩是摘要）。在 `client.beta.messages.*` 上配合 beta `context-management-2025-06-27`，传递 `context_management.edits` 及策略类型：

```python
client.beta.messages.create(
    model="{{OPUS_ID}}", max_tokens=4096,
    betas=["context-management-2025-06-27"],
    context_management={"edits": [{"type": "clear_tool_uses_20250919"}]},
    tools=[...], messages=[...],
)
```

策略类型：`clear_tool_uses_20250919`（清除旧工具结果；可选 `clear_tool_inputs: true` 也清除 tool_use 参数）和 `clear_thinking_20251015`（清除思考块）。**不要**使用 `compact_20260112` 或 beta `compact-2026-01-12`——那些是独立的压缩功能。

---

## 对话中途系统消息（快速参考）

**仅限 {{OPUS_NAME}}；无 beta 头。** 将 `{"role": "system", "content": "…"}` 追加到 `messages` 数组（不是顶级 `system` 字段）以在对话中途添加操作者指令而不使缓存前缀失效。使用常规 `client.messages.create`——没有 beta。对话中途系统消息必须在 `user` 消息之后（或以服务端工具使用结束的 `assistant` 消息之后），且必须是 `messages` 中的最后一个条目或后面跟 `assistant` 轮次——它不能是 `messages[0]`。可用性：`shared/platform-availability.md`。参见 `shared/prompt-caching.md` § 对话中途系统消息。

---

## 托管代理（Beta）

**托管代理**是第三方接口：服务端管理的有状态代理，Anthropic 托管工具执行。你创建持久化、版本化的代理配置（`POST /v1/agents`），然后启动引用它的会话。每个会话配置一个容器作为代理的工作区——bash、文件操作和代码执行在那里运行；代理循环本身在 Anthropic 的编排层运行并通过工具操作容器。会话流式传输事件；你发回消息和工具结果。

可用性：`shared/platform-availability.md`。对于 Bedrock / Vertex / Foundry 上的代理（不支持托管代理），使用 Claude API + 工具使用。

**强制流程：** 代理（一次性）→ 会话（每次运行）。`model`/`system`/`tools` 在代理上，永远不在会话上。参见 `shared/managed-agents-overview.md` 了解完整阅读指南、beta 头和陷阱。

**Beta 头：** `managed-agents-2026-04-01` — SDK 会为所有 `client.beta.{agents,environments,sessions,vaults,memory_stores,deployments,deployment_runs}.*` 调用自动设置。技能 API 使用 `skills-2025-10-02`，文件 API 使用 `files-api-2025-04-14`，但你不需要在 `/v1/skills` 和 `/v1/files` 以外的端点显式传递它们。

**子命令** — 通过 `/claude-api <子命令>` 直接调用：

| 子命令 | 操作 |
|---|---|
| `managed-agents-onboard` | 引导用户从头设置托管代理。**立即阅读 `shared/managed-agents-onboarding.md`** 并遵循其访谈脚本：**描述 → 配置代理（提议，不要审问）→ 环境 → 会话**（与 Console 快速入门相同的流程，认证延迟到会话步骤）——默认值和内联建议完成工作，在发出任何代码之前有静默可行性门控（工作 vs 工具/凭证/数据）。不要总结——运行访谈。 |

**阅读指南：** 从 `shared/managed-agents-overview.md` 开始，然后是主题性的 `shared/managed-agents-*.md` 文件（核心、环境、工具、事件、结果、多代理、webhook、记忆、定时部署、客户端模式、入门、API 参考）。对于 Python、TypeScript、Go、Ruby、PHP 和 Java，阅读 `{lang}/managed-agents/README.md` 了解代码示例。对于 cURL，阅读 `curl/managed-agents.md`。**代理是持久的——创建一次，通过 ID 引用。** 将代理和环境定义为版本控制的 YAML 并通过 `ant` CLI 应用——这是推荐流程（参见 `shared/anthropic-cli.md`）：CLI 负责控制面（创建和更新代理），你的代码负责数据面（`sessions.create` 使用存储的代理 ID）。仅在必须编程式配置时在代码中调用 `agents.create()`；无论哪种方式，存储返回的代理 ID 并传递给每个后续的 `sessions.create`；永远不要在请求路径中调用 `agents.create()`。如果你需要的绑定在语言 README 中没有展示，从 `shared/live-sources.md` WebFetch 相关条目而非猜测。C# 通过 `client.Beta.Agents` 和相关命名空间提供 beta 托管代理支持——参见 `csharp/claude-api/README.md` 了解详情，或 `curl/managed-agents.md` 了解原始 HTTP 参考。

**当用户想从头设置托管代理时**（例如"如何开始"、"引导我创建一个"、"设置新代理"）：阅读 `shared/managed-agents-onboarding.md` 并运行其访谈——与 `managed-agents-onboard` 子命令相同的流程。

**当用户询问"如何编写 X 的客户端代码"时：** 使用 `shared/managed-agents-client-patterns.md` — 涵盖无损流重连、`processed_at` 排队/处理门控、中断、`tool_confirmation` 往返、正确的 idle/terminated 中断门控、idle 后状态竞争、流优先排序、文件挂载注意事项等。对于凭证，优先使用保管库 `environment_variable` 凭证——一等机制；密钥在出口处替换，永远不进入沙箱（`shared/managed-agents-tools.md` → 保管库）。通过自定义工具在主机侧保存密钥是保管库凭证不适用时的回退方案（例如自托管沙箱）。

**当用户想让代理按计划运行时**（cron、"每晚"、"每周报告"）：阅读 `shared/managed-agents-scheduled-deployments.md` — 部署按 cron 节奏自主触发会话，带有每次运行的运行记录和生命周期控制（暂停/恢复/归档）。

---

## 服务端工具（快速参考）

服务端工具在 Anthropic 的基础设施上运行——无客户端执行循环。在 `tools` 中声明；结果作为内容块在同一响应中到达。**无 beta 头**除非注明。**优先使用你的模型支持的最新类型变体。** 下方的 `_20260209` 网页搜索/获取变体（动态过滤）需要 Opus 4.8/4.7/4.6、Sonnet 5 或 Sonnet 4.6；旧版模型的基本变体列在表后。

| 工具 | `type` | `name` | 关键可选参数 | 结果块类型 |
|---|---|---|---|---|
| 网页搜索 | `web_search_20260209` | `web_search` | `max_uses`、`allowed_domains`/`blocked_domains`、`user_location` | `web_search_tool_result` → `.content` 是 `web_search_result` 列表 |
| 网页获取 | `web_fetch_20260209` | `web_fetch` | `max_uses`、`allowed_domains`/`blocked_domains`、`citations`、`max_content_tokens` | `web_fetch_tool_result` → `.content` 是带 `document` 块的 `web_fetch_result` |
| 代码执行 | `code_execution_20260521` | `code_execution` | 无 | `bash_code_execution_tool_result` → `.content.stdout` / `.stderr` / `.return_code` |
| 工具搜索（正则） | `tool_search_tool_regex_20251119` | `tool_search_tool_regex` | 标记其他工具 `defer_loading: true` | `tool_search_tool_result` |
| 工具搜索（BM25） | `tool_search_tool_bm25_20251119` | `tool_search_tool_bm25` | 标记其他工具 `defer_loading: true` | `tool_search_tool_result` |

`web_search_20260209` / `web_fetch_20260209` 内置动态过滤——代码执行在底层运行，因此**不要**在 `tools` 中单独声明 `code_execution`（第二个执行环境使模型困惑）。对于 Opus 4.6 / Sonnet 4.6 之前的模型，使用基本变体 `web_search_20250305` / `web_fetch_20250910`；在 Vertex AI 上仅有基本 `web_search_20250305`。`code_execution_20260120`（REPL 持久化 + 编程式工具调用）在 Opus 4.5+ / Sonnet 4.5+ 上运行。**仅 Go SDK**：`code_execution_20260521` 在 `client.Beta.Messages.New` 下，配合 `Betas: []anthropic.AnthropicBeta{"code-execution-2025-08-25"}`（其他语言使用普通 `client.messages.create`）；`code_execution_20260120` 在 Go 中像其他地方一样使用非 beta 的 `client.Messages.New`。网页获取仅获取对话中已存在的 URL。提供商可用性因工具而异——参见 `shared/platform-availability.md`。参见 `shared/tool-use-concepts.md` 了解 `pause_turn` 处理。

## 文档与文件输入（快速参考）

**PDF（base64，无 beta）：** 用户内容中的 `{"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": <b64 字符串>}}`，放在文本块之前。Base64 字符串不能有换行。限制：32 MB 请求，600 页（200k 上下文模型为 100）。Java：`ContentBlockParam.ofDocument(DocumentBlockParam... Base64PdfSource.builder().data(...))`。

**Files API（beta `files-api-2025-04-14`）：** 通过 `client.beta.files.upload(...)` 上传 → 响应 `id` 是 `file_id`。引用它为 `{"type": "document", "source": {"type": "file", "file_id": "..."}}` 用于 PDF/文本，或 `{"type": "image", ...}` 用于图片——内容块类型必须匹配文件的 MIME 类型。beta 头在上传和引用文件的 `messages.create` 上都需要。可用性：`shared/platform-availability.md`。

**引用（无 beta）：** 在每个 `document` 内容块上设置 `citations: {enabled: true}`（全部或全无）。响应拆分为多个 `text` 块；引用块携带 `citations` 数组。每个引用有 `cited_text`、`document_index`、`document_title` 和按 `type` 的位置：纯文本的 `char_location`（`start_char_index`/`end_char_index`）、PDF 的 `page_location`（`start_page_number`/`end_page_number`，1 索引）、自定义内容的 `content_block_location`。与 `output_config.format` 不兼容（返回 400）。

## 工具使用模式（快速参考）

**严格工具使用（无 beta）：** 在工具定义上设置 `strict: true` 作为顶级字段（与 `name`/`description`/`input_schema` 并列），**不是**在 `tool_choice` 上。Schema 必须有 `additionalProperties: false` + `required`。保证 `tool_use.input` 精确验证。Go：`Strict: anthropic.Bool(true)` + 通过 `InputSchema.ExtraFields` 的 `additionalProperties`；Java：`.strict(true)` + `.putAdditionalProperty("additionalProperties", JsonValue.from(false))`。

**并行工具使用（默认开启）：** 一个助手消息可能包含多个 `tool_use` 块。并发执行它们，然后在**单个** user 消息中返回**所有** `tool_result` 块——将它们分散到多个消息中会静默训练 Claude 停止进行并行调用。对于失败的工具，返回 `tool_result` 配合 `is_error: true`——不要丢弃它。

**工具运行器（SDK beta 辅助）：** 通过 `client.beta.messages.*` 驱动工具调用循环。Python：`@beta_tool` 装饰器 + `client.beta.messages.tool_runner(...)` → `runner.until_done()`。TypeScript：`betaZodTool({...})` 来自 `@anthropic-ai/sdk/helpers/beta/zod` + `client.beta.messages.toolRunner(...)` → `await runner`。Go：`toolrunner.NewBetaToolFromJSONSchema(...)` + `client.Beta.Messages.NewToolRunner(...)` → `.RunToCompletion(ctx)`。Java 需要 `.addBeta("structured-outputs-2025-11-13")`。Ruby：`Anthropic::BaseTool` 子类 + `client.beta.messages.tool_runner(...)`。PHP：`BetaRunnableTool` + `->toolRunner(...)`。C#：原始 JSON schema 工具 + 通过 `client.Beta.Messages.ToolRunner(...)` 的 `BetaToolRunner`。

**编程式工具调用（无 beta 头）：** Claude 从代码执行内部调用你的自定义工具。添加 `{"type": "code_execution_20260120", "name": "code_execution"}` **并**在你的自定义工具上设置 `"allowed_callers": ["code_execution_20260120"]`。Opus 4.5+ / Sonnet 4.5+（可用性：`shared/platform-availability.md`）。响应待处理的编程式调用时，用户消息必须**仅**包含 `tool_result` 块（无文本）。与 `strict: true`、`disable_parallel_tool_use`、强制 `tool_choice` 或 MCP 工具不兼容。

## 其他 API 接口（快速参考）

**消息批次（无 beta；可用性：`shared/platform-availability.md`）：** `client.messages.batches.create(requests=[{custom_id, params}, ...])` → 轮询 `client.messages.batches.retrieve(id).processing_status` 直到 `"ended"` → 流式传输 `client.messages.batches.results(id)`。每个结果有 `.custom_id` + `.result.type`（`succeeded`/`errored`/`canceled`/`expired`）；成功时读取 `.result.message.content`。Python 将请求包装为 `Request(custom_id=..., params=MessageCreateParamsNonStreaming(...))`。结果以**任意顺序**到达——按 `custom_id` 键控，永远不按位置。

**模型 API（无 beta；可用性：`shared/platform-availability.md`）：** `client.models.list()`（自动分页）和 `client.models.retrieve("{{OPUS_ID}}")`。每个模型对象有 `id`、`display_name`、`created_at`，以及——自 2026 年 3 月起——`max_input_tokens`（上下文窗口）、`max_tokens`（输出上限）和 `capabilities`。没有 `context_window` 字段。

**停止详情（GA，Opus 4.7+）：** `response.stop_details` **仅在 `stop_reason == "refusal"` 时填充**（字段：`type: "refusal"`、`category: "cyber"|"bio"|null`、`explanation`）。对于每个其他 `stop_reason`（`end_turn`、`max_tokens`、`tool_use`、`pause_turn` 等）为 `null`——读取前始终检查。

**客户端配置（无 beta）：** `timeout` 默认 10 分钟；**单位因 SDK 而异**——Python/Ruby：秒；TypeScript：**毫秒**；Go `option.WithRequestTimeout(time.Duration)`；Java `Duration`；C# `TimeSpan`。TS 对非流式请求上的大 `max_tokens` 将默认值扩展到 60 分钟；Java 对流式请求这样做（Java 非流式在 30 秒–10 分钟之间缩放）。`max_retries`/`maxRetries` 默认 2（重试 408/409/429/5xx + 连接错误）。`base_url`（或 `ANTHROPIC_BASE_URL` 环境变量）。每请求覆盖：Python `client.with_options(timeout=5.0).messages.create(...)`；TS `client.messages.create({...}, {timeout: 5_000})`；Ruby `request_options: {timeout: 5}`。超时会被重试——挂钟可达 `timeout × (max_retries+1)`。

## 工作负载身份联合（快速参考）

**GA，无 beta 头。** 构造正常的零参数客户端（`Anthropic()` / `new Anthropic()` / `anthropic.NewClient()` / `AnthropicOkHttpClient.fromEnv()`）；SDK 在 `ANTHROPIC_FEDERATION_RULE_ID`、`ANTHROPIC_ORGANIZATION_ID`、`ANTHROPIC_SERVICE_ACCOUNT_ID` 和 `ANTHROPIC_IDENTITY_TOKEN_FILE`（或 `ANTHROPIC_IDENTITY_TOKEN`）**全部**设置时自动检测 WIF，在 `/v1/oauth/token` 交换 JWT 并自动刷新。`ANTHROPIC_WORKSPACE_ID` 不控制激活——仅在联合规则跨多个工作区时需要（否则 400 `workspace_id_required`），对单工作区规则可选。`ANTHROPIC_API_KEY` 或 `ANTHROPIC_AUTH_TOKEN`（即使为空）优先于 WIF，设置的 `ANTHROPIC_PROFILE` 也优先于联合环境变量（缺失的命名配置文件是错误，不是穿透）——取消设置所有三个。

---

## 阅读指南

检测语言后，根据用户需求阅读相关文件。

**所有 SDK 语言使用相同的多文件布局** — 目录 `{lang}/claude-api/` 包含 `README.md`（安装、客户端初始化、基本请求、思考、缓存、停止详情、杂项）、`tool-use.md`（工具定义、代理循环、Anthropic 定义工具、结构化输出）、`streaming.md`、`batches.md`、`files-api.md`。不是每种语言都有每个文件（例如 Ruby 没有 `batches.md`）；如果文件缺失，该功能的示例尚未为该语言文档化——回退到 cURL 形式或从 `shared/live-sources.md` WebFetch SDK 仓库。**cURL** → `curl/examples.md`。

下方快速任务参考使用 `{lang}/claude-api/FILE.md` 路径表示法。

### 快速任务参考

**单次文本分类/摘要/提取/问答：**
→ 仅阅读 `{lang}/claude-api/README.md` — **任何任务都始终先阅读 README**（安装、快速开始、常见模式、错误处理）

**聊天 UI 或实时响应显示：**
→ 阅读 `{lang}/claude-api/README.md` + `{lang}/claude-api/streaming.md`

**长时间对话（可能超过上下文窗口）：**
→ 阅读 `{lang}/claude-api/README.md` — 参见压缩部分
**迁移到更新模型（Fable 5 / Opus 4.8 / Opus 4.7 / Opus 4.6 / Sonnet 5 / Sonnet 4.6），替换已退役模型，或将 `budget_tokens` / 预填充模式转换到当前 API：**
→ 阅读 `shared/model-migration.md`
**提示或调优 Fable 5（长轮次、努力、冗长度、自主运行、子代理）：**
→ 阅读 `shared/model-migration.md` → 迁移到 Fable 5 → 行为变化（提示可调）+ 长时间运行代理推荐
**提示缓存/优化缓存/"为什么我的缓存命中率低"：**
→ 阅读 `shared/prompt-caching.md`（前缀稳定性设计、断点放置、静默使缓存失效的反模式）+ `{lang}/claude-api/README.md`（提示缓存部分）
**计算文件/提示/diff 中的 token（"X 有多少 token"）：**
→ 阅读 `shared/token-counting.md` — 使用 `messages.count_tokens`，永远不用 `tiktoken`

**函数调用/工具使用/代理：**
→ 阅读 `{lang}/claude-api/README.md` + `shared/tool-use-concepts.md`（概念基础：函数调用、代码执行、记忆、结构化输出）+ `{lang}/claude-api/tool-use.md`（语言特定代码示例：工具运行器、手动循环、代码执行、记忆、结构化输出）

**代理设计（工具接口、上下文管理、缓存策略）：**
→ 阅读 `shared/agent-design.md`（bash vs 专用工具、编程式工具调用、工具搜索/技能、上下文编辑 vs 压缩 vs 记忆、缓存原则）

**批处理（非延迟敏感；以 50% 成本异步运行）：**
→ 阅读 `{lang}/claude-api/README.md` + `{lang}/claude-api/batches.md`

**跨多个请求的文件上传（同一文件无需重新上传）：**
→ 阅读 `{lang}/claude-api/README.md` + `{lang}/claude-api/files-api.md`

**调试 HTTP 错误或实现错误处理：**
→ 阅读 `shared/error-codes.md` — 每 SDK 类型化异常类表和 Go `errors.As` 模式

**最新官方文档：**
→ WebFetch `shared/live-sources.md` 中的 URL

**托管代理（服务端管理的有状态代理与工作区）：**
→ 参见上方 `## 托管代理（Beta）` 部分中的阅读指南——它列出每个 `shared/managed-agents-*.md` 文件和语言特定 README（`{lang}/managed-agents/README.md`、`curl/managed-agents.md`）。

---

## 何时使用 WebFetch

在以下情况使用 WebFetch 获取最新文档：

- 用户要求"最新"或"当前"信息
- 缓存数据似乎不正确
- 用户询问此处未涵盖的功能

实时文档 URL 在 `shared/live-sources.md` 中。

## 常见陷阱

- 传递文件或内容给 API 时不要截断输入。如果内容太长无法适应上下文窗口，通知用户并讨论选项（分块、摘要等），而非静默截断。
- **预填充已移除（Fable 5 和 4.6/4.7/4.8 系列）：** 助手消息预填充（最后助手轮次预填充）在 Fable 5、Opus 4.6、Opus 4.7、Opus 4.8 和 Sonnet 4.6 上返回 400 错误。使用结构化输出（`output_config.format`）或系统提示词指令来控制响应格式。（一个例外：回退积分预填充声明——当使用 `fallback_has_prefill_claim: true` 兑换积分时，服务器接受回显的助手消息；参见迁移指南的拒绝部分。）
- **编辑前确认迁移范围：** 当用户要求将代码迁移到更新的 Claude 模型但未指定具体文件、目录或文件列表时，**先询问应用哪个范围**——整个工作目录、特定子目录还是特定文件集。在用户确认之前不要开始编辑。命令式措辞如"迁移我的代码库"、"将我的项目移到 X"、"升级到 Sonnet 4.6"或裸"迁移到 Opus 4.8"**仍然有歧义**——它们告诉你做什么但不告诉你在哪里，所以询问。仅在提示指定确切文件、特定目录或明确文件列表时才不问就继续（"迁移 `app.py`"、"迁移 `services/` 下的所有内容"、"更新 `a.py` 和 `b.py`"）。参见 `shared/model-migration.md` 步骤 0。
- **`max_tokens` 默认值：** 不要低估 `max_tokens`——达到上限会在思考中途截断输出并需要重试。对于非流式请求，默认 `~16000`（保持响应在 SDK HTTP 超时内）。对于流式请求，默认 `~64000`（超时不是问题，给模型空间）。仅在有硬性原因时才降低：分类（`~256`）、成本上限、故意短输出，或 **`max_tokens: 0`** 用于缓存预热（参见 `shared/prompt-caching.md` → 预热）。
- **128K 输出 token：** Fable 5、Opus 4.6、Opus 4.7、Opus 4.8、Sonnet 5 和 Sonnet 4.6 支持最多 128K `max_tokens`，但 SDK 对这么大的值需要流式传输以避免 HTTP 超时。使用 `.stream()` 配合 `.get_final_message()` / `.finalMessage()`。
- **工具调用 JSON 解析（Fable 5 和 4.6/4.7/4.8 系列）：** Fable 5、Opus 4.6、Opus 4.7、Opus 4.8 和 Sonnet 4.6 可能在工具调用 `input` 字段中产生不同的 JSON 字符串转义（例如 Unicode 或正斜杠转义）。始终用 `json.loads()` / `JSON.parse()` 解析工具输入——永远不要对序列化输入进行原始字符串匹配。
- **结构化输出（所有模型）：** 在 `messages.create()` 上使用 `output_config: {format: {...}}` 而非已弃用的 `output_format` 参数。这是一般 API 变更，不是 4.6 特有的。
- **不要重新实现 SDK 功能：** SDK 提供高级辅助工具——使用它们而非从头构建。具体来说：使用 `stream.finalMessage()` 而非在 `new Promise()` 中包装 `.on()` 事件；使用类型化异常类（`Anthropic.RateLimitError` 等）而非字符串匹配错误消息；使用 SDK 类型（`Anthropic.MessageParam`、`Anthropic.Tool`、`Anthropic.Message` 等）而非重新定义等效接口。
- **错误处理——捕获链，而非一个宽泛类。** 单个 `except APIStatusError` / `catch (AnthropicServiceException)` / `rescue APIError` 丢失了可重试（429、≥500、网络）和不可重试（400/404）失败之间的区别。编写最具体优先的链——例如 `NotFoundError` → `RateLimitError` → `APIStatusError` → `APIConnectionError`（或 Go 等价：`errors.As` 到 `*anthropic.Error` 然后 `switch apierr.StatusCode { case 404: …; case 429: …; default: … }`）。每语言类名和命名空间在 `shared/error-codes.md` 中。
- **不要研究 SDK 类型——先写代码。** 如果类型名未显示在本技能包含的文档中，从语言特定文档中的命名空间/包表编写代码文件，让编译器的错误指向正确的名称。不要在编写之前花轮次在 WebFetch、SDK 仓库克隆或编译运行单独反射程序上发现类型名——先生成源文件，然后修复编译器报告的内容。对已安装 SDK 的快速 `strings` / `jar tf` / `javap` 可以接受用于定位名称（它几秒内返回），但不要升级超过那个范围。有错误类型名的文件是可恢复的；花在整个发现上而没有写出文件的会话则不是。
- **Bash 和文本编辑器工具是 Anthropic 定义的、无 schema。** 声明 `{"type": "bash_20250124", "name": "bash"}` / `{"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"}` — 无 `input_schema`。使用你自己的 schema 命名为 `"bash"` 的自定义工具是不同的工具。处理器路径和安全检查在 `shared/tool-use-concepts.md` § 客户端工具中。
- **顾问工具模型配对。** 顾问工具的 `model` 必须至少与请求的顶级 `model` 一样强大——例如执行者 `claude-sonnet-5` → 顾问 `claude-opus-4-8` 或 `claude-opus-4-7`。无效配对返回 400。配对表在 `shared/tool-use-concepts.md` § 顾问中。可用性：`shared/platform-availability.md`。
- **代理技能 ≠ 托管代理。** 要让 Claude 通过代理技能生成 `.pptx`/`.xlsx`/等，调用 `client.beta.messages.create` 配合 `container={"skills": [...]}`、`code_execution_20260521` 工具，以及 `code-execution-2025-08-25` + `skills-2025-10-02` beta。不要在此使用 `client.beta.agents` / `sessions` / `environments`——那些是托管代理接口，不是代理技能。
- **MCP 连接器需要两部分。** 仅 `mcp_servers=[{type:"url", url, name}]` 会作为验证错误被拒绝——还需添加 `tools=[{type:"mcp_toolset", mcp_server_name:<相同名称>}]` 配合 beta `mcp-client-2025-11-20`。可用性：`shared/platform-availability.md`。
- **`inference_geo` 是直接的顶级请求参数** — `client.messages.create(..., inference_geo="us")` / `.inferenceGeo("us")`。不要放在 `extra_body` / `putAdditionalBodyProperty` 中。在 Opus 4.6 / Sonnet 4.6 及更高版本上支持；可用性：`shared/platform-availability.md`。`response.usage.inference_geo` 报告推理运行位置。
- **细粒度工具流式传输不是 beta 功能。** 在工具定义上设置 `eager_input_streaming: true` 并调用常规 `client.messages.stream(...)`。没有 beta 头也没有 `client.beta.*` 路径。
- **缓存诊断是 beta。** 使用 `client.beta.messages.*` 配合 beta `cache-diagnosis-2026-04-07`。在第一轮传递 `diagnostics: {previous_message_id: null}`，后续轮次传递 `diagnostics: {previous_message_id: <上一个响应 id>}`；结果在 `response.diagnostics` 上。可用性：`shared/platform-availability.md`。
- **记忆工具类型是 `memory_20250818`。** 声明 `{"type": "memory_20250818", "name": "memory"}`。Go 在 `client.Beta.Messages.New` 上使用 beta 命名空间类型 `{OfMemoryTool20250818: &anthropic.BetaMemoryTool20250818Param{}}`；Python/TypeScript/Ruby/PHP/C# 使用非 beta 的 `client.messages.create`；Java 同时有非 beta 的 `MemoryTool20250818` 和 beta 工具运行器路径。Python/TypeScript 提供 `BetaAbstractMemoryTool` / `betaMemoryTool` 辅助工具用于实现后端。
- **使用功能实际支持的模型。** 一些功能限制在特定模型层级——快速模式仅 Opus 4.8 / 4.7，任务预算仅 Fable 5 / Sonnet 5 / Opus 4.8 / 4.7，顾问工具需要有效的执行者↔顾问配对。如果用户的提示指定了功能不支持的模型，使用支持的模型并在输出中注明替换。
- **不要为 SDK 数据结构定义自定义类型：** SDK 为所有 API 对象导出类型。消息使用 `Anthropic.MessageParam`，工具定义使用 `Anthropic.Tool`，工具结果使用 `Anthropic.ToolUseBlock` / `Anthropic.ToolResultBlockParam`，响应使用 `Anthropic.Message`。定义你自己的 `interface ChatMessage { role: string; content: unknown }` 重复了 SDK 已提供的内容并丢失类型安全。
- **报告和文档输出：** 对于生成报告、文档或可视化的任务，代码执行沙箱预装了 `python-docx`、`python-pptx`、`matplotlib`、`pillow` 和 `pypdf`。Claude 可以生成格式化文件（DOCX、PDF、图表）并通过 Files API 返回——对于"报告"或"文档"类型请求考虑此方案而非纯 stdout 文本。
- **服务端工具错误不抛出。** 网页搜索和网页获取错误返回 HTTP 200，带有 `web_search_tool_result` / `web_fetch_tool_result` 块，其 `content` 是单个错误对象（例如 `{error_code: "max_uses_exceeded"}`）——不是抛出的异常。对于网页搜索，成功的 `content` 是*列表*；错误的 `content` 是*对象*——在索引之前据此分支。
- **代码执行输出块类型：** `code_execution_20260521` 返回 `bash_code_execution_tool_result`（带 `.content.stdout`），**不是**旧的裸 `code_execution_tool_result`。迭代 `response.content` 并匹配正确的类型。
- **工具搜索：永远不要延迟所有工具。** 搜索工具本身不能有 `defer_loading: true`，且 `tools` 中至少有一个工具必须是非延迟的，否则 API 返回 400 `All tools have defer_loading set`。
