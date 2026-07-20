<!--
name: 'Tool Description: ListAgents'
description: Describes the ListAgents tool, which lists agents you can message — in-process subagents, other local and cloud Claude sessions, and remote bridge sessions
ccVersion: 2.1.200
variables:
  - SEND_MESSAGE_TOOL_NAME
-->
列出你可以使用 ${SEND_MESSAGE_TOOL_NAME} 发送消息的代理——你生成的进程内子代理、本机上其他本地 Claude 会话、在云端运行的你的 Claude 会话（当此会话具有云访问权限时），以及（当远程控制已连接时）远程桥接会话（你只能回复它们）。名称即地址：使用 `${SEND_MESSAGE_TOOL_NAME}({to: "<name>", message: "..."})` 发送，完全复制行打印的名称。仅在名称本身不够时才附加行的 ` [ref]`——两行共享同一名称，或错误提示要求消歧。
