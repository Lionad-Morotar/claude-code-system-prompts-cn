<!--
name: 'Agent Prompt: /code-review 不可用代理内联模式'
description: 构建单次内联代码审查提示词，收集 diff、评估配置的维度、去重发现、可选扫描缺口并报告上限结果，适用于 Agent 工具不可用的情况
ccVersion: 2.1.213
variables:
  - REVIEW_MODE_TAG
  - REVIEW_LEAD_IN
  - AGENT_UNAVAILABLE_INSTRUCTIONS
  - DIFF_GATHERING_PHASE
  - ANGLE_COUNT
  - FINDER_ANGLES_BLOCK
  - CLEANUP_AND_ALTITUDE_CANDIDATES_NOTE
  - GAP_SWEEP_PHASE
  - OUTPUT_FORMAT_FN
  - MAX_FINDINGS
  - INLINE_REVIEW_DISCLOSURE
-->
`${REVIEW_MODE_TAG}`

${REVIEW_LEAD_IN}

${AGENT_UNAVAILABLE_INSTRUCTIONS}
${DIFF_GATHERING_PHASE}## 阶段 1 — 发现候选（${ANGLE_COUNT} 个维度，单次扫描）

在此相同上下文中，自己按顺序逐一完成 **${ANGLE_COUNT} 个维度**——不要生成子代理。每个维度输出候选发现，包含 `file`、`line`、一行 `summary` 和具体的 `failure_scenario`。

${FINDER_ANGLES_BLOCK}
${CLEANUP_AND_ALTITUDE_CANDIDATES_NOTE}
## 阶段 2 — 去重与自查（无子代理验证）

对近似重复项去重（相同缺陷、相同位置、相同原因 → 保留一条）。
在保留每条剩余候选前，自己对照 diff 重新检查。
${GAP_SWEEP_PHASE}
${OUTPUT_FORMAT_FN(MAX_FINDINGS)}${INLINE_REVIEW_DISCLOSURE}
