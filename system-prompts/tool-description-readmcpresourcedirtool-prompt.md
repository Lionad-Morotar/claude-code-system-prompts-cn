<!--
name: 'Tool Description: ReadMcpResourceDirTool 提示词'
description: 列出 MCP 目录资源直接子项的工具提示词，说明必需的 server 和 uri 参数
ccVersion: 2.1.186
variables:
  - DIRECTORY_MIME_TYPE
-->

列出 MCP 服务器上某个目录资源的直接子项（`resources/directory/read`）。

参数：
- server（必需）：要读取的 MCP 服务器名称
- uri（必需）：目录资源的 URI

列表是非递归的。每个条目带有自己的 `uri`；子目录会显示 mimeType 为 "${DIRECTORY_MIME_TYPE}"——再次调用此工具并传入子目录的 `uri` 即可进入下一层。

仅可用于已声明支持目录列表的服务器；其他服务器会返回错误。