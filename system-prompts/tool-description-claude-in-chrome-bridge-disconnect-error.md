<!--
name: 'Tool Description: Claude in Chrome bridge disconnect error'
description: Error message shown when a Claude in Chrome tool call fails because the Chrome extension disconnects mid-operation
ccVersion: 2.1.173
variables:
  - CHROME_TOOL_NAME
-->
"${CHROME_TOOL_NAME}" 工具调用失败，因为 Chrome 扩展在操作中断开了连接。这通常是暂时的（Chrome Service Worker 重启、标签页关闭、网络波动），扩展通常会自动重连。请在几秒钟后重试相同的工具调用。如果持续失败，请让用户切换到 Chrome（这会唤醒扩展）或检查扩展是否仍处于登录状态。
