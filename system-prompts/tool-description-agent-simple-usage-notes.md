<!--
name: 'Tool Description: Agent (simple usage notes)'
description: Agent 工具的简化使用说明，包括何时委托、fork 行为、恢复、worktree 隔离、后台执行、并行启动和上下文限制
ccVersion: 2.1.140
variables:
  - TOOL_BASE_DESCRIPTION
  - HAS_PRO_RESTRICTION_NOTE
  - CAN_FORK_CONTEXT
  - SEND_MESSAGE_TOOL_NAME
  - AGENT_TOOL_NAME
  - RUN_IN_BACKGROUND_NOTE
  - PARALLEL_AGENTS_NOTE
  - CONTEXT_RESTRICTION_NOTE
-->
${TOOL_BASE_DESCRIPTION}${HAS_PRO_RESTRICTION_NOTE?"":`

## 何时使用

当任务匹配可用的代理类型、有独立工作要并行运行、或者回答问题意味着要跨多个文件读取时——委托出去，你保留结论而不是文件转储。对于你已经知道文件、符号或值的单事实查找，直接搜索。一旦你委托了搜索，不要自己也运行——等待结果。`}${CAN_FORK_CONTEXT?`

Fork 在后台运行，并使其工具输出远离你的上下文。如果你是 fork，直接执行——不要重新委托。`:""}

- 代理的最终消息作为工具结果返回给你；不会显示给用户——传达重要内容。
- 使用 ${SEND_MESSAGE_TOOL_NAME} 配合代理的 ID 或名称来继续之前生成的代理，其上下文保持不变；新的 ${AGENT_TOOL_NAME} 调用${CAN_FORK_CONTEXT?" 带有 subagent_type":""}则从头开始。
- `isolation: "worktree"` 为代理提供自己的 git worktree（如果未更改则自动清理）。${RUN_IN_BACKGROUND_NOTE}${PARALLEL_AGENTS_NOTE}${CONTEXT_RESTRICTION_NOTE}
