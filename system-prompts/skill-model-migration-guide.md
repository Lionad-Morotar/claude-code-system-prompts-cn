<!--
name: '技能：模型迁移指南'
description: 将现有代码迁移到新版 Claude 模型的分步说明，涵盖破坏性变更、已弃用参数、各 SDK 语法、提示行为变化及迁移检查清单
ccVersion: 2.1.111
-->
# 模型迁移指南

如何将现有代码迁移到新版 Claude 模型。涵盖破坏性变更、已弃用参数以及已退役模型的直接替换方案。

要获取最新、权威的版本（包含所有支持语言的代码示例），请通过 WebFetch 获取 `shared/live-sources.md` 中的**迁移指南** URL。将此文件用作整合的技能内参考；当模型发布或破坏性变更可能改变情况时，回退到在线文档。

**此文件较大。** 使用以下章节名称跳转（或对此文件 `Grep` 标题文本）。首先阅读第 0 步和第 1 步 —— 它们适用于每次迁移。然后仅阅读你要迁移到的目标模型对应的章节。

| 章节 | 适用场景 |
|---|---|
| 第 0 步：确认迁移范围 | 始终 —— 在任何编辑之前 |
| 第 1 步：对每个文件进行分类 | 始终 —— 决定是替换、并行添加还是跳过 |
| 各 SDK 语法参考 | 将本指南中的 Python 示例翻译为 TypeScript / Go / Ruby / Java / C# / PHP |
| 目标模型 / 退役模型替换 | 选择目标模型 |
| 按源模型分类的破坏性变更 | 迁移到 Opus 4.6 / Sonnet 4.6 |
| 迁移到 Opus 4.7 | 迁移到 Opus 4.7（破坏性变更、静默默认值变更、行为变化） |
| Opus 4.7 迁移检查清单 | 4.7 的必需项与可选项，标记为 `[BLOCKS]` / `[TUNE]` |
| 验证迁移 | 编辑后 —— 运行时抽查 |

**TL;DR：** 更改模型 ID 字符串。如果你使用了 `budget_tokens`，切换到 `thinking: {type: "adaptive"}`。如果你使用了助手预填充（assistant prefills），它们在 Opus 4.6 和 Sonnet 4.6 上都会返回 400 —— 切换到其中一种预填充替代方案（最常见的是 `output_config.format`；参见"按源模型分类的破坏性变更"中的表格）。如果你从 Sonnet 4.5 迁移到 Sonnet 4.6，请显式设置 `effort` —— 4.6 默认值为 `high`。移除 `effort-2025-11-24` 和 `fine-grained-tool-streaming-2025-05-14` beta 头（在 4.6 上已 GA）；一旦使用自适应推理（adaptive thinking），就移除 `interleaved-thinking-2025-05-14`（仅在仍使用过渡期的 `budget_tokens` 逃生出口时保留）。然后将 `client.beta.messages.create` 降级回 `client.messages.create`。削减任何激进的"CRITICAL: YOU MUST"工具指令；4.6 会更加忠实地遵循系统提示。

---

## 第 0 步：确认迁移范围

**在任何 Write、Edit 或 MultiEdit 调用之前，先确认范围。** 如果用户的请求没有明确指定单个文件、特定目录或显式的文件列表，**先询问 —— 不要开始编辑**。这是不可协商的：即使听起来是命令式的请求，如"迁移我的代码库"、"将我的项目迁移到 X"、"升级到 Sonnet 4.6"，或仅仅说"迁移到 Opus 4.7"，其范围都是模糊的，需要澄清。诸如"我的项目"、"我的代码"、"我的代码库"、"整个项目"、"所有地方"或"跨仓库"之类的表述是**模糊的，不是指令** —— 它们告诉你*做什么*，但没有告诉你*在哪里做*。在动手之前先询问。

明确提供常见范围并等待回答后再触碰任何文件：

1. 整个工作目录
2. 特定子目录（如 `src/`、`app/`、`services/billing/`）
3. 特定文件或文件列表

将其呈现为一个单一的澄清问题，让用户可以在一轮内回答。**仅当范围已经明确时才无需询问直接进行** —— 用户指定了确切文件（"将 `extract.py` 迁移到 Sonnet 4.6"）、指向了特定目录（"将 `services/billing/` 下所有内容迁移到 Opus 4.6"）、列出了具体文件（"更新 `a.py` 和 `b.py`"），或在前一轮对话中已经回答了范围问题。如果你可以仅从提示词中回答"这个变更会触及哪些文件？"并获得精确列表，就继续进行。如果不能，就询问。

**示例。** 如果用户说*"将我的项目迁移到 Opus 4.6。我希望在所有合适的地方使用自适应推理。"*你不知道"我的项目"是指整个工作目录、仅 `src/`、仅生产代码，还是其他什么 —— `所有地方` 明确了意图（更新*范围内*的每个调用点），但范围本身仍未定义。不要开始编辑。回复：

> 在我开始编辑之前，你能确认一下范围吗？我可以迁移：
> 1. 工作目录中的每个 `.py` 文件
> 2. 仅 `src/` 下的文件（生产代码）
> 3. 你指定的特定子目录或文件列表
>
> 你选哪一个？

然后等待回答。这同样适用于*"迁移到 Opus 4.7"*和简单的*"帮我升级到 Sonnet 4.6"* —— 编辑之前先询问。

**确定范围问题的规模（大型仓库）。** 在询问之前，先获取每个目录的计数，让用户可以具体选择：

```sh
rg -l "<old-model-id>" --type-not md | cut -d/ -f1 | sort | uniq -c | sort -rn
```

在范围问题中呈现分解结果（如*"在 3 个目录中发现 217 处引用：api/（130）、api-go/（62）、routing/（25）。要迁移哪些？"*）。在调查之前还要确认 `git status` 是干净的 —— 意外的修改意味着有并发进程；停下来调查后再继续。

---

## 第 1 步：对每个文件进行分类

并非每个包含旧模型 ID 的文件都是 API 的**调用者**。在编辑之前，将每个文件归类到以下分类之一 —— 正确的操作各不相同：

| # | 分类 | 特征 | 操作 |
|---|---|---|---|
| 1 | **调用 API/SDK** | `client.messages.create(model=…)`、`anthropic.Anthropic()`、请求负载 | 替换模型 ID **并**应用目标版本的破坏性变更检查清单（见下文）。 |
| 2 | **定义或提供模型** | 模型注册表、OpenAPI 规范、路由/队列配置、模型策略枚举、生成的目录 | 旧条目**保留**（模型仍在服务中）。询问是否（a）并行添加新模型，（b）保持不变，或（c）退役旧模型 —— 永远不要盲目替换。**如果不能询问，默认选择（a）：并行添加新模型并标记** —— 替换会注销一个仍在生产中的模型。 |
| 3 | **将 ID 作为不透明字符串引用** | UI 回退常量、能力门控子字符串检查、通用测试夹具、标签解析器、环境变量默认值 | 通常替换字符串并验证任何解析器/正则/子字符串匹配能处理新 ID —— 但先检查下面的子情况。 |
| 4 | **带后缀的变体 ID** | `claude-<model>-<suffix>`，如 `-fast`、`-1024k`、`-200k`、`[1m]`、日期快照 | 这些是部署/路由标识符，不是公共模型 ID。**不要假设存在新模型的等价物。** 先在注册表中验证；如果不存在，保持字符串不变并标记。 |

**分类 3 的子情况 —— 在替换字符串引用之前，检查：**

- **能力门控**（如 `if 'opus-4-6' in model_id:` 启用某项功能）→ **并行添加新 ID**，不要替换。旧模型仍在服务中且仍具有该能力，因此替换会静默地为仍流经此处的旧模型流量禁用该功能。如果你知道不会有旧模型流量命中此门控（单一调用者代码库正在完全迁移），替换是可以的；如果不确定，则并行添加。
- **注册表断言测试**（如 `assert "claude-X" in supported_models`、`test_X_has_N_clusters`）→ **为新模型并行添加断言；保留旧断言。** 旧模型仍在服务中，因此其断言仍然有效 —— 但注册表也应包含新模型，所以也要断言它。启发式规则：如果测试在列表中引用了多个模型版本，则是注册表测试；如果只有一个模型在一个结构体中仅与自身比较，则是通用夹具。
- **冻结/生成的快照** → **重新生成**，不要手动编辑。
- **与定义者耦合**（如通过共享 `conftest` 种子列表传递模型授权的集成测试，或断言计费层级/速率限制组枚举或生成的 SKU/定价目录）→ **先验证定义者有新模型条目。** 如果没有，添加一个种子条目（复用最近的现有层级作为占位符）；如果不能自信地做到，询问用户如何填充定义者。**不要跳过测试。** 在未填充定义者的情况下替换会导致测试在运行时失败。

