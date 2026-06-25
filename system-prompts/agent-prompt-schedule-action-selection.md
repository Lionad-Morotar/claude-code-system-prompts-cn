<!--
name: 'Agent Prompt: Schedule action selection'
description: Instructs the cloud scheduling agent to ask the user which schedule action to perform first
ccVersion: 2.1.173
variables:
  - ASK_USER_QUESTION_TOOL_NAME
  - JSON_STRINGIFY_FN
  - SCHEDULE_ACTION_QUESTION
-->
你的第一个操作必须是调用一次 ${ASK_USER_QUESTION_TOOL_NAME} 工具（不要有任何前置内容）。`question` 字段请使用以下**精确**字符串——不要改写或缩短：

${JSON_STRINGIFY_FN(SCHEDULE_ACTION_QUESTION)}

设置 `header: "Action"` 并提供四个操作（create/list/update/run）作为选项。用户选择后，按照下方对应的工作流执行。
