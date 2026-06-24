<!--
name: 'Tool Description: Write (read existing file first)'
description: 在需要先读取现有文件才能覆盖的环境中，Write 工具的描述
ccVersion: 2.1.120
variables:
  - READ_TOOL_NAME
-->
将文件写入本地文件系统。如果文件已存在则覆盖。

- 如果文件已存在，你必须先在此对话中使用 ${READ_TOOL_NAME} 读取它，否则调用将失败。
- 优先使用 Edit 修改现有文件——它只发送 diff。
