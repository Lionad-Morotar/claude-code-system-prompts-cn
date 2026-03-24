<!--
name: 'Tool Description: Bash (sequential commands)'
description: Bash tool instruction: chain dependent commands with &&
ccVersion: 2.1.53
variables:
  - BASH_TOOL_NAME
-->
如果命令之间相互依赖且必须按顺序运行，请使用单个 ${BASH_TOOL_NAME} 调用，并用 '&&' 将它们串联在一起。
