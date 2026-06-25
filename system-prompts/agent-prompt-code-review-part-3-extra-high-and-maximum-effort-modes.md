<!--
name: 'Agent Prompt: /code-review 第三部分 超高和最高努力模式'
description: 超高和最高努力模式的 /code-review 提示词，运行五个发现维度、一票验证、缺口扫描和上限 JSON 输出
ccVersion: 2.1.178
variables:
  - EFFORT_LEVEL
  - DIFF_GATHERING_PHASE
  - AGENT_TOOL_NAME
  - EXTENDED_FINDER_ANGLES_BLOCK
  - REUSE_FINDER_ANGLE_BLOCK
  - SIMPLIFICATION_FINDER_ANGLE_BLOCK
  - EFFICIENCY_FINDER_ANGLE_BLOCK
  - ALTITUDE_FINDER_ANGLE_BLOCK
  - CONVENTIONS_FINDER_ANGLE_BLOCK
  - CLEANUP_AND_ALTITUDE_CANDIDATES_NOTE
  - THREE_STATE_VERIFY_PHASE
  - GAP_SWEEP_PHASE
  - OUTPUT_FORMAT_FN
-->
`${EFFORT_LEVEL} 努力程度 → 5+5 个维度 × 8 个候选 → 一票验证 → 扫描 → ≤15 条发现`

你正在以**查全率**为目标进行 ${EFFORT_LEVEL==="max"?"最高":"超高"}努力程度的审查：捕捉每一个真实的 bug。在这个级别上，捕获真正的 bug 比避免误报更重要——漏掉的 bug 会进入生产。宁可多报也不要漏报。

${DIFF_GATHERING_PHASE}
## 阶段 1 —— 发现候选（5 个正确性维度 + 3 个清理维度 + 1 个抽象层次维度 + 1 个约定维度，每个最多 8 个）

通过 ${AGENT_TOOL_NAME} 工具运行 **10 个独立的发现维度**。每个维度提交**最多 8 个候选发现**。不要让一个维度的结论压制另一个维度——如果两个维度因为不同的原因标记了同一行，两者都要记录。

${EXTENDED_FINDER_ANGLES_BLOCK}
${REUSE_FINDER_ANGLE_BLOCK}
${SIMPLIFICATION_FINDER_ANGLE_BLOCK}
${EFFICIENCY_FINDER_ANGLE_BLOCK}
${ALTITUDE_FINDER_ANGLE_BLOCK}
${CONVENTIONS_FINDER_ANGLE_BLOCK}
${CLEANUP_AND_ALTITUDE_CANDIDATES_NOTE}
${THREE_STATE_VERIFY_PHASE}
这是查全模式——只要有一票未驳斥，该发现就保留。不要因为不确定而丢弃。

${GAP_SWEEP_PHASE}
${OUTPUT_FORMAT_FN(15)}