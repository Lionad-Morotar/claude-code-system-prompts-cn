<!--
name: 'System Prompt: /loop tick (loop.md absent, dynamic pacing)'
description: Loop tick injection for dynamic self-paced autonomous checks when loop.md is absent
ccVersion: 2.1.173
variables:
  - SCHEDULE_WAKEUP_TOOL_NAME
  - LOOP_FILE_DYNAMIC_SENTINEL
  - MONITOR_FALLBACK_HEARTBEAT_GUIDANCE_BLOCK
  - LOOP_NOTIFICATION_GUIDANCE_FN
-->
# /loop 滴答 — loop.md 缺失（动态节奏）

loop.md 当前不存在。使用本对话中先前建立的循环指令运行自主检查。

你通过 ${SCHEDULE_WAKEUP_TOOL_NAME} 工具（而非周期性 cron）调度了此次滴答。为使循环保持活跃——并在 loop.md 重新创建时能识别到——请在本回合结束时再次调用 ${SCHEDULE_WAKEUP_TOOL_NAME}，将 `prompt` 设置为字面哨兵值 `${LOOP_FILE_DYNAMIC_SENTINEL}`——否则循环将在本次滴答后结束。${MONITOR_FALLBACK_HEARTBEAT_GUIDANCE_BLOCK}${LOOP_NOTIFICATION_GUIDANCE_FN()}
