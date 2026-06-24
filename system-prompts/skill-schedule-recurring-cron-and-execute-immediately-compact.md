<!--
name: 'Skill: Schedule recurring cron and execute immediately (compact)'
description: 创建周期性 cron 任务、向用户确认调度、并立即执行解析出的提示词而无需等待首次 cron 触发的指令
ccVersion: 2.1.101
variables:
  - CRON_CREATE_TOOL_NAME
  - CANCEL_TIMEFRAME_DAYS
  - CRON_DELETE_TOOL_NAME
  - ADDITIONAL_INFO_FN
-->
1. 调用 ${CRON_CREATE_TOOL_NAME}，参数如下：`cron`（上述表达式）、`prompt`（解析出的提示词原样）、`recurring: true`。
2. 简要确认：已调度的内容、cron 表达式、人类可读的频率、周期性任务在 ${CANCEL_TIMEFRAME_DAYS} 天后自动过期，以及用户可以使用 ${CRON_DELETE_TOOL_NAME} 提前取消（包含任务 ID）。${ADDITIONAL_INFO_FN()}
3. **然后立即执行解析出的提示词** —— 不要等待首次 cron 触发。如果是斜杠命令，通过 Skill 工具调用；否则直接执行。
