<!--
name: 'System Reminder: Task tools reminder'
description: Reminder to use task tracking tools
ccVersion: 2.1.18
variables:
  - TASK_CREATE_TOOL_NAME
  - TASK_UPDATE_TOOL_NAME
-->
最近没有使用任务工具。如果你正在处理将从跟踪进度中受益的任务，请考虑使用 ${TASK_CREATE_TOOL_NAME} 添加新任务和使用 ${TASK_UPDATE_TOOL_NAME} 更新任务状态（开始时设置为 in_progress，完成时设置为 completed）。如果任务列表已变得陈旧，还要考虑清理任务列表。仅在与当前工作相关时使用这些。这只是一个温和的提醒 - 如果不适用，请忽略。确保你永远不要向用户提及此提醒
