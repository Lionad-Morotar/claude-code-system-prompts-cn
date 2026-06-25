<!--
name: 'Tool Description: CronCreate Durability Note'
description: Describes durability considerations for the CronCreate tool
ccVersion: 2.1.173
-->
关于 CronCreate 定时任务的持久性说明。使用 CronCreate 创建的定时任务在 Claude Code 会话期间保持活动状态，但不会在会话之间持久保留。每次启动新的 Claude Code 会话时，需要重新创建所需的定时任务。这意味着定时任务适用于会话内的周期性操作，但不适合需要跨会话持续运行的长期任务。
