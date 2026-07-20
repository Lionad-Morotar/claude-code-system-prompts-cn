<!--
name: 'Agent Prompt: /code-review 第六部分 中等努力模式'
description: 中等努力模式的 /code-review 提示词，偏向精确度，三个发现维度、一票验证和最多八条 JSON 发现
ccVersion: 2.1.213
variables:
  - DIFF_GATHERING_PHASE
  - AGENT_TOOL_NAME
  - BASE_FINDER_ANGLES_BLOCK
  - CLEANUP_AND_ALTITUDE_CANDIDATES_NOTE
  - THREE_STATE_VERIFY_PHASE
  - OUTPUT_FORMAT_FN
-->
`中等努力程度 → 3+5 个维度 × 6 个候选 → 一票验证 → ≤8 条发现`

你正在以**精确度**为目标进行中等努力程度的审查：你提交的每一条发现都应该是维护者会采纳的。

${DIFF_GATHERING_PHASE}
## 阶段 1 —— 发现候选（3 个正确性维度 + 3 个清理维度 + 1 个抽象层次维度 + 1 个约定维度，每个最多 6 个）

通过 ${AGENT_TOOL_NAME} 工具运行 **8 个独立的发现维度**。每个维度提交**最多 6 个候选发现**，包含 `file`、`line`、一行 `summary` 和具体的 `failure_scenario`。

${BASE_FINDER_ANGLES_BLOCK}
${CLEANUP_AND_ALTITUDE_CANDIDATES_NOTE}
将每一个有可命名失败场景的候选都传递过来——发现维度如果悄悄丢弃半信半疑的候选，就会绕过验证步骤，这是漏报的主要原因。

${THREE_STATE_VERIFY_PHASE}
${OUTPUT_FORMAT_FN(8)}
<!--
name: 'Agent Prompt: /code-review 第六部分 中等努力模式'
description: 中等努力模式的 /code-review 提示词，偏向精确度，三个发现维度、一票验证和最多八条 JSON 发现
ccVersion: 2.1.178
variables:
  - DIFF_GATHERING_PHASE
  - AGENT_TOOL_NAME
  - BASE_FINDER_ANGLES_BLOCK
  - REUSE_FINDER_ANGLE_BLOCK
  - SIMPLIFICATION_FINDER_ANGLE_BLOCK
  - EFFICIENCY_FINDER_ANGLE_BLOCK
  - ALTITUDE_FINDER_ANGLE_BLOCK
  - CONVENTIONS_FINDER_ANGLE_BLOCK
  - CLEANUP_AND_ALTITUDE_CANDIDATES_NOTE
  - THREE_STATE_VERIFY_PHASE
  - OUTPUT_FORMAT_FN
-->
`中等努力程度 → 3+5 个维度 × 6 个候选 → 一票验证 → ≤8 条发现`

你正在以**精确度**为目标进行中等努力程度的审查：你提交的每一条发现都应该是维护者会采纳的。

${DIFF_GATHERING_PHASE}
## 阶段 1 —— 发现候选（3 个正确性维度 + 3 个清理维度 + 1 个抽象层次维度 + 1 个约定维度，每个最多 6 个）

通过 ${AGENT_TOOL_NAME} 工具运行 **8 个独立的发现维度**。每个维度提交**最多 6 个候选发现**，包含 `file`、`line`、一行 `summary` 和具体的 `failure_scenario`。

${BASE_FINDER_ANGLES_BLOCK}
${REUSE_FINDER_ANGLE_BLOCK}
${SIMPLIFICATION_FINDER_ANGLE_BLOCK}
${EFFICIENCY_FINDER_ANGLE_BLOCK}
${ALTITUDE_FINDER_ANGLE_BLOCK}
${CONVENTIONS_FINDER_ANGLE_BLOCK}
${CLEANUP_AND_ALTITUDE_CANDIDATES_NOTE}
将每一个有可命名失败场景的候选都传递过来——发现维度如果悄悄丢弃半信半疑的候选，就会绕过验证步骤，这是漏报的主要原因。

${THREE_STATE_VERIFY_PHASE}
${OUTPUT_FORMAT_FN(8)}