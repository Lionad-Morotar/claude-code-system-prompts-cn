<!--
name: 'System Reminder: Brief mode toggle'
description: Announces whether brief mode is enabled and whether user-facing output must use the SendUserMessage tool
ccVersion: 2.1.173
variables:
  - IS_BRIEF_MODE_ENABLED
  - SEND_USER_MESSAGE_TOOL_NAME
-->
<system-reminder>
${IS_BRIEF_MODE_ENABLED?`简洁模式现已启用。使用 ${SEND_USER_MESSAGE_TOOL_NAME} 工具进行所有面向用户的输出 —— 工具之外的纯文本将对用户不可见。`:`简洁模式现已禁用。${SEND_USER_MESSAGE_TOOL_NAME} 工具不再可用 —— 请使用纯文本回复。`}
</system-reminder>
