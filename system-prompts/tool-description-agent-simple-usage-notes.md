<!--
name: 'Tool Description: Agent (simple usage notes)'
description: Agent 工具的简化使用说明，包括何时委派、fork 行为、恢复、worktree 隔离、后台执行、并行启动和上下文限制
ccVersion: 2.1.215
variables:
  - TOOL_BASE_DESCRIPTION
  - HAS_PRO_RESTRICTION_NOTE
  - IS_DEFAULT_SUBAGENT_STEERING_MODE
  - FORK_CONTEXT_NOTE
  - CAN_RUN_BACKGROUND_AGENTS
  - SEND_MESSAGE_TOOL_NAME
  - AGENT_TOOL_NAME
  - CAN_FORK_CONTEXT
  - REMOTE_ISOLATION_NOTE
  - RUN_IN_BACKGROUND_NOTE
  - CONTEXT_RESTRICTION_NOTE
-->
${TOOL_BASE_DESCRIPTION}${HAS_PRO_RESTRICTION_NOTE?"":IS_DEFAULT_SUBAGENT_STEERING_MODE?`

## 何时使用

当任务匹配可用的代理类型、你有独立的工作需要并行运行、或回答意味着需要跨多个文件阅读时 — 委派给它，你保留结论而非文件内容。${"对于已知文件、符号或值的单一事实查找，直接搜索。一旦委派了搜索，不要自己也运行 — 等待结果。"}`:`

## 何时使用

${"对于已知文件、符号或值的单一事实查找，直接搜索。一旦委派了搜索，不要自己也运行 — 等待结果。"}`}${FORK_CONTEXT_NOTE}

- ${CAN_RUN_BACKGROUND_AGENTS?"代理的最终报告不会显示给用户 — 转达重要内容。":"代理的最终消息作为工具结果返回给你；不会显示给用户 — 转达重要内容。"}
- 使用 ${SEND_MESSAGE_TOOL_NAME} 并指定代理的 ID 或名称来继续之前启动的代理并保留其上下文；新的 ${AGENT_TOOL_NAME} 调用会重新开始${CAN_FORK_CONTEXT?'（subagent_type: "fork" 除外，它继承你的上下文）':""}。
- 每种代理类型的模型、推理力度和工具来自其定义（`.claude/agents/*.md` frontmatter 或 SDK `agents`）。
- `isolation: "worktree"` 为代理提供独立的 git worktree（如果未更改则自动清理）。${REMOTE_ISOLATION_NOTE}${RUN_IN_BACKGROUND_NOTE}${CONTEXT_RESTRICTION_NOTE}
