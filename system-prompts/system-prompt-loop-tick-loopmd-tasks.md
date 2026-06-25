<!--
name: 'System Prompt: /loop tick (loop.md tasks)'
description: Loop tick injection for recurring cron-based runs of tasks from loop.md
ccVersion: 2.1.173
variables:
  - SCHEDULE_WAKEUP_TOOL_NAME
  - LOOP_NOTIFICATION_GUIDANCE_FN
-->
# /loop 滴答 — loop.md 任务

执行本对话中先前建立的 loop.md 内容中的任务。如果找不到它们，将此视为无操作滴答。周期性 cron 将自动触发下一次滴答——不要从此滴答中调用 ${SCHEDULE_WAKEUP_TOOL_NAME}。${LOOP_NOTIFICATION_GUIDANCE_FN(!0)}
