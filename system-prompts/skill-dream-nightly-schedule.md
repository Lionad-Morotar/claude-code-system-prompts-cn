<!--
name: 'Skill: /dream nightly schedule'
description: Sets up a recurring nightly memory consolidation job by deduplicating existing schedules, creating a new cron task, confirming details to the user, and running an immediate consolidation
ccVersion: 2.1.98
variables:
  - CRON_LIST_TOOL_NAME
  - CRON_DELETE_TOOL_NAME
  - CRON_CREATE_TOOL_NAME
  - CRON_EXPRESSION
  - SCHEDULED_TIME_LOCAL
  - CANCEL_TIMEFRAME_DAYS
  - CONSOLIDATE_SKILL_FN
  - CONSOLIDATE_PROMPT
  - MEMORY_STORE_PATH
  - CONSOLIDATION_OPTIONS
-->
# Dream：设置夜间调度

用户想要设置一个周期性的夜间记忆整合任务。

**步骤 1 —— 去重已有的夜间任务**

调用 ${CRON_LIST_TOOL_NAME} 并检查是否存在 prompt 为 `"/dream consolidate"` 的已有任务。如果存在，先用 ${CRON_DELETE_TOOL_NAME} 删除它，以避免续期导致重叠任务。

**步骤 2 —— 调度**

调用 ${CRON_CREATE_TOOL_NAME}，参数如下：
- `cron`：`"${CRON_EXPRESSION}"`
- `prompt`：`"/dream consolidate"`
- `recurring`：true
- `durable`：true

（`consolidate` 后缀意味着此 prompt 在触发时不会匹配 SCHEDULING_KEYWORDS（因此会走整合路径），不会精确匹配 migrateAssistantTasksPermanent() 的 `'/dream'` 检查（因此保持非永久状态），并且能通过打包技能和磁盘技能上的主名称来解析（因此即使打包技能被 kill-switch 或 KAIROS 激活禁用，它也能继续工作）。）

**步骤 3 —— 确认**

告知用户：
- /dream 将在每天夜间约 ${SCHEDULED_TIME_LOCAL} 当地时间运行，以整合和整理记忆
- 调度在会话间持久存在（写入 .claude/scheduled_tasks.json）
- 周期性任务在 ${CANCEL_TIMEFRAME_DAYS} 天后自动过期——重新运行 `/dream nightly` 即可续期
- 随时可以通过 ${CRON_DELETE_TOOL_NAME}（带上任务 ID）取消

**步骤 4 —— 立即运行一次整合**

${CONSOLIDATE_SKILL_FN(CONSOLIDATE_PROMPT,MEMORY_STORE_PATH,CONSOLIDATION_OPTIONS)}
