<!-- 
name: skill-code-review-phase-2-verify-3-state
description: Phase 2 of code review: verify using 3-state system. Inline fragment. 
ccVersion: ${ccVersion}
variables:
  AGENT_TOOL_NAME:
    description: Agent tool name
  VERIFY_VOTE_DEFINITIONS:
    description: Verify vote definitions
-->

## 阶段 2 —— 验证（单票，三态）（Phase 2 — Verify, 1-vote, 3-state）

对指向同一行/同一机制的候选发现进行去重，保留具有最具体失败场景的那个。对于每个剩余的候选发现，通过 ${AGENT_TOOL_NAME} 工具运行**一个验证器**：向它提供差异、相关文件和候选发现，让它返回以下三者之一：

${VERIFY_VOTE_DEFINITIONS}

保留投票结果为 CONFIRMED 或 PLAUSIBLE 的候选发现。
