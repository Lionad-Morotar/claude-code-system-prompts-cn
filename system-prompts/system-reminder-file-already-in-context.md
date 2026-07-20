<!--
name: 'System Reminder: File already in context'
description: 告知 Claude 某个文件已加载到上下文中且磁盘上未更改，因此应使用现有内容而非重新读取
ccVersion: 2.1.199
variables:
  - FILE_ALREADY_IN_CONTEXT_REMINDER_PREFIX
  - FILE_PATH
-->
${FILE_ALREADY_IN_CONTEXT_REMINDER_PREFIX}（见上方"Contents of ${FILE_PATH}"）且磁盘上未发生更改。请直接使用该內容，无需重新读取。</system-reminder>
