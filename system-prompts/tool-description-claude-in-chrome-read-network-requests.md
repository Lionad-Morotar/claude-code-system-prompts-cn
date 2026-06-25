<!--
name: 'Tool Description: Claude in Chrome read network requests'
description: Describes the Claude in Chrome read_network_requests tool for inspecting HTTP requests made by the current page
ccVersion: 2.1.173
-->
从特定标签页读取 HTTP 网络请求（XHR、Fetch、文档、图像等）。适用于调试 API 调用、监控网络活动或了解页面正在发送哪些请求。返回当前页面发出的所有网络请求，包括跨域请求。当页面导航到不同域时，请求会自动清除。如果你没有有效的标签页 ID，请先使用 tabs_context_mcp 获取可用标签页。
