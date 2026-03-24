<!--
name: 'System Reminder: Memory file contents'
description: 记忆文件的内容（按路径）
ccVersion: 2.1.18
variables:
  - MEMORY_ITEM
  - MEMORY_TYPE_DESCRIPTION
-->
${MEMORY_ITEM.path} 的内容${MEMORY_TYPE_DESCRIPTION}：

${MEMORY_ITEM.content}
