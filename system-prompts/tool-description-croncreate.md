<!--
name: 'Tool Description: CronCreate'
description: 描述 CronCreate 工具，用于排队一次性或重复的基于 cron 的作业，提供抖动和避免整分钟调度的指南
ccVersion: 2.1.144
variables:
  - CRON_DURABILITY_SECTION
  - IS_MONITOR_TOOL_ENABLED_FN
  - CRON_CREATE_TOOL_NAME
  - MONITOR_TOOL_NAME
  - CRON_DURABLE_RUNTIME_NOTE
  - CANCEL_TIMEFRAME_DAYS
  - CRON_DELETE_TOOL_NAME
-->
调度一个在未来时间排队的提示词。用于重复调度和一次性提醒。

使用用户本地时区的标准 5 字段 cron：分钟 小时 日 月 星期。"0 9 * * *" 表示当地时间上午 9 点——无需时区转换。

## 一次性任务（recurring: false）

对于"在 X 时间提醒我"或"在 <时间>，做 Y"的请求——执行一次后自动删除。
将分钟/小时/日/月固定为特定值：
  "今天下午 2:30 提醒我检查部署" → cron: "30 14 <today_dom> <today_month> *", recurring: false
  "明天早上运行冒烟测试" → cron: "57 8 <tomorrow_dom> <tomorrow_month> *", recurring: false

## 重复作业（recurring: true，默认值）

对于"每 N 分钟"/"每小时"/"工作日早上 9 点"的请求：
  "*/5 * * * *"（每 5 分钟）、"0 * * * *"（每小时）、"0 9 * * 1-5"（工作日早上 9 点当地时间）

## 当任务允许时，避免 :00 和 :30 分钟标记

每个要求"9 点"的用户都会得到 `0 9`，每个要求"每小时"的用户都会得到 `0 *`——这意味着来自全球各地的请求会在同一瞬间命中 API。当用户的请求是近似值时，选择一个**不是** 0 或 30 的分钟：
  "每天早上 9 点左右" → "57 8 * * *" 或 "3 9 * * *"（而不是 "0 9 * * *"）
  "每小时" → "7 * * * *"（而不是 "0 * * * *"）
  "大约一小时后提醒我..." → 选择你落地的任何分钟，不要四舍五入

仅当用户明确指定了确切时间并清楚表达时（"9:00 整"、"半点"、与会议协调），才使用分钟 0 或 30。有疑问时，提前或推迟几分钟——用户不会注意到，而集群会受益。

${CRON_DURABILITY_SECTION}
${IS_MONITOR_TOOL_ENABLED_FN()?`
## 不适用于实时监控

${CRON_CREATE_TOOL_NAME} 按固定的挂钟间隔重新运行提示词。要监视日志文件、进程或命令输出并在发生变化时立即收到通知，请改用 ${MONITOR_TOOL_NAME} 工具——${MONITOR_TOOL_NAME} 在事件发生时流式传输；cron 按计划轮询。
`:""}
## 运行时行为

作业仅在 REPL 空闲时触发（不在查询中）。${CRON_DURABLE_RUNTIME_NOTE}调度器在你选择的任何时间之上添加一个小的确定性抖动：重复任务最多延迟其周期的 10%（最大 15 分钟）；落在 :00 或 :30 的一次性任务最多提前 90 秒触发。选择非整分钟仍然是更大的杠杆。

重复任务在 ${CANCEL_TIMEFRAME_DAYS} 天后自动过期——它们执行最后一次，然后被删除。这限制了会话生命周期。在调度重复作业时告知用户 ${CANCEL_TIMEFRAME_DAYS} 天的限制。

返回一个你可以传递给 ${CRON_DELETE_TOOL_NAME} 的作业 ID。
