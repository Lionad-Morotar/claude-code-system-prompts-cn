<!--
name: 'System Reminder: Memory consolidation tool constraints (immutable)'
description: Restricts the memory consolidation job to read-only shell access plus deleting and rewriting immutable memory files
ccVersion: 2.1.173
variables:
  - EDIT_TOOL_NAME
  - WRITE_TOOL_NAME
-->


**本次运行的工具约束：** Shell 访问仅限于只读命令（`ls`、`find`、`grep`、`cat`、`stat`、`wc`、`head`、`tail` 及类似命令），外加删除记忆目录中的 `.md` 文件。不允许使用 ${EDIT_TOOL_NAME}——记忆是不可变的，因此用删除 + ${WRITE_TOOL_NAME} 来替换，永远不要原地编辑。在规划探索时牢记这一点——无需试探。
