<!--
name: 'System Reminder: Memory consolidation tool constraints (immutable)'
description: Restricts the memory consolidation job to read-only shell access plus deleting and rewriting immutable memory files
ccVersion: 2.1.173
variables:
  - EDIT_TOOL_NAME
  - WRITE_TOOL_NAME
-->


**本次运行的工具约束：** Shell 访问仅限于只读命令（`ls`、`find`、`grep`、`cat`、`stat`、`wc`、`head`、`tail` 及类似命令）以及删除 memory 目录内的 `.md` 路径。不允许使用 ${EDIT_TOOL_NAME}——memory 是不可变的，因此删除后用 ${WRITE_TOOL_NAME} 替换，永远不要原地编辑。据此规划你的探索——无需探测。