特别是在迁移测试时：破坏性参数（`temperature`、`top_p`、`budget_tokens`）通常不存在 —— 测试夹具很少在占位模型上设置采样参数。破坏性变更扫描仍然是必需的，但预期结果大多是干净的。

**首先查找有意标记的同步点。** 许多代码库用注释标记标记每次模型发布时必须更改的位置，如 `MODEL LAUNCH`、`KEEP IN SYNC`、`@model-update` 等。在进行广泛的模型 ID grep 之前，先搜索仓库使用的任何约定标记 —— 这些标记指向负载关键的变更。

---

## 各 SDK 语法参考

本指南中的代码示例是 Python。**相同的字段存在于每个官方 Anthropic SDK 中** —— Stainless 从相同的 OpenAPI 规范生成了全部 7 个 SDK，因此 JSON 字段名一一对应，仅有大小写约定的差异。使用以下行将 Python 示例翻译为你正在迁移的 SDK。

> **在写入客户代码之前，根据 SDK 源码验证类型和方法名称。** 从 `shared/live-sources.md` 中的 SDK 源码表（每个 SDK 一行）WebFetch 相关仓库，确认确切的符号 —— 特别是对于类型化 SDK（Go、Java、C#），联合类型/构建器名称可能与 JSON 形状不同。不要猜测下表中不存在的类型名或 `<lang>/claude-api/README.md` 中没有的类型名。

<!-- 以下行已针对每个 SDK 的 `synced/model-launch-april` 分支进行了验证。 -->

### `thinking` —— `budget_tokens` → adaptive

| SDK | 之前 | 之后 |
|---|---|---|
| Python | `thinking={"type": "enabled", "budget_tokens": N}` | `thinking={"type": "adaptive"}` |
| TypeScript | `thinking: { type: 'enabled', budget_tokens: N }` | `thinking: { type: 'adaptive' }` |
| Go | `Thinking: anthropic.ThinkingConfigParamOfEnabled(N)` | `Thinking: anthropic.ThinkingConfigParamUnion{OfAdaptive: &anthropic.ThinkingConfigAdaptiveParam{}}` |
| Ruby | `thinking: { type: "enabled", budget_tokens: N }` | `thinking: { type: "adaptive" }` |
| Java | `.thinking(ThinkingConfigEnabled.builder().budgetTokens(N).build())` | `.thinking(ThinkingConfigAdaptive.builder().build())` |
| C# | `Thinking = new ThinkingConfigEnabled { BudgetTokens = N }` | `Thinking = new ThinkingConfigAdaptive()` |
| PHP | `thinking: ['type' => 'enabled', 'budget_tokens' => N]` | `thinking: ['type' => 'adaptive']` |

### 采样参数 —— `temperature` / `top_p` / `top_k`

（在 Opus 4.7 上完全移除此字段；在 Claude 4.x 上最多保留 `temperature` 或 `top_p` 中的一个。）

| SDK | 要移除的字段 |
|---|---|
| Python | `temperature=…`、`top_p=…`、`top_k=…` |
| TypeScript | `temperature: …`、`top_p: …`、`top_k: …` |
| Go | `Temperature: anthropic.Float(…)`、`TopP: anthropic.Float(…)`、`TopK: anthropic.Int(…)` |
| Ruby | `temperature: …`、`top_p: …`、`top_k: …` |
| Java | `.temperature(…)`、`.topP(…)`、`.topK(…)` |
| C# | `Temperature = …`、`TopP = …`、`TopK = …` |
| PHP | `temperature: …`、`topP: …`、`topK: …` |

### 预填充替代方案 —— 通过 `output_config.format` 的结构化输出

| SDK | 移除（最后一个助手轮次） | 添加 |
|---|---|---|
| Python | `{"role": "assistant", "content": "…"}` | `output_config={"format": {"type": "json_schema", "schema": SCHEMA}}` |
| TypeScript | `{ role: 'assistant', content: '…' }` | `output_config: { format: { type: 'json_schema', schema: SCHEMA } }` |
| Go | 尾部的 `anthropic.MessageParam{Role: "assistant", …}` | `OutputConfig: anthropic.OutputConfigParam{Format: anthropic.JSONOutputFormatParam{…}}` |
| Ruby | `{ role: "assistant", content: "…" }` | `output_config: { format: { type: "json_schema", schema: SCHEMA } }` |
| Java | 尾部的 `Message.builder().role(ASSISTANT)…` | `.outputConfig(OutputConfig.builder().format(JsonOutputFormat.builder()…build()).build())` |
| C# | 尾部的 `new Message { Role = "assistant", … }` | `OutputConfig = new OutputConfig { Format = new JsonOutputFormat { … } }` |
| PHP | 尾部的 `['role' => 'assistant', 'content' => '…']` | `outputConfig: ['format' => ['type' => 'json_schema', 'schema' => $SCHEMA]]` |

### `thinking.display` —— 选择恢复摘要推理（Opus 4.7）

| SDK | 添加 |
|---|---|
| Python | `thinking={"type": "adaptive", "display": "summarized"}` |
| TypeScript | `thinking: { type: 'adaptive', display: 'summarized' }` |
| Go | `Thinking: anthropic.ThinkingConfigParamUnion{OfAdaptive: &anthropic.ThinkingConfigAdaptiveParam{Display: anthropic.ThinkingConfigAdaptiveDisplaySummarized}}` |
| Ruby | `thinking: { type: "adaptive", display: "summarized" }`（直接构造模型类时使用 `display_:`） |
| Java | `.thinking(ThinkingConfigAdaptive.builder().display(ThinkingConfigAdaptive.Display.SUMMARIZED).build())` |
| C# | `Thinking = new ThinkingConfigAdaptive { Display = Display.Summarized }` |
| PHP | `thinking: ['type' => 'adaptive', 'display' => 'summarized']` |

对于这些表格中未列出的任何字段，Python 示例中的 JSON 键可以直接翻译：Python/TypeScript/Ruby 使用 `snake_case`，PHP 使用 `camelCase` 命名参数，Go/C# 使用 `PascalCase` 结构体字段，Java 使用 `camelCase` 构建器方法。

---

## 解释你所做的每个变更

迁移编辑对未阅读发布说明的用户来说常常显得随意 —— 删除 `temperature`、删除预填充、重写系统提示语句。**对于每个编辑，告诉用户你改了什么以及为什么**，并关联到驱动该变更的具体 API 或行为变更。在你工作的过程中在总结中进行，而不仅仅在最后。

对**系统提示编辑**要格外明确。用户有理由保护自己的提示，而提示调整变更是判断性决策（不是硬性 API 要求）。对于任何提示编辑：

- 引用修改前后的文本。
- 说明驱动它的行为变化（如*"Opus 4.7 根据任务复杂度调整响应长度，因此我添加了明确的长度指令"*，或*"4.6 更忠实地遵循指令，因此'CRITICAL: YOU MUST use the search tool'现在会过度触发 —— 已软化为'Use the search tool when…'"*）。
- 明确哪些提示编辑是**可选调整**（语气、长度、子代理指导），哪些代码编辑是**必须的以避免 400 错误**（采样参数、`budget_tokens`、预填充）。永远不要将可选提示变更描述为强制性的。

如果你一次性应用了多个提示调整编辑，将它们作为一个简短列表提供，用户可以逐项接受或拒绝，而不是静默地重写他们的系统提示。

---

## 迁移之前

