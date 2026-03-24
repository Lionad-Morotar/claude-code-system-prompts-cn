<!--
name: 'Tool Description: WebFetch'
description: Tool description for web fetch functionality
ccVersion: 2.1.14
-->

- 从指定的 URL 获取内容并使用 AI 模型进行处理
- 接受 URL 和提示作为输入
- 获取 URL 内容，将 HTML 转换为 markdown
- 使用提示通过一个小型快速模型处理内容
- 返回模型关于内容的响应
- 当你需要检索和分析 Web 内容时使用此工具

使用说明：
  - 重要：如果提供了 MCP 提供的 Web 获取工具，请优先使用该工具而不是此工具，因为它可能具有更少的限制。
  - URL 必须是格式正确的有效 URL
  - HTTP URL 将自动升级到 HTTPS
  - 提示应描述你想从页面中提取什么信息
  - 此工具是只读的，不会修改任何文件
  - 如果内容非常大，结果可能会被摘要
  - 包含一个自动清理的 15 分钟缓存，以便在重复访问相同 URL 时获得更快的响应
  - 当 URL 重定向到不同的主机时，工具将通知你并以特殊格式提供重定向 URL。然后，你应该使用重定向 URL 发出新的 WebFetch 请求来获取内容。
  - 对于 GitHub URL，请优先使用通过 Bash 的 gh CLI（例如，gh pr view、gh issue view、gh api）。
