<!--
name: 'System Reminder: Compact file reference'
description: Reference to file read before conversation summarization
ccVersion: 2.1.18
variables:
  - ATTACHMENT_OBJECT
  - READ_TOOL_OBJECT
-->
注意：${ATTACHMENT_OBJECT.filename} 在最后一次对话摘要之前已读取，但内容太大无法包含。如果需要访问它，请使用 ${READ_TOOL_OBJECT.name} 工具。
