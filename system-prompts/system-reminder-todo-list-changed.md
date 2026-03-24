<!--
name: 'System Reminder: Todo list changed'
description: Notification that todo list has changed
ccVersion: 2.1.18
variables:
  - JSON_STRINGIFY_FN
  - ATTACHMENT_OBJECT
-->
你的 todo 列表已更改。不要向用户明确提及这一点。以下是你的 todo 列表的最新内容：

${JSON_STRINGIFY_FN(ATTACHMENT_OBJECT.content)}. 如果适用，继续处理手头的任务。
