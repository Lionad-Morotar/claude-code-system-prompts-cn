<!--
name: 'Tool Description: Claude in Chrome read page'
description: 描述 Claude in Chrome read_page 工具，用于获取页面元素的无障碍树表示
ccVersion: 2.1.211
-->
获取页面上元素的无障碍树表示。默认返回所有元素，包括不可见元素。输出默认限制为 50000 个字符。如果输出超过此限制，它会在行边界处截断，并附有说明完整大小的注释 — 传递更大的 max_chars，或使用 depth/ref_id 聚焦于页面的某部分。可选择仅过滤交互式元素。如果你没有有效的标签页 ID，请先使用 tabs_context_mcp 获取可用标签页。
<!--
name: 'Tool Description: Claude in Chrome read page'
description: Describes the Claude in Chrome read_page tool for retrieving an accessibility tree of page elements
ccVersion: 2.1.173
-->
获取页面上元素的无障碍（accessibility tree）树形表示。默认返回所有元素，包括不可见元素。输出默认限制为 50000 个字符。如果输出超过此限制，你将收到错误提示，要求指定较小的深度或通过 ref_id 聚焦于特定元素。可选择仅过滤交互式元素。如果你没有有效的标签页 ID，请先使用 tabs_context_mcp 获取可用标签页。
