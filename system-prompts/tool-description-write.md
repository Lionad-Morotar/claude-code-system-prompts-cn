<!--
name: 'Tool Description: Write'
description: Tool for writing files to the local filesystem
ccVersion: 2.1.91
variables:
  - GET_NEW_FILE_NOTE_FN
  - WRITE_FILE_NOTE
  - PREFER_EDIT_NOTE
-->
将文件写入本地文件系统。

使用说明：
- 如果在提供的路径处已有文件，此工具将覆盖该文件。${GET_NEW_FILE_NOTE_FN()}${WRITE_FILE_NOTE}
- 优先使用 Edit 工具修改现有文件 —— 它只发送 diff。${PREFER_EDIT_NOTE}
- 不要主动创建文档文件（*.md）或 README 文件。只有在用户明确要求时才创建文档文件。
- 只有在用户明确要求时才使用表情符号。除非被要求，否则避免在文件中写入表情符号。
