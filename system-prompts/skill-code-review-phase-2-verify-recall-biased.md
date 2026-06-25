<!-- 
name: skill-code-review-phase-2-verify-recall-biased
description: Phase 2 of code review: verify with recall bias. Inline fragment. 
ccVersion: ${ccVersion}
variables:
  AGENT_TOOL_NAME:
    description: Agent tool name
  RECALL_BIASED_RUBRIC:
    description: Recall biased rubric
-->

## 阶段 2 —— 验证（单票，偏向召回）（Phase 2 — Verify, 1-vote, recall-biased）

对近似重复的候选发现进行去重（同一缺陷、同一位置、同一原因 → 保留一个）。对于每个剩余的候选发现，通过 ${AGENT_TOOL_NAME} 工具运行**一个验证器**：向它提供差异、相关文件和候选发现；它返回 **CONFIRMED / PLAUSIBLE / REFUTED** 三者之一。

${RECALL_BIASED_RUBRIC}

保留 **CONFIRMED 和 PLAUSIBLE** 的结果。丢弃 REFUTED 的结果。
