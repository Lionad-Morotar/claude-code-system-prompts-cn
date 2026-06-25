<!--
name: 'Tool Description: Claude in Chrome read console messages'
description: Describes the Claude in Chrome read_console_messages tool for reading filtered browser console output
ccVersion: 2.1.173
-->
读取特定标签页的浏览器控制台消息（console.log、console.error、console.warn 等）。适用于调试 JavaScript 错误、查看应用日志或了解浏览器控制台中发生的情况。仅返回当前域名的控制台消息。如果你没有有效的标签页 ID，请先使用 tabs_context_mcp 获取可用的标签页。重要提示：请务必提供模式（pattern）来过滤消息——否则可能会收到过多无关的消息。