1. **确认目标模型 ID。** 仅使用 `shared/models.md` 中的精确字符串 —— 不要向别名追加日期后缀（如 `claude-opus-4-6`，而非 `claude-opus-4-6-20251101`）。猜测 ID 会导致 404。
2. **检查代码使用了哪些功能**，使用以下检查清单：
   - `thinking: {type: "enabled", budget_tokens: N}` → 在 Opus 4.6 / Sonnet 4.6 上迁移到自适应推理（仍可使用但已弃用）
   - 助手轮次预填充（`messages` 以 `role: "assistant"` 结尾）→ 在 Opus 4.6 / Sonnet 4.6 上必须更改（返回 400）
   - `messages.create()` 上的 `output_format` 参数 → 在所有模型上都必须更改（全 API 范围已弃用）
   - `max_tokens > ~16000` → 在任何模型上都必须使用流式传输（超过 ~16K 有 SDK HTTP 超时风险）。使用流式传输时，Sonnet 4.6 / Haiku 4.5 上限为 64K，Opus 4.6 上限为 128K
   - Beta 头 `effort-2025-11-24`、`fine-grained-tool-streaming-2025-05-14`、`interleaved-thinking-2025-05-14` → 在 4.6 上已 GA，移除它们并从 `client.beta.messages.create` 切换到 `client.messages.create`
   - Sonnet 4.5 → Sonnet 4.6 迁移未设置 `effort` → 4.6 默认为 `high`，可能会改变你的延迟/成本配置
   - 包含 `CRITICAL`、`MUST`、`If in doubt, use X` 语言的系统提示 → 在 4.6 上可能过度触发（见提示行为变更）
   - 从 3.x / 4.0 / 4.1 迁移：还要检查采样参数（`temperature` + `top_p`）、工具版本（`text_editor_20250728`）、`refusal` + `model_context_window_exceeded` 停止原因、尾部换行符工具参数处理
3. **先对单个请求进行测试。** 对新模型运行一次调用，检查响应，然后铺开。

---

## 目标模型（推荐目标）

| 如果你当前使用… | 迁移到 | 原因 |
| ------------------------------------- | ------------------ | ------------------------------------------------- |
| Opus 4.6 | `claude-opus-4-7` | 能力最强的模型；仅支持自适应推理；高分辨率视觉；见迁移到 Opus 4.7 |
| Opus 4.0 / 4.1 / 4.5 / Opus 3 | `claude-opus-4-6` | 4.7 之前最智能的 4.x；自适应推理；128K 输出 |
| Sonnet 4.0 / 4.5 / 3.7 / 3.5 | `claude-sonnet-4-6` | 最佳速度/智能平衡；自适应推理；64K 输出 |
| Haiku 3 / 3.5 | `claude-haiku-4-5` | 最快且最具成本效益 |

默认使用调用者层级对应的最新 Opus，除非他们明确选择了其他模型。如果你从 Opus 4.5 或更早版本直接迁移到 Opus 4.7，先应用 4.6 迁移，然后再叠加 Opus 4.7 变更（见下方迁移到 Opus 4.7）。

---

## 退役模型替换

以下模型返回 404 —— 立即更新：

| 退役模型 | 退役日期 | 直接替换 |
| ----------------------------- | ------------- | -------------------- |
| `claude-3-7-sonnet-20250219` | 2026年2月19日 | `claude-sonnet-4-6` |
| `claude-3-5-haiku-20241022` | 2026年2月19日 | `claude-haiku-4-5` |
| `claude-3-opus-20240229` | 2026年1月5日 | `claude-opus-4-7` |
| `claude-3-5-sonnet-20241022` | 2025年10月28日 | `claude-sonnet-4-6` |
| `claude-3-5-sonnet-20240620` | 2025年10月28日 | `claude-sonnet-4-6` |
| `claude-3-sonnet-20240229` | 2025年7月21日 | `claude-sonnet-4-6` |
| `claude-2.1`、`claude-2.0` | 2025年7月21日 | `claude-sonnet-4-6` |

## 已弃用模型（即将退役）

| 模型 | 退役日期 | 替换 |
| ----------------------------- | ------------- | -------------------- |
| `claude-3-haiku-20240307` | 2026年4月19日 | `claude-haiku-4-5` |
| `claude-opus-4-20250514` | 2026年6月15日 | `claude-opus-4-7` |
| `claude-sonnet-4-20250514` | 2026年6月15日 | `claude-sonnet-4-6` |

---

## 按源模型分类的破坏性变更

### 从 Sonnet 4.5 迁移到 Sonnet 4.6（effort 默认值变更）

Sonnet 4.5 没有 `effort` 参数；Sonnet 4.6 默认为 `high`。如果你只是切换模型字符串而不做其他操作，可能会看到明显更高的延迟和 token 用量。请显式设置 `effort`。

**推荐的起点：**

| 工作负载 | 起始值 | 备注 |
| ------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| 聊天、分类、内容生成 | `low` | 配合 `thinking: {"type": "disabled"}`，你将看到与 Sonnet 4.5 无推理模式相当或更好的表现 |
| 大多数应用（平衡） | `medium` | 质量与成本的默认最佳平衡点 |
| 智能编程、工具密集型工作流 | `medium` | 配合自适应推理和慷慨的 `max_tokens`（流式传输时最高 64K —— Sonnet 4.6 的上限） |
| 自主多步代理、长周期循环 | `high` | 如果延迟/token 成为问题则降低到 `medium` |
| 计算机使用代理 | `high` + adaptive | Sonnet 4.6 的最佳计算机使用精度在 adaptive + high 上 |

特别针对无推理聊天工作负载：

```python
client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=8192,
    thinking={"type": "disabled"},
    output_config={"effort": "low"},
    messages=[{"role": "user", "content": "..."}],
)
```

**何时改用 Opus 4.6：** 最困难且周期最长的问题 —— 大型代码迁移、深度研究、扩展自主工作。Sonnet 4.6 在快速响应和成本效率上胜出。

### 迁移到 Opus 4.6 / Sonnet 4.6（从任何旧模型）

**1. 手动扩展推理已弃用 —— 使用自适应推理。**

`thinking: {type: "enabled", budget_tokens: N}`（带有固定 token 预算的手动扩展推理）在 Opus 4.6 和 Sonnet 4.6 上已弃用。将其替换为 `thinking: {type: "adaptive"}`，让 Claude 自行决定何时推理以及推理多少。自适应推理还自动启用了交错推理（interleaved thinking）（不需要 beta 头）。

```python
# 旧方式（在旧模型上仍然有效，在 4.6 上已弃用）
response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=16000,
    thinking={"type": "enabled", "budget_tokens": 8000},
    messages=[...]
)

# 新方式（Opus 4.6 / Sonnet 4.6）
response = client.messages.create(
    model="claude-opus-4-6",  # 或 "claude-sonnet-4-6"
    max_tokens=16000,
    thinking={"type": "adaptive"},
    output_config={"effort": "high"},  # 可选：low | medium | high | max
    messages=[...]
)
```

自适应推理是长期目标，在内部评估中它优于手动扩展推理。尽可能迁移。

**过渡期逃生出口：** 手动扩展推理在 Opus 4.6 和 Sonnet 4.6 上仍然*可用*（已弃用，将在未来版本中移除）。如果在迁移期间需要一个硬性上限 —— 例如，在调整 `effort` 之前限制失控工作负载的 token 消耗 —— 你可以在显式的 `effort` 值旁边保留 `budget_tokens`，然后在后续跟进中移除它。`budget_tokens` 必须严格小于 `max_tokens`：

```python
# 仅限过渡期 —— 已弃用，计划移除
client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=16384,
    thinking={"type": "enabled", "budget_tokens": 8192},  # 必须 < max_tokens
    output_config={"effort": "medium"},
    messages=[...],
)
```

如果用户要求在 4.6 上设置"推理预算"，首选答案是 `effort` —— 使用 `low`、`medium`、`high` 或 `max`（仅限 Opus 层级 —— Sonnet 或 Haiku 不可用），而不是 token 数量。

**2. Effort 参数（仅限 Opus 4.5、Opus 4.6、Sonnet 4.6）。**

