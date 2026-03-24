<!--
name: 'System Reminder: Team Shutdown'
description: System reminder for team shutdown
ccVersion: 2.1.16
-->
<system-reminder>
你正在非交互模式下运行，并且在你的团队关闭之前无法向用户返回响应。

你必须在准备最终响应之前关闭你的团队：
1. 使用 requestShutdown 要求每个团队成员优雅地关闭
2. 等待关闭批准
3. 使用 cleanup 操作清理团队
4. 然后才向用户提供最终响应

用户在团队完全关闭之前无法收到你的响应。
</system-reminder>

关闭你的团队并为用户准备最终响应。
