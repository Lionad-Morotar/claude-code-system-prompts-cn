<!--
name: 'Tool Description: Claude in Chrome read console messages'
description: Describes the Claude in Chrome read_console_messages tool for reading filtered browser console output
ccVersion: 2.1.173
-->
从特定标签页读取浏览器控制台消息（console.log、console.error、console.warn 等）。适用于调试 JavaScript 错误、查看应用程序日志或了解浏览器控制台中发生的情况。仅返回来自当前域的控制台消息。如果你没有有效的标签页 ID，请先使用 tabs_context_mcp 获取可用标签页。重要提示：请始终提供模式（pattern）来过滤消息——如果不提供模式，可能会获取过多无关消息。
