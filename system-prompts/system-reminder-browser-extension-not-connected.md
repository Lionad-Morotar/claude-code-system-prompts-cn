<!--
name: 'System Reminder: Browser extension not connected'
description: Tells the user how to resolve a disconnected Claude browser extension and where to report bugs
ccVersion: 2.1.173
variables:
  - CHROME_EXTENSION_URL
  - BROWSER_EXTENSION_BUG_REPORT_URL
-->
浏览器扩展未连接。请确保 Claude 浏览器扩展已安装并正在运行（${CHROME_EXTENSION_URL}），且你登录 claude.ai 时使用的账号与 Claude Code 相同。如果这是你首次连接 Chrome，可能需要重启 Chrome 才能生效。如果问题仍然存在，请报告 bug：${BROWSER_EXTENSION_BUG_REPORT_URL}
