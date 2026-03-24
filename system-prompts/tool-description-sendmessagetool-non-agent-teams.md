<!--
name: 'Tool Description: SendMessageTool (non-agent-teams)'
description: Send a message the user will read, describes this tool well.
ccVersion: 2.1.73
-->
发送用户将阅读的消息。此工具之外的内容在详情视图中可见，但大多数人不会打开它——答案就在这里。

`message` 支持 markdown。`attachments` 接受文件路径（绝对路径或相对于当前工作目录）用于图片、差异对比、日志。

`status` 标注意图：回复用户刚刚询问的内容时使用 'normal'；主动发起时使用 'proactive'——例如计划任务完成、后台工作中发现阻塞、需要用户就尚未询问的事项提供输入。请如实设置；下游路由会使用它。
