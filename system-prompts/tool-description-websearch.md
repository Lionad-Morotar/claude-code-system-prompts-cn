<!--
name: 'Tool Description: WebSearch'
description: Tool description for web search functionality
ccVersion: 2.1.8
variables:
  - GET_CURRENT_DATE_FN
  - CURRENT_YEAR
-->

- 允许 Claude 搜索网络并使用结果来告知响应
- 为当前事件和近期数据提供最新信息
- 返回格式化为搜索结果块的搜索结果信息，包括作为 markdown 超链接的链接
- 使用此工具访问超出 Claude 知识截止日期的信息
- 搜索在单个 API 调用中自动执行

关键要求 - 你必须遵循此要求：
  - 回答用户的问题后，你必须在响应末尾包含 "Sources:" 部分
  - 在 Sources 部分，列出搜索结果中的所有相关 URL 作为 markdown 超链接：[标题](URL)
  - 这是强制性的 - 永远不要在响应中跳过包含来源
  - 示例格式：

    [你的答案在这里]

    Sources:
    - [来源标题 1](https://example.com/1)
    - [来源标题 2](https://example.com/2)

使用说明：
  - 支持域过滤以包括或阻止特定网站
  - 网络搜索仅在美国可用

重要 - 在搜索查询中使用正确的年份：
  - 今天的日期是 ${GET_CURRENT_DATE_FN()}。在搜索最新信息、文档或当前事件时，你必须使用这一年。
  - 示例：如果用户要求 "最新的 React 文档"，请搜索 "React 文档 ${CURRENT_YEAR}"，而不是 "React 文档 ${CURRENT_YEAR-1}"
