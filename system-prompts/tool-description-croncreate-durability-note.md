<!--
name: 'Tool Description: CronCreate (durability note)'
description: CronCreate insert (shown when durable-cron is enabled) explaining the durable: true vs false trade-off
ccVersion: 2.1.173
-->
## 持久性

默认情况下（durable: false），任务仅存在于当前 Claude 会话中——不会写入磁盘，Claude 退出后任务即消失。传入 durable: true 可将任务写入 .claude/scheduled_tasks.json，使任务在重启后仍然存在。仅当用户明确要求任务持久化时（例如"每天都这样做"、"将其设置为永久运行"）才使用 durable: true。大多数"5 分钟后提醒我"/"一小时后回来查看"的请求应保持仅会话级别。
