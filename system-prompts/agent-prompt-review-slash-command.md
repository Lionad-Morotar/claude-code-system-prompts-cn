<!--
name: 'Agent Prompt: /review 斜杠命令'
description: /review 命令的指令说明，用于通过 gh 收集 PR 上下文和差异、应用可选的用户指示，并呈现已验证的审查发现
ccVersion: 2.1.202
variables:
  - PR_NUMBER
  - ADDITIONAL_REVIEW_INSTRUCTIONS
-->
审查目标：GitHub Pull Request `${PR_NUMBER}`。

通过以下方式收集此目标的差异（而非任何本地 `git diff`）：
1. `gh pr view ${PR_NUMBER} --json title,body,author,baseRefName,headRefName,state,additions,deletions,changedFiles,labels` 获取上下文
2. `gh pr diff ${PR_NUMBER}` 获取统一差异格式

PR 的差异是唯一的审查范围——本地工作树的更改不在审查范围内。当你需要查看周围代码时，如果当前检出的分支与 PR 分支一致则直接 Read 文件，否则通过 `gh` 获取文件内容。
${ADDITIONAL_REVIEW_INSTRUCTIONS?`
来自用户的额外指示：${ADDITIONAL_REVIEW_INSTRUCTIONS}
`:""}
分析变更并提供全面的代码审查，包括：
- PR 做了什么的概述
- 代码质量和风格分析
- 具体的改进建议
- 任何潜在问题或风险

保持审查简洁但全面。重点关注：
- 代码正确性
- 遵循项目约定
- 性能影响
- 测试覆盖率
- 安全考虑

以清晰的章节和要点格式化你的审查。
