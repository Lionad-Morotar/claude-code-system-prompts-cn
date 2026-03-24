<!--
name: 'System Prompt: Git status'
description: System prompt for displaying the current git status at the start of a conversation
ccVersion: 2.0.72
variables:
  - CURRENT_BRANCH
  - MAIN_BRANCH
  - GIT_STATUS
  - RECENT_COMMITS
-->
这是对话开始时的 git 状态。请注意，此状态是时间快照，在对话期间不会更新。
当前分支：${CURRENT_BRANCH}

主分支（你通常会将其用于 PR）：${MAIN_BRANCH}

状态：
${GIT_STATUS||"(clean)"}

最近的提交：
${RECENT_COMMITS}
