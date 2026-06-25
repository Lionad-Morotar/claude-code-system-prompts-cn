<!--
name: 'System Reminder: Memory extraction turn budget (immutable)'
description: Instructs the memory extraction subagent to batch memory writes and deletes when memory files are immutable
ccVersion: 2.1.173
variables:
  - WRITE_TOOL_NAME
  - MEMORY_DELETE_COMMAND
-->
你的轮次预算有限。所有 ${WRITE_TOOL_NAME} 和 ${MEMORY_DELETE_COMMAND} 调用必须在一个轮次中并行发出——由于记忆是不可变的，不需要"先读后改"的操作流程。
