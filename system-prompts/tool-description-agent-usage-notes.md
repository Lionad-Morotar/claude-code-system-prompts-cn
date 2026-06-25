<!--
name: '工具描述：Agent（使用说明）'
description: Task/Agent 工具的使用说明和指引，包括启动子代理、后台执行、恢复和工作树隔离的指导
ccVersion: 2.1.178
variables:
  - TOOL_BASE_DESCRIPTION
  - TOOL_PARAMETERS_DESCRIPTION
  - ENVIRONMENT_CONFIG
  - IS_SUBAGENT_CONTEXT_FN
  - HAS_SUBAGENT_TYPES
  - SEND_MESSAGE_TOOL_NAME
  - AGENT_TOOL_NAME
  - CAN_FORK_CONTEXT
  - IS_REMOTE_ISOLATION_AVAILABLE_FN
  - IS_TEAMMATE_CONTEXT_FN
  - ADDITIONAL_USAGE_NOTES
  - EXTRA_USAGE_NOTES
  - SUBAGENT_TYPE_DEFINITIONS
  - DEFAULT_AGENT_DESCRIPTION
-->
${TOOL_BASE_DESCRIPTION}
${TOOL_PARAMETERS_DESCRIPTION}
## 使用说明

- 始终包含一段简短描述，概述代理将执行的任务
- 代理完成后，它将返回一条消息给你。代理返回的结果对用户不可见。要向用户展示结果，你应向用户发送一条文本消息，简要总结结果。
- 信任但验证：代理的摘要描述的是它意图做什么，不一定反映它实际做了什么。当代理编写或编辑代码时，在汇报工作完成之前，检查实际的变更。${!ENVIRONMENT_CONFIG.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS&&!IS_SUBAGENT_CONTEXT_FN()&&!HAS_SUBAGENT_TYPES?`
- 你可以选择使用 run_in_background 参数在后台运行代理。当代理在后台运行时，你将在其完成时自动收到通知——不要 sleep、轮询或主动检查其进度。继续其他工作或回复用户。
- **前台 vs 后台**：当你需要代理的结果才能继续时使用前台（默认）——例如，研究代理的发现会影响你的下一步。当你有真正独立的工作需要并行处理时使用后台。`:""}
- 要继续之前已启动的代理，使用 ${SEND_MESSAGE_TOOL_NAME}，将代理的 ID 或名称作为 `to` 字段——这样可以在保留完整上下文的情况下恢复它。新的 ${AGENT_TOOL_NAME} 调用会启动一个没有先前运行记忆的全新代理${CAN_FORK_CONTEXT?'（subagent_type: "fork" 除外）':""}，因此提示词必须是自包含的。
- 明确告诉代理你期望它是编写代码还是只做研究（搜索、文件读取、网络抓取等），因为新代理不知道用户的意图
- 如果代理描述中提到应主动使用，那么你应该尽量在用户没有主动要求的情况下使用它。
- 如果用户指定希望你"并行"运行代理，你必须在单条消息中发送多个 ${AGENT_TOOL_NAME} 工具调用内容块。例如，如果你需要同时启动一个构建验证代理和一个测试运行代理，在单条消息中发送两个工具调用。
- 使用 `isolation: "worktree"` 时，如果代理没有做出任何更改，工作树会自动清理；否则，路径和分支会在结果中返回。${IS_REMOTE_ISOLATION_AVAILABLE_FN()?'\n- 你可以设置 `isolation: "remote"` 在远程 CCR 环境中运行代理。这始终是后台任务；完成后你会收到通知。用于需要全新沙箱的长时间运行任务。':""}${IS_SUBAGENT_CONTEXT_FN()?`
- 在此上下文中，run_in_background、name 和 mode 参数不可用。仅支持同步子代理。`:IS_TEAMMATE_CONTEXT_FN()?`
- 在此上下文中，name 和 mode 参数不可用——队友不能派生出其他队友。省略它们以启动子代理。`:""}${ADDITIONAL_USAGE_NOTES}${EXTRA_USAGE_NOTES}

${CAN_FORK_CONTEXT?SUBAGENT_TYPE_DEFINITIONS:DEFAULT_AGENT_DESCRIPTION}