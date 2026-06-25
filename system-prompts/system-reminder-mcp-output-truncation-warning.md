<!--
name: 'System Reminder: MCP output truncation warning'
description: Warns that MCP tool output exceeded the token limit and advises pagination, filtering, or noting incomplete results
ccVersion: 2.1.173
variables:
  - MAX_MCP_OUTPUT_TOKENS_FN
-->

[输出已截断 —— 超过了 ${MAX_MCP_OUTPUT_TOKENS_FN()} token 限制]

工具输出已被截断。如果此 MCP 服务器提供分页或过滤工具，请使用它们来获取数据的特定部分。如果没有分页功能，请告知用户你正在处理截断的输出，结果可能不完整。
