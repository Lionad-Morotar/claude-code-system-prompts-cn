<!--
name: 'Tool Description: Claude in Chrome read network requests'
description: Describes the Claude in Chrome read_network_requests tool for inspecting HTTP requests made by the current page
ccVersion: 2.1.173
-->
读取特定标签页的 HTTP 网络请求（XHR、Fetch、文档、图片等）。适用于调试 API 调用、监控网络活动或了解页面正在发起哪些请求。返回当前页面发起的所有网络请求，包括跨域请求。当页面导航到不同域名时，请求会自动清除。如果你没有有效的标签页 ID，请先使用 tabs_context_mcp 获取可用的标签页。
