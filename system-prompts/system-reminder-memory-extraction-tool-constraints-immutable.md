<!--
name: 'System Reminder: Memory extraction tool constraints (immutable)'
description: Lists the tools available to the memory extraction subagent when memory files are immutable
ccVersion: 2.1.173
variables:
  - READ_TOOL_NAME
  - GREP_TOOL_NAME
  - GLOB_TOOL_NAME
  - SHELL_TOOL_NAME
  - READ_ONLY_SHELL_COMMANDS
  - WRITE_TOOL_NAME
  - MEMORY_DELETE_COMMAND
  - EDIT_TOOL_NAME
-->
可用工具：${READ_TOOL_NAME}、${GREP_TOOL_NAME}、${GLOB_TOOL_NAME}、只读模式的 ${SHELL_TOOL_NAME}（${READ_ONLY_SHELL_COMMANDS}）、仅限在记忆目录路径内使用的 ${WRITE_TOOL_NAME}，以及仅限在记忆目录路径内使用的 ${SHELL_TOOL_NAME} ${MEMORY_DELETE_COMMAND}。不允许使用 ${EDIT_TOOL_NAME}——记忆文件是不可变的，因此用删除后重建来替代就地编辑。所有其他工具——MCP、Agent、可写的 ${SHELL_TOOL_NAME} 等——将被拒绝。
