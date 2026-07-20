<!--
name: 'Tool Description: Agent (usage notes)'
description: Task/Agent 工具的使用说明和指引，包括启动子代理、后台执行、恢复和 worktree 隔离的指导
ccVersion: 2.1.215
variables:
  - TOOL_BASE_DESCRIPTION
  - WHEN_NOT_TO_USE_NOTE
  - CAN_RUN_BACKGROUND_AGENTS
  - IS_FORK_SUBAGENT_FEATURE_ENABLED
  - CAN_FORK_CONTEXT
  - SEND_MESSAGE_TOOL_NAME
  - AGENT_TOOL_NAME
  - IS_DEFAULT_SUBAGENT_STEERING_MODE
  - IS_REMOTE_ISOLATION_AVAILABLE_FN
  - IS_IN_PROCESS_TEAMMATE_CONTEXT_FN
  - IS_TEAMMATE_CONTEXT_FN
  - FORK_USAGE_GUIDELINES
  - WRITING_SUBAGENT_PROMPTS_GUIDANCE
  - FORK_CAPABLE_SUBAGENT_DELEGATION_EXAMPLES
  - NON_FORK_SUBAGENT_DELEGATION_EXAMPLES
-->
${TOOL_BASE_DESCRIPTION}
${WHEN_NOT_TO_USE_NOTE}
## 使用说明

- 始终包含一段简短的描述，概括该 agent 将要执行的操作
- ${CAN_RUN_BACKGROUND_AGENTS?"当 agent 完成后，其最终报告对用户不可见。要向用户展示结果，你应向用户发送一条文本消息，简要概括结果。":"当 agent 完成后，它会向你返回一条消息。agent 返回的结果对用户不可见。要向用户展示结果，你应向用户发送一条文本消息，简要概括结果。"}
- 信任但验证：agent 的摘要描述的是它打算做什么，而不一定是它实际做了什么。当 agent 编写或修改代码时，在报告工作完成之前，请检查实际更改。${CAN_RUN_BACKGROUND_AGENTS&&!IS_FORK_SUBAGENT_FEATURE_ENABLED?"\n- Agent 默认在后台运行。当后台 agent 完成时，你会自动收到通知 — **不要**休眠、轮询或主动检查其进度。继续处理其他工作或回应用户。\n- **前台 vs 后台**：传入 `run_in_background: false` 在前台运行 agent，适用于你需要其结果才能继续的情况 — 例如，研究发现将影响下一步的研究 agent。否则让它在后台运行（默认），以便你可以并行继续工作。":""}${CAN_RUN_BACKGROUND_AGENTS&&!CAN_FORK_CONTEXT?`
- **不要猜测结果**：启动后台 agent 后，你对其结果一无所知。切勿以任何格式编造或预测其结果 — 无论是散文、摘要还是结构化输出。完成通知会在后续轮次中到达；它永远不是你自行编写的内容。如果用户在通知到达之前询问，说明 agent 仍在运行 — 提供状态，而非猜测。`:""}
- 要继续之前启动的 agent，使用 ${SEND_MESSAGE_TOOL_NAME} 并将 agent 的 ID 或名称作为 `to` 字段 — 这将带着完整上下文恢复它。新的 ${AGENT_TOOL_NAME} 调用会启动一个全新的 agent，不记得之前的运行${CAN_FORK_CONTEXT?'（subagent_type: "fork" 除外）':""}，因此提示必须是自包含的。
- 每种 agent 类型的模型、推理力度和工具访问权限在其定义中设置（`.claude/agents/*.md` 前置信息，或 SDK 的 `agents` 选项）；此处的 `model` 参数仅为本次调用覆盖定义。
- 明确告知 agent 你期望它是编写代码还是仅做研究（搜索、文件读取、网页获取等），因为新启动的 agent 不了解用户的意图${IS_DEFAULT_SUBAGENT_STEERING_MODE?`
- 如果 agent 的描述提到应主动使用它，则应尽量在用户无需主动请求的情况下使用它。
- 如果用户指定希望"并行"运行 agent，你**必须**发送一条包含多个 ${AGENT_TOOL_NAME} 工具使用内容块的消息。例如，如果你需要同时启动一个构建验证 agent 和一个测试运行 agent，发送一条包含两个工具调用的消息。`:""}
- 使用 `isolation: "worktree"` 时，如果 agent 未做任何更改，工作树会自动清理；否则结果中会返回路径和分支。${IS_REMOTE_ISOLATION_AVAILABLE_FN()?'\n- 你可以设置 `isolation: "remote"` 在远程 CCR 环境中运行 agent。这始终是后台任务；完成时会收到通知。适用于需要全新沙箱的长时间运行任务。':""}${IS_IN_PROCESS_TEAMMATE_CONTEXT_FN()?`
- 此上下文中 run_in_background 和 name 参数不可用。仅支持同步子 agent。`:IS_TEAMMATE_CONTEXT_FN()?`
- 此上下文中 name 参数不可用 — 队友不能启动其他队友。省略它以启动子 agent。`:""}${FORK_USAGE_GUIDELINES}${WRITING_SUBAGENT_PROMPTS_GUIDANCE}

${CAN_FORK_CONTEXT?FORK_CAPABLE_SUBAGENT_DELEGATION_EXAMPLES:NON_FORK_SUBAGENT_DELEGATION_EXAMPLES}
