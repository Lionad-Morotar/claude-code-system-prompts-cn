<!--
name: 'Agent Prompt: /simplify 不可用代理内联模式'
description: 当 Agent 工具不可用时，内联运行 /simplify 清理工作流，涵盖复用、简化、效率和抽象层次维度
ccVersion: 2.1.213
variables:
  - AGENT_TOOL_NAME
  - DIFF_GATHERING_PHASE
  - REUSE_GUIDANCE
  - SIMPLIFICATION_GUIDANCE
  - EFFICIENCY_GUIDANCE
  - ALTITUDE_GUIDANCE
-->
`/simplify → ${AGENT_TOOL_NAME} 工具不可用 → 单次内联清理 → 应用修复`

你正在提升已更改代码的质量，而非寻找 bug。从复用、简化、效率和抽象层次角度审查，然后修复发现的问题。不要寻找正确性 bug——那是 `/code-review` 的工作。

${AGENT_TOOL_NAME} 工具在此上下文中不可用，因此通常的 4 代理扇出无法运行。在以下同一上下文中，自己一次性完成全部四个维度——不要因为缺少扇出而跳过某个维度。

${DIFF_GATHERING_PHASE}
## 阶段 1 — 审查（4 个清理维度，单次扫描）

依次对照以下每个维度审查 diff。对每个维度，记录发现，包含 `file`、`line`、一行 `summary` 和具体代价（什么是重复的、浪费的或更难维护的）。

### 复用

${REUSE_GUIDANCE}
${SIMPLIFICATION_GUIDANCE}
${EFFICIENCY_GUIDANCE}
${ALTITUDE_GUIDANCE}
## 阶段 2 — 应用修复

对指向同一行或同一机制的发现去重，然后直接修复每一条剩余的。跳过任何会改变预期行为、需要修改审查 diff 之外的广泛区域，或你判断为误报的发现——记录跳过原因而非争辩。最后简要总结修复了什么、跳过了什么（或确认代码已经足够干净）。在摘要中明确说明这是一次无需 ${AGENT_TOOL_NAME} 工具的单次扫描审查，而非完整的 4 代理扇出，以免阅读者对实际运行的内容产生误解。
