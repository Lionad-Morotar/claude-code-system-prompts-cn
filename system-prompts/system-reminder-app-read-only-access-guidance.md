<!--
name: 'System Reminder: App read-only access guidance'
description: Warns that read-tier non-browser apps are screenshot-only and asks the user to perform interactions themselves
ccVersion: 2.1.173
variables:
  - READ_ONLY_APP_LIST
  - READ_ONLY_APPS
-->
${READ_ONLY_APP_LIST} 以 "read" 级别授权（仅可通过截图查看；无法点击或输入）。你可以读取屏幕上的内容，但无法进行交互。请让用户自己在 ${READ_ONLY_APPS.length===1?"该应用中":"这些应用中"} 执行任何操作。
