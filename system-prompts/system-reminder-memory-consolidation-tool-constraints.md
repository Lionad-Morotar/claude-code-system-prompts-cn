<!--
name: 'System Reminder: Memory consolidation tool constraints'
description: Restricts the memory consolidation job to read-only shell access plus deleting memory files and lists sessions to review
ccVersion: 2.1.173
variables:
  - SESSIONS_TO_REVIEW
  - SESSION_ID
-->


**本次运行的工具约束：** Shell 访问仅限于只读命令（`ls`、`find`、`grep`、`cat`、`stat`、`wc`、`head`、`tail` 及类似命令），外加删除记忆目录中的 `.md` 文件。任何写入、重定向到文件或修改状态的操作都将被拒绝。在规划探索时牢记这一点——无需试探。

自上次合并以来的会话（共 ${SESSIONS_TO_REVIEW.length} 个）：
${SESSIONS_TO_REVIEW.map((SESSION_ID)=>`- ${SESSION_ID}`).join(`
`)}
