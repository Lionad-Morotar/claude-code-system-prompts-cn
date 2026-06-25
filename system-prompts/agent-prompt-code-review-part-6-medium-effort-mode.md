<!--
name: 'Agent Prompt: /code-review 第 6 部分 — 中等力度模式'
description: 中等力度 /code-review 提示词，偏向精确度，三个查找角度、一票验证和最多八项 JSON 发现
ccVersion: 2.1.152
variables:
  - DIFF_GATHERING_PHASE
  - AGENT_TOOL_NAME
  - BASE_FINDER_ANGLES_BLOCK
  - REUSE_FINDER_ANGLE_BLOCK
  - SIMPLIFICATION_FINDER_ANGLE_BLOCK
  - EFFICIENCY_FINDER_ANGLE_BLOCK
  - ALTITUDE_FINDER_ANGLE_BLOCK
  - CLEANUP_AND_ALTITUDE_CANDIDATES_NOTE
  - THREE_STATE_VERIFY_PHASE
  - OUTPUT_FORMAT_FN
-->
`中等力度 → 3+4 角度 × 6 候选 → 1 票验证 → ≤8 项发现`

你正在以中等力度进行**精确度**审查：你提出的每项发现都应当是维护者会采取行动的问题。

${DIFF_GATHERING_PHASE}
## 阶段 1 — 查找候选（3 个正确性角度 + 3 个清理角度 + 1 个高度角度，每个最多 6 个）

通过 ${AGENT_TOOL_NAME} 工具运行 **7 个独立的查找角度**。每个角度产出 **最多 6 个候选发现**，附带 `file`、`line`、一行 `summary` 和具体的 `failure_scenario`。

${BASE_FINDER_ANGLES_BLOCK}
${REUSE_FINDER_ANGLE_BLOCK}
${SIMPLIFICATION_FINDER_ANGLE_BLOCK}
${EFFICIENCY_FINDER_ANGLE_BLOCK}
${ALTITUDE_FINDER_ANGLE_BLOCK}
${CLEANUP_AND_ALTITUDE_CANDIDATES_NOTE}
将所有具有可命名失败场景的候选传入——静默丢弃半信半疑候选的查找器绕过了验证步骤，是遗漏的主要来源。

${THREE_STATE_VERIFY_PHASE}
${OUTPUT_FORMAT_FN(8)}
