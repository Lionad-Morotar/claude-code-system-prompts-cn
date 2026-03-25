<!--
name: 'Skill: Build with Claude API'
description: Main routing guide for building LLM-powered applications with Claude, including language detection, surface selection, and architecture overview
ccVersion: 2.1.78
-->
# 使用 Claude 构建大语言模型驱动的应用程序

本 skill 帮助你使用 Claude 构建大语言模型驱动的应用程序。根据你的需求选择合适的界面，检测项目语言，然后阅读相关的语言特定文档。

## 默认值

除非用户另有要求：

对于 Claude 模型版本，请使用 {{OPUS_NAME}}，你可以通过确切的模型字符串 `{{OPUS_ID}}` 访问它。对于任何稍微复杂的任务，请默认使用自适应思考 (`thinking: {type: "adaptive"}`)。最后，对于任何可能涉及长输入、长输出或高 `max_tokens` 的请求，请默认使用流式传输 —— 这可以防止请求超时。如果你不需要处理单独的流事件，可以使用 SDK 的 `.get_final_message()` / `.finalMessage()` 辅助方法来获取完整响应

---

## 语言检测

在阅读代码示例之前，确定用户正在使用哪种语言：

1. **查看项目文件**以推断语言：

   - `*.py`, `requirements.txt`, `pyproject.toml`, `setup.py`, `Pipfile` → **Python** — 从 `python/` 读取
   - `*.ts`, `*.tsx`, `package.json`, `tsconfig.json` → **TypeScript** — 从 `typescript/` 读取
   - `*.js`, `*.jsx` (没有 `.ts` 文件存在) → **TypeScript** — JS 使用相同的 SDK，从 `typescript/` 读取
   - `*.java`, `pom.xml`, `build.gradle` → **Java** — 从 `java/` 读取
   - `*.kt`, `*.kts`, `build.gradle.kts` → **Java** — Kotlin 使用 Java SDK，从 `java/` 读取
   - `*.scala`, `build.sbt` → **Java** — Scala 使用 Java SDK，从 `java/` 读取
   - `*.go`, `go.mod` → **Go** — 从 `go/` 读取
   - `*.rb`, `Gemfile` → **Ruby** — 从 `ruby/` 读取
   - `*.cs`, `*.csproj` → **C#** — 从 `csharp/` 读取
   - `*.php`, `composer.json` → **PHP** — 从 `php/` 读取

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

| 语言       | Tool Runner | Agent SDK | 说明                                 |
| ---------- | ----------- | --------- | ------------------------------------- |
| Python     | Yes (beta)  | Yes       | 完整支持 — `@beta_tool` 装饰器 |
| TypeScript | Yes (beta)  | Yes       | 完整支持 — `betaZodTool` + Zod    |
| Java       | Yes (beta)  | No        | 使用注解类的 Beta tool use  |
| Go         | Yes (beta)  | No        | `toolrunner` 包中的 `BetaToolRunner`  |
| Ruby       | Yes (beta)  | No        | beta 中的 `BaseTool` + `tool_runner`    |
| cURL       | N/A         | N/A       | 原始 HTTP，无 SDK 功能             |
| C#         | No          | No        | 官方 SDK                          |
| PHP        | No          | No        | 官方 SDK                          |

---

## 我应该使用哪个界面？

> **从简单开始。** 默认使用满足你需求的最简单层级。单个 API 调用和工作流处理大多数用例 —— 只在任务真正需要开放式、模型驱动的探索时才使用智能体。

| 用例                                        | 层级            | 推荐的界面       | 原因                                     |
| ----------------------------------------------- | --------------- | ------------------------- | --------------------------------------- |
| 分类、摘要、提取、问答  | 单一大语言模型调用 | **Claude API**            | 一个请求，一个响应               |
| 批处理或嵌入                  | 单一大语言模型调用 | **Claude API**            | 专用端点                   |
| 具有代码控制逻辑的多步骤流水线 | 工作流        | **Claude API + tool use** | 你编排循环                |
| 带有你自己工具的自定义智能体                | 智能体           | **Claude API + tool use** | 最大灵活性                     |
| 具有文件/网络/终端访问权限的 AI 智能体          | 智能体           | **Agent SDK**             | 内置工具、安全性和 MCP 支持 |
| 智能体编码助手                        | 智能体           | **Agent SDK**             | 为此用例设计              |
| 想要内置权限和保护措施        | 智能体           | **Agent SDK**             | 包含安全功能                |

> **注意：** Agent SDK 适用于当你想要开箱即用的内置文件/网络/终端工具、权限和 MCP 时。如果你想用你自己的工具构建智能体，Claude API 是正确的选择 —— 使用 tool runner 进行自动循环处理，或使用手动循环进行细粒度控制（审批门、自定义日志、条件执行）。

### 决策树

