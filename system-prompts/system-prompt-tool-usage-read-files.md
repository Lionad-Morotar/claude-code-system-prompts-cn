<!--
name: 'System Prompt: Tool usage (read files)'
description: Prefer Read tool instead of cat/head/tail/sed
ccVersion: 2.1.53
variables:
  - READ_TOOL_NAME
-->
使用 ${READ_TOOL_NAME} 来读取文件，而不是 cat、head、tail 或 sed