控制推理深度和总体 token 消耗。位于 `output_config` 内部，而非顶层。默认值为 `high`。`max` 仅限 Opus 层级（Opus 4.6 及以后 —— Sonnet 或 Haiku 不可用）。在 Sonnet 4.5 和 Haiku 4.5 上会报错。

```python
output_config={"effort": "medium"}  # 通常是最佳的成本/质量平衡
```

### 迁移到 4.6 系列（Opus 4.6 和 Sonnet 4.6）

**3. 助手轮次预填充返回 400（Opus 4.6 和 Sonnet 4.6）。**

在 Opus 4.6 和 Sonnet 4.6 上，最后一个助手轮次的预填充响应不再受支持 —— 两者都返回 400。在对话中*其他位置*添加助手消息（例如，用于少样本示例）仍然有效。选择与预填充之前所做工作匹配的替代方案：

| 预填充用途 | 替代方案 |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 强制 JSON / YAML / schema 输出 | 带有 `json_schema` 的 `output_config.format` —— 见下方示例 |
| 强制分类标签 | 包含有效标签的枚举字段的工具，或结构化输出 |
| 跳过前言（`Here is the summary:\n`） | 系统提示指令：*"直接回答，不要前言。不要以'Here is...'或'Based on...'等短语开头。"* |
| 规避不良拒绝 | 通常不再需要 —— 4.6 的拒绝行为更加合理。普通的用户轮次提示就足够了。 |
| 继续被中断的响应 | 将续写移入用户轮次：*"你之前的响应被中断了，结尾是 `[last text]`。从那里继续。"* |
| 注入提醒/上下文注入 | 改为注入到用户轮次。对于复杂的代理框架，通过工具调用或在压缩期间暴露上下文。 |

```python
# 旧方式（在 Opus 4.6 / Sonnet 4.6 上失败）—— 预填充强制 JSON 形状
messages=[
    {"role": "user", "content": "Extract the name."},
    {"role": "assistant", "content": "{\"name\": \""},
]

# 新方式 —— 结构化输出替代预填充
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    output_config={"format": {"type": "json_schema", "schema": {...}}},
    messages=[{"role": "user", "content": "Extract the name."}],
)
```

**4. 对 `max_tokens > ~16K` 使用流式传输（所有模型）；仅 Opus 4.6 达到 128K。**

非流式请求在高 `max_tokens` 下会遇到 SDK HTTP 超时，无论模型如何 —— 对于超过 ~16K 输出的任何内容都使用流式传输。可流式传输的上限因模型而异：Sonnet 4.6 和 Haiku 4.5 上限为 64K，仅 Opus 4.6 最高可达 128K。

```python
with client.messages.stream(model="claude-opus-4-6", max_tokens=64000, ...) as stream:
    message = stream.get_final_message()
```

**5. 工具调用 JSON 转义可能不同（Opus 4.6 和 Sonnet 4.6）。**

两个 4.6 模型生成的工具调用 `input` 字段可能包含 Unicode 或正斜杠转义。始终使用 `json.loads()` / `JSON.parse()` 解析 —— 永远不要对序列化的输入进行原始字符串匹配。

### 所有模型

**6. `output_format` → `output_config.format`（全 API 范围）。**

`messages.create()` 上旧的顶层 `output_format` 参数已弃用。改用 `output_config.format`。这不特定于 4.6 —— 适用于每个模型。

---

## 在 4.6 上需要移除的 Beta 头

在 4.5 上必需的几个 beta 头现在在 4.6 上已 GA，应予以移除。保留它们无害但会产生误导；移除它们还可以让你从 `client.beta.messages.create(...)` 迁移回 `client.messages.create(...)`。

| 头 | 在 4.6 上的状态 | 操作 |
| ----------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| `effort-2025-11-24` | Effort 参数已 GA | 移除 |
| `fine-grained-tool-streaming-2025-05-14` | 已 GA | 移除 |
| `interleaved-thinking-2025-05-14` | 自适应推理自动启用交错推理 | 使用自适应推理时移除；在 Sonnet 4.6 上*配合*手动扩展推理仍可用，但该路径已弃用 |
| `token-efficient-tools-2025-02-19` | 内置于所有 Claude 4+ 模型 | 移除（无效果） |
| `output-128k-2025-02-19` | 内置于 Claude 4+ 模型 | 移除（无效果） |

一旦你移除了所有这些并完成了向自适应推理的迁移，就可以将 SDK 调用点从 beta 命名空间切换回常规命名空间：

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

## 从 3.x / 4.0 / 4.1 → 4.6 时的额外变更

如果你从 Opus 4.1、Sonnet 4、Sonnet 3.7 或更旧的 Claude 3.x 模型直接跳到 4.6，应用上述所有内容*加上*本节中的项目。已在使用 Opus 4.5 / Sonnet 4.5 的用户可以跳过本节。

**1. 采样参数：`temperature` 或 `top_p`，不能两者都传。**

同时传递两者会在每个 Claude 4+ 模型上报错：

```python
# 旧方式（仅 3.x —— 在 4+ 上会报错）
client.messages.create(temperature=0.7, top_p=0.9, ...)

# 新方式
client.messages.create(temperature=0.7, ...)  # 或 top_p，不能两者都传
```

**2. 更新工具版本。**

旧版工具版本在 4+ 上不受支持。**`type` 和 `name` 字段都会变化** —— `text_editor_20250728` 和 `str_replace_based_edit_tool` 是成对的；只更新其中一个而不更新另一个会返回 400。还要从文本编辑器集成中移除 `undo_edit` 命令：

| 旧版本 | 新版本 |
| ------------------------------------------------- | ------------------------------------------------------- |
| `text_editor_20250124` + `str_replace_editor` | `text_editor_20250728` + `str_replace_based_edit_tool` |
| `code_execution_*`（早期版本） | `code_execution_20250825` |
| `undo_edit` 命令 | *（不再支持 —— 删除调用点）* |

```python
# 之前
tools = [{"type": "text_editor_20250124", "name": "str_replace_editor"}]

# 之后 —— 两个字段都变化
tools = [{"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"}]
```

**3. 处理 `refusal` 停止原因。**

Claude 4+ 可能在响应中返回 `stop_reason: "refusal"`。如果你的代码只处理 `end_turn` / `tool_use` / `max_tokens`，添加一个分支：

```python
if response.stop_reason == "refusal":
    # 将拒绝展示给用户；不要用相同的提示重试
    ...
```

**4. 处理 `model_context_window_exceeded` 停止原因（4.5+）。**

与 `max_tokens` 不同：它表示模型达到了*上下文窗口*限制，而不是请求的输出上限。同时处理两者：

```python
if response.stop_reason == "model_context_window_exceeded":
    # 上下文窗口耗尽 —— 压缩或拆分对话
    ...
elif response.stop_reason == "max_tokens":
    # 达到请求的输出上限 —— 用更高的 max_tokens 重试或使用流式传输
    ...
```

**5. 工具调用字符串参数中保留尾部换行符（4.5+）。**

4.5 和 4.6 保留了旧模型会剥离的尾部换行符。如果你的工具实现对工具调用 `input` 值进行精确字符串匹配（如 `if name == "foo"`），验证当模型发送 `"foo\n"` 时是否仍能匹配。在接收端使用 `.rstrip()` 规范化通常是最简单的修复方法。

**6. Haiku：速率限制在各代之间重置。**

