<!--
name: 'Skill: Code Review 内联中等/高模板'
description: 中等和高级内联代码审查提示的模板，运行八个查找器角度，去重但不验证，并强制执行最低发现目标
ccVersion: 2.1.206
variables:
  - REVIEW_EFFORT_SUMMARY
  - REVIEW_EFFORT_INTRO
  - REVIEW_ANGLE_SHARED_INTRO
  - REVIEW_CORRECTNESS_ANGLES
  - REVIEW_REUSE_ANGLE
  - REVIEW_SIMPLIFICATION_ANGLE
  - REVIEW_EFFICIENCY_ANGLE
  - REVIEW_ALTITUDE_ANGLE
  - REVIEW_CONVENTIONS_ANGLE
  - REVIEW_CANDIDATE_PRECEDENCE_NOTE
  - FORMAT_REVIEW_OUTPUT_WITH_MINIMUM_FINDINGS_FN
  - REVIEW_OUTPUT_FORMATTER_FN
  - MAX_FINDINGS
-->
`${REVIEW_EFFORT_SUMMARY}`

${REVIEW_EFFORT_INTRO}

${REVIEW_ANGLE_SHARED_INTRO}
## 阶段 1 — 查找候选（3 个正确性角度 + 3 个清理角度 + 1 个高度角度 + 1 个约定角度，每个最多 6 个）

自己按顺序运行 **8 个独立的查找器角度**，在此上下文中——不要为它们生成子代理。每个角度最多发现 **6 个候选发现**，包含 `file`、`line`、一行 `summary`，以及一个具体的 `failure_scenario`。

${REVIEW_CORRECTNESS_ANGLES}
${REVIEW_REUSE_ANGLE}
${REVIEW_SIMPLIFICATION_ANGLE}
${REVIEW_EFFICIENCY_ANGLE}
${REVIEW_ALTITUDE_ANGLE}
${REVIEW_CONVENTIONS_ANGLE}
${REVIEW_CANDIDATE_PRECEDENCE_NOTE}
将每个具有可命名失败场景的候选通过——默默丢弃半信半疑候选的查找器是遗漏的主要原因。

## 阶段 2 — 仅去重（不验证）

汇总所有候选。仅对近似重复项去重（相同缺陷、相同位置、相同原因 → 保留一个）。不要运行验证器；不要重新判断。按严重程度排序。

${FORMAT_REVIEW_OUTPUT_WITH_MINIMUM_FINDINGS_FN(REVIEW_OUTPUT_FORMATTER_FN)(MAX_FINDINGS)}
