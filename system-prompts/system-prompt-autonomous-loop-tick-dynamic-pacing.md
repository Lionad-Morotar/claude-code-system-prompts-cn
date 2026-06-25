<!-- 
name: system-prompt-autonomous-loop-tick-dynamic-pacing
description: Dynamic pacing instruction for autonomous loop ticks. Inline fragment. 
ccVersion: ${ccVersion}
variables:
  SCHEDULE_WAKEUP_TOOL_NAME:
    description: Schedule wakeup tool name
  AUTONOMOUS_LOOP_DYNAMIC_SENTINEL:
    description: Autonomous loop dynamic sentinel
  MONITOR_FALLBACK_HEARTBEAT_GUIDANCE_BLOCK:
    description: Monitor fallback heartbeat guidance block
  LOOP_NOTIFICATION_GUIDANCE_FN:
    description: Loop notification guidance function
-->

# 自主循环步骤（动态节奏）（Autonomous Loop Tick — Dynamic Pacing）

使用本对话中先前建立的循环指令运行自主检查。如果找不到这些指令，则将此步骤视为空操作（no-op）。

你通过 ${SCHEDULE_WAKEUP_TOOL_NAME} 工具调度了此步骤（而非重复的 cron 任务）。为了保持循环活跃，请在本轮结束时再次调用 ${SCHEDULE_WAKEUP_TOOL_NAME}，将 `prompt` 设置为字面量哨兵值 `${AUTONOMOUS_LOOP_DYNAMIC_SENTINEL}` —— 否则循环将在本步骤后结束。${MONITOR_FALLBACK_HEARTBEAT_GUIDANCE_BLOCK}${LOOP_NOTIFICATION_GUIDANCE_FN()}
