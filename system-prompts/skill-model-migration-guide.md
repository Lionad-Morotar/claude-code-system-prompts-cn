<!--
name: 'Skill: Model migration guide'
description: 将现有代码迁移到更新 Claude 模型的逐步指南，涵盖破坏性变更、已弃用参数、每 SDK 语法、提示词行为变化和迁移清单
ccVersion: 2.1.197
-->
# 模型迁移指南

> **如果你通过 `/claude-api migrate` 到达这里：** 这就是正确的文件。按顺序执行以下步骤——不要向用户总结它们。从步骤 0（确认范围）开始，然后再修改任何文件。

如何将现有代码迁移到更新的 Claude 模型。涵盖破坏性变更、已弃用参数和退役模型的就地替换。

获取最新权威版本（包含每种支持语言的代码示例），请 WebFetch `shared/live-sources.md` 中的 **Migration Guide** URL。本文件用作整合的技能常驻参考；当模型发布或破坏性变更可能改变情况时，请回退到在线文档。

**本文件很大。** 使用下方的章节名称跳转（或 `Grep` 本文件搜索标题文本）。先阅读步骤 0 和步骤 1——它们适用于每次迁移。然后只阅读你要迁移到的模型对应的每目标章节。

| 章节 | 何时需要 |
|---|---|
| 步骤 0：确认迁移范围 | 始终——在任何编辑之前 |
| 步骤 1：分类每个文件 | 始终——决定是否替换、并行添加或跳过 |
| 每 SDK 语法参考 | 将本指南中的 Python 示例翻译为 TypeScript / Go / Ruby / Java / C# / PHP |
| 目标模型 / 退役模型替换 | 选择目标模型 |
| 按源模型的破坏性变更 | 迁移到 Opus 4.6 / Sonnet 4.6 |
| 迁移到 Opus 4.7 | 迁移到 Opus 4.7（破坏性变更、静默默认值、行为变化） |
| Opus 4.7 迁移清单 | 4.7 的必需 vs 可选项目，标记为 `[BLOCKS]` / `[TUNE]` |
| 迁移到 Opus 4.8 | 迁移到 Opus 4.8（无新破坏性变更；会话中途系统提示词；行为重新调优） |
| Opus 4.8 迁移清单 | 4.8 的必需 vs 可选项目，标记为 `[BLOCKS]` / `[TUNE]` |
| 迁移到 {{SONNET_NEXT_NAME}} | 迁移 Sonnet 4.6 → {{SONNET_NEXT_NAME}}（自适应思考默认开启；非默认采样参数 400；新分词器；`xhigh` 用于编码/代理；高分辨率视觉；行为重新调优） |
| {{SONNET_NEXT_NAME}} 迁移清单 | 必需 vs 可选项目，标记为 `[BLOCKS]` / `[TUNE]` |
| 迁移到 {{FABLE_NAME}} | 迁移到 {{FABLE_NAME}} 或 {{MYTHOS_NAME}}（始终开启思考、永不返回原始思维链、拒绝处理、数据保留、行为变化 + 提示词指导） |
| {{FABLE_NAME}} 迁移清单 | {{FABLE_NAME}} 的必需 vs 可选项目，标记为 `[BLOCKS]` / `[TUNE]` |
| 验证迁移 | 编辑后——运行时抽查 |

**摘要：** 更改模型 ID 字符串。如果你使用 `budget_tokens`，切换到 `thinking: {type: "adaptive"}`。如果你使用助手预填充，它们在 Opus 4.6 和 Sonnet 4.6 上都会 400——切换到预填充替换方案之一（最常见的是 `output_config.format`；参见按源模型的破坏性变更中的表格）。如果你从 Sonnet 4.5 迁移到 Sonnet 4.6，显式设置 `effort`——4.6 默认为 `high`。移除 `effort-2025-11-24` 和 `fine-grained-tool-streaming-2025-05-14` beta 头（在 4.6 上已 GA）；切换到自适应思考后移除 `interleaved-thinking-2025-05-14`（仅在使用过渡性 `budget_tokens` 逃生舱时保留）。然后从 `client.beta.messages.create` 退回到 `client.messages.create`。降低任何激进的"CRITICAL: YOU MUST"工具指令；4.6 更严格地遵循系统提示词。

---

## 步骤 0：确认迁移范围

**在任何 Write、Edit 或 MultiEdit 调用之前，确认范围。** 如果用户的请求没有显式指定单个文件、特定目录或明确的文件列表，**先询问——不要开始编辑**。这是不可协商的：即使是听起来像命令的请求如"迁移我的代码库"、"把我的项目移到 X"、"升级到 Sonnet 4.6"或裸的"迁移到 Opus 4.7"也使范围模糊，需要澄清问题。像"我的项目"、"我的代码"、"我的代码库"、"整个"、"到处"或"整个仓库"这样的短语是**模糊的，不是指令**——它们告诉你*做什么*但不告诉*在哪里*。先问再做。

显式提供常见范围选项并等待回答后再修改任何文件：

1. 整个工作目录
2. 特定子目录（例如 `src/`、`app/`、`services/billing/`）
3. 特定文件或文件列表

以单个澄清问题的形式提出，以便用户可以在一轮中回答。**仅当范围已经明确时才不问就继续**——用户指定了确切文件（"将 `extract.py` 迁移到 Sonnet 4.6"）、指向特定目录（"迁移 `services/billing/` 下的所有文件到 Opus 4.6"）、列出了特定文件（"更新 `a.py` 和 `b.py`"），或已在之前的轮次中回答了范围问题。如果你能仅从提示中回答"此更改将涉及哪些文件？"并给出精确列表，就继续。如果不能，就问。

**示例。** 如果用户说*"将我的项目迁移到 Opus 4.6。我想在合理的地方都使用自适应思考。"*你不知道"我的项目"是指整个工作目录、仅 `src/`、仅生产代码还是其他——`合理的地方`使意图清晰（更新范围内*每个调用点*），但范围本身仍未定义。不要开始编辑。回复：

> 在开始编辑之前，你能确认范围吗？我可以迁移：
> 1. 工作目录中的每个 `.py` 文件
> 2. 仅 `src/` 下的文件（生产代码）
> 3. 你指定的特定子目录或文件列表
>
> 选哪个？

然后等待回答。同样适用于*"迁移到 Opus 4.7"*和裸的*"帮我升级到 Sonnet 4.6"*——编辑前先问。

**评估范围问题的大小（大型仓库）。** 在询问之前，获取按目录的计数，以便用户可以具体选择：

```sh
rg -l "<old-model-id>" --type-not md | cut -d/ -f1 | sort | uniq -c | sort -rn
```

在你的范围问题中展示分解（例如*"找到 217 个引用，分布在 3 个目录：api/ (130)、api-go/ (62)、routing/ (25)。迁移哪些？"*）。在调查之前还要确认 `git status` 是干净的——意外的修改意味着并发进程；在继续之前停下来调查。

---

## 步骤 1：分类每个文件

不是每个包含旧模型 ID 的文件都是 API 的**调用者**。在编辑之前，将每个文件分类到以下桶之一——正确的操作不同：

| # | 桶 | 外观 | 操作 |
|---|---|---|---|
| 1 | **调用 API/SDK** | `client.messages.create(model=…)`、`anthropic.Anthropic()`、请求载荷 | 替换模型 ID **并**应用目标版本的破坏性变更清单（下方）。 |
| 2 | **定义或提供服务** | 模型注册表、OpenAPI 规范、路由/队列配置、模型策略枚举、生成的目录 | 旧条目**保留**（模型仍在服务）。询问是否 (a) 并行添加新模型、(b) 保持不变或 (c) 退役旧模型——绝不盲目替换。**如果不能询问，默认为 (a)：并行添加新模型并标记**——替换会取消注册仍在生产中的模型。 |
| 3 | **将 ID 作为不透明字符串引用** | UI 回退常量、能力门控子串检查、通用测试夹具、标签解析器、环境默认值 | 通常替换字符串并验证任何解析器/正则/子串匹配能处理新 ID——但先检查下方的子情况。 |
| 4 | **带后缀的变体 ID** | `claude-<model>-<suffix>` 如 `-fast`、`-1024k`、`-200k`、`[1m]`、日期快照 | 这些是部署/路由标识符，不是公共模型 ID。**不要假设新模型的等效项存在。** 先在注册表中验证；如果不存在，保留字符串并标记。**例外：`-fast` 字符串（例如 `claude-opus-4-6-fast`）由下方的快速模式章节处理**，将其重写为 Opus 4.8 加 `speed="fast"` 和 `fast-mode-2026-02-01` beta，而不是保留原样。 |

**桶 3 子情况——在替换字符串引用之前检查：**

- **能力门控**（例如 `if 'opus-4-6' in model_id:` 启用功能）→ **并行添加新 ID**，不要替换。旧模型仍在服务且仍有该能力，所以替换会静默禁用仍流经的任何旧模型流量的该功能。如果你知道没有旧模型流量会命中此门控（单调用者代码库完全迁移），替换是可以的；如果不确定，并行添加。
- **注册表断言测试**（例如 `assert "claude-X" in supported_models`、`test_X_has_N_clusters`）→ **并行添加新模型的断言；保留旧的。** 旧模型仍在服务，所以其断言仍然有效——但注册表也应包含新模型，所以也要断言。启发式：如果测试在列表中引用多个模型版本，它是注册表测试；如果只有一个模型与自身比较的结构体，它是通用夹具。
- **冻结/生成的快照** → **重新生成**，不要手动编辑。
- **耦合到定义者**（例如通过共享 `conftest` 种子列表传递模型授权的集成测试，或断言计费层/速率限制组枚举或生成的 SKU/定价目录）→ **先验证定义者有新模型条目。** 如果没有，添加种子条目（复用最近的现有层作为占位符）；如果你不能自信地做到这一点，询问用户如何填充定义者。**不要跳过测试。** 在不填充定义者的情况下替换会使测试在运行时失败。

专门迁移测试时：破坏性参数（`temperature`、`top_p`、`budget_tokens`）通常不存在——测试夹具很少在占位模型上设置采样参数。破坏性变更扫描仍然需要，但预期大部分结果是干净的。

**先找到有意标记的同步点。** 许多代码库用 `MODEL LAUNCH`、`KEEP IN SYNC`、`@model-update` 或类似注释标记标记每次模型发布时必须更改的位置。在广泛的模型 ID grep *之前*搜索仓库使用的任何约定——那些标记指向关键变更。

---

## 每 SDK 语法参考

本指南中的代码示例为 Python。**每个官方 Anthropic SDK 中都存在相同的字段**——Stainless 从同一个 OpenAPI 规范生成全部 7 个，因此 JSON 字段名 1:1 映射，仅有大小写约定差异。使用下方的行将 Python 示例翻译为你正在迁移的 SDK。

> **在将类型和方法名写入客户代码之前，对照 SDK 源验证它们。** WebFetch `shared/live-sources.md` 中 SDK 源代码表的相关仓库（每个 SDK 一行）并确认确切符号——特别是对于类型化 SDK（Go、Java、C#），其中联合/构建器名称可能与 JSON 形式不同。不要猜测不在下方表格或 `<lang>/claude-api/README.md` 中的类型名称。

<!-- 下方的行已对照每个 SDK 的 `synced/model-launch-april` 分支验证。 -->

### `thinking` — `budget_tokens` → adaptive

| SDK | 之前 | 之后 |
|---|---|---|
| Python | `thinking={"type": "enabled", "budget_tokens": N}` | `thinking={"type": "adaptive"}` |
| TypeScript | `thinking: { type: 'enabled', budget_tokens: N }` | `thinking: { type: 'adaptive' }` |
| Go | `Thinking: anthropic.ThinkingConfigParamOfEnabled(N)` | `Thinking: anthropic.ThinkingConfigParamUnion{OfAdaptive: &anthropic.ThinkingConfigAdaptiveParam{}}` |
| Ruby | `thinking: { type: "enabled", "budget_tokens: N }` | `thinking: { type: "adaptive" }` |
| Java | `.thinking(ThinkingConfigEnabled.builder().budgetTokens(N).build())` | `.thinking(ThinkingConfigAdaptive.builder().build())` |
| C# | `Thinking = new ThinkingConfigEnabled { BudgetTokens = N }` | `Thinking = new ThinkingConfigAdaptive()` |
| PHP | `thinking: ['type' => 'enabled', 'budget_tokens' => N]` | `thinking: ['type' => 'adaptive']` |

### 采样参数 — `temperature` / `top_p` / `top_k`

（在 Opus 4.7 上完全移除字段；在 Claude 4.x 上最多保留 `temperature` 或 `top_p` 之一。）

| SDK | 要移除的字段 |
|---|---|
| Python | `temperature=…`、`top_p=…`、`top_k=…` |
| TypeScript | `temperature: …`、`top_p: …`、`top_k: …` |
| Go | `Temperature: anthropic.Float(…)`、`TopP: anthropic.Float(…)`、`TopK: anthropic.Int(…)` |
| Ruby | `temperature: …`、`top_p: …`、`top_k: …` |
| Java | `.temperature(…)`、`.topP(…)`、`.topK(…)` |
| C# | `Temperature = …`、`TopP = …`、`TopK = …` |
| PHP | `temperature: …`、`topP: …`、`topK: …` |

### 预填充替换 — 通过 `output_config.format` 的结构化输出

| SDK | 移除（最后一个助手轮次） | 添加 |
|---|---|---|
| Python | `{"role": "assistant", "content": "…"}` | `output_config={"format": {"type": "json_schema", "schema": SCHEMA}}` |
| TypeScript | `{ role: 'assistant', content: '…' }` | `output_config: { format: { type: 'json_schema', schema: SCHEMA } }` |
| Go | 尾部的 `anthropic.MessageParam{Role: "assistant", …}` | `OutputConfig: anthropic.OutputConfigParam{Format: anthropic.JSONOutputFormatParam{…}}` |
| Ruby | `{ role: "assistant", content: "…" }` | `output_config: { format: { type: "json_schema", "schema: SCHEMA } }` |
| Java | 尾部的 `Message.builder().role(ASSISTANT)…` | `.outputConfig(OutputConfig.builder().format(JsonOutputFormat.builder()…build()).build())` |
| C# | 尾部的 `new Message { Role = "assistant", … }` | `OutputConfig = new OutputConfig { Format = new JsonOutputFormat { … } }` |
| PHP | 尾部的 `['role' => 'assistant', 'content' => '…']` | `outputConfig: ['format' => ['type' => 'json_schema', 'schema' => $SCHEMA]]` |

### `thinking.display` — 选择加入摘要推理（Opus 4.7）

| SDK | 添加 |
|---|---|
| Python | `thinking={"type": "adaptive", "display": "summarized"}` |
| TypeScript | `thinking: { type: 'adaptive', display: 'summarized' }` |
| Go | `Thinking: anthropic.ThinkingConfigParamUnion{OfAdaptive: &anthropic.ThinkingConfigAdaptiveParam{Display: anthropic.ThinkingConfigAdaptiveDisplaySummarized}}` |
| Ruby | `thinking: { type: "adaptive", display: "summarized" }`（或在直接构造模型类时使用 `display_:`） |
| Java | `.thinking(ThinkingConfigAdaptive.builder().display(ThinkingConfigAdaptive.Display.SUMMARIZED).build())` |
| C# | `Thinking = new ThinkingConfigAdaptive { Display = Display.Summarized }` |
| PHP | `thinking: ['type' => 'adaptive', 'display' => 'summarized']` |

对于不在这些表格中的任何字段，Python 示例中的 JSON 键直接翻译：Python/TypeScript/Ruby 使用 `snake_case`，PHP 使用 `camelCase` 命名参数，Go/C# 使用 `PascalCase` 结构体字段，Java 使用 `camelCase` 构建器方法。

---

## 解释你做的每个更改

迁移编辑对没读过发布说明的用户来说可能看起来很随意——移除的 `temperature`、删除的预填充、重写的系统提示词句子。**对于每个编辑，告诉用户你更改了什么以及为什么**，与推动它的特定 API 或行为变更关联。在工作时在你的摘要中这样做，而不是仅在最后。

对于**系统提示词编辑**要特别明确。用户有理由保护他们的提示词，提示词调优更改是判断调用（不是硬 API 要求）。对于任何提示词编辑：

- 引用前后文本。
- 说明推动它的行为变化（例如*"Opus 4.7 将响应长度校准到任务复杂度，所以我添加了显式长度指令"*，或*"4.6 更字面地遵循指令，所以'CRITICAL: YOU MUST use the search tool'现在会过度触发——软化为'Use the search tool when…'"*）。
- 明确哪些提示词编辑是**可选调优**（语气、长度、子代理指导），哪些代码编辑是**避免 400 所必需的**（采样参数、`budget_tokens`、预填充）。绝不将可选提示词更改呈现为强制性。

如果你同时应用多个提示词调优编辑，将它们作为短列表提供，让用户可以逐项接受或拒绝，而不是静默重写他们的系统提示词。

---

## 迁移之前

