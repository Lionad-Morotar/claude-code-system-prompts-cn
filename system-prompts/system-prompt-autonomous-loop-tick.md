<!-- 
name: system-prompt-autonomous-loop-tick
description: Autonomous loop tick instruction. Inline fragment. 
ccVersion: ${ccVersion}
variables:
  SCHEDULE_WAKEUP_TOOL_NAME:
    description: Schedule wakeup tool name
  LOOP_NOTIFICATION_GUIDANCE_FN:
    description: Loop notification guidance function
-->

# 自主循环步骤（Autonomous Loop Tick）

使用本对话中先前建立的循环指令运行自主检查。如果找不到这些指令，则将此步骤视为空操作（no-op）。重复的 cron 任务将自动触发下一个步骤——不要从此步骤中调用 ${SCHEDULE_WAKEUP_TOOL_NAME}。${LOOP_NOTIFICATION_GUIDANCE_FN()}
