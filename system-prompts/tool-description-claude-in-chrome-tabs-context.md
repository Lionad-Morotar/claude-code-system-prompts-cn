<!--
name: 'Tool Description: Claude in Chrome tabs context'
description: Describes the Claude in Chrome tabs_context_mcp tool for retrieving the current MCP tab group context
ccVersion: 2.1.173
-->
获取当前 MCP 标签页组的上下文信息。如果标签页组存在，则返回组内所有标签页 ID。关键提示：在使用其他浏览器自动化工具之前，你必须至少获取一次上下文，以便了解存在哪些标签页。每次新对话都应创建自己的新标签页（使用 tabs_create_mcp），而不是复用现有标签页，除非用户明确要求使用现有标签页。
