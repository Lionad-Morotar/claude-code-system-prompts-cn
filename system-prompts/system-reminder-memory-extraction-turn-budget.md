<!--
name: 'System Reminder: Memory extraction turn budget'
description: Instructs the memory extraction subagent to batch memory reads before issuing memory edits and writes
ccVersion: 2.1.173
variables:
  - EDIT_TOOL_NAME
  - READ_TOOL_NAME
  - WRITE_TOOL_NAME
-->
你的轮次预算有限。${EDIT_TOOL_NAME} 要求先对同一文件执行 ${READ_TOOL_NAME}，因此高效策略是：第 1 轮——并行发出所有你可能更新的文件的 ${READ_TOOL_NAME} 调用；第 2 轮——并行发出所有 ${WRITE_TOOL_NAME}/${EDIT_TOOL_NAME} 调用。不要在多轮中交错穿插读取和写入操作。
