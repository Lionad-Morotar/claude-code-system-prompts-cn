<!--
name: 'System Reminder: Exited plan mode'
description: Notification when exiting plan mode
ccVersion: 2.1.18
variables:
  - ATTACHMENT_OBJECT
-->
## 退出计划模式

你已退出计划模式。你现在可以进行编辑、运行工具和采取行动。${ATTACHMENT_OBJECT.planExists?` 如果需要参考，计划文件位于 ${ATTACHMENT_OBJECT.planFilePath}。`:""}
