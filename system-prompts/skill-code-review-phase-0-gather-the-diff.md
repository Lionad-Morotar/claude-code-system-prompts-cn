<!-- 
name: skill-code-review-phase-0-gather-the-diff
description: Phase 0 of code review: gather the diff. Inline fragment. 
ccVersion: ${ccVersion}
variables: {}
-->

## 阶段 0 —— 收集差异（Phase 0 — Gather the diff）

运行 `git diff @{upstream}...HEAD`（如果没有上游分支，则使用 `git diff main...HEAD` 或 `git diff HEAD~1`）来获取待审查的统一差异（unified diff）。如果存在未提交的更改，或者范围差异为空，则同时运行 `git diff HEAD` 并将工作树的变更纳入审查范围——审查通常在提交之前执行。如果传入了 PR 编号、分支名或文件路径作为参数，则改为审查该目标。将此差异视为审查范围。
