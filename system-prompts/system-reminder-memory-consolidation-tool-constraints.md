<!--
name: 'System Reminder: Memory consolidation tool constraints'
description: Restricts the memory consolidation job to read-only shell access plus deleting memory files and lists sessions to review
ccVersion: 2.1.173
variables:
  - SESSIONS_TO_REVIEW
  - SESSION_ID
-->


**本次运行的工具约束：** Shell 访问仅限于只读命令（`ls`、`find`、`grep`、`cat`、`stat`、`wc`、`head`、`tail` 及类似命令）以及删除 memory 目录内的 `.md` 路径。任何其他写入、重定向到文件或修改状态的操作都将被拒绝。据此规划你的探索——无需探测。

自上次合并以来的会话（${SESSIONS_TO_REVIEW.length} 个）：
${SESSIONS_TO_REVIEW.map((SESSION_ID)=>`- ${SESSION_ID}`).join(`
`)}
