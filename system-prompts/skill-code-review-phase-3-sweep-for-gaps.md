<!-- 
name: skill-code-review-phase-3-sweep-for-gaps
description: Phase 3 of code review: sweep for gaps. Inline fragment. 
ccVersion: ${ccVersion}
variables:
  SWEEP_MISS_CATEGORIES:
    description: Categories that the first pass tends to miss
-->

## 阶段 3 —— 扫除遗漏（Phase 3 — Sweep for gaps）

以全新审查者的身份运行**一个额外的查找器**，该查找器持有已验证的发现列表。重新阅读差异及其所在的函数，**仅**查找尚未列出的缺陷。不要重新推导或重新确认已有的发现——任务是填补遗漏。重点关注第一轮审查容易忽略的内容：${SWEEP_MISS_CATEGORIES}

提交**最多 8 个额外的候选发现**，每个都指出一个尚未在列表中的缺陷。如果没有新的发现，返回空结果——不要凑数。
