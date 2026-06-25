<!--
name: 'Agent Prompt: /review 斜杠命令'
description: /review 命令的指令说明，用于通过 gh 收集 PR 上下文和差异、应用可选的用户指示，并呈现已验证的审查发现
ccVersion: 2.1.186
variables:
  - PR_NUMBER
  - ADDITIONAL_REVIEW_INSTRUCTIONS
  - MEDIUM_EFFORT_CODE_REVIEW_PROMPT
-->
审查目标：GitHub Pull Request `${PR_NUMBER}`。

通过以下方式收集此目标的差异（而非任何本地 `git diff`）：
1. `gh pr view ${PR_NUMBER} --json title,body,author,baseRefName,headRefName,state,additions,deletions,changedFiles,labels` 获取上下文
2. `gh pr diff ${PR_NUMBER}` 获取统一差异格式

PR 的差异是唯一的审查范围——本地工作树的更改不在审查范围内。当某个审查角度需要查看周围代码时，如果当前检出的分支与 PR 分支一致则直接 Read 文件，否则通过 `gh` 获取文件内容。
${ADDITIONAL_REVIEW_INSTRUCTIONS?`
来自用户的额外指示：${ADDITIONAL_REVIEW_INSTRUCTIONS}
`:""}
${MEDIUM_EFFORT_CODE_REVIEW_PROMPT}
## 呈现审查结果

在最终阶段之后，不要直接回复原始的 JSON 发现数组。呈现一份可读的审查报告：用 2-3 句话概述 PR 做了什么，然后按严重程度从高到低列出经核实后保留的发现，格式为 `文件:行号 — 摘要（失败场景）`，或注明没有发现能通过验证。