```
你的应用程序需要什么？

1. 单一大语言模型调用（分类、摘要、提取、问答）
   └── Claude API — 一个请求，一个响应

2. Claude 是否需要读取/写入文件、浏览网页或运行 shell 命令
   作为其工作的一部分？（不是：你的应用程序读取文件并交给 Claude ——
   而是 Claude 本身是否需要发现和访问文件/网络/shell？）
   └── 是 → Agent SDK — 内置工具，不要重新实现它们
       示例："扫描代码库中的错误"、"摘要目录中的每个文件"、
                 "使用子智能体查找错误"、"通过网络搜索研究主题"

3. 工作流（多步骤、代码编排、使用你自己的工具）
   └── Claude API with tool use — 你控制循环

4. 开放式智能体（模型决定自己的轨迹、你自己的工具）
   └── Claude API 智能体循环（最大灵活性）
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

**Opus 4.6 — 自适应思考（推荐）：** 使用 `thinking: {type: "adaptive"}`。Claude 动态决定何时以及思考多少。不需要 `budget_tokens` —— `budget_tokens` 在 Opus 4.6 和 Sonnet 4.6 上已弃用，不得使用。自适应思考还自动启用交错思考（不需要 beta header）。**当用户要求"扩展思考"、"思考预算"或 `budget_tokens` 时：始终使用 Opus 4.6 配合 `thinking: {type: "adaptive"}`。固定 token 预算的概念已弃用 —— 自适应思考取代了它。不要使用 `budget_tokens`，也不要切换到旧模型。**

**Effort 参数（GA，无需 beta header）：** 通过 `output_config: {effort: "low"|"medium"|"high"|"max"}` 控制思考深度和整体 token 消耗（在 `output_config` 内部，不是顶级）。默认是 `high`（相当于省略）。`max` 仅适用于 Opus 4.6。适用于 Opus 4.5、Opus 4.6 和 Sonnet 4.6。在 Sonnet 4.5 / Haiku 4.5 上会报错。与自适应思考结合使用以获得最佳的成本-质量权衡。对子智能体或简单任务使用 `low`；对最深度的推理使用 `max`。

**Sonnet 4.6：** 支持自适应思考 (`thinking: {type: "adaptive"}`)。`budget_tokens` 在 Sonnet 4.6 上已弃用 —— 改用自适应思考。

**旧模型（仅当明确请求时）：** 如果用户特别要求 Sonnet 4.5 或其他旧模型，使用 `thinking: {type: "enabled", budget_tokens: N}`。`budget_tokens` 必须小于 `max_tokens`（最小 1024）。永远不要仅仅因为用户提到 `budget_tokens` 就选择旧模型 —— 改用 Opus 4.6 配合自适应思考。

---

## 压缩（快速参考）

**Beta 版，Opus 4.6 和 Sonnet 4.6。** 对于可能超过 200K 上下文窗口的长对话，启用服务端压缩。当接近触发阈值（默认：150K token）时，API 会自动摘要较早的上下文。需要 beta header `compact-2026-01-12`。

**重要：** 在每一轮将 `response.content`（不仅仅是文本）追加回你的消息。响应中的压缩块必须被保留 —— API 使用它们在下次请求时替换被压缩的历史记录。仅提取文本字符串并追加会静默丢失压缩状态。

有关代码示例，请参阅 `{lang}/claude-api/README.md`（压缩部分）。完整文档通过 `shared/live-sources.md` 中的 WebFetch 获取。

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

**函数调用 / tool use / 智能体：**
→ 阅读 `{lang}/claude-api/README.md` + `shared/tool-use-concepts.md` + `{lang}/claude-api/tool-use.md`

**批处理（对延迟不敏感）：**
→ 阅读 `{lang}/claude-api/README.md` + `{lang}/claude-api/batches.md`

**跨多个请求的文件上传：**
→ 阅读 `{lang}/claude-api/README.md` + `{lang}/claude-api/files-api.md`

**带有内置工具的智能体（文件/网络/终端）：**
→ 阅读 `{lang}/agent-sdk/README.md` + `{lang}/agent-sdk/patterns.md`

### Claude API（完整文件参考）

阅读**语言特定的 Claude API 文件夹** (`{language}/claude-api/`)：

1. **`{language}/claude-api/README.md`** —— **首先阅读此文件。** 安装、快速入门、常见模式、错误处理。
2. **`shared/tool-use-concepts.md`** —— 当用户需要函数调用、代码执行、内存或结构化输出时阅读。涵盖概念基础。
3. **`{language}/claude-api/tool-use.md`** —— 阅读语言特定的 tool use 代码示例（tool runner、手动循环、代码执行、内存、结构化输出）。
4. **`{language}/claude-api/streaming.md`** —— 构建聊天 UI 或增量显示响应的界面时阅读。
5. **`{language}/claude-api/batches.md`** —— 离线处理大量请求时阅读（对延迟不敏感）。以 50% 的成本异步运行。
6. **`{language}/claude-api/files-api.md`** —— 在多个请求中发送相同文件而不重新上传时阅读。
7. **`shared/error-codes.md`** —— 调试 HTTP 错误或实现错误处理时阅读。
8. **`shared/live-sources.md`** —— 用于获取最新官方文档的 WebFetch URL。

> **注意：** 对于 Java、Go、Ruby、C#、PHP 和 cURL —— 这些每种语言都有一个涵盖所有基础知识的文件。根据需要阅读该文件以及 `shared/tool-use-concepts.md` 和 `shared/error-codes.md`。

### Agent SDK

阅读**语言特定的 Agent SDK 文件夹** (`{language}/agent-sdk/`)。Agent SDK 仅适用于 **Python 和 TypeScript**。

1. **`{language}/agent-sdk/README.md`** —— 安装、快速入门、内置工具、权限、MCP、hooks。
2. **`{language}/agent-sdk/patterns.md`** —— 自定义工具、hooks、子智能体、MCP 集成、会话恢复。
3. **`shared/live-sources.md`** —— 当前 Agent SDK 文档的 WebFetch URL。

---

## 何时使用 WebFetch

在以下情况下使用 WebFetch 获取最新文档：

- 用户要求"最新"或"当前"信息
- 缓存数据似乎不正确
- 用户询问此处未涵盖的功能

实时文档 URL 在 `shared/live-sources.md` 中。

## 常见陷阱

- 向 API 传递文件或内容时不要截断输入。如果内容太长而无法放入上下文窗口，请通知用户并讨论选项（分块、摘要等），而不是静默截断。
- **Opus 4.6 / Sonnet 4.6 思考：** 使用 `thinking: {type: "adaptive"}` —— 不要使用 `budget_tokens`（在 Opus 4.6 和 Sonnet 4.6 上已弃用）。对于旧模型，`budget_tokens` 必须小于 `max_tokens`（最小 1024）。如果弄错了会抛出错误。
- **Opus 4.6 预填充已移除：** Assistant 消息预填充（最后一轮 assistant 预填充）在 Opus 4.6 上返回 400 错误。改用结构化输出 (`output_config.format`) 或系统提示词指令来控制响应格式。
- **`max_tokens` 默认值：** 不要低估 `max_tokens` —— 达到上限会截断输出并需要重试。对于非流式请求，默认使用 `~16000`（保持响应在 SDK HTTP 超时范围内）。对于流式请求，默认使用 `~64000`（超时不是问题，所以给模型更多空间）。仅在以下情况下降低：分类（`~256`）、成本上限或故意缩短输出。
- **128K 输出 token：** Opus 4.6 支持最多 128K `max_tokens`，但 SDK 需要流式传输以避免大 `max_tokens` 值的 HTTP 超时。使用 `.stream()` 配合 `.get_final_message()` / `.finalMessage()`。
- **Tool call JSON 解析 (Opus 4.6)：** Opus 4.6 可能在 tool call `input` 字段中产生不同的 JSON 字符串转义（例如 Unicode 或正斜杠转义）。始终使用 `json.loads()` / `JSON.parse()` 解析 tool 输入 —— 永远不要对序列化输入进行原始字符串匹配。
- **结构化输出（所有模型）：** 使用 `output_config: {format: {...}}` 而不是 `messages.create()` 上已弃用的 `output_format` 参数。这是一般的 API 更改，不是 4.6 特定的。
- **不要重新实现 SDK 功能：** SDK 提供高级辅助功能 —— 使用它们而不是从头构建。具体来说：使用 `stream.finalMessage()` 而不是将 `.on()` 事件包装在 `new Promise()` 中；使用类型化的异常类（`Anthropic.RateLimitError` 等）而不是字符串匹配错误消息；使用 SDK 类型（`Anthropic.MessageParam`、`Anthropic.Tool`、`Anthropic.Message` 等）而不是重新定义等效接口。
- **不要为 SDK 数据结构定义自定义类型：** SDK 导出所有 API 对象的类型。对消息使用 `Anthropic.MessageParam`，对工具定义使用 `Anthropic.Tool`，对工具结果使用 `Anthropic.ToolUseBlock` / `Anthropic.ToolResultBlockParam`，对响应使用 `Anthropic.Message`。定义你自己的 `interface ChatMessage { role: string; content: unknown }` 会重复 SDK 已提供的内容并失去类型安全。
- **报告和文档输出：** 对于生成报告、文档或可视化的任务，代码执行沙箱预装了 `python-docx`、`python-pptx`、`matplotlib`、`pillow` 和 `pypdf`。Claude 可以生成格式化文件（DOCX、PDF、图表）并通过 Files API 返回它们 —— 对于"报告"或"文档"类型的请求，请考虑这样做而不是纯 stdout 文本。
