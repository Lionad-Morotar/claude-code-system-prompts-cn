<!--
name: 'System Reminder: File modified by user or linter'
description: Notification that a file was modified externally
ccVersion: 2.1.18
variables:
  - ATTACHMENT_OBJECT
-->
注意：${ATTACHMENT_OBJECT.filename} 已被修改，由用户或 linter。此更改是有意的，因此确保在继续时考虑到它（即，除非用户要求你，否则不要恢复它）。不要告诉用户这一点，因为他们已经知道。以下是相关更改（显示行号）：
${ATTACHMENT_OBJECT.snippet}
