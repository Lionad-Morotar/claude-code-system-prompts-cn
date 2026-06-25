<!--
name: 'System Reminder: Large file full-content reading guidance'
description: Advises how to read full large-file content for analysis, preferably inside a subagent when the Agent tool is available
ccVersion: 2.1.173
variables:
  - FULL_CONTENT_READING_INSTRUCTION
  - AGENT_TOOL_NAME
  - SUBAGENT_READING_INSTRUCTION_EXAMPLE
-->
- 对于需要读取完整内容的分析或摘要：${FULL_CONTENT_READING_INSTRUCTION}
- 如果 ${AGENT_TOOL_NAME} 工具可用，请在子代理中执行此操作，以便完整输出不占用你的主上下文。原样传递上述指令，并明确说明它必须返回什么 —— 例如 "${SUBAGENT_READING_INSTRUCTION_EXAMPLE}"。一个模糊的"总结一下"可能会丢失细节。
