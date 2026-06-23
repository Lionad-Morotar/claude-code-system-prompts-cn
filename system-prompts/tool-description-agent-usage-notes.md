<!--
name: 'Tool Description: Agent (usage notes)'
description: Usage notes and instructions for the Task/Agent tool, including guidance on launching subagents, background execution, resumption, and worktree isolation
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

- 始终包含一个简短的描述（3-5 个词），总结代理将要做什么
- 当代理完成时，它会向你返回一条消息。代理返回的结果对用户不可见。要向用户显示结果，你应该向用户发送一条文本消息，包含结果的简洁摘要。
- 信任但验证：代理的摘要描述的是它**意图**做什么，不一定是它实际做了什么。当代理编写或编辑代码时，在报告工作完成之前，检查实际的更改。${!ENVIRONMENT_CONFIG.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS&&!IS_SUBAGENT_CONTEXT_FN()&&!HAS_SUBAGENT_TYPES?`
- 你可以选择使用 run_in_background 参数在后台运行代理。当代理在后台运行时，你将在其完成时自动收到通知——不要 sleep、轮询或主动检查其进度。继续其他工作或响应用户。
- **前台 vs 后台**：当你需要代理的结果才能继续时使用前台（默认）——例如，研究代理的发现会指导你的后续步骤。当你确实有独立的工作可以并行进行时使用后台。`:""}
- 要继续之前生成的代理，使用 ${SEND_MESSAGE_TOOL_NAME}，将代理的 ID 或名称作为 `to` 字段——这将恢复其完整上下文。新的 ${AGENT_TOOL_NAME} 调用会启动一个没有先前运行记忆的全新代理${CAN_FORK_CONTEXT?'（subagent_type: "fork" 除外）':""}，因此提示词必须自包含。
- 明确告知代理你期望它编写代码还是仅进行研究（搜索、文件读取、web 获取等），因为新代理不了解用户的意图
- 如果代理描述中提到应主动使用，那么你应该尽力在用户未要求时也使用它。
- 如果用户指定他们希望你"并行"运行代理，你必须发送一条包含多个 ${AGENT_TOOL_NAME} 工具使用内容块的单条消息。例如，如果你需要同时启动构建验证代理和测试运行代理，发送一条包含两个工具调用的消息。
- 使用 `isolation: "worktree"` 时，如果代理未做任何更改，工作树会自动清理；否则路径和分支会包含在结果中。${IS_REMOTE_ISOLATION_AVAILABLE_FN()?'\n- 你可以设置 `isolation: "remote"` 在远程 CCR 环境中运行代理。这始终是一个后台任务；你会在其完成时收到通知。用于需要全新沙箱的长时间运行任务。':""}${IS_SUBAGENT_CONTEXT_FN()?`
- 在此上下文中，run_in_background、name 和 mode 参数不可用。仅支持同步子代理。`:IS_TEAMMATE_CONTEXT_FN()?`
- 在此上下文中，name 和 mode 参数不可用——队友无法生成其他队友。省略它们以生成子代理。`:""}${ADDITIONAL_USAGE_NOTES}${EXTRA_USAGE_NOTES}

${CAN_FORK_CONTEXT?SUBAGENT_TYPE_DEFINITIONS:DEFAULT_AGENT_DESCRIPTION}
