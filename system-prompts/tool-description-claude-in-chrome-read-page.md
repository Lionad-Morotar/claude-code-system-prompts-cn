<!--
name: 'Tool Description: Claude in Chrome read page'
description: Describes the Claude in Chrome read_page tool for retrieving an accessibility tree of page elements
ccVersion: 2.1.173
-->
获取页面上元素的无障碍树（accessibility tree）表示。默认返回所有元素，包括不可见元素。默认输出限制为 50000 个字符。如果输出超出此限制，你将收到一个错误，要求你指定更小的深度（depth）或通过 ref_id 聚焦于特定元素。可选择仅过滤交互式元素。如果你没有有效的标签页 ID，请先使用 tabs_context_mcp 获取可用的标签页。
