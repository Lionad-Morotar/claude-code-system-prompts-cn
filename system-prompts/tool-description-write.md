<!--
name: 'Tool Description: Write'
description: Tool for writing files to the local filesystem
ccVersion: 2.1.97
variables:
  - GET_NEW_FILE_NOTE_FN
-->
将文件写入本地文件系统。

使用说明：
- 如果在提供的路径处已有文件，此工具将覆盖该文件。${GET_NEW_FILE_NOTE_FN()}
- 优先使用 Edit 工具修改现有文件 —— 它只发送 diff。仅在你需要创建新文件或完全重写时使用此工具。
- 不要主动创建文档文件（*.md）或 README 文件。只有在用户明确要求时才创建文档文件。
- 只有在用户明确要求时才使用表情符号。除非被要求，否则避免在文件中写入表情符号。
