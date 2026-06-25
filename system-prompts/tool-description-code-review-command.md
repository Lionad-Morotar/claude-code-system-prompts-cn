<!--
name: 'Tool Description: Code review command'
description: Describes the code review command and its effort levels, PR comment mode, and fix mode
ccVersion: 2.1.173
variables:
  - IS_CLOUD_CODE_REVIEW_ENABLED_FN
  - HAS_CLAUDE_AI_ACCESS_FN
-->
对当前差异进行正确性缺陷和复用/简化/效率优化的代码审查，在给定的努力级别下运行（低/中：较少、高置信度发现；高到最大：覆盖范围更广，可能包含不确定的发现${IS_CLOUD_CODE_REVIEW_ENABLED_FN()?`；ultra：云端深度多智能体审查${HAS_CLAUDE_AI_ACCESS_FN()?"":"（需要 claude.ai 账号访问权限）"}`:""}）。使用 --comment 将发现作为内联 PR 评论发布，或使用 --fix 在审查后将发现应用到工作树。
