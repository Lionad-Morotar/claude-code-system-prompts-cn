<!--
name: 'System Reminder: Loop wakeup not scheduled'
description: 指导 Claude 如何处理 /loop 动态模式的唤醒未被调度的情况，包括何时需要重新发出并设置 prompt 字段
ccVersion: 2.1.101
variables:
  - SCHEDULE_WAKEUP_TOOL_NAME
  - EMPTY_LOOP_SENTINEL
-->
唤醒未被调度。如果你的 ${SCHEDULE_WAKEUP_TOOL_NAME} 调用已设置 `prompt` 字段，则 /loop 动态运行时门控已关闭或循环已达到最大时长 —— 循环已结束；不要重新发出。如果未设置 `prompt`，则 /loop 动态模式需要 `prompt` 字段以便下次触发时重新进入该技能 —— 重新发出并设置 `prompt`：对于用户提供的 /loop 提示词，传递原始 /loop 输入原样；对于空 /loop（动态节奏模式下的自主默认值），传递字面哨兵 `${EMPTY_LOOP_SENTINEL}`。
