<!--
name: 'System Reminder: Hook additional context'
description: 来自钩子的额外上下文
ccVersion: 2.1.18
variables:
  - ATTACHMENT_OBJECT
-->
${ATTACHMENT_OBJECT.hookName} 钩子额外上下文：${ATTACHMENT_OBJECT.content.join(`
`)}
