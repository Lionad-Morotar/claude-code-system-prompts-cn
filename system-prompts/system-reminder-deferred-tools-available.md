<!--
name: 'System Reminder: Deferred tools available'
description: Announces newly available deferred tools and instructs the agent to load their schemas through ToolSearch
ccVersion: 2.1.173
variables:
  - TOOL_SEARCH_TOOL_NAME
  - DEFERRED_TOOLS_DELTA
-->
以下延迟加载工具现在可通过 ${TOOL_SEARCH_TOOL_NAME} 使用。它们的 schema 尚未加载 —— 直接调用将失败并抛出 InputValidationError。在调用之前，请使用 ${TOOL_SEARCH_TOOL_NAME} 并指定 query 为 "select:<name>[,<name>...]" 来加载工具 schema：
${DEFERRED_TOOLS_DELTA.addedLines.join(`
`)}
