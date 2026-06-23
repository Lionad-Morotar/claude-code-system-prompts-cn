<!--
name: 'Tool Description: Agent (when to launch subagents)'
description: Describes _when_ to use the Agent tool - for launching specialized subagent subprocesses to autonomously handle complex multi-step tasks
ccVersion: 2.1.178
variables:
  - AGENT_TYPES_BLOCK
  - CAN_FORK_CONTEXT
  - AGENT_TOOL_NAME
-->
启动新代理来处理复杂的多步骤任务。每个代理类型具有特定的能力和可用的工具。

可用的代理类型列在会话中的 <system-reminder> 消息中。${AGENT_TYPES_BLOCK}

${CAN_FORK_CONTEXT?`使用 ${AGENT_TOOL_NAME} 工具时，指定 subagent_type 以选择代理："fork" 会复刻你自己（复刻继承你的完整对话上下文，并始终在你的模型上运行——`model` 覆盖被忽略）；任何其他类型（或省略）会启动一个新代理（默认是通用代理）。`:`使用 ${AGENT_TOOL_NAME} 工具时，指定 subagent_type 参数以选择要使用的代理类型。如果省略，则使用通用代理。`}
