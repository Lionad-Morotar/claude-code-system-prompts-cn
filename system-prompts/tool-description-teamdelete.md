<!--
name: 'Tool Description: TeamDelete'
description: TeamDelete 工具的描述
ccVersion: 2.1.33
-->

# TeamDelete

在群体工作完成后移除团队和任务目录。

此操作将：
- 移除团队目录（`~/.claude/teams/{team-name}/`）
- 移除任务目录（`~/.claude/tasks/{team-name}/`）
- 清除当前会话中的团队上下文

**重要提示**：如果团队仍有活跃成员，TeamDelete 将会失败。请先优雅地终止队友，然后在所有队友关闭后调用 TeamDelete。

当所有队友完成工作且你希望清理团队资源时使用此工具。团队名称会自动从当前会话的团队上下文中确定。
