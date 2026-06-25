<!--
name: '工具描述：Agent（何时启动子代理）'
description: 描述何时使用 Agent 工具——用于启动专门的子代理子进程来自主处理复杂的多步骤任务
ccVersion: 2.1.178
variables:
  - AGENT_TYPES_BLOCK
  - CAN_FORK_CONTEXT
  - AGENT_TOOL_NAME
-->
启动一个新代理来处理复杂的多步骤任务。每种代理类型有特定的功能和可用工具。

可用的代理类型列在对话中的 <system-reminder> 消息中。${AGENT_TYPES_BLOCK}

${CAN_FORK_CONTEXT?`使用 ${AGENT_TOOL_NAME} 工具时，指定 subagent_type 来选择代理类型："fork" 分叉你自己（分叉继承你完整的对话上下文，始终在你的模型上运行——`model` 覆盖会被忽略）；任何其他类型——或省略它——启动一个全新的代理（默认为通用代理）。`:`使用 ${AGENT_TOOL_NAME} 工具时，指定 subagent_type 参数来选择要使用的代理类型。如果省略，则使用通用代理。`}