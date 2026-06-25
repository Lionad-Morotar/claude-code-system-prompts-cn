<!--
name: 'Tool Description: Claude in Chrome bridge timeout error'
description: Error message shown when a Claude in Chrome tool does not respond before timing out
ccVersion: 2.1.173
variables:
  - CHROME_TOOL_NAME
-->
"${CHROME_TOOL_NAME}" 工具未及时响应。Chrome 扩展程序已连接，但页面可能正在加载、无响应或正在等待扩展侧面板中的权限提示。请尝试更轻量的操作（例如使用 "get_page_text" 而非截图），或让用户检查页面以及任何待处理的提示。
