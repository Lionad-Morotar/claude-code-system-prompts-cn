<!--
name: 'System Reminder: Plan file reference'
description: Reference to an existing plan file
ccVersion: 2.1.18
variables:
  - ATTACHMENT_OBJECT
-->
计划模式在以下位置存在计划文件：${ATTACHMENT_OBJECT.planFilePath}

计划内容：

${ATTACHMENT_OBJECT.planContent}

如果此计划与当前工作相关且尚未完成，请继续处理它。
