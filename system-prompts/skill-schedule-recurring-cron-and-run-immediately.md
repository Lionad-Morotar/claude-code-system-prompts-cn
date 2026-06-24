<!--
name: 'Skill: Schedule recurring cron and run immediately'
description: 将时间间隔转换为 cron 表达式，通过 cron 创建工具调度周期性任务，向用户确认，并立即执行任务而无需等待首次 cron 触发
ccVersion: 2.1.101
variables:
  - PREAMBLE
  - INTERVAL
  - CRON_CREATE_TOOL_NAME
  - SCHEDULED_PROMPT
  - PROMPT_DESCRIPTION
  - CONFIRMATION_MESSAGE
  - IMMEDIATE_RUN_REFERENCE
  - INLINE_TASK_INSTRUCTIONS
  - ADDITIONAL_CONTEXT
-->
${PREAMBLE}

## 操作

1. 将 `${INTERVAL}` 转换为 5 字段 cron 表达式。支持的后缀：`s` → 向上取整到最近分钟，`m`（分钟），`h`（小时），`d`（天）。示例：`5m` → `*/5 * * * *`，`1h` → `0 * * * *`，`1d` → `0 0 * * *`。如果时间间隔不能整除其单位，则四舍五入到最近的规整间隔，并告知用户你四舍五入到了什么值。
2. 调用 ${CRON_CREATE_TOOL_NAME}，参数如下：
   - `cron`：步骤 1 中的表达式
   - `prompt`：字面字符串 `${SCHEDULED_PROMPT}` —— ${PROMPT_DESCRIPTION}
   - `recurring`：`true`
3. 简要确认：${CONFIRMATION_MESSAGE}
4. **然后立即运行 ${IMMEDIATE_RUN_REFERENCE}**，按照下方内联的指令执行。不要等待首次 cron 触发。

${INLINE_TASK_INSTRUCTIONS}

${ADDITIONAL_CONTEXT}
