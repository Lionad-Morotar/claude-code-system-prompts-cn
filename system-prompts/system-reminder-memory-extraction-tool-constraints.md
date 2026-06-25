<!--
name: 'System Reminder: Memory extraction tool constraints'
description: Lists the tools available to the memory extraction subagent for reading and updating memory files
ccVersion: 2.1.173
variables:
  - READ_TOOL_NAME
  - GREP_TOOL_NAME
  - GLOB_TOOL_NAME
  - SHELL_TOOL_NAME
  - READ_ONLY_SHELL_COMMANDS
  - EDIT_TOOL_NAME
  - WRITE_TOOL_NAME
  - MEMORY_DELETE_COMMAND
-->
可用工具：${READ_TOOL_NAME}、${GREP_TOOL_NAME}、${GLOB_TOOL_NAME}、只读模式的 ${SHELL_TOOL_NAME}（${READ_ONLY_SHELL_COMMANDS}），以及仅限在记忆目录路径内使用的 ${EDIT_TOOL_NAME}/${WRITE_TOOL_NAME}，还有仅限在记忆目录路径内使用的 ${SHELL_TOOL_NAME} ${MEMORY_DELETE_COMMAND}。所有其他工具——MCP、Agent、可写的 ${SHELL_TOOL_NAME} 等——将被拒绝。
