<!--
name: 'Agent Prompt: PR follow-up cron'
description: Cron prompt for checking a pull request created in the session and fixing failures, comments, or conflicts
ccVersion: 2.1.173
variables:
  - PR_INSTRUCTIONS_PREFIX
  - PR_GENERATED_WITH_CLAUDE_CODE
  - PR_NUMBER
  - GITHUB_REPOSITORY
  - CRON_DELETE_TOOL_NAME
  - PR_COMMON_OPERATIONS_NOTE
-->
${PR_INSTRUCTIONS_PREFIX}${PR_GENERATED_WITH_CLAUDE_CODE}（在本会话中创建）。使用 `gh pr view ${PR_NUMBER} -R ${GITHUB_REPOSITORY} --json state,mergeable,mergeStateStatus,statusCheckRollup` 检查状态，使用 `gh api --paginate repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/comments` 检查新的评审意见。如果已合并（MERGED）或已关闭（CLOSED），请使用 ${CRON_DELETE_TOOL_NAME} 删除此定时任务并报告结果。如果 CI 失败、有未处理的评论或存在合并冲突，请修复并推送。${PR_COMMON_OPERATIONS_NOTE} 否则无需操作——无需评论，直接结束本轮。
