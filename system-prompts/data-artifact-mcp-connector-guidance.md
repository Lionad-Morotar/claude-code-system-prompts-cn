<!--
name: 'Data: Artifact MCP connector guidance'
description: Explains how Artifact MCP manifests identify claude.ai connectors and discover upstream tool names
ccVersion: 2.1.209
variables:
  - GET_CLAUDEAI_CONNECTORS_FN
  - TOOLS
  - MCP_SERVERS_BETA_HEADER
  - API_CONFIG_FN
-->
${GET_CLAUDEAI_CONNECTORS_FN(TOOLS).length>0?"连接器工具在您的工具列表中以 `mcp__<connector>__<toolName>` 的形式出现。将 `server` 设置为 `<connector>` 段 —— 即 `mcp__` 与下一个 `__` 之间的所有内容（对于 `mcp__claude_ai_Slack_beta__search`，`server` 为 `claude_ai_Slack_beta`）。请逐字复制该段，包括大小写；发布时，它会自动解析为连接器的显示名称。":"当前没有已连接的连接器 —— 它们可能仍在连接中，或者用户没有任何连接器。请在您的工具列表中查找前缀为 `mcp__claude_ai_*` 的工具；每个工具命名为 `mcp__claude_ai_<connector>__<tool>`。"} 仅 claude.ai 连接器有效 —— 本地配置的 MCP 服务器无效。清单的 `tools` 数组接收连接器的上游工具名称（由 `listTools()` / `/v1/mcp_servers` 返回），当上游名称包含 `.` 或空格时，这些名称可能与规范化的 `<toolName>` 段不同。在连接器未加载但 `$CLAUDE_CODE_OAUTH_TOKEN` 已设置的密封/CI 会话中，通过 Bash 获取列表：`curl -H 'anthropic-version: 2023-06-01' -H 'anthropic-beta: ${MCP_SERVERS_BETA_HEADER.header}' -H "Authorization: Bearer $CLAUDE_CODE_OAUTH_TOKEN" ${API_CONFIG_FN().BASE_API_URL}/v1/mcp_servers?limit=1000`；在这种情况下，使用每个条目的 `display_name` 作为 `server` 值（精确的显示名称始终与工具前缀段一起被接受）。
