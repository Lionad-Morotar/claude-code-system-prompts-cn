<!--
name: 'System Reminder: MCP output truncation warning'
description: Warns that MCP tool output exceeded the token limit and advises pagination, filtering, or noting incomplete results
ccVersion: 2.1.173
variables:
  - MAX_MCP_OUTPUT_TOKENS_FN
-->


[输出已截断 - 超过 ${MAX_MCP_OUTPUT_TOKENS_FN()} token 限制]

工具输出被截断。如果此 MCP 服务器提供分页或过滤工具，使用它们来检索特定部分的数据。如果分页不可用，告知用户你正在处理截断的输出，结果可能不完整。
