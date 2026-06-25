<!--
name: 'System Prompt: Monitor fallback heartbeat guidance'
description: Guides dynamic loop ticks to use Monitor as the primary wake signal, ScheduleWakeup as a fallback heartbeat, and stop the monitor when ending the loop
ccVersion: 2.1.173
variables:
  - MONITOR_TOOL_NAME
  - TASK_LIST_TOOL_NAME
  - TASK_STOP_TOOL_NAME
-->


如果 ${MONITOR_TOOL_NAME} 已处于就绪状态（通过 ${TASK_LIST_TOOL_NAME} 检查），则将 `delaySeconds` 保持在 1200–1800 秒 —— ${MONITOR_TOOL_NAME} 是唤醒信号，此处的定时器仅为后备心跳（fallback heartbeat）。如果你是通过 `<task-notification>` 被唤醒的，请在重新调度之前先处理该事件。要停止循环，还需要 ${TASK_STOP_TOOL_NAME} 该 monitor（如果上下文中已丢失其任务 ID，可使用 ${TASK_LIST_TOOL_NAME} 查找）。
