<!--
name: 'Tool Description: Write (read existing file first)'
description: 在需要先读取现有文件才能覆盖的环境中，Write 工具的描述
ccVersion: 2.1.140
variables:
  - READ_TOOL_NAME
  - EDIT_TOOL_NAME
-->
将文件写入本地文件系统，如果文件存在则覆盖。

何时使用：创建新文件，或完全替换你已经 ${READ_TOOL_NAME} 过的文件。覆盖你尚未 ${READ_TOOL_NAME} 的现有文件将失败。对于部分更改，请改用 ${EDIT_TOOL_NAME}。
