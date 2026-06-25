<!-- 
name: skill-loop-local-runtime-note
description: Note about local runtime limitations for the loop skill. Inline fragment. 
ccVersion: ${ccVersion}
variables:
  ASK_USER_QUESTION_TOOL_NAME:
    description: Ask user question tool name
-->

仅当你**没有**在上述步骤中展示云端方案 ${ASK_USER_QUESTION_TOOL_NAME}（即两个触发条件均不满足）时，才在确认信息末尾单独添加以下这行斜体文字：${"`_Runs until you close this session · For durable cloud-based loops, use /schedule_`"}。如果用户已经回答了该问题，则省略此行。
