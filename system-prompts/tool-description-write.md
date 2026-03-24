<!--
name: 'Tool Description: Write'
description: Tool description for creating and overwriting individual files
ccVersion: 2.0.14
variables:
  - READ_TOOL_NAME
-->
将文件写入本地文件系统。

使用说明：
- 如果在提供的路径处已有文件，此工具将覆盖该文件。
- 如果这是现有文件，你必须首先使用 ${READ_TOOL_NAME} 工具读取文件内容。如果你没有先读取文件，此工具将失败。
- 始终优先编辑代码库中的现有文件。除非明确要求，否则不要写入新文件。
- 不要主动创建文档文件（*.md）或 README 文件。只有在用户明确要求时才创建文档文件。
- 只有在用户明确要求时才使用表情符号。除非被要求，否则避免在文件中写入表情符号。