Haiku 4.5 有自己的速率限制池，与 Haiku 3 / 3.5 分开。如果你在迁移时逐步增加流量，请在 [API 速率限制](https://platform.claude.com/docs/en/api/rate-limits) 查看你层级对应的 Haiku 4.5 限制 —— 在 Haiku 3.5 上能舒适服务的配额，在 4.5 上相同流量可能需要层级提升。

---

## 提示行为变更（Opus 4.5 / 4.6、Sonnet 4.6）

这些不会破坏你的代码，但在 4.5 及更早版本上有效的提示可能在 4.6 上过度触发或触发不足。根据需要调整。

**1. 激进的指令导致过度触发。** Opus 4.5 和 4.6 比早期模型更忠实地遵循系统提示。为*克服*旧模型不情愿而编写的提示现在过于激进：

| 之前（在 4.0 / 4.5 上有效） | 之后（在 4.6 上使用） |
| ------------------------------------------- | ----------------------------------------- |
| `CRITICAL: You MUST use this tool when...` | `Use this tool when...` |
| `Default to using [tool]` | `Use [tool] when it would improve X` |
| `If in doubt, use [tool]` | *（删除 —— 不再需要）* |

如果模型现在对某个工具或技能过度触发，修复方法几乎总是降低语言强度，而不是添加更多护栏。

**2. 过度推理和过度探索（Opus 4.6）。** 在较高的 `effort` 设置下，Opus 4.6 在回答之前会进行更多探索。如果这消耗了过多的推理 token，先降低 `effort`（`medium` 通常是最佳平衡点），然后再添加文本来约束推理。

**3. 过度的子代理派生（Opus 4.6）。** Opus 4.6 有很强的委托给子代理的偏好。如果你发现它为一个直接 `grep` 或 `read` 就能解决的事情派生了子代理，添加指导：*"仅对并行或独立的工作流使用子代理。对于单文件读取或顺序操作，直接工作。"*

**4. 过度工程化（Opus 4.5 / 4.6）。** 两个模型都可能添加超出要求的额外文件、抽象或防御性错误处理。如果你想要最小化更改，明确提示：*"仅进行直接要求的更改。不要为不可能发生的场景添加辅助函数、抽象或错误处理。"*

**5. LaTeX 数学输出（Opus 4.6）。** Opus 4.6 对数学和技术内容默认使用 LaTeX（`\frac{}{}`、`$...$`）。如果你需要纯文本，明确指示：*"将所有数学格式化为纯文本 —— 不要使用 LaTeX、`$`、`\frac{}{}`。使用 `/` 表示除法，`^` 表示指数。"*

**6. 跳过的口头摘要（4.6 系列）。** 4.6 模型更加简洁，可能跳过工具调用后的摘要段落，直接跳到下一个操作。如果你依赖这些摘要来获得可见性，添加：*"在完成涉及工具使用的任务后，提供你所做工作的简要摘要。"*

**7. "Think"作为触发词（Opus 4.5，推理关闭时）。** 当 `thinking` 关闭时，Opus 4.5 对"think"这个词特别敏感，可能会比你希望的更多地进行推理。改用 `consider`、`evaluate` 或 `reason through`。

---

## 模型 ID 重命名快速参考

| 旧字符串（迁移源） | 新字符串 |
| ------------------------------ | ------------------ |
| `claude-opus-4-6` | `claude-opus-4-7` |
| `claude-opus-4-5` | `claude-opus-4-7` |
| `claude-opus-4-1` | `claude-opus-4-7` |
| `claude-opus-4-0` | `claude-opus-4-7` |
| `claude-sonnet-4-5` | `claude-sonnet-4-6` |
| `claude-sonnet-4-0` | `claude-sonnet-4-6` |

旧别名（`claude-opus-4-5`、`claude-sonnet-4-5`、`claude-opus-4-1` 等）仍然有效，如果你在升级前需要时间，可以锁定它们 —— 完整旧版列表见 `shared/models.md`。

---

## 迁移检查清单

每个项目都带有标记：**`[BLOCKS]`** 项如果遗漏会导致 400 错误、无限循环、静默超时或错误的工具选择 —— 将这些作为代码编辑应用，而非作为建议。**`[TUNE]`** 项是质量/成本调整。

对于每个调用 `messages.create()` 或等效 SDK 方法的文件：

- [ ] **[BLOCKS]** 将 `model=` 字符串更新为新别名
- [ ] **[BLOCKS]** 将 `budget_tokens` 替换为 `thinking={"type": "adaptive"}`（在 Opus 4.6 / Sonnet 4.6 上已弃用）
- [ ] **[BLOCKS]** 将 `format` 从顶层 `output_format` 移入 `output_config.format`
- [ ] **[BLOCKS]** 如果目标是 Opus 4.6 或 Sonnet 4.6，移除任何助手轮次预填充（见预填充替代方案表格）
- [ ] **[BLOCKS]** 如果 `max_tokens > ~16000`，切换到流式传输（否则 SDK HTTP 超时）
- [ ] **[TUNE]** 显式设置 `output_config={"effort": "..."}` —— 特别是从 Sonnet 4.5 迁移到 Sonnet 4.6 时（4.6 默认为 `high`）
- [ ] **[TUNE]** 移除已 GA 的 beta 头：`effort-2025-11-24`、`fine-grained-tool-streaming-2025-05-14`、`token-efficient-tools-2025-02-19`、`output-128k-2025-02-19`；一旦使用自适应推理就移除 `interleaved-thinking-2025-05-14`
- [ ] **[TUNE]** 一旦所有 beta 都被移除，将 `client.beta.messages.create(...)` → `client.messages.create(...)`
- [ ] **[TUNE]** 检查系统提示中激进的工具语言（`CRITICAL:`、`MUST`、`If in doubt`）并降低强度

**从 3.x / 4.0 / 4.1 迁移时的额外项目：**
- [ ] **[BLOCKS]** 移除 `temperature` 或 `top_p` 中的一个（同时传递两者在 Claude 4+ 上返回 400）
- [ ] **[BLOCKS]** 将文本编辑器工具 `type` 更新为 `text_editor_20250728`
- [ ] **[BLOCKS]** 将文本编辑器工具 `name` 更新为 `str_replace_based_edit_tool` —— **仅更改 `type` 而保留 `name: "str_replace_editor"` 会返回 400**
- [ ] **[BLOCKS]** 将代码执行工具更新为 `code_execution_20250825`
- [ ] **[BLOCKS]** 删除任何 `undo_edit` 命令调用点
- [ ] **[TUNE]** 添加对 `stop_reason == "refusal"` 的处理
- [ ] **[TUNE]** 添加对 `stop_reason == "model_context_window_exceeded"` 的处理（4.5+）
- [ ] **[TUNE]** 验证工具参数字符串匹配能容忍尾部换行符（在 4.5+ 上保留）
- [ ] **[TUNE]** 如果迁移到 Haiku 4.5：检查速率限制层级（与 Haiku 3.x 分离的池）

**验证：**
- [ ] 运行一次测试请求并检查 `response.stop_reason`、`response.usage`，以及工具使用/推理行为是否符合预期

对于缓存的提示：渲染顺序和哈希输入没有变化，因此现有的 `cache_control` 断点继续有效。然而，**更改模型字符串会使现有缓存失效** —— 新模型上的第一个请求将重新写入缓存。

---

## 迁移到 Opus 4.7

> **模型 ID `claude-opus-4-7` 以本文为准。** 当用户要求迁移到 Opus 4.7 时，请精确地写 `model="claude-opus-4-7"`。**不要**通过 WebFetch 来验证 —— 本指南是迁移目标 ID 的权威来源。对应的条目存在于 `shared/models.md` 中。

Claude Opus 4.7 是我们迄今为止能力最强的通用模型。它具有高度自主性，在长周期代理工作、知识工作、视觉任务和记忆任务上表现卓越。本节总结了发布时的所有新内容。它叠加在上述 4.6 迁移之上 —— 如果调用者从 Opus 4.5 或更早版本跳转，先应用 4.6 变更，然后应用本节。

**已在使用 Opus 4.6 的用户的 TL;DR：** 将模型 ID 更新为 `claude-opus-4-7`，剥离任何剩余的 `budget_tokens` 和采样参数（两者在 Opus 4.7 上都会返回 400），为 `max_tokens` 留出额外余量并使用 `count_tokens()` 在新模型上重新校准基线，如果推理内容面向用户则选择恢复 `thinking.display: "summarized"`，并重新调整 `effort` —— 它在 4.7 上比在任何之前的 Opus 上都更重要。

### 破坏性变更（在 Opus 4.7 上会返回 400）

**扩展推理已移除。**

`thinking: {type: "enabled", budget_tokens: N}` 在 Claude Opus 4.7 及更高版本的模型上不再受支持，会返回 400 错误。切换到自适应推理（`thinking: {type: "adaptive"}`）并使用 effort 参数来控制推理深度。自适应推理在 Claude Opus 4.7 上**默认关闭**：没有 `thinking` 字段的请求会无推理运行，与 Opus 4.6 行为一致。显式设置 `thinking: {type: "adaptive"}` 来启用它。

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

如果调用者没有使用扩展推理，则不需要更改 —— 推理默认关闭，或者可以显式设置 `thinking={"type": "disabled"}`。

完全删除 `budget_tokens` 相关代码。对于替代的 `effort` 值，见下方**在 Opus 4.7 上选择 effort 级别** —— `budget_tokens` 到 effort 没有精确的 1:1 映射。

**采样参数已移除。**

`temperature`、`top_p` 和 `top_k` 参数在 Claude Opus 4.7 上不再被接受。包含它们的请求会返回 400 错误。从请求负载中移除这些字段。提示词是在 Claude Opus 4.7 上引导模型行为的推荐方式。如果你之前使用 `temperature = 0` 来追求确定性，请注意它在之前的模型上也从未保证完全相同的输出。

```python
# 之前 —— 在 Opus 4.7 上会报错
client.messages.create(temperature=0.7, top_p=0.9, ...)

# 之后
client.messages.create(...)  # 无采样参数
```

- **如果意图是确定性** —— 使用 `effort: "low"` 配合更严格的提示。
- **如果意图是创造性变化** —— 提示替代方案取决于用例；**询问用户**他们希望如何激发变化。如果不能询问，添加一个适合用例的指令，如*"选择一个偏离常规且有趣的选项"* —— 例如，对于文本生成，*"在响应中变换措辞和结构"*；对于前端/设计，使用下方**设计与前端编码**中提议 4 个方向的方法。

### 在 Opus 4.7 上选择 effort 级别

`budget_tokens` 控制*推理*多少；`effort` 控制*推理和行动*多少，因此没有精确的 1:1 映射。**在编码和代理用例中使用 `xhigh` 以获得最佳结果，对大多数对智能敏感的用例至少使用 `high`。** 尝试其他级别以进一步调整 token 使用和智能程度：

| 级别 | 使用场景 | 备注 |
| --- | --- | --- |
| `max` | 值得在最高级别测试的智能要求高的任务 | 在某些用例中可能带来收益，但增加的 token 使用可能带来递减回报；可能倾向于过度推理 |
| `xhigh` | **大多数编码和代理用例** | 这些场景的最佳设置；在 Claude Code 中作为默认值使用 |
| `high` | 对智能敏感的通用用例 | 平衡 token 使用和智能程度；大多数对智能敏感的工作推荐的最低级别 |
| `medium` | 需要在减少 token 使用的同时以智能程度换取成本的成本敏感用例 | |
| `low` | 短小、范围明确的任务和对延迟敏感但对智能不敏感的工作负载 | |

### 静默默认值变更（不报错，但行为不同）

**推理内容默认省略。**

推理块在 Claude Opus 4.7 的响应流中仍然出现，但其 `thinking` 字段为空，除非你显式选择加入。这是与 Claude Opus 4.6 的静默变化，在 4.6 上默认返回摘要推理文本。要在 Claude Opus 4.7 上恢复摘要推理内容，将 `thinking.display` 设置为 `"summarized"`。**块字段名不变** —— 在 `thinking` 类型的块上仍然是 `block.thinking`；不要重命名它。

**检测方法：** 任何从 `thinking` 类型块读取 `block.thinking`（或等效字段）并在 UI、日志或追踪中渲染它的代码。**修复方法是请求参数，而非响应处理** —— 向 `thinking` 参数添加 `display: "summarized"`：

```python
thinking={"type": "adaptive", "display": "summarized"}  # "display" 在 Opus 4.7 上新增；值："omitted"（默认）| "summarized"
```

Claude Opus 4.7 上的默认值是 `"omitted"`。如果推理内容从未在任何地方展示，则不需要更改。如果你的产品将推理流式传输给用户，新默认值表现为输出开始前的长暂停；设置 `display: "summarized"` 可在推理期间恢复可见的进度。

**更新后的 token 计数。**

Claude Opus 4.7 和 Claude Opus 4.6 计算 token 的方式不同。相同的输入文本在 Claude Opus 4.7 上产生的 token 计数比在 Claude Opus 4.6 上更高，且 `/v1/messages/count_tokens` 在 Claude Opus 4.7 上返回的 token 数量将与在 Claude Opus 4.6 上不同。Claude Opus 4.7 的 token 效率可能因工作负载形态而异。提示干预、`task_budget` 和 `effort` 可以帮助控制成本并确保适当的 token 使用。请注意这些控制可能会牺牲模型智能。**更新你的 `max_tokens` 参数以提供额外余量，包括压缩触发器。** Claude Opus 4.7 提供 1M 上下文窗口，采用标准 API 定价，无长上下文溢价。

还需检查的内容：

- 针对 4.6 校准的客户端 token 估算器（类似 tiktoken 的近似值）
- 将 token 乘以固定每 token 费率计算的成本计算器
- 与测量的 token 计数关联的速率限制重试阈值

通过在 `claude-opus-4-7` 上对调用者提示的代表性样本重新运行 `client.messages.count_tokens()` 来重新校准基线。不要应用统一的乘数。对于成本敏感的工作负载，考虑将 `effort` 降低一个级别（如 `high` → `medium`）。对于代理循环，考虑采用任务预算（Task Budgets，见下文）。

### 新功能：任务预算（Task Budgets，Beta）

Opus 4.7 引入了**任务预算** —— 告诉 Claude 它在完整代理循环（推理 + 工具调用 + 最终输出）中拥有多少 token。模型会看到一个运行的倒计时，并利用它来优先处理工作，在预算消耗时优雅地收尾。

这是一个**模型能感知到的建议**，而非硬性上限。它与 `max_tokens` 不同，后者仍然是强制的每次响应限制，且*不会*暴露给模型。当你希望模型自我调节时使用 `task_budget`；使用 `max_tokens` 作为硬上限来限制使用量。

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

为开放式的代理任务设置慷慨的预算，为对延迟敏感的任务收紧预算。**`task_budget.total` 的最小值是 20,000 token。** 如果预算对任务来说过于受限，模型可能完成得不够彻底，并引用其预算作为约束。**在迁移期间，除非你确定预算值是正确的，否则不要添加 `task_budget`** —— 如果你可以运行工作负载并测量，就这样做；否则向用户询问值而不是猜测。这是抵消代理工作负载上 token 计数变化的主要杠杆。

### 能力改进

**高分辨率视觉。** Opus 4.7 是首个支持高分辨率图像的 Claude 模型。最大图像分辨率为**长边 2576 像素**（从 Opus 4.6 及之前的 1568px 提升）。这解锁了视觉密集型工作负载的收益，尤其是计算机使用和截图/工件/文档理解。模型返回的坐标现在与图像实际像素 1:1 映射，因此不需要缩放因子计算。

高分辨率支持在 Opus 4.7 上是**自动的** —— 不需要 beta 头，不需要客户端选择加入。模型接受更大的输入并直接返回像素精确的坐标。

**Token 成本。** Opus 4.7 上的全分辨率图像可能使用比之前模型多约 3 倍的图像 token（每张图像最多约 4784 token，而之前约为 1,600 token 上限）。如果不需要额外的保真度，在发送之前在客户端降采样以控制成本 —— 但**不要在迁移期间默认添加降采样**。如果你不确定管道是否需要保真度，询问用户而不是猜测。使用 `count_tokens()` 在 Opus 4.7 上对代表性图像重新校准基线，然后再对任何测量的成本变化做出反应。

除了分辨率，Opus 4.7 还改进了低级感知（指向、测量、计数）和自然图像边界框定位和检测。

**知识工作。** 在模型可视化验证自身输出的任务上有显著提升 —— `.docx` 修订、`.pptx` 编辑和程序化图表/图形分析（例如通过图像处理库进行像素级数据转录）。如果提示中有类似*"在返回之前仔细检查幻灯片布局"*的脚手架，尝试移除它并重新校准基线。

**记忆。** Opus 4.7 在编写和使用基于文件系统的记忆方面更出色。如果代理跨轮次维护草稿本、笔记文件或结构化记忆存储，该代理应能更好地给自己记笔记并在未来的任务中利用这些笔记。

**面向用户的进度更新。** Opus 4.7 在长代理追踪期间提供更规律、更高质量的中期更新。如果系统提示中有类似*"每 3 次工具调用后总结进度"*的脚手架，尝试移除它以避免过多的面向用户文本。如果 Opus 4.7 更新的长度或内容不能很好地适配你的用例，在提示中明确描述这些更新应该是什么样子并提供示例。

### 实时网络安全保障

涉及被禁止或高风险主题的请求可能导致拒绝。

### 快速模式（Fast Mode）：在 Opus 4.7 上不可用

Opus 4.7 没有快速模式变体。**Opus 4.6 Fast 仍然受支持**。仅当调用者的代码实际使用了快速模式模型字符串（如 `claude-opus-4-6-fast`）时才提及；如果代码中没有出现"fast"一词，则对快速模式只字不提。

当你看到 `model="claude-opus-4-6-fast"`（或类似内容）时，**迁移编辑为**：

```python
# Opus 4.7 没有快速模式 —— 保持在 4.6 Fast（调用者自行选择是否切换到标准 Opus 4.7）。
model="claude-opus-4-6-fast",
```

即：保持模型字符串**不变**，在其上方添加上述注释，并告诉用户他们的两个选择 —— (a) 保持在 Opus 4.6 Fast，该模式仍然受支持，或 (b) 将对延迟不敏感的流量迁移到标准 Opus 4.7 以获得智能提升。**不要**自己将模型字符串重写为 `claude-opus-4-7`；这会静默地用延迟换取智能，这是调用者的决定。

### 行为变化（可通过提示调整）

这些不会破坏任何东西，但针对 Opus 4.6 调整的提示可能效果不同。Opus 4.7 比 4.6 更具可引导性，因此小的提示调整通常能弥补差距。

**更字面的指令遵循。** Claude Opus 4.7 比 Claude Opus 4.6 更字面、更明确地解释提示，特别是在较低的 effort 级别。它不会静默地将一条指令推广到另一条，也不会推断你没有提出的请求。这种字面性的好处是精确性和更少的无效操作。对于精心调整提示的 API 用例、结构化提取和需要可预测行为的管道，它通常表现更好。提示和框架审查对迁移到 Claude Opus 4.7 可能特别有帮助。

**详细程度根据任务复杂度校准。** Opus 4.7 根据它判断的任务复杂度来调整响应长度，而不是默认为固定的详细程度 —— 简单查询回答较短，开放式分析回答则长得多。如果产品依赖特定的长度或风格，请明确调整提示。减少详细程度：

> *"提供简洁、聚焦的响应。跳过不必要的上下文，保持示例最小化。"*

如果你看到特定类型的过度详细（如过度解释），添加针对这些的指令。展示所需简洁程度的正面示例往往比负面示例或告诉模型不要做什么的指令更有效。**不要**假设现有的"简洁"指令应该被移除 —— 先测试。

**语气和写作风格。** Opus 4.7 更加直接和鲜明，与 Opus 4.6 更温暖的风格相比，肯定性措辞更少，emoji 也更少。与任何新模型一样，长文写作的散文风格可能会变化。如果产品依赖特定的声音，根据新基线重新评估风格提示。如果需要更温暖或更具对话感的声音，请明确指定：

> *"使用温暖、协作的语气。在回答之前先确认用户的框架。"*

**`effort` 比以往任何 Opus 都更重要。** Opus 4.7 更严格地遵循 `effort` 级别，特别是在低端。在 `low` 和 `medium` 下，它将工作范围限定在所请求的内容上，而不是超出范围 —— 对延迟和成本有利，但在中等任务上使用 `low` 存在一定程度的推理不足风险。

- 如果复杂问题出现浅层推理，将 `effort` 提升到 `high` 或 `xhigh` 而不是通过提示来应对。
- 如果 `effort` 因延迟原因必须保持 `low`，添加有针对性的指导：*"此任务涉及多步推理。在回答之前仔细思考问题。"*
- **在 `xhigh` 或 `max` 下，设置较大的 `max_tokens`**，让模型有空间跨工具调用和子代理进行思考和行动。从 64K 开始，然后据此调整。（`xhigh` 是 Opus 4.7 上新的 effort 级别，介于 `high` 和 `max` 之间。）

自适应推理的触发也是可引导的。如果模型比期望的更频繁地推理 —— 这可能在庞大或复杂的系统提示中发生 —— 添加：*"推理会增加延迟，仅应在能显著提升回答质量时使用 —— 通常用于需要多步推理的问题。有疑问时，直接回答。"*

**默认情况下使用工具的频率更低。** Opus 4.7 倾向于比 4.6 更少地使用工具，而更多地使用推理。在大多数情况下这会产生更好的结果，但对于依赖工具的产品（搜索/检索、函数调用、计算机使用步骤），可能会降低工具使用率。两个杠杆：

- **提升 `effort`** —— `high` 或 `xhigh` 在代理搜索和编码中显示显著更多的工具使用，特别适用于知识工作。
- **通过提示引导** —— 在工具描述或系统提示中明确说明何时以及如何使用工具，并鼓励模型倾向于更频繁地使用它：

> *"当答案依赖于对话中不存在的信息时，你必须在回答之前调用 `search` 工具 —— 不要从先验知识回答。"*

**默认情况下更少的子代理。** Opus 4.7 倾向于比 4.6 派生出更少的子代理。这是可引导的 —— 给出何时委托是合适的明确指导。例如，对于编码代理：

> *"不要为可以在单个响应中直接完成的工作派生子代理（例如重构你已经能看到的函数）。当需要跨多个项目展开或读取多个文件时，在同一轮中派生多个子代理。"*

**设计和前端编码。** Opus 4.7 比 4.6 有更强的设计直觉，具有一致的默认风格：温暖的奶油色/米白色背景（约 `#F4F1EA`）、衬线展示字体（Georgia、Fraunces、Playfair）、斜体词强调，以及赤陶色/琥珀色强调。这对编辑、酒店和作品集简报很合适，但对仪表板、开发工具、金融科技、医疗保健或企业应用来说会感觉不合适 —— 并且它出现在幻灯片和 Web UI 中。

默认风格是持久的。通用指令（"不要用奶油色"、"做得干净极简"）往往会让模型转向不同的固定调色板，而不是产生多样性。两种方法可靠有效：

1. **指定具体替代方案。** 模型精确遵循明确的规范 —— 给出精确的十六进制值、字体和布局约束。
2. **让模型在构建之前提出选项。** 这打破了默认风格并给用户控制权：

   > *"在构建之前，提出 4 个针对此简报的不同视觉方向（每个方向：背景 hex / 强调色 hex / 字体 —— 一行理由）。让用户选择一个，然后仅实现该方向。"*

如果调用者之前依赖 `temperature` 来获得设计多样性，使用方法 (2) —— 它在多次运行中产生有意义的不同方向。

Opus 4.7 也需要比之前的模型更少的前端设计提示来避免通用的"AI 风格"美学。早期模型需要冗长的反风格化代码段，而 Opus 4.7 用更短的提示就能生成独特、有创意的前端。以下代码段与上述多样性方法配合使用效果良好：

> *"永远不要使用通用的 AI 生成美学，如过度使用的字体系列（Inter、Roboto、Arial、系统字体）、陈词滥调的配色方案（特别是白色或深色背景上的紫色渐变）、可预测的布局和组件模式，以及缺乏特定上下文特征的千篇一律的设计。使用独特的字体、协调的色彩和主题，以及用于效果和微交互的动画。"*

**交互式编码产品。** Opus 4.7 的 token 使用和行为在自主异步编码代理（单用户轮次）和交互式同步编码代理（多用户轮次）之间可能有所不同。具体来说，它在交互式设置中倾向于使用更多 token，主要是因为在用户轮次后进行了更多推理。这可以改善长周期交互编码会话中的长跨度一致性、指令遵循和编码能力，但也带来更多的 token 使用。要在编码产品中最大化性能和 token 效率，使用 `effort: "xhigh"` 或 `"high"`，添加自主功能（如自动模式），并减少需要用户进行的人工交互次数。

在限制所需的用户交互时，在第一个用户轮次中明确指定任务、意图和相关约束。前期明确、准确的清晰任务描述有助于最大化自主性和智能性，同时最小化用户轮次后的额外 token 使用 —— 因为 Opus 4.7 比之前的模型更自主，这种使用模式有助于最大化性能。相反，在多个用户轮次中逐步传达的模糊或不明确的提示往往会降低 token 效率，有时也会降低性能。

**代码审查。** Opus 4.7 在发现 bug 方面比之前的模型有显著提升，召回率和精确率都更高。然而，如果代码审查框架是针对早期模型调整的，它最初可能显示*更低*的召回率 —— 这很可能是框架效应，而非能力退步。当审查提示说"只报告高严重性问题"、"保持保守"或"不要吹毛求疵"时，Opus 4.7 比早期模型更忠实地遵循该指令：它同样彻底地调查，识别出 bug，然后拒绝报告它认为低于规定门槛的发现。精确率上升，但测量的召回率可能下降，即使底层的 bug 发现能力已经提升。

推荐的提示语言：

> *"报告你发现的每个问题，包括你不确定的或认为低严重性的问题。不要在此阶段按重要性或置信度过滤 —— 单独的验证步骤会做这件事。你的目标在这里是覆盖率：展示一个后来被过滤掉的发现，比静默地漏掉一个 bug 要好。对于每个发现，包含你的置信度水平和估计的严重性，以便下游过滤器可以排序。"*

这可以在没有实际第二步的情况下使用，但将置信度过滤移出发现步骤通常有帮助。如果框架有单独的验证/去重/排序阶段，明确告诉模型它在发现阶段的工作是覆盖率，而非过滤。如果需要单次自过滤，具体说明标准而不是使用"重要"等定性术语 —— 例如，*"报告任何可能导致错误行为、测试失败或误导结果的 bug；只省略纯粹的风格或命名偏好等小问题。"* 对评估子集迭代提示以验证召回率或 F1 提升。

**计算机使用。** 计算机使用适用于分辨率高达新的 2576px / 3.75MP 最大值。以 **1080p** 发送图像提供了性能和成本的良好平衡。对于特别成本敏感的工作负载，**720p** 或 **1366×768** 是性能强劲的低成本选项。通过测试找到用例的理想设置；尝试 `effort` 也有助于调整行为。

---

## Opus 4.7 迁移检查清单

每个项目都带有标记：**`[BLOCKS]`** 项如果遗漏会导致 400 错误、无限循环、静默截断或空输出 —— 将这些作为代码编辑应用，而非作为建议。**`[TUNE]`** 项是质量/成本调整 —— 将它们作为建议展示给用户。

以 **"If…"** 或 **"At…"** 为前缀的 `[BLOCKS]` 项是有条件的。在遍历清单之前，**扫描文件**中的条件：它是否将推理文本展示给 UI/日志？是否将 `output_config.effort` 设置为 `"x-high"` 或 `"max"`？是否是安全工作负载？是否是多轮代理循环？仅应用条件匹配的项目。

- [ ] **[BLOCKS]** 将 `thinking: {type: "enabled", budget_tokens: N}` 替换为 `thinking: {type: "adaptive"}` + `output_config.effort`；完全删除 `budget_tokens` 相关代码
- [ ] **[BLOCKS]** 从请求构造中剥离 `temperature`、`top_p`、`top_k`
- [ ] **[BLOCKS]** 如果推理内容展示给用户或存储在日志中：添加 `thinking.display: "summarized"`（否则渲染的文本为空）
- [ ] **[BLOCKS]** 在 `output_config.effort` 为 `xhigh` 或 `max` 时：设置 `max_tokens` ≥ 64000（否则输出在推理中途截断）
- [ ] **[TUNE]** 为 `max_tokens` 和压缩触发器留出额外余量；在 `claude-opus-4-7` 上对代表性提示重新运行 `count_tokens()` 来重新校准基线（不要用统一乘数）
- [ ] **[TUNE]** 在对测量的变化做出反应*之前*，重新校准成本和速率限制仪表板
- [ ] **[TUNE]** 按路由重新评估 `effort` —— 编码/代理使用 `xhigh`，大多数对智能敏感的工作至少使用 `high`；它在 4.7 上比以往任何 Opus 都更重要
- [ ] **[TUNE]** 多轮代理循环：采用 API 原生的任务预算（`output_config.task_budget`，beta `task-budgets-2026-03-13`，最少 20k token）—— 这用于限制跨循环的*累积*消耗；每轮深度由 `effort` 控制
- [ ] **[TUNE]** 检查依赖 4.6 推广意图的模糊或不明确的指令，并将其更新为更清晰或更精确 —— 4.7 会字面地遵循它们
- [ ] **[TUNE]** 工具使用工作负载：向工具描述添加明确的何时/如何使用指导（4.7 使用工具的倾向更低）
- [ ] **[TUNE]** 详细程度：在更改之前先测试现有的长度指令 —— 4.7 根据任务复杂度校准长度，所以针对所需输出进行调整，而不是假设一个方向
- [ ] **[TUNE]** 移除强制的进度更新脚手架（*"每 N 次工具调用后…"*）
- [ ] **[TUNE]** 移除知识工作验证脚手架（*"仔细检查幻灯片布局…"*）并重新校准基线
- [ ] **[TUNE]** 如果需要更温暖/更具对话感的声音，添加语气指令；在写作密集型路由上重新评估风格提示
- [ ] **[TUNE]** 存在子代理工具：添加明确的派生/不派生指导
- [ ] **[TUNE]** 前端/设计输出：指定具体调色板/字体，或让模型在构建之前提出 4 个视觉方向（默认的奶油色/衬线风格是持久的）
- [ ] **[TUNE]** 交互式编码产品：使用 `effort: "xhigh"` 或 `"high"`，添加自主功能（如自动模式）以减少人工交互，并在第一个轮次中明确指定任务/意图/约束
- [ ] **[TUNE]** 代码审查框架：移除或放宽"仅报告高严重性"/"保持保守"的过滤器，让模型报告每个发现并附带置信度 + 严重性；将过滤移至下游步骤（4.7 更字面地遵循严重性过滤器，这可能会降低测量的召回率）
- [ ] **[TUNE]** 视觉密集型管道（截图、图表、文档理解）：将图像保持在本机分辨率，最高 2576px 长边以获得精度提升；从坐标处理中移除任何缩放因子计算（坐标现在与像素 1:1）。不需要 beta 头/选择加入 —— 高分辨率在 Opus 4.7 上自动生效。
- [ ] **[TUNE]** 计算机使用管道：以 1080p 发送截图以获得良好的性能/成本平衡（成本敏感工作负载使用 720p 或 1366×768）；尝试 `effort` 来调整行为
- [ ] **[TUNE]** 成本敏感图像管道：4.7 上的全分辨率图像使用高达 ~4784 token，而之前的模型约为 ~1,600（约 3 倍）。在上传之前在客户端降采样可以避免增加，但**不要默认降采样** —— 如果不确定是否需要保真度，询问用户。在对成本变化做出反应之前，使用 `count_tokens()` 在代表性图像上重新校准基线。

---

## 验证迁移

更新后，抽查确认新模型确实被使用了。将 `YOUR_TARGET_MODEL` 替换为你迁移到的模型字符串（如 `claude-opus-4-7`、`claude-opus-4-6`、`claude-sonnet-4-6`、`claude-haiku-4-5`），并保持断言前缀同步：

```python
YOUR_TARGET_MODEL = "{{OPUS_ID}}"  # 或 "claude-opus-4-6"、"claude-sonnet-4-6"、"claude-haiku-4-5"
response = client.messages.create(model=YOUR_TARGET_MODEL, max_tokens=64, messages=[...])
assert response.model.startswith(YOUR_TARGET_MODEL), response.model
```

对于速率限制余量变更、定价或能力差异（视觉、结构化输出、effort 支持），查询 Models API：

```python
m = client.models.retrieve(YOUR_TARGET_MODEL)
m.max_input_tokens, m.max_tokens
m.capabilities["effort"]["max"]["supported"]
```

完整的能力查找模式见 `shared/models.md`。
