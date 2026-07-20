<!--
name: 'Data: Claude model catalog'
description: 当前和旧版 Claude 模型目录，包含精确的模型 ID、别名、上下文窗口和定价
ccVersion: 2.1.197
-->
# Claude 模型目录

**仅使用本文件中列出的精确模型 ID。** 切勿猜测或构造模型 ID——错误的 ID 会导致 API 错误。尽可能使用别名。获取最新信息，请使用 WebFetch 访问 `shared/live-sources.md` 中的 Models Overview URL，或直接查询 Models API（参见下方的程序化模型发现）。

## 程序化模型发现

对于**实时**能力数据——上下文窗口、最大输出 token 数、功能支持（thinking、vision、effort、structured outputs 等）——请查询 Models API，而不是依赖下面的缓存表格。当用户询问"X 的上下文窗口是多少"、"模型 X 是否支持 vision/thinking/effort"、"哪些模型支持功能 Y"，或希望在运行时按能力选择模型时使用此方法。

```python
m = client.models.retrieve("claude-opus-4-8")
m.id                 # "claude-opus-4-8"
m.display_name       # "Claude Opus 4.8"
m.max_input_tokens   # 上下文窗口（int）
m.max_tokens         # 最大输出 token 数（int）

# capabilities 是一个无类型的嵌套 dict——使用方括号访问，在叶子节点检查 ["supported"]
caps = m.capabilities
caps["image_input"]["supported"]                       # vision
caps["thinking"]["types"]["adaptive"]["supported"]     # adaptive thinking
caps["effort"]["max"]["supported"]                     # effort: max（也有 low/medium/high）
caps["structured_outputs"]["supported"]
caps["context_management"]["compact_20260112"]["supported"]

# 跨所有模型过滤——直接迭代 page 对象（自动分页）；不要使用 .data
[m for m in client.models.list()
 if m.capabilities["thinking"]["types"]["adaptive"]["supported"]
 and m.max_input_tokens >= 200_000]
```

顶级字段（`id`、`display_name`、`max_input_tokens`、`max_tokens`）是有类型的属性。`capabilities` 是一个 dict——使用方括号访问，而不是属性访问。API 为每个模型返回完整的能力树，每个叶子节点都有 `supported: true/false`，因此方括号链可以安全使用，无需 `.get()` 防护。TypeScript SDK：方法名相同，迭代时也自动分页。

### 原始 HTTP

