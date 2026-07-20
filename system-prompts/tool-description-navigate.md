<!--
name: 'Tool Description: Navigate'
description: 描述浏览器导航工具，用于打开 URL 以及在标签页历史记录中前进或后退
ccVersion: 2.1.211
-->
导航到 URL，或在浏览器历史记录中前进/后退。当单独调用 navigate（不在 browser_batch 内部）进行 URL 导航时，tabId 可以省略：系统会自动为你调用 tabs_context_mcp{createIfEmpty:true}，并导航会话组中的第一个标签页——其结果会附加到此调用的输出中，以便你获得标签页列表和后续调用的 id。在 browser_batch 内部，navigate（以及其他作用于页面的工具）需要显式的 tabId。当你需要特定标签页，或会话组有多个需要保留其状态的标签页时，传递显式的 tabId。url:"back"/"forward" 时 tabId 为必填。
