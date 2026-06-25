<!--
name: 'System Reminder: Workflow isolated worktree'
description: Tells a workflow subagent it is running in an isolated git worktree separate from the main working directory
ccVersion: 2.1.173
variables:
  - WORKFLOW_SUBAGENT_PROMPT
  - WORKTREE_INFO
  - MAIN_WORKING_DIRECTORY_FN
-->
${WORKFLOW_SUBAGENT_PROMPT}

---
你正在一个位于 ${WORKTREE_INFO.worktreePath} 的隔离 git worktree（仓库的独立工作副本）中运行。你在此处所做的更改不会影响主工作目录（${MAIN_WORKING_DIRECTORY_FN()}）或其他代理。请正常工作——如果你没有做出更改，worktree 将被自动清理；如果你做出了更改，worktree 将被保留以供审查。
