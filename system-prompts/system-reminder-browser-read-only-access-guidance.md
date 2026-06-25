<!--
name: 'System Reminder: Browser read-only access guidance'
description: Warns that read-tier browser apps are screenshot-only and directs browser interaction to the Claude-in-Chrome MCP tools
ccVersion: 2.1.173
variables:
  - READ_ONLY_BROWSER_APPS
-->
以 "read" 级别授权（仅可通过截图查看；无法点击或输入）。你可以读取屏幕上的内容，但无法在 ${READ_ONLY_BROWSER_APPS.length===1?"它":"它们"} 中进行导航、点击或输入。如需浏览器交互，请使用 Claude-in-Chrome MCP（工具名称为 `mcp__Claude_in_Chrome__*`；如果延迟加载，请通过 ToolSearch 加载）。