1. **确认目标模型 ID。** 仅使用 `shared/models.md` 中的确切字符串——不要在别名后追加日期后缀（`claude-opus-4-6`，不是 `claude-opus-4-6-20251101`）。猜测 ID 会 404。
2. **用此清单检查你的代码使用了哪些功能：**
   - `thinking: {type: "enabled", budget_tokens: N}` → 在 Opus 4.6 / Sonnet 4.6 上迁移到自适应思考（仍可用但已弃用）
   - 助手轮次预填充（`messages` 以 `role: "assistant"` 结尾）→ 在 Opus 4.6 / Sonnet 4.6 上必须更改（返回 400）
   - `messages.create()` 上的 `output_format` 参数 → 必须在所有模型上更改（API 范围内已弃用）
   - `max_tokens > ~16000` → 必须在任何模型上流式传输（超过 ~16K 有 SDK HTTP 超时风险）。流式传输时，每个当前模型达到 128K，除了 Haiku 4.5 上限为 64K
   - Beta 头 `effort-2025-11-24`、`fine-grained-tool-streaming-2025-05-14`、`interleaved-thinking-2025-05-14` → 在 4.6 上 GA，移除它们并从 `client.beta.messages.create` 切换到 `client.messages.create`
   - 从 Sonnet 4.5 迁移到 Sonnet 4.6 且未设置 `effort` → 4.6 默认为 `high`，可能改变你的延迟/成本配置
   - 包含 `CRITICAL`、`MUST`、`If in doubt, use X` 语言的系统提示词 → 在 4.6 上可能过度触发（参见提示词行为变化）
   - 从 3.x / 4.0 / 4.1 迁移：还要检查采样参数（`temperature` + `top_p`）、工具版本（`text_editor_20250728`）、`refusal` + `model_context_window_exceeded` 停止原因、尾部换行工具参数处理
3. **先在一个请求上测试。** 对新模型运行一次调用，检查响应，然后推广。

---

## 目标模型（推荐目标）

| 如果你当前使用… | 迁移到 | 原因 |
| ------------------------------------- | ------------------ | ------------------------------------------------- |
| Claude Mythos Preview (`claude-mythos-preview`) | `{{MYTHOS_ID}}`（Project Glasswing 继任者）或 `{{FABLE_ID}}`（GA） | 相同的分词器系列——主要是模型 ID 替换；移除 `thinking` 配置和预填充；参见迁移到 {{FABLE_NAME}} |
| Opus 4.7 | `claude-opus-4-8` | 最强大的 Opus 层模型；与 4.7 相同的 API 表面（无新破坏性变更）——主要是提示词重新调优；参见迁移到 Opus 4.8 |
| Opus 4.6 | `claude-opus-4-8` | 先应用 Opus 4.7 破坏性变更，然后 4.8 重新调优 |
| Opus 4.0 / 4.1 / 4.5 / Opus 3 | `claude-opus-4-8` | 按顺序应用 4.6 → 4.7 → 4.8（自适应思考、移除采样参数、然后重新调优） |
| Sonnet 4.6 | `{{SONNET_NEXT_ID}}` | 在代理和编码工作上接近 Opus 质量，Sonnet 成本；自适应思考默认开启；参见迁移到 {{SONNET_NEXT_NAME}} |
| Sonnet 4.0 / 4.5 / 3.7 / 3.5 | `{{SONNET_NEXT_ID}}` | 先应用 Sonnet 4.6 变更，然后 {{SONNET_NEXT_NAME}} 章节 |
| Haiku 3 / 3.5 | `claude-haiku-4-5` | 最快且最具成本效益 |

默认为调用者层级的最新 Opus，除非他们明确选择了其他。Opus 迁移是分层的：如果你在 Opus 4.6 或更旧版本，按顺序应用每个版本的章节直到目标（例如 4.5 → 4.8 意味着 4.6、4.7 和 4.8 章节按顺序）。4.7 → 4.8 没有新的破坏性变更——参见下方迁移到 Opus 4.8。

---

## 退役模型替换

这些模型返回 404——立即更新：

| 退役模型 | 退役日期 | 就地替换 |
| ----------------------------- | ------------- | -------------------- |
| `claude-3-7-sonnet-20250219` | 2026年2月19日 | `{{SONNET_NEXT_ID}}` |
| `claude-3-5-haiku-20241022` | 2026年2月19日 | `claude-haiku-4-5` |
| `claude-3-opus-20240229` | 2026年1月5日 | `claude-opus-4-8` |
| `claude-3-5-sonnet-20241022` | 2025年10月28日 | `{{SONNET_NEXT_ID}}` |
| `claude-3-5-sonnet-20240620` | 2025年10月28日 | `{{SONNET_NEXT_ID}}` |
| `claude-3-sonnet-20240229` | 2025年7月21日 | `{{SONNET_NEXT_ID}}` |
| `claude-2.1`、`claude-2.0` | 2025年7月21日 | `{{SONNET_NEXT_ID}}` |

## 弃用模型（即将退役）

| 模型 | 退役日期 | 替换 |
| ----------------------------- | ------------- | -------------------- |
| `claude-3-haiku-20240307` | 2026年4月19日 | `claude-haiku-4-5` |
| `claude-opus-4-20250514` | 2026年6月15日 | `claude-opus-4-8` |
| `claude-sonnet-4-20250514` | 2026年6月15日 | `{{SONNET_NEXT_ID}}` |

---

## 按源模型的破坏性变更

### 从 Sonnet 4.5 迁移到 Sonnet 4.6（effort 默认值变更）

Sonnet 4.5 没有 `effort` 参数；Sonnet 4.6 默认为 `high`。如果你只是切换模型字符串而不做其他操作，可能会看到明显更高的延迟和 token 使用量。显式设置 `effort`。

**推荐起始点：**

| 工作负载 | 起始值 | 说明 |
| ------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| 聊天、分类、内容生成 | `low` | 配合 `thinking: {"type": "disabled"}`，你会看到与 Sonnet 4.5 无思考相似或更好的性能 |
| 大多数应用（平衡） | `medium` | 质量与成本的默认最佳平衡点 |
| 代理编码、工具密集型工作流 | `medium` | 配合自适应思考和充足的 `max_tokens`（流式传输时最高 128K——Sonnet 4.6 的上限） |
| 自主多步代理、长期循环 | `high` | 如果延迟/token 成为问题，降级到 `medium` |
| 计算机使用代理 | `high` + 自适应 | Sonnet 4.6 在自适应 + high 上实现最佳计算机使用准确率 |

专门针对无思考聊天工作负载：

```python
client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=8192,
    thinking={"type": "disabled"},
    output_config={"effort": "low"},
    messages=[{"role": "user", "content": "..."}],
)
```

**何时使用 Opus 4.6 代替：** 最难和最长期的问题——大型代码迁移、深度研究、扩展自主工作。Sonnet 4.6 在快速周转和成本效率上胜出。

### 迁移到 Opus 4.6 / Sonnet 4.6（从任何旧模型）

**1. 手动扩展思考已弃用——使用自适应思考。**

`thinking: {type: "enabled", budget_tokens: N}`（带固定 token 预算的手动扩展思考）在 Opus 4.6 和 Sonnet 4.6 上已弃用。用 `thinking: {type: "adaptive"}` 替换，让 Claude 决定何时以及思考多少。自适应思考还自动启用交错思考（无需 beta 头）。

```python
# 旧（在旧模型上仍可用，在 4.6 上已弃用）
response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=16000,
    thinking={"type": "enabled", "budget_tokens": 8000},
    messages=[...]
)

# 新（Opus 4.6 / Sonnet 4.6）
response = client.messages.create(
    model="claude-opus-4-6",  # 或 "claude-sonnet-4-6"
    max_tokens=16000,
    thinking={"type": "adaptive"},
    output_config={"effort": "high"},  # 可选：low | medium | high | max
    messages=[...]
)
```

自适应思考是长期目标，在内部评估中它优于手动扩展思考。在可以的时候迁移。

**过渡逃生舱：** 手动扩展思考在 Opus 4.6 和 Sonnet 4.6 上仍然*可用*（已弃用，将在未来版本中移除）。如果你需要在迁移期间有硬上限——例如，在调优 `effort` 之前限制失控工作负载的 token 花费——你可以保留 `budget_tokens`  alongside 显式 `effort` 值，然后在后续中移除。`budget_tokens` 必须严格小于 `max_tokens`：

```python
# 仅过渡使用——已弃用，计划移除
client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=16384,
    thinking={"type": "enabled", "budget_tokens": 8192},  # 必须 < max_tokens
    output_config={"effort": "medium"},
    messages=[...],
)
```

如果用户在 4.6 上要求"思考预算"，首选答案是 `effort`——使用 `low`、`medium`、`high` 或 `max` 而不是 token 计数。

**2. Effort 参数（仅限 Opus 4.5、Opus 4.6、Sonnet 4.6）。**

控制思考深度和总体 token 花费。放在 `output_config` 内部，不是顶级。默认为 `high`。`max` 在 Fable 5、Opus 4.6 及更高版本、Sonnet 5 和 Sonnet 4.6 上支持——在 Sonnet 4.5 和 Haiku 4.5 上会报错。

```python
output_config={"effort": "medium"}  # 通常是成本/质量的最佳平衡
```

### 迁移到 4.6 系列（Opus 4.6 和 Sonnet 4.6）

**3. 助手轮次预填充返回 400（Opus 4.6 和 Sonnet 4.6）。**

在 Opus 4.6 和 Sonnet 4.6 上都不再支持最后一个助手轮次的预填充响应——两者都返回 400。在对话*其他位置*添加助手消息（例如用于少样本示例）仍然有效。选择与预填充用途匹配的替换方案：

| 预填充的用途 | 替换方案 |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 强制 JSON / YAML / schema 输出 | `output_config.format` 配合 `json_schema`——参见下方示例 |
| 强制分类标签 | 带 enum 字段的工具或结构化输出 |
| 跳过前导（`Here is the summary:\n`） | 系统提示词指令：*"Respond directly without preamble. Do not start with phrases like 'Here is...' or 'Based on...'."* |
| 绕过糟糕的拒绝 | 通常不再需要——4.6 拒绝得更恰当。简单的用户轮次提示即可。 |
| 继续中断的响应 | 将继续移到用户轮次：*"Your previous response was interrupted and ended with `[last text]`. Continue from there."* |
| 注入提醒 / 上下文补充 | 改为注入到用户轮次。对于复杂的代理框架，通过工具调用或在压缩期间暴露上下文。 |

```python
# 旧（在 Opus 4.6 / Sonnet 4.6 上失败）——预填充强制 JSON 格式
messages=[
    {"role": "user", "content": "Extract the name."},
    {"role": "assistant", "content": "{\"name\": \""},
]

# 新——结构化输出替换预填充
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    output_config={"format": {"type": "json_schema", "schema": {...}}},
    messages=[{"role": "user", "content": "Extract the name."}],
)
```

**4. 对 `max_tokens > ~16K` 使用流式传输（所有模型）；仅 Haiku 4.5 上限更低，为 64K。**

非流式请求在高 `max_tokens` 时会遇到 SDK HTTP 超时，与模型无关——超过 ~16K 输出时流式传输。可流式上限是每个当前模型 128K，除了 Haiku 4.5 上限为 64K。

```python
with client.messages.stream(model="claude-opus-4-6", max_tokens=64000, ...) as stream:
    message = stream.get_final_message()
```

**5. 工具调用 JSON 转义可能不同（Opus 4.6 和 Sonnet 4.6）。**

两个 4.6 模型都可能生成带 Unicode 或正斜杠转义的工具调用 `input` 字段。始终用 `json.loads()` / `JSON.parse()` 解析——绝不原始字符串匹配序列化输入。

### 所有模型

**6. `output_format` → `output_config.format`（API 范围内）。**

`messages.create()` 上的旧顶级 `output_format` 参数已弃用。改用 `output_config.format`。这不是 4.6 特有的——适用于每个模型。

---

## 在 4.6 上要移除的 Beta 头

几个在 4.5 上必需的 beta 头在 4.6 上已 GA，应该移除。保留它们无害但误导；移除它们还让你能从 `client.beta.messages.create(...)` 移回 `client.messages.create(...)`。

| 头 | 在 4.6 上的状态 | 操作 |
| ----------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| `effort-2025-11-24` | Effort 参数已 GA | 移除 |
| `fine-grained-tool-streaming-2025-05-14` | GA | 移除 |
| `interleaved-thinking-2025-05-14` | 自适应思考自动启用交错思考 | 使用自适应思考时移除；在 Sonnet 4.6 上配合手动扩展思考仍可用，但该路径已弃用 |
| `token-efficient-tools-2025-02-19` | 内置于所有 Claude 4+ 模型 | 移除（无效） |
| `output-128k-2025-02-19` | 内置于 Claude 4+ 模型 | 移除（无效） |

一旦你移除所有这些并完成切换到自适应思考，你可以将 SDK 调用点从 beta 命名空间切回常规命名空间：

```python
# 之前
response = client.beta.messages.create(
    model="claude-opus-4-5",
    betas=["interleaved-thinking-2025-05-14", "effort-2025-11-24"],
    ...
)

# 之后
response = client.messages.create(
    model="claude-opus-4-6",
    thinking={"type": "adaptive"},
    output_config={"effort": "high"},
    ...
)
```

---

## 从 3.x / 4.0 / 4.1 → 4.6 迁移时的额外变更

如果你从 Opus 4.1、Sonnet 4、Sonnet 3.7 或更旧的 Claude 3.x 模型直接跳转到 4.6，应用上述所有内容*加上*本节中的项目。已在 Opus 4.5 / Sonnet 4.5 上的用户可以跳过此节。

**1. 采样参数：`temperature` 或 `top_p`，不能同时使用。**

在 Claude 4+ 模型上同时传递两者会报错：

```python
# 旧（仅 3.x——在 4+ 上报错）
client.messages.create(temperature=0.7, top_p=0.9, ...)

# 新
client.messages.create(temperature=0.7, ...)  # 或 top_p，不能同时
```

**2. 更新工具版本。**

旧工具版本在 4+ 上不受支持。**`type` 和 `name` 字段都改变**——`text_editor_20250728` 和 `str_replace_based_edit_tool` 是一对；只更新其中一个会 400。还要从文本编辑器集成中移除 `undo_edit` 命令：

| 旧 | 新 |
| ------------------------------------------------- | ------------------------------------------------------- |
| `text_editor_20250124` + `str_replace_editor` | `text_editor_20250728` + `str_replace_based_edit_tool` |
| `code_execution_*`（早期版本） | `code_execution_20260521` |
| `undo_edit` 命令 | *（不再支持——删除调用点）* |

```python
# 之前
tools = [{"type": "text_editor_20250124", "name": "str_replace_editor"}]

# 之后——两个字段都改变
tools = [{"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"}]
```

**3. 处理 `refusal` 停止原因。**

Claude 4+ 可以在响应上返回 `stop_reason: "refusal"`。如果你的代码只处理 `end_turn` / `tool_use` / `max_tokens`，添加一个分支：

```python
if response.stop_reason == "refusal":
    # 将拒绝呈现给用户；不要用相同的提示词重试
    ...
```

**4. 处理 `model_context_window_exceeded` 停止原因（4.5+）。**

不同于 `max_tokens`：它意味着模型达到了*上下文窗口*限制，不是请求的输出上限。两者都要处理：

```python
if response.stop_reason == "model_context_window_exceeded":
    # 上下文窗口耗尽——压缩或拆分对话
    ...
elif response.stop_reason == "max_tokens":
    # 达到请求的输出上限——用更高的 max_tokens 重试或流式传输
    ...
```

**5. 工具调用字符串参数中保留尾部换行（4.5+）。**

4.5 和 4.6 保留旧模型会剥离的尾部换行。如果你的工具实现对工具调用 `input` 值做精确字符串匹配（例如 `if name == "foo"`），验证当模型发送 `"foo\n"` 时它们仍然匹配。在接收端用 `.rstrip()` 规范化通常是最简单的修复。

**6. Haiku：速率限制在代际之间重置。**

