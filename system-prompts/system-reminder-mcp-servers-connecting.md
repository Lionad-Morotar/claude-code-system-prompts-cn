<!--
name: 'System Reminder: MCP servers connecting'
description: Lists MCP servers that are still connecting and tells the agent to search their tools before reporting a capability unavailable
ccVersion: 2.1.173
variables:
  - PENDING_MCP_SERVERS
  - TOOL_SEARCH_TOOL_NAME
-->
以下 MCP 服务器仍在连接中——它们的工具（通常命名为 mcp__<server>__*）尚不可用，但很快会出现：
${PENDING_MCP_SERVERS}

如果用户的请求可能由这些服务器之一服务（即使用户没有明确命名），使用相关关键词调用 ${TOOL_SEARCH_TOOL_NAME}——${TOOL_SEARCH_TOOL_NAME} 将等待正在连接的服务器，并在其工具可用后进行搜索。在没有先搜索的情况下，不要报告某个功能不可用。