```bash
curl https://api.anthropic.com/v1/models/claude-opus-4-8 \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

```json
{
  "id": "claude-opus-4-8",
  "display_name": "Claude Opus 4.8",
  "max_input_tokens": 1000000,
  "max_tokens": 128000,
  "capabilities": {
    "image_input": {"supported": true},
    "structured_outputs": {"supported": true},
    "thinking": {"supported": true, "types": {"enabled": {"supported": false}, "adaptive": {"supported": true}}},
    "effort": {"supported": true, "low": {"supported": true}, …, "max": {"supported": true}},
    …
  }
}
```

## 当前模型（推荐）

| 友好名称     | 别名（使用此列）    | 完整 ID                       | 上下文        | 最大输出 | 状态 |
|-------------------|---------------------|-------------------------------|----------------|------------|--------|
| {{FABLE_NAME}}    | `{{FABLE_ID}}`      | —                             | 1M             | 128K       | 活跃 |
| {{MYTHOS_NAME}}   | `{{MYTHOS_ID}}`     | —                             | 1M             | 128K       | 活跃（仅限 Project Glasswing） |
| Claude Opus 4.8   | `claude-opus-4-8`   | —                             | 1M             | 128K       | 活跃 |
| Claude Opus 4.7   | `claude-opus-4-7`   | —                             | 1M             | 128K       | 活跃 |
| Claude Opus 4.6   | `claude-opus-4-6`   | —                             | 1M             | 128K       | 活跃 |
| {{SONNET_NEXT_NAME}} | `{{SONNET_NEXT_ID}}` | —                         | 1M             | 128K       | 活跃 |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | -                             | 1M             | 128K       | 活跃 |
| Claude Haiku 4.5  | `claude-haiku-4-5`  | `claude-haiku-4-5-20251001`   | 200K           | 64K        | 活跃 |

### 模型描述
- **{{FABLE_NAME}}** — Anthropic 最强大的广泛发布模型，适用于最苛刻的推理和长期代理工作。与 Opus 4.7/4.8 具有相同的 API 接口，但有一个新的破坏性变更：显式设置 `thinking: {type: "disabled"}` 会返回 400——请改为省略 `thinking` 参数（thinking 始终开启；原始思维链永远不会返回——通过 `display: "summarized"` 获取摘要）。与 Opus 4.8 使用相同的分词器（token 计数与 Opus 4.7/4.8 大致相同）。安全分类器可能返回 `stop_reason: "refusal"`。不支持助手预填充。需要 30 天数据保留（ZDR 下不可用）。$10/$50 每 MTok；1M 上下文窗口（默认），128K 最大输出。参见 `shared/model-migration.md` → 迁移到 {{FABLE_NAME}}。
- **{{MYTHOS_NAME}}** — 与 {{FABLE_NAME}} 具有相同的能力、定价、限制和 API 行为；仅模型 ID 不同。仅通过 Project Glasswing 提供，在那里它加入（并接替）仅限邀请的 Claude Mythos Preview（`claude-mythos-preview`）。仅在组织参与 Project Glasswing 时使用；否则使用 {{FABLE_ID}}。
- **Claude Opus 4.8** — 最强大的 Opus 级模型——高度自主，在长期代理工作、知识工作和记忆方面达到最先进水平；写作更清晰、更温暖。与 Opus 4.7 具有相同的 API 接口（仅支持 adaptive thinking；采样参数和 `budget_tokens` 已移除）。1M 上下文窗口，标准 API 定价（无长上下文溢价）。参见 `shared/model-migration.md` → 迁移到 Opus 4.8——从 4.7 到 4.8 只需更换模型 ID 并重新调优提示词，无新的破坏性变更。
- **Claude Opus 4.7** — 上一代 Opus。高度自主；在长期代理工作、知识工作、视觉和记忆方面表现出色。仅支持 adaptive thinking；采样参数和 `budget_tokens` 已移除。1M 上下文窗口。参见 `shared/model-migration.md` → 迁移到 Opus 4.7。
- **Claude Opus 4.6** — 较旧的 Opus。支持 adaptive thinking（推荐），128K 最大输出 token 数（大输出需要流式传输）。1M 上下文窗口。
- **{{SONNET_NEXT_NAME}}** — Sonnet 级中速度与智能的最佳组合；在编码和代理工作上接近 Opus 质量。默认开启 adaptive thinking（省略 `thinking` 则运行 adaptive）；手动 `budget_tokens` 已移除；非默认采样参数会被拒绝。`effort` 支持 `low`/`medium`/`high`/`xhigh`/`max`。新分词器（相同文本比 Sonnet 4.6 多约 30% 的 token）。高分辨率视觉（2576px）。1M 上下文窗口，128K 最大输出。参见 `shared/model-migration.md` → 迁移到 {{SONNET_NEXT_NAME}}。
- **Claude Sonnet 4.6** — 上一代 Sonnet。支持 adaptive thinking（推荐）。1M 上下文窗口。128K 最大输出 token 数。
- **Claude Haiku 4.5** — 适合简单任务的最快、最具成本效益的模型。

## 旧版模型（仍然活跃）

| 友好名称     | 别名（使用此列）    | 完整 ID                       | 状态 |
|-------------------|---------------------|-------------------------------|--------|
| Claude Opus 4.5   | `claude-opus-4-5`   | `claude-opus-4-5-20251101`    | 活跃 |
| Claude Opus 4.1   | `claude-opus-4-1`   | `claude-opus-4-1-20250805`    | 已弃用（2026-08-05 退役——迁移到 `claude-opus-4-8`） |
| Claude Sonnet 4.5 | `claude-sonnet-4-5` | `claude-sonnet-4-5-20250929`  | 活跃 |

## 已弃用模型（即将退役）

| 友好名称     | 别名（使用此列）    | 完整 ID                       | 状态     | 退役日期      |
|-------------------|---------------------|-------------------------------|------------|--------------|
| Claude Sonnet 4   | `claude-sonnet-4-0` | `claude-sonnet-4-20250514`    | 已弃用 | 待定          |
| Claude Opus 4     | `claude-opus-4-0`   | `claude-opus-4-20250514`      | 已弃用 | 待定          |
| Claude Haiku 3    | —                   | `claude-3-haiku-20240307`     | 已弃用 | 2026 年 4 月 19 日 |

## 已退役模型（不再可用）

| 友好名称     | 完整 ID                       | 退役日期     |
|-------------------|-------------------------------|-------------|
| Claude Sonnet 3.7 | `claude-3-7-sonnet-20250219`  | 2026 年 2 月 19 日 |
| Claude Haiku 3.5  | `claude-3-5-haiku-20241022`   | 2026 年 2 月 19 日 |
| Claude Opus 3     | `claude-3-opus-20240229`      | 2026 年 1 月 5 日 |
| Claude Sonnet 3.5 | `claude-3-5-sonnet-20241022`  | 2025 年 10 月 28 日 |
| Claude Sonnet 3.5 | `claude-3-5-sonnet-20240620`  | 2025 年 10 月 28 日 |
| Claude Sonnet 3   | `claude-3-sonnet-20240229`    | 2025 年 7 月 21 日 |
| Claude 2.1        | `claude-2.1`                  | 2025 年 7 月 21 日 |
| Claude 2.0        | `claude-2.0`                  | 2025 年 7 月 21 日 |

## 解析用户请求

当用户按名称请求模型时，使用此表查找正确的模型 ID：

| 用户说...                              | 使用此模型 ID              |
|-------------------------------------------|--------------------------------|
| "fable"、"最强大的模型"             | `{{FABLE_ID}}`                 |
| "最强大"                           | `{{FABLE_ID}}`                 |
| "mythos"、"mythos 5"                      | `{{MYTHOS_ID}}`（仅限 Project Glasswing 参与者；否则使用 `{{FABLE_ID}}`） |
| "mythos preview"                          | `{{MYTHOS_ID}}`（`claude-mythos-preview` 的继任者——参见迁移指南） |
| "opus"                                    | `claude-opus-4-8`              |
| "opus 4.8"                                | `claude-opus-4-8`              |
| "opus 4.7"                                | `claude-opus-4-7`              |
| "opus 4.6"                                | `claude-opus-4-6`              |
| "opus 4.5"                                | `claude-opus-4-5`              |
| "opus 4.1"                                | `claude-opus-4-1`（已弃用，2026-08-05 退役——建议 `claude-opus-4-8`） |
| "opus 4"、"opus 4.0"                      | `claude-opus-4-0`（已弃用——建议 `claude-opus-4-8`） |
| "sonnet"、"均衡"                      | `{{SONNET_NEXT_ID}}`           |
| "sonnet 5"                                | `{{SONNET_NEXT_ID}}`           |
| "sonnet 4.6"                              | `claude-sonnet-4-6`            |
| "sonnet 4.5"                              | `claude-sonnet-4-5`            |
| "sonnet 4"、"sonnet 4.0"                  | `claude-sonnet-4-0`（已弃用——建议 `{{SONNET_NEXT_ID}}`） |
| "sonnet 3.7"                              | 已退役——建议 `{{SONNET_NEXT_ID}}` |
| "sonnet 3.5"                              | 已退役——建议 `{{SONNET_NEXT_ID}}` |
| "haiku"、"快速"、"便宜"                  | `claude-haiku-4-5`             |
| "haiku 4.5"                               | `claude-haiku-4-5`             |
| "haiku 3.5"                               | 已退役——建议 `claude-haiku-4-5` |
| "haiku 3"                                 | 已弃用——建议 `claude-haiku-4-5` |