Haiku 4.5 有自己独立的速率限制池，与 Haiku 3 / 3.5 分开。如果你在迁移时逐步增加流量，在 [API rate limits](https://platform.claude.com/docs/en/api/rate-limits) 检查你层级的 Haiku 4.5 限制——舒适服务 Haiku 3.5 流量的配额可能需要在 4.5 上提升层级以处理相同量。

---

## 提示词行为变化（Opus 4.5 / 4.6，Sonnet 4.6）

这些不会破坏你的代码，但在 4.5 及更早版本上有效的提示词可能在 4.6 上过度或不足触发。根据需要调优。

**1. 激进指令导致过度触发。** Opus 4.5 和 4.6 比早期模型更严格地遵循系统提示词。为*克服*旧 reluctance 而编写的提示词现在过于激进：

| 之前（在 4.0 / 4.5 上有效） | 之后（在 4.6 上使用） |
| ------------------------------------------- | ----------------------------------------- |
| `CRITICAL: You MUST use this tool when...` | `Use this tool when...` |
| `Default to using [tool]` | `Use [tool] when it would improve X` |
| `If in doubt, use [tool]` | *（删除——不再需要）* |

如果模型现在过度触发某个工具或技能，修复几乎总是降低语言强度，而不是添加更多防护栏。

**2. 过度思考和过多探索（Opus 4.6）。** 在较高的 `effort` 设置下，Opus 4.6 在回答前探索更多。如果这消耗了太多思考 token，先降低 `effort`（`medium` 通常是最佳平衡点），然后再添加文字指令来约束推理。

**3. 过度积极生成子代理（Opus 4.6）。** Opus 4.6 对委托给子代理有强烈偏好。如果你看到它为简单的 `grep` 或 `read` 就能解决的事情生成子代理，添加指导：*"Use subagents only for parallel or independent workstreams. For single-file reads or sequential operations, work directly."*

**4. 过度工程（Opus 4.5 / 4.6）。** 两个模型都可能添加超出要求的额外文件、抽象或防御性错误处理。如果你想要最小更改，明确提示：*"Only make changes directly requested. Don't add helpers, abstractions, or error handling for scenarios that can't happen."*

**5. LaTeX 数学输出（Opus 4.6）。** Opus 4.6 默认为 LaTeX（`\frac{}{}`、`$...$`）用于数学和技术内容。如果你需要纯文本，明确指示：*"Format all math as plain text — no LaTeX, no `$`, no `\frac{}{}`. Use `/` for division and `^` for exponents."*

**6. 跳过的口头摘要（4.6 系列）。** 4.6 模型更简洁，可能跳过工具调用后的摘要段落，直接跳到下一个操作。如果你依赖这些摘要来获取可见性，添加：*"After completing a task that involves tool use, provide a brief summary of what you did."*

**7. "Think"作为触发词（Opus 4.5 思考禁用时）。** 当 `thinking` 关闭时，Opus 4.5 对*think*一词特别敏感，可能比你想的更多推理。改用 `consider`、`evaluate` 或 `reason through`。

---

## 模型 ID 重命名快速参考

| 旧字符串（迁移源） | 新字符串 |
| ------------------------------ | ------------------ |
| `claude-opus-4-7` | `claude-opus-4-8` |
| `claude-opus-4-6` | `claude-opus-4-8` |
| `claude-opus-4-5` | `claude-opus-4-8` |
| `claude-opus-4-1` | `claude-opus-4-8` |
| `claude-opus-4-0` | `claude-opus-4-8` |
| `claude-mythos-preview` | `{{MYTHOS_ID}}`（Project Glasswing）或 `{{FABLE_ID}}` |
| `claude-sonnet-4-6` | `{{SONNET_NEXT_ID}}` |
| `claude-sonnet-4-5` | `{{SONNET_NEXT_ID}}` |
| `claude-sonnet-4-0` | `{{SONNET_NEXT_ID}}` |

旧别名（`claude-opus-4-7`、`claude-opus-4-6`、`claude-opus-4-5`、`claude-sonnet-4-6`、`claude-sonnet-4-5` 等）仍然活跃，如果你需要时间升级可以固定——参见 `shared/models.md` 获取完整旧版列表。

### Amazon Bedrock 模型 ID

如果代码使用 `AnthropicBedrockMantle` 客户端（Python `anthropic[bedrock]`、TypeScript `@anthropic-ai/bedrock-sdk`、Java `BedrockMantleBackend`、Go `bedrock.NewMantleClient` 等）或目标为 `https://bedrock-mantle.{region}.api.aws/anthropic`，它运行在 **Amazon Bedrock 上的 Claude**。本指南中的所有破坏性变更在那里同样适用——它提供相同的 Messages API 形式——但模型 ID 带有 `anthropic.` 提供商标签：

| 第一方 ID | Bedrock ID |
|---|---|
| `claude-opus-4-8` | `anthropic.claude-opus-4-8` |
| `claude-opus-4-7` | `anthropic.claude-opus-4-7` |
| `{{SONNET_NEXT_ID}}` | `anthropic.{{SONNET_NEXT_ID}}` |
| `claude-haiku-4-5` | `anthropic.claude-haiku-4-5` |

迁移 Bedrock 文件时，应用与第一方相同的重命名表行，然后保留/添加 `anthropic.` 前缀。**不要**为 Bedrock 客户端生成第一方 `claude-*` ID——它会 400。

**Bedrock 跳过：** `code_execution_*` 工具版本清单项目和**任务预算**章节——两者在 Bedrock 上都不可用（参见 `shared/platform-availability.md` 获取每功能表格）。本指南中的其他所有内容——`effort`、自适应/扩展思考、`output_config.format`、`thinking.display`、细粒度工具流式传输、token 计数——在 Bedrock 上都可用。

> **超出范围：** 旧版 Amazon Bedrock 集成（`InvokeModel` / `Converse` API，使用 ARN 版本化 ID 如 `anthropic.claude-3-5-sonnet-20241022-v2:0`）使用不同的请求形式和模型 ID 格式。本指南不涵盖它；如果用户在两个 Bedrock 集成之间迁移，WebFetch `shared/live-sources.md` 中的 Bedrock 页面。

### AWS 上的 Claude 平台

如果代码使用 `AnthropicAWS` / `AnthropicAws` / `anthropicaws.NewClient` / `AnthropicAwsClient`（或目标为 `https://aws-external-anthropic.{region}.api.aws`），它运行在 **AWS 上的 Claude 平台**——Anthropic 运营，同日 API 对等。模型 ID 是**裸第一方**字符串；**逐字**应用上方的重命名表和本指南中每个破坏性变更章节。没有需要跳过的。**不要**添加 `anthropic.` 前缀（那是 Amazon Bedrock，一个单独的产品）。参见 `shared/claude-platform-on-aws.md` 了解客户端/认证详情。

---

## 迁移清单

每个项目都标记为：**`[BLOCKS]`** 项目如果被忽略会导致 400 错误、无限循环、静默超时或错误的工具选择——将它们作为代码编辑应用，而不是建议。**`[TUNE]`** 项目是质量/成本调整。

对于每个调用 `messages.create()` / 等效 SDK 方法的文件：

- [ ] **[BLOCKS]** 将 `model=` 字符串更新为新别名
- [ ] **[BLOCKS]** 将 `budget_tokens` 替换为 `thinking={"type": "adaptive"}`（在 Opus 4.6 / Sonnet 4.6 上已弃用）
- [ ] **[BLOCKS]** 将 `format` 从顶级 `output_format` 移到 `output_config.format`
- [ ] **[BLOCKS]** 如果目标是 Opus 4.6 或 Sonnet 4.6，移除任何助手轮次预填充（参见预填充替换表）
- [ ] **[BLOCKS]** 如果 `max_tokens > ~16000`，切换到流式传输（否则 SDK HTTP 超时）
- [ ] **[TUNE]** 验证工具输入处理解析 JSON 而不是原始字符串匹配序列化输入（4.6 可能以不同方式转义 Unicode / 正斜杠；大多数 SDK 已经将 `block.input` 暴露为解析后的对象）
- [ ] **[TUNE]** 显式设置 `output_config={"effort": "..."}`——特别是从 Sonnet 4.5 迁移到 Sonnet 4.6 时（4.6 默认为 `high`）
- [ ] **[TUNE]** 移除 GA beta 头：`effort-2025-11-24`、`fine-grained-tool-streaming-2025-05-14`、`token-efficient-tools-2025-02-19`、`output-128k-2025-02-19`；切换到自适应思考后移除 `interleaved-thinking-2025-05-14`
- [ ] **[TUNE]** 将所有 beta 移除后，将 `client.beta.messages.create(...)` → `client.messages.create(...)`
- [ ] **[TUNE]** 审查系统提示词中的激进工具语言（`CRITICAL:`、`MUST`、`If in doubt`）并降低强度

**从 3.x / 4.0 / 4.1 迁移时的额外项目：**
- [ ] **[BLOCKS]** 移除 `temperature` 或 `top_p` 之一（在 Claude 4+ 上同时传递两者会 400）
- [ ] **[BLOCKS]** 将文本编辑器工具 `type` 更新为 `text_editor_20250728`
- [ ] **[BLOCKS]** 将文本编辑器工具 `name` 更新为 `str_replace_based_edit_tool`——**只更改 `type` 而保留 `name: "str_replace_editor"` 会返回 400**
- [ ] **[BLOCKS]** 将代码执行工具更新为 `code_execution_20260521`
- [ ] **[BLOCKS]** 删除任何 `undo_edit` 命令调用点
- [ ] **[TUNE]** 添加 `stop_reason == "refusal"` 处理
- [ ] **[TUNE]** 添加 `stop_reason == "model_context_window_exceeded"` 处理（4.5+）
- [ ] **[TUNE]** 验证工具参数字符串匹配能容忍尾部换行（在 4.5+ 上保留）
- [ ] **[TUNE]** 如果迁移到 Haiku 4.5：审查速率限制层级（与 Haiku 3.x 不同的池）

**验证：**
- [ ] 运行一个测试请求并检查 `response.stop_reason`、`response.usage`，以及工具使用/思考行为是否符合预期

对于缓存提示词：渲染顺序和哈希输入没有改变，所以现有的 `cache_control` 断点继续有效。但是，**更改模型字符串会使现有缓存失效**——新模型上的第一个请求会重新写入缓存。

---

## 迁移到 Opus 4.7

> **模型 ID `claude-opus-4-7` 以此处所写为准。** 当用户要求迁移到 Opus 4.7 时，准确写入 `model="claude-opus-4-7"`。**不要** WebFetch 验证——本指南是迁移目标 ID 的真实来源。相应条目存在于 `shared/models.md` 中。

Claude Opus 4.7 在发布时是 Anthropic 最强大的模型，现在是上一代 Opus（Opus 4.8 是当前版本——参见下方迁移到 Opus 4.8）。它高度自主，在长期代理工作、知识工作、视觉任务和记忆任务上表现出色。本节总结了 4.7 发布时的所有新内容，对于从 Opus 4.6 或更旧版本迁移的调用者，它仍然是分层的破坏性变更路径。它分层在上方 4.6 迁移之上——如果调用者从 Opus 4.5 或更旧版本跳转，先应用 4.6 变更，然后本节，然后 4.8 章节。

**已在 Opus 4.6 上的人的摘要：** 将模型 ID 更新为 `claude-opus-4-7`，剥离任何剩余的 `budget_tokens` 和采样参数（两者在 Opus 4.7 上都 400），给 `max_tokens` 额外余量并用 `count_tokens()` 对照新模型重新基线，如果推理面向用户则选择加入 `thinking.display: "summarized"`，然后重新调优 `effort`——它在 4.7 上比任何之前的 Opus 都重要。

### 破坏性变更（在 Opus 4.7 上会 400）

**扩展思考已移除。**

`thinking: {type: "enabled", budget_tokens: N}` 在 Claude Opus 4.7 或更高版本上不再支持，返回 400 错误。切换到自适应思考（`thinking: {type: "adaptive"}`）并使用 effort 参数控制思考深度。自适应思考在 Claude Opus 4.7 上**默认关闭**：没有 `thinking` 字段的请求不启用思考运行，匹配 Opus 4.6 行为。显式设置 `thinking: {type: "adaptive"}` 以启用它。

```python
# 之前（Opus 4.6）
client.messages.create(
    model="claude-opus-4-6",
    max_tokens=64000,
    thinking={"type": "enabled", "budget_tokens": 32000},
    messages=[{"role": "user", "content": "..."}],
)

# 之后（Opus 4.7）
client.messages.create(
    model="claude-opus-4-7",
    max_tokens=64000,
    thinking={"type": "adaptive"},
    output_config={"effort": "high"},  # 或 "max"、"xhigh"、"medium"、"low"
    messages=[{"role": "user", "content": "..."}],
)
```

如果调用者没有使用扩展思考，不需要更改——思考默认关闭，或可以用 `thinking={"type": "disabled"}` 显式设置。

完全删除 `budget_tokens` 管道。对于替换的 `effort` 值，参见下方**在 Opus 4.7 上选择 effort 级别**——没有精确的 1:1 映射。

**采样参数已移除。**

`temperature`、`top_p` 和 `top_k` 参数在 Claude Opus 4.7 上不再接受。包含它们的请求返回 400 错误。从请求载荷中移除这些字段。提示词是在 Claude Opus 4.7 上引导模型行为的推荐方式。如果你使用 `temperature = 0` 来获得确定性，注意它在之前的模型上也不能保证相同输出。

```python
# 之前——在 Opus 4.7 上报错
client.messages.create(temperature=0.7, top_p=0.9, ...)

# 之后
client.messages.create(...)  # 无采样参数
```

- **如果意图是确定性**——使用 `effort: "low"` 配合更紧的提示词。
- **如果意图是创意变化**——提示词替换取决于用例；**询问用户**他们希望如何获得变化。如果不能问，添加适合用例的指令，类似*"选择偏离常规且有趣的东西"*——例如对于文本生成，*"在不同响应中变化措辞和结构"*；对于前端/设计，使用下方**设计和前端编码**下的提出 4 个方向方法。

### 在 Opus 4.7 上选择 effort 级别

`budget_tokens` 控制思考*多少*；`effort` 控制思考*和行动*多少，所以没有精确的 1:1 映射。**在编码和代理用例中使用 `xhigh` 获得最佳结果，对大多数智能敏感用例至少使用 `high`。** 尝试其他级别以进一步调优 token 使用和智能：

| 级别 | 使用时机 | 说明 |
| --- | --- | --- |
| `max` | 值得在天花板测试的智能密集任务 | 在某些用例中可能有收益，但可能因 token 使用增加而递减；可能倾向于过度思考 |
| `xhigh` | **大多数编码和代理用例** | 这些的最佳设置；在 Claude Code 中用作默认值 |
| `high` | 一般智能敏感用例 | 平衡 token 使用和智能；推荐的大多数智能敏感工作的最低值 |
| `medium` | 需要减少 token 使用的成本敏感用例，以智能为代价 | |
| `low` | 短期、范围明确的任务和非智能敏感的延迟敏感工作负载 | |

### 静默默认值变更（无错误，但行为不同）

**思考内容默认省略。**

思考块仍出现在 Claude Opus 4.7 的响应流中，但它们的 `thinking` 字段为空，除非你显式选择加入。这与 Claude Opus 4.6 不同，后者默认返回摘要思考文本。要在 Claude Opus 4.7 上恢复摘要思考内容，将 `thinking.display` 设置为 `"summarized"`。**块字段名未变**——它仍然是 `thinking` 类型块上的 `block.thinking`；不要重命名它。

**检测方式：** 任何从 `thinking` 类型块读取 `block.thinking`（或等效）并在 UI、日志或跟踪中渲染的代码。**修复是请求参数，不是响应处理**——在 `thinking` 参数中添加 `display: "summarized"`：

```python
thinking={"type": "adaptive", "display": "summarized"}  # "display" 在 Opus 4.7 上是新的；值："omitted"（默认）| "summarized"
```

默认值为 Claude Opus 4.7 上的 `"omitted"`。如果思考内容从未在任何地方展示，不需要更改。如果你的产品将推理流式传输给用户，新默认值表现为输出开始前的长暂停；设置 `display: "summarized"` 以恢复思考期间的可见进度。

**更新的 token 计数。**

Claude Opus 4.7 和 Claude Opus 4.6 的 token 计数方式不同。相同的输入文本在 Claude Opus 4.7 上产生的 token 数比 Claude Opus 4.6 多，`/v1/messages/count_tokens` 对 Claude Opus 4.7 返回的 token 数与 Claude Opus 4.6 不同。Claude Opus 4.7 的 token 效率因工作负载形状而异。提示词干预、`task_budget` 和 `effort` 可以帮助控制成本并确保适当的 token 使用。**更新你的 `max_tokens` 参数以提供额外余量，包括压缩触发器。** Claude Opus 4.7 在标准 API 定价下提供 1M 上下文窗口，无长上下文溢价。

其他需要检查的：

- 针对 4.6 校准的客户端 token 估算器（tiktoken 风格的近似）
- 将 token 乘以固定每 token 费率的成本计算器
- 基于测量 token 计数的速率限制重试阈值

通过在调用者提示词的代表性样本上重新运行 `client.messages.count_tokens()` 对照 `claude-opus-4-7` 来重新基线。不要应用统一乘数。对于成本敏感的工作负载，考虑降低 `effort` 一个级别（例如 `high` → `medium`）。对于代理循环，考虑采用任务预算（下方）。

### 新功能：任务预算（beta）

Opus 4.7 引入了**任务预算**——告诉 Claude 在完整代理循环（思考 + 工具调用 + 最终输出）中有多少 token。模型看到运行倒计时，并用它来优先处理工作，在预算消耗时优雅地收尾。

这是**模型感知的建议**，不是硬上限。它不同于 `max_tokens`，后者仍然是强制的每响应限制且*不*面向模型。当你想让模型自我调节时使用 `task_budget`；使用 `max_tokens` 作为硬上限来限制使用量。

需要 beta 头 `task-budgets-2026-03-13`：

```python
client.beta.messages.create(
    betas=["task-budgets-2026-03-13"],
    model="claude-opus-4-7",
    max_tokens=64000,
    thinking={"type": "adaptive"},
    output_config={
        "effort": "high",
        "task_budget": {"type": "tokens", "total": 128000},
    },
    messages=[...],
)
```

为开放式代理任务设置充足的预算，对延迟敏感的任务收紧。**最低 `task_budget.total` 为 20,000 token。** 如果预算对任务来说太严格，模型可能完成得不够彻底，引用预算作为约束。**不要在迁移期间添加 `task_budget`，除非你确定预算值正确**——如果你能运行工作负载并测量，就这样做；否则询问用户值而不是猜测。这是抵消代理工作负载 token 计数变化的主要手段。

### 能力改进

**高分辨率视觉。** Opus 4.7 是第一个支持高分辨率图像的 Claude 模型。最大图像分辨率为**长边 2576 像素**（Opus 4.6 及之前为 1568px）。这解锁了视觉密集工作负载的收益，特别是计算机使用和截图/工件/文档理解。模型返回的坐标现在与实际像素 1:1 映射，所以不需要缩放因子计算。

高分辨率支持在 Opus 4.7 上是**自动的**——无需 beta 头，无需客户端选择加入。模型接受更大的输入并开箱即用地返回像素精确坐标。

**Token 成本。** Opus 4.7 上的全分辨率图像可能使用比之前模型多约 3× 的图像 token（每张图像最多约 4784 token，之前上限约 1,600 token）。如果不需要额外的保真度，在发送前在客户端降采样以控制成本——但**不要在迁移期间默认添加降采样**。如果你不确定管道是否需要保真度，询问用户而不是猜测。在 Opus 4.7 上用代表性图像使用 `count_tokens()` 在应对任何测量到的成本变化之前重新基线。

除了分辨率，Opus 4.7 还改进了低级感知（指向、测量、计数）和自然图像边界框定位和检测。

**知识工作。** 在模型视觉验证自己输出的任务上有显著收益——`.docx` 红线标注、`.pptx` 编辑和程序化图表/图形分析（例如通过图像处理库的像素级数据转录）。如果提示词有脚手架如*"在返回之前仔细检查幻灯片布局"*，尝试移除它并重新基线。

**记忆。** Opus 4.7 更擅长编写和使用基于文件系统的记忆。如果代理在轮次之间维护草稿本、笔记文件或结构化记忆存储，该代理在记下笔记和在未来任务中利用笔记方面应该有所改进。

**面向用户的进度更新。** Opus 4.7 在长期代理跟踪中提供更规律、更高质量的中间更新。如果系统提示词有脚手架如*"每 3 次工具调用后，总结进度"*，尝试移除它以避免过多的面向用户文本。如果 Opus 4.7 更新的长度或内容不适合你的用例，在提示词中明确描述这些更新应该是什么样子并提供示例。

### 实时网络安全防护

涉及禁止或高风险主题的请求可能导致拒绝。

### 快速模式：仅限 Opus 4.8 / 4.7

快速模式在 Opus 4.8 和 Opus 4.7 上可用。仅当调用者的代码实际使用快速模式时才展示此内容（例如 `model="claude-opus-4-6-fast"`，或在不支持的模型上的 `speed="fast"`）；如果代码中没有出现"fast"一词，不要提及快速模式。

当你看到 `model="claude-opus-4-6-fast"`（或任何退役的 `-fast` 模型字符串）时，**迁移编辑是**将快速模式流量移到 Opus 4.8，持久的快速模式可用层：

```python
# 在 Opus 4.8 上请求快速模式。
client.beta.messages.create(
    model="claude-opus-4-8", max_tokens=4096,
    speed="fast", betas=["fast-mode-2026-02-01"],
    messages=[...],
)
```

即：将模型切换到 Opus 4.8 并以受支持的方式请求快速模式，使用 beta `client.beta.messages.…` 端点、`fast-mode-2026-02-01` beta 标志和 `speed="fast"` 作为顶级请求参数（每语言形式见 SKILL.md § 快速模式）。Opus 4.7 也支持快速模式，但它本身正在退役（快速模式在约 2026 年 7 月 25 日默认移除），所以将 Opus 4.8 作为持久选择，而不是落在即将失去快速模式的层上。**不要**将代码留在退役的 `-fast` 模型字符串上——失败模式因版本而异：`claude-opus-4-6-fast` 已退役，API **静默回退**到标准 Opus 4.6（无错误——调用者在不知不觉中失去快速模式速度）；`claude-opus-4-7-fast` 一旦移除将返回 **API 错误**（硬失败——请求完全中断而不是降级）。无论哪种情况，现在迁移到 Opus 4.8 快速模式。

### 行为变化（提示词可调优）

这些不会破坏任何东西，但为 Opus 4.6 调优的提示词可能有不同的效果。Opus 4.7 比 4.6 更具可控性，所以小的提示词推动通常能弥合差距。

**更字面的指令遵循。** Claude Opus 4.7 比 Claude Opus 4.6 更字面和显式地解释提示词，特别是在较低的 effort 级别。它不会静默将指令从一个项目推广到另一个，也不会推断你没有提出的请求。这种字面主义的优点是精确性和更少的浪费。它通常对精心调优提示词、结构化提取和需要可预测行为的管道的 API 用例表现更好。提示词和框架审查对迁移到 Claude Opus 4.7 特别有帮助。

**冗长度校准到任务复杂度。** Opus 4.7 将响应长度缩放到它判断的任务复杂度，而不是默认固定冗长度——简单查询的较短答案，开放式分析的更长答案。如果产品依赖特定长度或风格，在提示词中显式调优。要减少冗长度：

> *"Provide concise, focused responses. Skip non-essential context, and keep examples minimal."*

如果你看到特定类型的过度冗长（例如过度解释），添加针对那些的指令。展示所需简洁度的正面示例往往比告诉模型不要做什么的负面示例或指令更有效。**不要**假设现有的"简洁"指令应该被移除——先测试。

**语气和写作风格。** Opus 4.7 更直接和更有主见，比 Opus 4.6 更温暖的风格少了更多验证性措辞和更少表情符号。与任何新模型一样，长文的散文风格可能变化。如果产品依赖特定声音，对照新基线重新评估风格提示词。如果需要更温暖或更对话式的声音，指定：

> *"Use a warm, collaborative tone. Acknowledge the user's framing before answering."*

**`effort` 比任何之前的 Opus 都更重要。** Opus 4.7 更严格地遵守 `effort` 级别，特别是在低端。在 `low` 和 `medium` 上，它将工作范围限定在要求的内容，而不是超越——适合延迟和成本，但在 `low` 上的中等任务有一些思考不足的风险。

- 如果在复杂问题上出现浅层推理，将 `effort` 提高到 `high` 或 `xhigh`，而不是用提示词绕过。
- 如果 `effort` 必须保持 `low` 以获得低延迟，添加有针对性的指导：*"This task involves multi-step reasoning. Think carefully through the problem before responding."*
- **在 `xhigh` 或 `max` 上，设置大的 `max_tokens`**，让模型有空间在工具调用和子代理之间思考和行动。从 64K 开始然后调优。（`xhigh` 是 Opus 4.7 上的新 effort 级别，在 `high` 和 `max` 之间。）

自适应思考触发也是可控的。如果模型思考得比期望更频繁——这可能发生在大型或复杂系统提示词上——添加：*"Thinking adds latency and should only be used when it will meaningfully improve answer quality — typically for problems that require multi-step reasoning. When in doubt, respond directly."*

**默认更少使用工具。** Opus 4.7 倾向于比 4.6 更少使用工具，更多使用推理。这在大多数情况下产生更好的结果，但对于依赖工具的产品（搜索/检索、函数调用、计算机使用步骤），它可能降低工具使用率。两个手段：

- **提高 `effort`**——`high` 或 `xhigh` 在代理搜索和编码中显示更多工具使用，对知识工作特别有用。
- **用提示词引导**——在工具描述或系统提示词中明确何时以及如何使用工具，并鼓励模型倾向于更多使用：

> *"When the answer depends on information not present in the conversation, you MUST call the `search` tool before answering — do not answer from prior knowledge."*

**默认更少子代理。** Opus 4.7 倾向于比 4.6 生成更少子代理。这是可控的——给出何时委托的明确指导。对于编码代理，例如：

> *"Do NOT spawn a subagent for work you can complete directly in a single response (e.g. refactoring a function you can already see). Spawn multiple subagents in the same turn when fanning out across items or reading multiple files."*

**设计和前端编码。** Opus 4.7 比 4.6 有更强的设计直觉，有一致的默认房屋风格：温暖的奶油/灰白背景（约 `#F4F1EA`）、衬线展示字体（Georgia、Fraunces、Playfair）、斜体文字强调和赤陶/琥珀色强调。这对编辑、酒店和作品集简报效果很好，但对仪表板、开发工具、金融科技、医疗保健或企业应用感觉不合适——它也出现在幻灯片和 Web UI 中。

默认是持久的。通用指令（"不要用奶油色"、"让它干净简约"）往往将模型切换到不同的固定调色板，而不是产生多样性。两种方法可靠地工作：

1. **指定具体的替代方案。** 模型精确遵循显式规范——给出确切的十六进制值、字体和布局约束。
2. **让模型在构建前提出选项。** 这打破默认并给用户控制权：

   > *"Before building, propose 4 distinct visual directions tailored to this brief (each as: bg hex / accent hex / typeface — one-line rationale). Ask the user to pick one, then implement only that direction."*

如果调用者之前依赖 `temperature` 获得设计多样性，使用方法 (2)——它在不同运行中产生有意义的不同方向。

Opus 4.7 也比之前的模型需要更少的前端设计提示词来避免通用的"AI 泡沫"美学。之前的模型需要冗长的反泡沫片段，Opus 4.7 用更短的推动生成独特、创意的前端。此片段与上述多样性方法配合良好：

> *"NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white or dark backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character. Use unique fonts, cohesive colors and themes, and animations for effects and micro-interactions."*

**交互式编码产品。** Opus 4.7 的 token 使用和行为在具有单个用户轮次的自主异步编码代理与具有多个用户轮次的交互式同步编码代理之间可能不同。具体来说，它倾向于在交互式设置中使用更多 token，主要是因为它在用户轮次后推理更多。这可以改善长期交互式编码会话中的长期连贯性、指令遵循和编码能力，但也带来更多 token 使用。为了在编码产品中最大化性能和 token 效率，使用 `effort: "xhigh"` 或 `"high"`，添加自主功能（如自动模式），并减少需要的人工交互次数。

当限制需要的人工交互时，在第一个人类轮次中提前指定任务、意图和相关约束。良好指定、清晰准确的任务描述有助于最大化自主性和智能，同时最小化用户轮次后的额外 token 使用——因为 Opus 4.7 比之前的模型更自主，这种使用模式有助于最大化性能。相比之下，通过多个用户轮次逐步传达的模糊或不足的提示词往往会降低 token 效率，有时还会降低性能。

**代码审查。** Opus 4.7 在发现 bug 方面比之前的模型有显著改进，召回率和精确率都更高。然而，如果代码审查框架是为早期模型调优的，最初可能显示*更低*的召回率——这可能是框架效应，不是能力回退。当审查提示词说"只报告高严重性问题"、"保守"或"不要挑刺"时，Opus 4.7 比早期模型更忠实地遵循该指令：它同样彻底地调查、识别 bug，然后拒绝报告它判断低于 stated 标准的发现。精确率上升，但即使底层 bug 发现能力提高了，测量的召回率也可能下降。

推荐提示词语言：

> *"Report every issue you find, including ones you are uncertain about or consider low-severity. Do not filter for importance or confidence at this stage — a separate verification step will do that. Your goal here is coverage: it is better to surface a finding that later gets filtered out than to silently drop a bug. For each finding, include your confidence level and an estimated severity so a downstream filter can rank them."*

这可以在没有实际第二步的情况下使用，但将置信度过滤移出发现步骤通常有帮助。如果框架有单独的验证/去重/排名阶段，明确告诉模型在发现阶段的工作是覆盖，不是过滤。如果需要单次自过滤，对标准要具体而不是使用"重要"这样的定性术语——例如*"报告任何可能导致错误行为、测试失败或误导性结果的 bug；只省略纯风格或命名偏好的吹毛求疵"*。在 eval 子集上迭代提示词以验证召回率或 F1 增益。

**计算机使用。** 计算机使用在新的 2576px / 3.75MP 最大值以下的各种分辨率上工作。以 **1080p** 发送图像提供良好的性能和成本平衡。对于特别成本敏感的工作负载，**720p** 或 **1366×768** 是具有强劲性能的低成本选项。测试以找到用例的理想设置；尝试 `effort` 也可以帮助调优行为。

---

## Opus 4.7 迁移清单

每个项目都标记为：**`[BLOCKS]`** 项目如果被忽略会导致 400 错误、无限循环、静默截断或空输出——将它们作为代码编辑应用，而不是建议。**`[TUNE]`** 项目是质量/成本调整——作为推荐呈现给用户。

标记为 **"If…"** 或 **"At…"** 前缀的 **`[BLOCKS]`** 项目是有条件的。在处理列表之前，**扫描文件**检查条件：它是否将思考文本展示到 UI/日志？它是否将 `output_config.effort` 设置为 `"x-high"` 或 `"max"`？它是安全工作负载吗？它是多轮代理循环吗？只应用条件匹配的项目。

- [ ] **[BLOCKS]** 将 `thinking: {type: "enabled", budget_tokens: N}` 替换为 `thinking: {type: "adaptive"}` + `output_config.effort`；完全删除 `budget_tokens` 管道
- [ ] **[BLOCKS]** 从请求构造中剥离 `temperature`、`top_p`、`top_k`
- [ ] **[BLOCKS]** 如果思考内容面向用户或存储在日志中：添加 `thinking.display: "summarized"`（否则渲染文本为空）
- [ ] **[BLOCKS]** 在 `output_config.effort` 为 `xhigh` 或 `max` 时：设置 `max_tokens` ≥ 64000（否则输出在思考中途截断）
- [ ] **[TUNE]** 给 `max_tokens` 和压缩触发器额外余量；在代表性提示词上对 `claude-opus-4-7` 重新运行 `count_tokens()` 以重新基线（无统一乘数）
- [ ] **[TUNE]** 在应对测量变化*之前*重新基线成本和速率限制仪表板
- [ ] **[TUNE]** 按路由重新评估 `effort`——编码/代理使用 `xhigh`，大多数智能敏感工作至少 `high`；它在 4.7 上比任何之前的 Opus 都重要
- [ ] **[TUNE]** 多轮代理循环：采用 API 原生任务预算（`output_config.task_budget`，beta `task-budgets-2026-03-13`，最低 20k token）——这用于限制循环中的*累积*花费；每轮深度由 `effort` 控制
- [ ] **[TUNE]** 检查依赖 4.6 推广意图的模糊或不足指令，更新为更清晰或更精确——4.7 字面遵循
- [ ] **[TUNE]** 工具使用工作负载：在工具描述中添加何时/如何使用的明确指导（4.7 较少主动使用工具）
- [ ] **[TUNE]** 冗长度：在更改之前测试现有的长度指令——4.7 将长度校准到任务复杂度，所以为期望的输出调优而不是假设方向
- [ ] **[TUNE]** 移除强制进度更新脚手架（*"每 N 次工具调用后…"*）
- [ ] **[TUNE]** 移除知识工作验证脚手架（*"仔细检查幻灯片布局…"*）并重新基线
- [ ] **[TUNE]** 如果需要更温暖/更对话式的声音，添加语气指令；在写作密集路由上重新评估风格提示词
- [ ] **[TUNE]** 子代理工具存在：添加显式的生成/不生成指导
- [ ] **[TUNE]** 前端/设计输出：指定具体的调色板/字体，或让模型在构建前提出 4 个视觉方向（默认的奶油/衬线房屋风格是持久的）
- [ ] **[TUNE]** 交互式编码产品：使用 `effort: "xhigh"` 或 `"high"`，添加自主功能（如自动模式）以减少人工交互，并在第一个轮次中提前指定任务/意图/约束
- [ ] **[TUNE]** 代码审查框架：移除或放松"只报告高严重性"/"保守"过滤器，让模型报告每个发现及置信度 + 严重性；将过滤移到下游步骤（4.7 更字面地遵循严重性过滤器，可能降低测量的召回率）
- [ ] **[TUNE]** 视觉密集管道（截图、图表、文档理解）：将图像保留到长边 2576px 的原生分辨率以获得准确性提升；从坐标处理中移除任何缩放因子计算（坐标现在与像素 1:1）。无需 beta 头/选择加入——高分辨率在 Opus 4.7 上是自动的。
- [ ] **[TUNE]** 计算机使用管道：以 1080p 发送截图以获得良好的性能/成本平衡（成本敏感工作负载用 720p 或 1366×768）；尝试 `effort` 调优行为
- [ ] **[TUNE]** 成本敏感图像管道：4.7 上的全分辨率图像使用最多约 4784 token，之前模型约 1,600 token（约 3×）。上传前在客户端降采样可以避免增加，但**不要默认降采样**——如果不确定是否需要保真度，询问用户。在代表性图像上用 `count_tokens()` 重新基线，然后再应对成本变化。

---

## 迁移到 Opus 4.8

> **模型 ID `claude-opus-4-8` 以此处所写为准。** 当用户要求迁移到 Opus 4.8 时，准确写入 `model="claude-opus-4-8"`。**不要** WebFetch 验证——本指南是迁移目标 ID 的真实来源。相应条目存在于 `shared/models.md` 中。

Claude Opus 4.8 是我们最强大的 Opus 层模型——高度自主，在长期代理执行、知识工作和记忆方面达到最先进水平。它分层在上方 Opus 4.7 迁移之上。如果调用者从 Opus 4.6 或更旧版本跳转，先应用 4.6 和 4.7 章节，然后是本章。

**无新破坏性变更。** Opus 4.8 保持与 Opus 4.7 相同的请求表面。在 4.7 上已经有效的调用在 4.8 上不变——仅自适应思考（`thinking: {type: "enabled", budget_tokens: N}` 仍然 400；使用 `{type: "adaptive"}`），采样参数（`temperature`、`top_p`、`top_k`）仍然被拒绝，最后助手轮次预填充仍然 400，`thinking.display` 仍然默认 `"omitted"`，`low`/`medium`/`high`/`xhigh`/`max` effort 级别、任务预算（beta）和高分辨率视觉都与 4.7 上行为相同。4.7 → 4.8 迁移因此是**模型 ID 替换加提示词重新调优**——除了模型字符串外没有必需的代码编辑。

**已在 Opus 4.7 上的人的摘要：** 将模型 ID 交换为 `claude-opus-4-8`。没有其他内容是避免错误所必需的。然后为行为变化重新调优提示词：4.8 比 4.7 叙述*更多*（如果想要 4.7 式的简洁则添加静默默认），以更温暖、更少保留的声音写作，更审慎且更频繁地提问（添加自主指导以收回提问率），并且对搜索、子代理、基于文件的记忆和自定义工具更保守（添加明确的"何时使用此工具"触发）。对于长期代理工作，在一个良好指定的轮次中提前给出完整任务规格并以高 effort 运行。

### 无新 API 破坏性变更（继承自 4.7）

这些都从 Opus 4.7 不变地继承——仅当调用者从 Opus 4.6 或更早版本迁移时才应用它们（参见上方**迁移到 Opus 4.7** 章节的前后对比和 SDK 特定语法）：

- `thinking: {type: "enabled", budget_tokens: N}` → 400。使用 `thinking: {type: "adaptive"}` + `output_config.effort`。
- `temperature`、`top_p`、`top_k` → 400。移除它们；用提示词引导。
- 最后助手轮次预填充 → 400。使用 `output_config.format`（结构化输出）或系统提示词指令。
- `thinking.display` 默认为 `"omitted"`；如果向用户展示推理则设置 `"summarized"`。

如果调用者已在 Opus 4.7 上且这些都干净，这里没有需要更改的。

### 新 API 功能：会话中途系统提示词

你可以在会话中途通过将 `{"role": "system", ...}` 条目直接放在 `messages` 数组中来传递受信任的指令——无需编辑顶级系统提示词并使提示缓存失效。用于应用在会话中途学到的内容：用户传递了异步上下文、模式切换（自动批准启用）、磁盘上的文件变化、剩余 token 预算下降。

```python
messages=[
    {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "...", "content": "..."}]},
    {"role": "system", "content": "This project's codebase is Go. Write code in Go."},
]
```

将这些表述为**上下文，不是命令**。陈述事实并让 Claude 据此行动；避免覆盖风格的语言（"ignore what the user said"、"regardless of the user's request"、"disregard the previous instruction"）。Claude 被训练为保护用户免受似乎与他们作对的指令，该保护也适用于系统角色。无需 beta 头；在 {{OPUS_NAME}} 上可用。有关缓存放置细节和旧模型的 `<system-reminder>` 回退，参见 `shared/prompt-caching.md` 和 `shared/agent-design.md`。

### 能力改进

**长期代理执行。** Opus 4.8 在长期自主代理工作上达到最先进水平——复杂重构和过夜编码运行无需人工纠正即可完成。为了充分利用它，**在一个良好指定的初始轮次中提前给出完整任务规格并以高 effort 运行**（`effort: "high"` 或 `"xhigh"`）。它的长期连贯性部分来自于每步推理更多；结合清晰的提前目标，这种更智能的规划通常产生比之前前沿模型更高效*且*更准确的输出。"提前明确目标"原则映射到两个产品表面：在 Claude Code 中，`/goal` 设置运行方向；使用**托管代理（CMA）**，通过**结果**（`user.define_outcome` 配合可评分的评分标准——框架运行迭代 → 评分 → 修订循环）定义"完成"的含义，参见 `shared/managed-agents-outcomes.md`。

**Effort 是一个要测试的维度，不是固定设置。** 在之前的模型上，许多人习惯性地选择 `xhigh` 以最大化智能。Opus 4.8 有更高的智能上限，所以**从 `high` 作为默认值开始并迭代**，而不是默认 `xhigh`。在你自己的 eval 集上扫描 `medium`、`high` 和 `xhigh`，并按路由权衡智能 ↔ 延迟 ↔ 成本——关系不是单调的：更高的 effort 在代理工作上通常*减少*轮次和总成本，而对于某些任务 `medium` 在更短时间内交付同样好的结果。将 `max` 保留给极难且延迟不敏感的情况。上方**迁移到 Opus 4.7** 章节中的每级 effort 表在 4.8 上不变地适用。

**写作声音和清晰度。** 测试人员一致描述 4.8 的散文比之前的模型更清晰、更温暖、更少保留，有更少的可测量 AI 声音习惯——特别是在较高 effort 下，它接近专家级散文和结构。这与 4.7 转变的方向大致**相反**（4.7 更简洁、更直接、更少验证性措辞）。如果你添加了风格提示词来对抗 4.7 的简洁或注入温暖，在保留之前对照新基线重新评估——它们现在可能过度校正。4.8 也是更好的思考伙伴：更周到、更愿意反驳、更可能从上下文推断正确答案。

**代码审查和调试。** 比 4.7 更强的真实 bug 发现和更清晰的解释——4.7 需要更多的一次性修复，正确识别间歇性不稳定而不是在一次干净运行后宣布"已修复"。4.7 的注意事项仍然适用：如果审查框架说"只报告高严重性问题"或"保守"，4.8 会字面遵循，测量的召回率可能下降，即使底层 bug 发现能力提高了。告诉模型报告一切并在下游过滤（或第二次审查）——参见 4.7 章节中**代码审查**指导的推荐提示词。

### 行为变化（提示词可调优）

这些都不会破坏代码，但为 Opus 4.7 调优的提示词可能有不同的效果。4.8 很好地遵循指令，所以小的、明确的推动可以弥合差距。

**工具触发依赖于表面（搜索和知识）。** 4.8 的工具触发比之前的模型更依赖于表面：有系统提示词时它是高精度/低召回——网页搜索触发稍微更频繁但每次触发运行更少轮次，而知识检索工具（Drive、项目知识、连接文件）触发*更少*。它在确信需要搜索时搜索，否则从上下文回答，这可能降低需要它的任务的研究深度。用明确的搜索优先指令恢复应有的搜索率：

> ```
> <search_first>
> For questions where current information would change the answer (recent events, current roles or prices, version-specific behavior, or anything the user flags as time-sensitive) search before answering rather than answering from memory. For open-ended research requests, begin searching immediately; do not ask a scoping question first unless the request is genuinely ambiguous about what to research.
> </search_first>
> ```

**子代理、记忆和自定义工具的利用不足。** 与搜索分开，4.8 对需要显式"决定使用此功能"步骤的能力持保守态度——基于文件的记忆、子代理委托、自定义工具。除非相当确定需要，否则它不会主动使用复杂或昂贵的能力。这是可控的，因为 4.8 很好地遵循指令——说明*何时*每个能力适用，而不仅仅是它存在：

> *"Before any task longer than a few turns, check your memory file for relevant prior context and write new findings to it as you go. When a task fans out across independent items (many files to read, many tests to run, many candidates to check), delegate to subagents rather than iterating serially."*

同样的手段在**工具描述**级别也有效，不仅在系统提示词：说明*何时*调用工具的规范性描述（例如"当用户询问当前价格或最近事件时调用此工具"）在 4.8 上比仅说明工具功能的描述有显著提升。将触发条件作为每个能力自身 `description` 的一部分。

**更多面向用户的叙述。** 4.8 比 4.7 叙述更多——长工具调用会话中工具调用之间更多文本，默认更长更详细的任务结束总结。如果你之前添加了脚手架来强制中间状态（"每 3 次工具调用后总结进度"），**移除它**——4.8 自己就会这样做。如果叙述对编码代理来说太冗长，显式的静默默认让它表现得像 4.7 而不损失质量：

> *"Default to silence between tool calls. Only write text when you find something, change direction, or hit a blocker — one sentence each. Do not narrate routine actions ('Now I'll...', 'Let me check...', 'Looking at...'). When done: one or two sentences on the outcome. Do not recap every file or test — the user has been following along."*

对于知识工作交付物（报告、分析报告），冗长度对用户偏好或用户轮次中的指令响应非常好——暴露冗长度偏好而不是硬编码长度。

**更审慎——更频繁提问。** 4.8 比之前的 Opus 模型更审慎。在之前会直接做的次要决策上（变量名、默认值、两种等效方法中的哪一个），它倾向于暂停并询问，并且经常在完成任务后以"Want me to also…?"结束，而不是做明显的下一步或干净地停止。这对高风险或不熟悉的代码库是首选，但未校准时会让用户烦恼。在小事上授予自主权，同时在重要事项上保持谨慎（在 Claude Code 测试中，这将提问率降低了约 12 个百分点，且没有增加越界）：

> *"For minor choices (naming, formatting, default values, which approach among equivalents), pick a reasonable option and note it rather than asking. For scope changes or destructive actions, still ask first."*

**思考禁用时的冗长推理。** 使用 `thinking: {type: "disabled"}` 时，4.8 偶尔会将更长的推理解释写入可见响应，当用户想要快速简短的答案时显得冗长。最简单的修复是保持自适应思考开启——设置 `thinking: {type: "adaptive"}`（推荐设置；它根据任务调整思考量）。注意当字段被省略时自适应**不**开启——与 Opus 4.7 一样，没有 `thinking` 字段的请求不启用思考运行，所以显式设置。如果因延迟或成本需要关闭思考，在系统提示词中限定范围：

> *"Respond only with your final answer. Do not include exploratory reasoning, intermediate drafts, diffs you considered but rejected, or meta-commentary about your process."*

### Opus 4.8 迁移清单

每个项目都标记为：**`[BLOCKS]`** 项目如果被忽略会导致 400 错误；**`[TUNE]`** 项目是质量/成本调整——作为推荐呈现给用户。

对于**已在 Opus 4.7 上**的调用者，只有第一项是必需的；其他都是 `[TUNE]`。条件性 `[BLOCKS]` 项目仅在从 Opus 4.6 或更早版本迁移时适用。

- [ ] **[BLOCKS]** 将 `model=` 字符串更新为 `claude-opus-4-8`
- [ ] **[BLOCKS]** *（仅从 Opus 4.6 或更早版本迁移时）* 先应用**迁移到 Opus 4.7** 的破坏性变更——`budget_tokens` → 自适应思考，剥离 `temperature`/`top_p`/`top_k`，移除最后助手轮次预填充。这些在 4.7 上已经 400，在 4.8 上继续 400。
- [ ] **[TUNE]** 长期/代理工作：将完整任务规格放在一个良好指定的首轮中并以 `high` 或 `xhigh` effort 运行（Claude Code：`/goal`；托管代理：带可评分评分标准的 Outcome）
- [ ] **[TUNE]** Effort：在 eval 集上扫描 `medium` / `high` / `xhigh` 并按路由按智能 ↔ 延迟 ↔ 成本权衡选择（默认 `high`，编码/代理用 `xhigh`）
- [ ] **[TUNE]** 研究深度和工具使用：添加搜索优先指令；为子代理、基于文件的记忆和自定义工具添加显式触发指导（4.8 默认对这些不够主动）——在系统提示词*和*每个工具自身的 `description` 中（规范性"在…时调用此工具"的描述有可测量的提升）
- [ ] **[TUNE]** 叙述：移除强制进度脚手架（*"每 N 次工具调用后…"*）；如果编码代理太话多则添加静默默认
- [ ] **[TUNE]** 自主性：添加小决策不询问的指导以降低提问率，同时在范围变更/破坏性操作上保持谨慎
- [ ] **[TUNE]** 写作声音：重新评估为对抗 4.7 直接性而添加的风格提示词——4.8 默认更温暖和更少保留；在保留之前重新基线
- [ ] **[TUNE]** 代码审查框架：保持报告一切-下游过滤的模式（4.8 字面遵循"只高严重性"/"保守"过滤器，可能降低测量的召回率）
- [ ] **[TUNE]** 思考禁用路径：如果推理泄漏到可见响应中，添加仅最终答案指令
- [ ] **[TUNE]** 考虑会话中途系统消息（`messages` 中的 `role:"system"`；无 beta 头）用于应用中途学到的上下文，而不是重建顶级系统提示词并使缓存失效

---

## 迁移到 {{SONNET_NEXT_NAME}}

> **模型 ID `{{SONNET_NEXT_ID}}` 以此处所写为准。** 当用户要求迁移到 {{SONNET_NEXT_NAME}} 时，准确写入 `model="{{SONNET_NEXT_ID}}"`。**不要** WebFetch 验证——本指南是迁移目标 ID 的真实来源。相应条目存在于 `shared/models.md` 中。

{{SONNET_NEXT_NAME}} 在编码和代理工作上大幅改进了 Sonnet 4.6，在许多任务上达到之前的 Opus 层质量。它的 API 表面与 Opus 4.7/4.8 对齐：手动扩展思考已移除（仅自适应或禁用，自适应为默认），非默认采样参数被拒绝。本节分层在上方 Sonnet 4.6 迁移之上——如果调用者从 Sonnet 4.5 或更旧版本跳转，先应用 4.6 变更，然后是本章。

**已在 Sonnet 4.6 上的人的摘要：** 将模型 ID 交换为 `{{SONNET_NEXT_ID}}`。将任何剩余的 `thinking: {type: "enabled", budget_tokens: N}` 替换为 `thinking: {type: "adaptive"}`（过渡逃生舱已消失——现在 400），注意省略 `thinking` 现在运行自适应（4.6 运行思考关闭）。剥离非默认 `temperature`/`top_p`/`top_k`。对照 `{{SONNET_NEXT_ID}}` 重新运行 `count_tokens()`——新分词器对相同文本产生约多 30% 的 token，所以 token 预算限制和成本基线会变化，即使每 token 定价不变。`effort` 默认为 `high`，与 Sonnet 4.6 相同——对最难的编码和代理任务提高到 `xhigh`（{{SONNET_NEXT_NAME}} 支持完整的 `low`/`medium`/`high`/`xhigh`/`max` 范围），在 `xhigh`/`max` 时给 `max_tokens` 余量（新分词器意味着为 Sonnet 4.6 调优的 `max_tokens` 可能截断等效输出）。然后重新调优提示词：{{SONNET_NEXT_NAME}} 比 4.6 更字面地解释指令——遗留的风格/语气指令现在按字面适用；它默认更具代理性并更主动地使用工具和自验证循环（思考禁用时不太热衷于工具——添加显式推动）；它默认提供更好的进行中更新（丢弃强制"每 N 次工具调用总结"脚手架）；带保守报告指令的代码审查框架可能看到更低召回率（告诉它报告一切并在下游过滤）。

### 破坏性变更（在 {{SONNET_NEXT_NAME}} 上会 400）

这些将 Sonnet 线路带到与 Opus 4.7/4.8 相同的请求表面。参见上方**每 SDK 语法参考**获取每种语言的具体写法。

**1. 扩展思考已移除——仅自适应。** `thinking: {type: "enabled", budget_tokens: N}` 返回 400。在 Sonnet 4.6 上仍有效的过渡逃生舱已消失。使用自适应思考配合 effort 提示：

```python
# 之前——在 Sonnet 4.6 上已弃用，现在在 {{SONNET_NEXT_NAME}} 上报错
thinking={"type": "enabled", "budget_tokens": 10000}

# 之后
thinking={"type": "adaptive"},
output_config={"effort": "high"},  # 或对最难的编码/代理任务用 "xhigh"
```

要完全关闭思考，设置 `thinking: {type: "disabled"}`——但在这样做之前参见下方的*自适应 vs 禁用*。

**2. 采样参数被拒绝。** 将 `temperature`、`top_p` 或 `top_k` 设置为非默认值返回 400；省略参数或传递其默认值仍被接受。最安全的迁移是完全省略它们并用提示词引导。如果调用者依赖 `temperature=0` 获得确定性，在迁移注释中注明它从不保证相同输出。

```python
# 之前
client.messages.create(model="claude-sonnet-4-6", temperature=0.2, ...)

# 之后——完全省略
client.messages.create(model="{{SONNET_NEXT_ID}}", ...)
```

**3. 仅 Bedrock：强制 `tool_choice` 需要 `thinking: {type: "disabled"}`。** 在 Amazon Bedrock 上，在 `tool_choice: {type: "tool", name: ...}` 或 `tool_choice: {type: "any"}` 旁传递 `thinking: {type: "disabled"}`。Claude API 和 Vertex AI 不需要此。

**不是请求形式错误，但要处理：网络安全防护。** {{SONNET_NEXT_NAME}} 在网络安全能力上大幅超越 Sonnet 4.6，所以——与 Opus 4.7/4.8 一样——涉及禁止或高风险主题的请求可能被拒绝。作为内容结果处理（如果调用者需要回退路径，参见 {{FABLE_NAME}} 章节中的 `refusal` 停止原因指导）。

**与 Sonnet 4.6 不变：** 助手轮次预填充仍然返回 400（使用 `output_config.format` 或系统提示词指令）；1M token 上下文窗口、128k 最大输出上限、提示缓存、批处理、Files API、PDF 支持、视觉和完整的服务端及客户端工具集都延续。

### 静默默认值变更：省略 `thinking` 时自适应思考开启

在 Sonnet 4.6 上，没有 `thinking` 字段的请求**不**启用思考运行。在 {{SONNET_NEXT_NAME}} 上，相同的请求以**自适应思考**运行。这不是错误——但从未设置 `thinking` 的调用者现在会看到思考输出（并花费思考 token），而之前不会。`max_tokens` 是总输出（思考 + 响应文本）的硬限制，所以在 Sonnet 4.6 上通过省略运行思考关闭的工作负载现在可能截断。要么显式设置 `thinking: {type: "disabled"}` 保持旧行为，要么重新审视 `max_tokens` 为思考留出空间。

### 静默默认值变更：`thinking.display` 默认为 `"omitted"`

`thinking.display` 在 {{SONNET_NEXT_NAME}} 上默认为 `"omitted"`（匹配 Opus 4.7/4.8 和 {{FABLE_NAME}}）；在 Sonnet 4.6 上默认为 `"summarized"`。使用默认值时，`thinking` 块流式传输时文本为空——对流式 UI 来说这看起来像输出前的长暂停。结合上方的自适应默认开启变更，完全省略 `thinking` 的 Sonnet 4.6 调用者现在获得自适应思考*和*空文本思考块。如果你将推理流式传输给用户，显式设置 `thinking: {type: "adaptive", display: "summarized"}`。`display` 仅控制可见性——思考发生并在每个设置下以相同方式计费。

### 新分词器（约多 30% token）

{{SONNET_NEXT_NAME}} 使用与 Opus 4.7/4.8 相同的新分词器。相同输入文本产生的 token 数比 Sonnet 4.6 多约 30%。无请求/响应形式变更，也不需要代码编辑，但**以 token 测量或预算的一切都会变化**：相同文本的 `usage` 字段和 `count_tokens()` 结果更高，1M 上下文窗口容纳更少文本，为 Sonnet 4.6 调优的 `max_tokens` 限制可能截断等效输出。每 token 定价在 $3/$15 标价不变（入门价 $2/$10 每 MTok 持续到 2026-08-31），所以等效请求的成本可能不同。对照 `{{SONNET_NEXT_ID}}` 重新运行 `count_tokens()` 而不是复用对早期模型测量的计数，并在应对测量变化之前重新基线成本仪表板。

### 在 {{SONNET_NEXT_NAME}} 上选择 effort 级别

`effort` 未设置时默认为 `high`（与 Sonnet 4.6 和 Opus 4.8 相同）。{{SONNET_NEXT_NAME}} 支持完整的 `low`/`medium`/`high`/`xhigh`/`max` 范围——第一个有 `xhigh` 的 Sonnet 层模型。**保持大多数工作的 `high` 默认值，对最难的编码和代理任务提高到 `xhigh`**：

| 级别 | 在 {{SONNET_NEXT_NAME}} 上的使用时机 |
| -------- | ----- |
| `max` | 需要绝对最高能力且无 token 约束的任务。在某些用例中可能有收益但可能递减并有时倾向于过度思考——提交前测试 |
| `xhigh` | 最难的编码和代理用例——推荐设置 |
| `high` | 默认值；平衡大多数用例的 token 使用和智能 |
| `medium` | 默认的节省成本降级——与 Sonnet 4.6 在 `high` 时相当 |
| `low` | 短期、范围明确的任务和非智能敏感的延迟敏感工作负载（聊天、简单查询） |

作为迁移时的粗略跨模型映射：{{SONNET_NEXT_NAME}} 在 `medium` 时智能与 Sonnet 4.6 在 `high` 时相当，{{SONNET_NEXT_NAME}} 在 `high` 时与 Sonnet 4.6 在 `max` 时相当。基准测试时，按观察到的思考长度而不是 effort 名称匹配。

{{SONNET_NEXT_NAME}} **严格尊重 effort 级别，特别是在低端**。在 `low` 和 `medium` 上它将工作范围限定在要求的内容，而不是超越——适合延迟和成本，但在 `low` 上的中等复杂任务有思考不足的风险。如果你观察到复杂问题上的浅层推理，**将 effort 提高到 `high` 或 `xhigh` 而不是用提示词绕过**。如果因延迟必须保持 `low`，添加有针对性的指导：

> *"This task involves multi-step reasoning. Think carefully through the problem before responding."*

**在 `xhigh`/`max` 时留 `max_tokens` 余量。** 设置大的输出 token 预算（最高 128k 上限，与 Sonnet 4.6 不变），让模型有空间进行思考和工具调用。在长任务上，自适应思考可能使用预算的大部分；如果预算紧张，你可能看到几乎全是思考后跟截断答案和 `stop_reason: "max_tokens"` 的响应——提高 `max_tokens` 或降到 `medium`。因为 {{SONNET_NEXT_NAME}} 使用新分词器（相同文本约多 30% token），为 Sonnet 4.6 调优的 `max_tokens` 限制可能截断等效输出。

### 自适应 vs 禁用思考

保持自适应思考开启。{{SONNET_NEXT_NAME}} 将思考花费校准到任务复杂度；少量额外延迟通常值得质量增益。如果调用者在 Sonnet 4.6 上关闭思考运行，**先尝试自适应 + `effort: "low"`** 而不是 `thinking: {type: "disabled"}`。

自适应思考的触发行为是可控的。如果模型发出思考块比期望更频繁（这可能发生在大型或复杂系统提示词上），直接提示——并测量对质量的影响：

> *"Thinking adds latency and should only be used when it will meaningfully improve answer quality, typically for problems that require multi-step reasoning. When in doubt, respond directly."*

反过来，如果你在 `medium` 上运行高难度工作负载并看到思考不足，第一个手段是提高 effort；如果需要更精细的控制，直接提示。

### 能力改进

**编码和代理任务。** 相对 Sonnet 4.6 的最大收益在编码和代理任务上。{{SONNET_NEXT_NAME}} 在现有 Sonnet 4.6 提示词上开箱即用。

**高分辨率视觉。** {{SONNET_NEXT_NAME}} 是第一个支持高分辨率图像的 Sonnet 层模型：**长边最大 2576 像素**（Sonnet 4.6 为 1568px）。高分辨率图像可能使用比 Sonnet 4.6 多约 3× 的图像 token（极限时每张图像 4784 vs 1568 token）——如果不需要额外保真度，在发送前降采样以控制 token 成本。无需 beta 头或选择加入。

**计算机使用。** 支持 `computer_20251124` 工具版本（beta 头 `computer-use-2025-11-24`）。能力在 2576px / 3.75MP 最大值以下的各种分辨率上工作；以 **1080p** 发送截图提供良好的性能/成本平衡。对于特别成本敏感的工作负载，**720p** 或 **1366×768** 是具有强劲性能的低成本选项。测试以找到用例的理想设置；尝试 `effort` 也可以帮助调优行为。

### 行为变化（提示词可调优）

这些都不会破坏代码，但为 Sonnet 4.6 调优的提示词可能有不同的效果。{{SONNET_NEXT_NAME}} 密切遵循指令，所以小的明确指令可以弥合差距。

**响应长度和冗长度。** {{SONNET_NEXT_NAME}} 将响应长度校准到任务复杂度，而不是默认固定冗长度——通常在简单查询上更短，开放式分析上更长。如果产品依赖特定冗长度，调优提示词。要减少冗长度：

> *"Provide concise, focused responses. Skip non-essential context, and keep examples minimal."*

如果你看到特定类型的冗长（例如过度解释），添加有针对性的指令来防止。展示所需简洁度的正面示例往往比告诉模型不要做什么更有效。

**工具使用触发。** {{SONNET_NEXT_NAME}} 默认比 Sonnet 4.6 更具代理性，更主动地使用工具和运行自验证循环。**思考禁用时**，模型不太可能主动使用工具或考虑搜索——如果框架在思考关闭时依赖工具调用，在系统提示词中添加显式推动。`effort` 也是手段：`high` 和 `xhigh` 在代理搜索和编码中显示更多工具使用。对于想要更多工具使用的场景，还明确指示何时以及如何使用工具（例如如果网页搜索使用不足，在提示词中描述为什么以及应该如何调用）。

**面向用户的进度更新。** {{SONNET_NEXT_NAME}} 默认在长期代理跟踪中向用户提供规律的更高质量更新。如果框架有强制中间状态消息的脚手架（"每 3 次工具调用后总结进度"），**尝试移除它**。如果更新的长度或内容不适合用例，在提示词中描述它们应该是什么样子并提供示例。

**更字面的指令遵循。** {{SONNET_NEXT_NAME}} 字面且显式地解释提示词，特别是在较低的 effort 级别。它不静默将指令从一个项目推广到另一个，也不推断未提出的请求。优点是精确性——更适合精心调优的提示词、结构化提取和需要可预测行为的管道。如果指令应广泛适用，**显式说明范围**（"Apply this formatting to every section, not just the first one"）。同样的字面主义意味着从 Sonnet 4.6 延续的风格/语气指令现在可能过度适用——在保留之前重新基线"简洁"等遗留行。

**语气和写作风格。** 长文的散文风格可能变化。如果产品依赖特定声音，对照新基线重新评估风格提示词。需要更温暖或更对话式的声音：

> *"Use a warm, collaborative tone. Acknowledge the user's framing before answering."*

因为 `temperature`/`top_p`/`top_k` 在 {{SONNET_NEXT_NAME}} 上不被接受，之前依赖 `temperature` 获得风格多样性的调用者必须改用系统提示词指令。

**代码审查框架。** 为早期模型调优的审查框架最初可能在 {{SONNET_NEXT_NAME}} 上看到更低召回率。这可能是框架效应，不是能力回退：当审查提示词说"只报告高严重性问题"/"保守"/"不要挑刺"时，{{SONNET_NEXT_NAME}} 比早期模型更忠实地遵循该指令——它同样彻底地调查、识别 bug，然后不报告它判断低于 stated 标准的发现。精确率通常上升，但即使底层 bug 发现能力提高了，测量的召回率也可能下降。推荐提示词语言：

> *"Report every issue you find, including ones you are uncertain about or consider low-severity. Do not filter for importance or confidence at this stage — a separate verification step will do that. Your goal here is coverage: it is better to surface a finding that later gets filtered out than to silently drop a real bug. For each finding, include your confidence level and an estimated severity so a downstream filter can rank them."*

这即使没有实际第二步也有效，但将置信度过滤移出发现步骤通常有帮助。如果你确实想要单次自过滤，对标准要具体而不是使用"重要"这样的定性术语——例如"报告任何可能导致错误行为、测试失败或误导性结果的 bug；只省略纯风格或命名偏好的吹毛求疵。"在 eval 子集上迭代以验证召回率/F1 增益。

**设计和前端默认值。** {{SONNET_NEXT_NAME}} 在开放式前端和设计简报上可能固定到一致的默认视觉风格。通用指令（"不要用那个颜色"、"让它干净简约"）往往将它切换到不同的固定调色板，而不是产生多样性。两种方法可靠地工作：**指定具体的替代方案**（模型精确遵循显式规范——给出调色板、排版、布局和间距），或**让模型在构建前提出选项**（例如"Before building, propose 4 distinct visual directions tailored to this brief — bg hex / accent hex / typeface plus a one-line rationale — ask the user to pick one, then implement only that direction"）。因为 `temperature` 在 {{SONNET_NEXT_NAME}} 上不被接受，先提出再选择的方法是获得跨运行有意义不同设计方向的推荐替代方式。要避免通用 AI 美学模式，系统提示词中的简短指令也有帮助：

> *"NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white or dark backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character. Use unique fonts, cohesive colors and themes, and animations for effects and micro-interactions."*

**交互式编码产品。** Token 使用和行为在自主异步编码代理（单用户轮次）和交互式同步编码代理（多用户轮次）之间可能不同。为了最大化性能和 token 效率，使用 `effort: "xhigh"` 或 `"high"`，添加自动模式等自主功能，减少需要的人工交互。在第一个轮次中提前指定任务、意图和约束——良好指定的初始提示词最大化自主性和智能，同时最小化用户轮次后的额外 token 使用；模糊或逐步揭示的提示词往往降低 token 效率，有时还降低性能。

### {{SONNET_NEXT_NAME}} 迁移清单

每个项目都标记为：**`[BLOCKS]`** 项目如果被忽略会导致 400 错误或截断输出；**`[TUNE]`** 项目是质量/成本调整——作为推荐呈现给用户。

- [ ] **[BLOCKS]** 将 `model=` 字符串更新为 `{{SONNET_NEXT_ID}}`
- [ ] **[BLOCKS]** 将 `thinking: {type: "enabled", budget_tokens: N}` 替换为 `thinking: {type: "adaptive"}` + `output_config.effort`——Sonnet 4.6 过渡逃生舱已消失
- [ ] **[BLOCKS]** 从请求构造中剥离 `temperature`、`top_p`、`top_k`（改用系统提示词指令控制语气/多样性）
- [ ] **[BLOCKS]** 仅 Bedrock：在强制 `tool_choice`（`{type: "tool"}` / `{type: "any"}``）旁传递 `thinking: {type: "disabled"}`——Claude API 或 Vertex AI 不需要
- [ ] **[BLOCKS]** 在 `effort: "xhigh"` 或 `"max"` 时：设置大的 `max_tokens`（最高 128k，与 Sonnet 4.6 不变），让模型有空间进行思考和工具调用——Sonnet 4.6 调优的限制在新分词器下可能截断等效输出（症状：`stop_reason: "max_tokens"`）
- [ ] **[TUNE]** 思考字段省略：自适应现在是默认（4.6 运行思考关闭）——要么设置 `thinking: {type: "disabled"}` 保持旧行为，要么重新审视 `max_tokens` 以适应新增思考花费
- [ ] **[TUNE]** `thinking.display` 默认为 `"omitted"`（4.6 默认为 `"summarized"`）：如果你将推理流式传输给用户，显式设置 `thinking: {type: "adaptive", display: "summarized"}`——默认流式传输空文本思考块（输出前的长暂停）
- [ ] **[TUNE]** 新分词器：对照 `{{SONNET_NEXT_ID}}` 重新运行 `count_tokens()`（相同文本约多 30% token）；重新审视接近预期输出长度的 `max_tokens` 和压缩触发器；在应对之前重新基线成本仪表板（每 token 定价不变）
- [ ] **[TUNE]** Effort：保持 `high` 默认值；对最难的编码/代理任务提高到 `xhigh`；`medium` 是节省成本的降级（≈ Sonnet 4.6 在 `high`）；将 `low` 保留给短期、延迟敏感、非智能敏感任务。如果在 `low`/`medium` 上出现浅层推理，提高 effort 而不是用提示词绕过
- [ ] **[TUNE]** 思考关闭的调用者：尝试 `thinking: {type: "adaptive"}` + `effort: "low"` 而不是 `disabled`；如果必须保持 `disabled`，添加显式工具触发推动（模型在思考关闭时不太热衷于工具）
- [ ] **[TUNE]** 工具使用：默认比 4.6 更具代理性（更主动使用工具和自验证）——`effort` 是手段（`high`/`xhigh` 获得更多工具使用）；为使用不足的工具添加何时/如何触发的明确指令
- [ ] **[TUNE]** 丢弃强制进度更新脚手架（"每 N 次工具调用后总结"）——默认更新质量更高；如果仍需调优则描述期望的更新形式
- [ ] **[TUNE]** 重新基线遗留风格/语气/范围指令——指令被字面遵循；当一个指令应广泛适用时显式说明范围
- [ ] **[TUNE]** 冗长度敏感路由：通过提示词调优响应长度（正面示例 > "不要"指令）
- [ ] **[TUNE]** 带保守报告指令的代码审查框架（"只高严重性"、"不要挑刺"）：切换到覆盖优先提示词（报告一切带置信度 + 严重性）并在下游过滤——否则即使 bug 发现能力提高了，测量的召回率也可能下降
- [ ] **[TUNE]** 开放式前端/设计简报：指定具体规范，或让模型提出 3-4 个视觉方向并选择一个（`temperature` 驱动多样性的推荐替代）
- [ ] **[TUNE]** 交互式编码产品：使用 `effort: "xhigh"`/`"high"`，添加自主功能（如自动模式），并将任务/意图/约束放在第一个轮次
- [ ] **[TUNE]** 视觉密集/计算机使用管道：将图像保留到长边 2576px 的原生分辨率以获得准确性提升（如果不需要保真度则降采样以控制图像 token 成本）；对于计算机使用，1080p 截图配合 `computer_20251124` 是良好的性能/成本平衡
- [ ] **[TUNE]** 安全工作负载：添加安全防护拒绝处理（网络能力主题现在可能在 Sonnet 4.6 会回答的地方被拒绝）

---

## 迁移到 {{FABLE_NAME}}

> **模型 ID `{{FABLE_ID}}` 和 `{{MYTHOS_ID}}` 以此处所写为准。** 当用户要求迁移到 {{FABLE_NAME}} 时，准确写入 `model="{{FABLE_ID}}"`；Project Glasswing 中的 Mythos Preview 迁移者写入 `model="{{MYTHOS_ID}}"`（其他所有人：`{{FABLE_ID}}`）。**不要** WebFetch 验证——本指南是迁移目标 ID 的真实来源。相应条目存在于 `shared/models.md` 中。

{{FABLE_NAME}} 是 Anthropic 最强大的广泛发布模型——用于最苛刻的推理和长期代理工作。**{{MYTHOS_NAME}}**（`{{MYTHOS_ID}}`）通过 Project Glasswing 提供相同的能力、定价和 API 行为（参与是唯一访问方式），并接替仅限邀请的 **Claude Mythos Preview**（`claude-mythos-preview`）。本节中的所有内容适用于两个模型——仅 ID 不同。Project Glasswing 中的 Mythos Preview 迁移者目标为 `{{MYTHOS_ID}}`；其他所有人目标为 `{{FABLE_ID}}`。1M token 上下文窗口默认（最大值也是默认值），每请求最多 128K 输出 token。

**仅在用户明确选择时迁移到 {{FABLE_NAME}}。** 它不是默认的 Opus 升级路径——定价高于 Opus 层。对于"升级到最新模型"请求，目标仍然是 `claude-opus-4-8`。

### 破坏性变更（相对于 Opus 层和 Mythos Preview）

1. **思考始终开启——移除所有 `thinking` 配置。** 自适应思考在 `thinking` 参数未设置时自动应用（显式 `{type: "adaptive"}` 也被接受）。任何其他配置被拒绝：`thinking: {type: "disabled"}` 和 `{type: "enabled", budget_tokens: N}` 都返回 400。`budget_tokens` 没有替换——`output_config.effort` 参数是单独的输出级控制，不是思考预算。

   ```python
   # 之前（Mythos Preview / 旧模型）
   client.messages.create(
       model="claude-mythos-preview",
       max_tokens=16000,
       thinking={"type": "enabled", "budget_tokens": 10000},
       messages=[...],
   )

   # 之后（{{FABLE_NAME}}）——完全没有 thinking 字段
   client.messages.create(
       model="{{FABLE_ID}}",
       max_tokens=16000,
       output_config={"effort": "high"},
       messages=[...],
   )
   ```

2. **不支持助手预填充。** 用结构化输出（`output_config.format`）或系统提示词指令替换最后助手轮次预填充——与上方 4.6 系列预填充移除相同的替换模式。（一个例外：回退信用预填充声明——服务器在接受信用时接受回显的助手消息；参见下方拒绝章节。）

3. **不支持交错草稿本**（仅 Mythos Preview 迁移者）。工具间推理改为在思考块中返回，自适应思考在工具调用之间自动产生。

### {{FABLE_NAME}} 和 {{MYTHOS_NAME}} 上的思考输出

在 {{FABLE_NAME}} 和 {{MYTHOS_NAME}} 上，原始思维链永不返回。你收到的是**常规 `thinking` 块**，不是加密块或 `redacted_thinking`：`display: "summarized"` 返回推理的可读摘要，使用 `"omitted"`——默认值，与 Opus 4.8/4.7 相同——响应仍包含 `thinking` 块但 `thinking` 字段为空字符串。`display` 仅控制可见性；思考发生并在每个设置下以相同方式计费。在同一模型上继续对话时，将思考块**不变地**传回 API（标准多轮模式；丢弃或编辑它们会破坏轮次）。

在同一模型上继续时，将每个思考块**完全按收到传回——包括 `thinking` 文本为空的块**。API 拒绝内容被*修改*的块，不拒绝你已读取的块；显示摘要没问题，编辑或重建块不行。

常规思考块不是来源锁定的——它们跨模型回放正常（服务器将它们渲染到目标模型的提示词中）。{{FABLE_NAME}}/{{MYTHOS_NAME}} 思考是例外：来自这些模型的思考块回放到不同模型时会**从提示词中丢弃**而不是渲染——通常是静默的（早期访问版本硬拒绝 `invalid_request_error`；那破坏了工作流并在发布前被恢复，但新行为仍在推出中，所以不要构建依赖任一结果的逻辑）。丢弃发生在提示词定价之前，所以丢弃的块**降低 `usage.input_tokens`**——你不为其计费，也没有需要剥离的成本。也不要剥离*常规*思考块：移除它们可能触发顺序/签名 400。两个规则无论如何适用于回放体：回退信用重试必须**不变地**回显拒绝体，中间输出回退的 `fallback` 块保持在出现的位置。

相关：尝试在*响应文本中*引出模型内部推理的请求可能以 `stop_details.category: "reasoning_extraction"` 拒绝——需要推理可见性的应用应该读取摘要 `thinking` 块而不是提示推理。

### 分词器——与 Opus 4.8 不变

{{FABLE_NAME}} 使用**与 Claude Opus 4.8 相同的分词器**（Opus 4.7 引入的分词器）。从 Opus 4.7/4.8 或 `claude-mythos-preview` 迁移时 token 计数大致不变；每 token 定价不同。

- 从 **Opus 4.7/4.8 或 `claude-mythos-preview`** 迁移：token 计数大致不变。在你自己的工作负载上重新基线成本和延迟以适应每 token 价格差异。
- 从 **Opus 4.6、Sonnet、Haiku 或更旧版本** 迁移：Opus 4.7 分词器将相同内容分词为大约 1×–1.35× 倍多的 token（因内容和工作负载形状而异）。不要复用在旧模型上测量的 token 计数、上下文窗口预算或 `max_tokens` 设置；用 `count_tokens` 重新基线。

要测量你自己提示词的差异，用当前模型调用一次 `count_tokens`，再用 `model: "{{FABLE_ID}}"` 调用一次，比较两个 `input_tokens` 值。

### `refusal` 停止原因——在读取内容之前处理

{{FABLE_NAME}} 对传入请求运行安全分类器，针对研究生物学和大部分网络安全内容（{{FABLE_NAME}} 不适用于这些领域）；良性相邻工作——安全工具、生命科学任务——偶尔可能触发误报，这就是为什么下面的回退模式即使对合法工作负载也很重要。（大多数 Claude 消费者界面附带内置的 Opus 4.8 回退；API 调用者自行配置。）被拒绝的请求返回**成功的 HTTP 200** 和 `stop_reason: "refusal"`，加上 `stop_details` 对象携带策略类别（值如 `"cyber"`、`"bio"`、`"reasoning_extraction"`、`"frontier_llm"` 或 `null`——将 `null` 视为永久有效状态；参见公共文档中的拒绝类别表获取完整集合）。**基于 `stop_reason` 分支，永远不基于 `stop_details`**——`stop_details` 是信息性的，即使在拒绝时也可能为 `null`，`explanation` 不保证存在。注意分类器块和普通模型拒绝（模型自身拒绝）都以 `stop_reason: "refusal"` 出现；`stop_details.category` 告诉你正在处理哪个类别，因此在回退模型上重试是否是正确的响应。分类器可能在**任何输出之前**触发（空 `content` 数组；完全不计费——无输入或输出 token，无速率限制消耗）或**中间流**在部分输出之后（已流式传输的输出按正常费率计费——丢弃部分输出而不是视为完成）。无条件读取 `response.content[0]` 的代码会中断——先检查 `stop_reason`：

```python
response = client.messages.create(model="{{FABLE_ID}}", max_tokens=1024, messages=[...])
if response.stop_reason == "refusal":
    # 分类器拒绝；内容为空（输出前）或部分（中间流）
    handle_refusal()
else:
    print(response.content[0].text)
```

**默认选择加入。** 回退在 API 上不是自动的——没有它们的请求在拒绝时只是停止。迁移和新的 {{FABLE_NAME}} 代码应从第一天起就附带下面的模式 1（在没有服务端支持的提供商上使用模式 2），而不是作为后续加固步骤：在代码中发出选择加入，告诉用户它在那里，只有他们拒绝时才移除。

三种在另一个模型上重试被拒绝请求的方式，按优先级排列：

**1. 服务端 `fallbacks` 参数（beta：Claude API 和 AWS 上的 Claude 平台）——首选。** 一次往返，简单客户端，无客户端逻辑。命名替代模型（发布时唯一支持的回退目标是 `claude-opus-4-8`，预计扩展）；在策略拒绝时 API 在同一请求上运行下一个模型并返回其答案，自动应用信用风格重新定价。最终响应上的 `stop_reason: "refusal"` 表示整个链路拒绝。

```python
response = client.beta.messages.create(
    model="{{FABLE_ID}}",
    max_tokens=1024,
    betas=["server-side-fallback-2026-06-01"],
    fallbacks=[{"model": "claude-opus-4-8"}],
    messages=[{"role": "user", "content": "Hello, Claude"}],
)

# 切换点：每个运行并拒绝此轮次的模型有一个 fallback 块
for block in response.content:
    if block.type == "fallback":
        print(f"{block.from_.model} declined; {block.to.model} continued")

# 服务信号：usage.iterations 中的 fallback_message 表示回退模型
# 运行了；将其与 stop_reason 配对确认回退提供了响应
# （回退模型也可能拒绝）。覆盖粘性轮次。
fallback_ran = any(
    entry.type == "fallback_message" for entry in response.usage.iterations or []
)
if fallback_ran and response.stop_reason != "refusal":
    print(f"Served by {response.model}")
```

关键语义：

- **头必须恰好是 `server-side-fallback-2026-06-01`**——其他 `server-side-fallback-*` 值拒绝 `fallbacks` 参数并返回 400。当前头携带系列的*最早*日期（`-2026-06-09` 和 `-2026-06-02` 是更早的预览）——不要"更正"为看起来更新的日期。在 Batches API 上被拒绝；在 Amazon Bedrock、Vertex AI 或 Microsoft Foundry 上不可用（在那里使用模式 2——SDK 中间件）。条目可能覆盖每跳的 `max_tokens`（独立于顶级 `max_tokens` 限定该次尝试自身的输出）；`thinking`、`output_config` 和 `speed` 覆盖正在推出（`speed` 额外需要其 beta）——在你的请求接受它们之前，每个条目中只包含 `model` 和 `max_tokens`。条目必须不同且必须在请求模型的 `allowed_fallback_models` 中（当 `server-side-fallback-2026-06-01` beta 头设置时在 `/v1/models` 上发布——仅在 `fallback-credit-*` 头下还不可见，在 Amazon Bedrock、Vertex AI 或 Microsoft Foundry 上不暴露）。*合并了条目覆盖的请求*作为对该条目模型的直接请求必须有效。
- **仅在策略拒绝时触发**——速率限制、过载和请求模型上的服务器错误按原样返回，永不回退。
- **读取响应：** `fallback` 内容块（`{"type": "fallback", "from": {"model": ...}, "to": {"model": ...}}`）标记 `content` 中的每个切换点；服务信号是 `usage.iterations` 中的 `fallback_message` 条目（不要依赖块——粘性服务轮次没有）。顶级 `model` 命名产生消息的模型。
- **计费：** `usage.iterations` 是每尝试的真实来源；顶级 `usage` 仅覆盖产生返回消息的尝试。输出前拒绝的尝试被报告但不计费；回退尝试按回退模型的费率计费。每次尝试声明运行它的模型的速率限制——如果回退模型被速率限制或过载，不回退尝试，而是返回之前的拒绝，`stop_details.recommended_model` 命名一个直接重试的模型（推荐是提示，不是保证，无可推荐时为 `null`）——为预期拒绝量调整回退模型限制。
- **粘性路由：** 一旦对话回退，后续非流式请求的 `fallbacks` 由回退模型直接服务约 1 小时（尽力而为；组织范围内容哈希记录，不是消息内容；ZDR 组织不记录）。随时处理请求模型被再次尝试。
- **回显回退轮次：** 中间输出回退后，省略出现在最终 `fallback` 块*之前*的 `thinking`、`redacted_thinking` 和 `tool_use` 块——加上任何没有匹配 `server_tool_result` 的 `server_tool_use` 块，以及任何其他无法识别的模型内部块类型；文本块、配对的服务器工具块和边界之后的所有内容正常回显。`fallback` 块本身是被忽略的审计标记（保留或丢弃）。流式传输：重试在同一流上发生，已接收的内容永不被失效——输出前块是无缝的（`message_start` 命名回退模型；`fallback` 块作为普通 `content_block_start` 到达，在 `content` 中第一个——没有特殊的 SSE 事件类型；注意 `message_start` 仅在拒绝尝试之后到达，所以首字节时间包含它），中间块保留部分，用块标记边界并继续——只有部分的 `text` 块作为继续上下文传递给回退模型（其他块类型留在 `content` 中但不属于它）。粘性路由在初始发布中**不在流式请求上咨询**，所以在流上 `fallback` 块检查是完整信号；非流式中间输出拒绝完全省略拒绝的部分。

**2. SDK 客户端中间件——用于没有服务端回退的提供商（Amazon Bedrock、Vertex AI、Microsoft Foundry）。** 在客户端上注册它，每个 `client.beta.messages` 请求（包括流式传输）自动重试拒绝，将回退模型的事件拼接到开放流上，与模式 1 相同的线路形式（每个边界一个 `fallback` 内容块，每跳 `usage.iterations`）。它也是 beta 表面：中间件默认发送 `fallback-credit-2026-06-01` 头，所以重试通过信用 token 重新定价（用其 `betas` 选项覆盖）。`BetaFallbackState` 将后续轮次固定到接受的模型（服务端粘性路由的客户端模拟）——每个对话复用一个状态对象：

```python
from anthropic import Anthropic, BetaFallbackState, BetaRefusalFallbackMiddleware

client = Anthropic(middleware=[BetaRefusalFallbackMiddleware([{"model": "claude-opus-4-8"}])])
state = BetaFallbackState()  # 将后续轮次固定到接受的模型
with state:
    response = client.beta.messages.create(model="{{FABLE_ID}}", max_tokens=1024, messages=messages)
```

每个对话创建**一个状态**——它是固定范围；在对话之间共享一个会将不相关的线程固定在一起，没有状态的对话永不被固定。每语言命名（来自 GA SDK 示例——不要自行发明）：

- **TypeScript**：客户端 `middleware` 数组中的 `betaRefusalFallbackMiddleware([...])`；传递 `{ fallbackState: state }`（`BetaFallbackState`）作为请求选项。
- **Go**：`option.WithMiddleware(betafallback.BetaRefusalFallbackMiddleware([]anthropic.BetaFallbackParam{{Model: ...}}))`（包 `lib/betafallback`）；状态通过 `betafallback.WithBetaFallbackState(&betafallback.BetaFallbackState{})` 作为请求选项传递。服务端等效：`Fallbacks: []anthropic.BetaFallbackParam{...}` + `anthropic.AnthropicBetaServerSideFallback2026_06_01`。
- **C#**：它是一个*处理器*——`new AnthropicClient { Handlers = [new BetaRefusalFallbackHandler { Fallbacks = [new(Model.ClaudeOpus4_8)] }] }`（命名空间 `Anthropic.Helpers`）；状态通过 `BetaFallbackState.Create()` 用 `using (fallbackState.Use()) { ... }` 按调用作用域。服务端等效：`Fallbacks = [new(Model.ClaudeOpus4_8)]` + `AnthropicBeta.ServerSideFallback2026_06_01`。

对于未列出的语言（Java、Ruby、PHP）——或任何语言的完整可运行程序——每个公共 SDK 仓库在 `examples/` 下有回退示例（例如 `examples/fallbacks.py`、`examples/refusal-fallback/`）：WebFetch `shared/live-sources.md` § SDK 仓库中的仓库，而不是自行发明绑定。

**3. 手动重试 + 回退信用（原始 HTTP，或没有中间件的 SDK）。** 通过 `stop_reason` 检测拒绝并在可用性更广的模型（如 `claude-opus-4-8`）上原样重新发送对话（{{FABLE_NAME}} 的思考块被其他模型静默忽略——无需剥离）；后续轮次继续使用回退模型。**回退信用**（beta：Claude API、AWS 上的 Claude 平台、Amazon Bedrock、Vertex AI 和 Microsoft Foundry）使这些重试更便宜。提示缓存是按模型的，所以简单重试在新模型上支付冷缓存写入。使用 `fallback-credit-2026-06-01` beta 头（在原始请求和重试上都发送），拒绝的 `stop_details` 携带 `fallback_credit_token`（不透明；不可用时为 `null`）和 `fallback_has_prefill_claim`。在重试上将 token 作为顶级 `fallback_credit_token` 请求参数回显（在 GA SDK 中有类型；在 pre-GA SDK 上通过 `extra_body` 传递），之前缓存的跨度按缓存读取费率计费——重试成本与对话一直在该模型上的成本相同。规则：重试体必须在每个提示词塑造字段（`system`、`messages`、`tools`、`tool_choice`、`thinking`——在兑换信用时**不要**剥离思考块——服务器处理它们）上与拒绝请求**完全匹配**；重试模型必须在拒绝模型的 `allowed_fallback_models` 中；token 5 分钟过期；Batches 结果不携带 token。如果 `fallback_has_prefill_claim` 为 `true`，追加一个助手消息回显拒绝响应的 `content`——重试模型从拒绝模型停止的地方继续（已完成的服务器工具工作不会重新运行）。回显时，从最终 `text` 块中剥离尾部空白（预填充验证器拒绝它；信用匹配容忍该编辑），在省略任何未配对的 `tool_use` 块之后。在 400 上，回退到带 token 的未更改体；在命名 `fallback_credit_token` 的 400 上，不带它重试（信用作废）。

**在 v1 预览上构建的代码迁移。** 如果你正在编辑的代码携带以下任何标记，它针对已停止的早期访问表面——迁移到上方的 v2 形式，一起发送头和参数变更（v2 头下的 v1 参数形式是 400）：

| v1 标记（替换） | v2 |
|---|---|
| `server-side-fallback-2026-06-09` / `-2026-06-02` 头 | `server-side-fallback-2026-06-01` |
| `fallback: {model, on_partial}` 单对象 | `fallbacks: [{model, ...}]` 数组（1-3）；`on_partial` 不再存在——部分输出行为是固定的（流保留部分；非流式省略它）。条目中的未知键是 400 |
| 顶级 `response.fallback` 对象（`from_model`、`reason`） | 永不发出——读取 `fallback` 内容块（切换点，无 `reason` 字段）和 `usage.iterations`（服务信号） |
| `event: fallback` SSE 带丢弃索引 | 无专用事件；流式内容永不被失效——切换作为 `fallback` 类型的普通 `content_block_start`/`stop` 对到达 |
| `fallback_primary` / `fallback_retry` 迭代类型 | 阻止的尝试是普通 `message` 条目；服务尝试是 `fallback_message` |
| `reason: "sticky"` | 无 reason 字段——粘性轮次不携带块；通过 `usage.iterations` 中的 `fallback_message` + `response.model` 检测 |
| `recommended_model` 含义"主要服务了拒绝" | 现在仅在回退尝试*无法运行*（速率限制/过载）时填充——它的存在意味着在该模型上直接重试可能成功，不是它也拒绝了 |

### 数据保留要求

{{FABLE_NAME}} 需要 **30 天数据保留**，在零数据保留下不可用。来自数据保留配置不满足要求的组织的请求返回 `400 invalid_request_error`——如果迁移突然 400 且没有明显的请求问题，在调试载荷之前检查组织保留配置。在 Amazon Bedrock、Google Vertex AI 和 Microsoft Foundry 上，数据保留要求由各平台设置。

### 不变延续的内容

与 Opus 层和 Mythos Preview 相同的 Messages API 和工具使用模式。发布时支持：`output_config.effort`（`low`/`medium`/`high`/`xhigh`/`max`）、任务预算（beta、`task-budgets-2026-03-13` 头）、压缩（beta、`compact-2026-01-12` 头）、记忆工具、通过上下文编辑的工具调用清除和高分辨率视觉（无降分辨率上限，与 Opus 4.7+ 相同）。

### 行为变化（提示词可调优）

这些都不是 API 破坏性的，但它们是迁移工作负载感觉不同的地方。{{FABLE_NAME}} 的最大收益在*超越*之前模型能力的工作上（长期自主运行、良好指定系统的首次实现、端到端企业交付物——财务分析、电子表格、幻灯片、文档——代码审查/调试和仓库历史搜索、密集或退化图像上的视觉——它被显式训练为在翻转/模糊/嘈杂输入上使用 bash 和裁剪工具——导航模糊性、并行子代理委托和协作——它可靠地维持与长期运行子代理和对等代理的持续通信；注意 bug 发现收益不包括安全分析，那里应用网络分类器）——不要仅在旧模型已处理的工作负载上评估它。

**默认更长的轮次——最大的结构变化。** 困难任务上的单个请求在较高 effort 下可能运行很多分钟（当任务涉及收集上下文、构建和自验证时，15 分钟的单个请求是正常的）。迁移之前，规划超时、流式传输和面向用户的进度指示；构建工作使调用者异步检查运行而不是在一个请求内阻塞。在模糊任务上 {{FABLE_NAME}} 可能需要小推动以避免过度规划：

> When you have enough information to act, act. Do not re-derive facts already established in the conversation, re-litigate a decision the user has already made, or narrate options you will not pursue in user-facing messages. If you are weighing a choice, give a recommendation, not an exhaustive survey. This does not apply to thinking blocks.

**考虑所有 effort 级别。** `output_config.effort` 是主要的智能/延迟/成本控制。推荐默认值：大多数任务用 `high`，最能力敏感的工作负载用 `xhigh`，常规工作用 `medium`/`low`。较低的 effort 设置——包括 `low`——在 {{FABLE_NAME}} 上仍然表现非常好，通常超过之前模型的 `xhigh` 甚至 `max` 性能。如果任务正确完成但耗时超过必要，或为了更快的交互工作风格，降低 effort。在常规工作上较高 effort 时，{{FABLE_NAME}} 可能收集上下文和审议超出任务需要（反面：更高 effort 带来出色的验证行为和最严格的输出）。要防止较高 effort 时未请求的整理或重构：

> Don't add features, refactor, or introduce abstractions beyond what the task requires. A bug fix doesn't need surrounding cleanup and a one-shot operation usually doesn't need a helper. Don't design for hypothetical future requirements - do the simplest thing that works well. Avoid premature abstraction. Avoid half-finished implementations either. Don't add error handling, fallbacks, or validation for scenarios that cannot happen. Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs). Don't use feature flags or backwards-compatibility shims when you can just change the code.

**指令遵循很强——利用它。** {{FABLE_NAME}} 对系统提示词中的显式通信风格部分非常响应；投资于它们而不是在下游对抗输出风格。未引导时——特别是在较高 effort 下——它可能阐述超出任务需要：重度结构的 PR 描述、关于未选择的替代方案的章节、注释下一行代码的注释。你不需要按名称枚举这些行为；简短指令同样有效：

> Lead with the outcome. Your first sentence after finishing should answer "what happened" or "what did you find" — the thing the user would ask for if they said "just give me the TLDR." Supporting detail and reasoning come after. Being readable and being concise are different things, and readability matters more. The way to keep output short is to be selective about what you include (drop details that don't change what the reader would do next), not to compress the writing into fragments, abbreviations, arrow chains like A → B → fails, or jargon.

**在长期运行上基于证据声明进度。** 要求进度声明对照工具结果审计——在测试中这几乎消除了旨在引出它们的任务上的虚构状态报告：

> Before reporting progress, audit each claim against a tool result from this session. Only report work you can point to evidence for; if something is not yet verified, say so explicitly. Report outcomes faithfully: if tests fail, say so with the output; if a step was skipped, say that; when something is done and verified, state it plainly without hedging.

**显式声明边界。** {{FABLE_NAME}} 有时采取未请求但相邻的操作（例如直接撰写邮件到草稿、创建备份 git 分支）。定义它*不应*做什么：

> When the user is describing a problem, asking a question, or thinking out loud rather than requesting a change, the deliverable is your assessment. Report your findings and stop. Don't apply a fix until they ask for one. Before running a command that changes system state — restarts, deletes, config edits — check that the evidence actually supports that specific action. A signal that pattern-matches to a known failure may have a different cause.

**让它委托——异步地。** 并行子代理在 {{FABLE_NAME}} 上可靠——而不是抑制委托（常见的旧模型防护栏），频繁使用子代理并给出*何时*委托的明确指导。与编排器**异步**通信的子代理优于生成并阻塞：长期代理保持上下文而不是每个子任务重新建立（缓存读取节省），编排器不受最慢子代理的瓶颈限制，上下文跨子任务持续。

> Delegate independent subtasks to sub-agents and keep working while they run. Intervene if a sub-agent goes off track or is missing relevant context.

**给它记忆表面。** {{FABLE_NAME}} 在可以 somewhere 写下学习内容以供将来参考时表现显著更好——即使是一个普通的 `.md` 文件。告诉它在哪里，告诉它在未来会话中查阅该文件，并给它格式：

> Store one lesson per file with a one-line summary at the top. Record corrections and confirmed approaches alike, including why they mattered. Don't save what the repo or chat history already records; update an existing note rather than creating a duplicate; delete notes that turn out to be wrong.

**罕见：提前停止。** 在长期会话深处，它偶尔以纯文本意图声明（"I'll now run X"）结束轮次而不发出工具调用，或请求不需要的许可。"继续"可以交互恢复它；对于自主管道添加系统提醒：

> You are operating autonomously. The user is not watching in real time and cannot answer questions mid-task, so asking 'Want me to…?' or 'Shall I…?' will block the work. For reversible actions that follow from the original request, proceed without asking. Offering follow-ups after the task is done is fine; asking permission after already discussing with the user before doing the work is not. Before ending your turn, check your last paragraph. If it is a plan, an analysis, a question, a list of next steps, or a promise about work you have not done ('I'll…', 'let me know when…'), do that work now with tool calls. End your turn only when the task is complete or you are blocked on input only the user can provide.

**罕见：上下文焦虑。** 在非常长的会话中，它可能担心用完上下文——建议新会话或削减自己的工作——最常发生在框架展示剩余 token 倒计时时。避免显示显式上下文预算计数；如果必须：

> You have ample context remaining. Do not stop, summarize, or suggest a new session on account of context limits – continue the work.

**给出原因，不只是请求。** {{FABLE_NAME}} 在理解请求背后的意图时表现更好——它将任务与相关信息连接，而不是自行推断意图。这对管理来自不同工作流上下文的长期运行代理最重要：

> I'm working on [the larger task] for [who it's for]. They need [what the output enables]. With that in mind: [request].

**长期代理会话中的可读性。** 在扩展对话深处（许多工具调用、大工作上下文）{{FABLE_NAME}} 可能产生用户觉得难以跟随的文本——密集的箭头链速记、实现级细节、对用户从未看到的思考的引用。通信风格附录强烈缓解此问题；改编：

> Terse shorthand is fine between tool calls (that's you thinking out loud, and brevity there is good). Your final summary is different: it's for a reader who didn't see any of that. If you've been working for a while without the user watching - overnight, across many tool calls, since they last spoke - your final message is their first look at any of it. Write it as a re-grounding, not a continuation of your working thread: the outcome first, then the one or two things you need from them, each explained as if new. The vocabulary you built up while working is yours, not theirs; leave it behind unless you re-introduce it. When you write the summary at the end, drop the working shorthand. Write complete sentences. Spell out terms instead of abbreviating them. Don't use arrow chains, hyphen-stacked compounds, or labels you made up earlier — the reader doesn't have the context to decode them. When you mention files, commits, flags, or other identifiers, give each one its own plain-language clause saying what it is or what changed — never pack several into one parenthesized run or slash-separated list. Open with the outcome: one sentence on what happened or what you found. Then the supporting detail. If you have to choose between short and clear, choose clear.

### 长期运行代理建议

- **使自验证显式。** 对于长期运行的构建，指示它建立并定期运行自己的检查框架（"Establish a method for checking your own work as you build; run it every [interval], verifying against the specification with sub-agents"）。独立的新鲜上下文验证器子代理往往优于自我批评。
- **减少对已迁移提示词和技能的过度规定。** 为之前模型编写的提示词和技能对 {{FABLE_NAME}} 往往过于规定性并*降低*输出质量。迁移后，A/B 测试移除旧的分步脚手架的工作负载——偏好说明目标和约束而不是枚举步骤。{{FABLE_NAME}} 也擅长根据中途学习即时更新技能——让它这样做。
- **从难度范围顶部开始。** 获得最佳早期访问结果的团队首先给它最难的未解决问题——让它确定范围、提问、然后执行。
- **添加 `send_to_user` 工具用于逐字中间交付。** 当异步代理必须在运行中途传递用户*完全按原样*看到的内容（交付物、带特定数字的进度更新、直接答案）时，给它一个客户端工具，其输入你在 UI 中直接渲染——工具输入从不被摘要，所以内容完整到达。返回简单确认作为工具结果：

```json
{
  "name": "send_to_user",
  "description": "Display a message directly to the user. Use this for progress updates, partial results, or content the user must see exactly as written before the task finishes.",
  "input_schema": {
    "type": "object",
    "properties": {
      "message": { "type": "string", "description": "The content to display to the user." }
    },
    "required": ["message"]
  }
}
```

对于仅叙述常规进度的代理，模型的默认进度叙述通常足够，不需要此工具。

### {{FABLE_NAME}} 迁移清单

- [ ] **[BLOCKS]** 将 `model=` 字符串更新为 `{{FABLE_ID}}`（Project Glasswing 中的 Mythos Preview 迁移者用 `{{MYTHOS_ID}}`）
- [ ] **[BLOCKS]** 移除 `thinking: {type: "disabled"}`（在 {{FABLE_NAME}} 上报错）
- [ ] **[BLOCKS]** 用结构化输出或系统提示词指令替换助手预填充
- [ ] **[BLOCKS]** 确认组织满足 30 天数据保留要求（ZDR 组织每个请求得到 `400 invalid_request_error`）
- [ ] **[BLOCKS]** 移除所有其他 `thinking` 配置（`{type: "enabled", budget_tokens: N}` 返回 400，与 Opus 4.7/4.8 相同）；用 `output_config.effort` 控制深度
- [ ] **[BLOCKS]** 如果思考内容面向用户或存储在日志中：添加 `thinking: {type: "adaptive", display: "summarized"}`（默认为 `"omitted"`——否则渲染文本为空）
- [ ] **[TUNE]** 在你自己的工作负载上重新基线成本和延迟——从 Opus 4.7/4.8 和 Mythos Preview 迁移时 token 计数大致不变（相同分词器）；每 token 定价不同。从 Opus 4.6、Sonnet、Haiku 或更旧版本迁移时 token 计数不同——用 `count_tokens` 与每个模型比较
- [ ] **[TUNE]** 在读取 `response.content` 之前添加 `stop_reason == "refusal"` 处理（输出前：空 + 不计费；中间流：部分输出计费——丢弃）；默认选择加入回退——服务端 `fallbacks`（`server-side-fallback-2026-06-01`，Claude API 和 AWS 上的 Claude 平台）在可用时，否则 SDK 中间件或回退信用（`fallback-credit-2026-06-01`，精确体）；裸客户端重放（历史原样；其他模型丢弃 Fable 的思考块）是底线，不是推荐
- [ ] **[TUNE]** 如果你向用户展示了思考文本，为思考输出变化做计划——原始思维链永不返回；渲染 `display: "summarized"` 摘要（按上方 [BLOCKS] 项目）；在同一模型上不变传回块；其他模型从提示词中丢弃它们（不计费）
- [ ] **[TUNE]** 为分钟级轮次做计划：超时、流式传输、异步检查、进度 UX（参见上方行为变化）
- [ ] **[TUNE]** 运行 effort 扫描，包括常规工作负载的 low/medium；如果较高 effort 产生未请求的重构则添加不整理指令
- [ ] **[TUNE]** A/B 测试移除旧模型脚手架——过度规定的提示词/技能降低 {{FABLE_NAME}} 输出质量

---

## 验证迁移

更新后，抽查新模型确实在使用。将 `YOUR_TARGET_MODEL` 替换为你迁移到的模型字符串（例如 `{{FABLE_ID}}`、`claude-opus-4-8`、`claude-opus-4-7`、`{{SONNET_NEXT_ID}}`、`claude-sonnet-4-6`、`claude-haiku-4-5`）并保持断言前缀同步：

```python
YOUR_TARGET_MODEL = "{{OPUS_ID}}"  # 或 "claude-opus-4-7"、"{{SONNET_NEXT_ID}}"、"claude-sonnet-4-6"、"claude-haiku-4-5"
response = client.messages.create(model=YOUR_TARGET_MODEL, max_tokens=64, messages=[...])
assert response.model.startswith(YOUR_TARGET_MODEL), response.model
```

对于速率限制余量变化、定价或能力差异（视觉、结构化输出、effort 支持），查询 Models API：

```python
m = client.models.retrieve(YOUR_TARGET_MODEL)
m.max_input_tokens, m.max_tokens
m.capabilities["effort"]["max"]["supported"]
```

参见 `shared/models.md` 获取完整的能力查找模式。