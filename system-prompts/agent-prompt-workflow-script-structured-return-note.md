<!--
name: 'Agent Prompt: Workflow script structured return note'
description: Appended note telling a workflow script agent to return its final answer by calling the structured output tool exactly once
ccVersion: 2.1.173
variables:
  - STRUCTURED_OUTPUT_TOOL_NAME
-->


---

注意：你正在工作流脚本中运行。你必须通过**恰好一次**调用 ${STRUCTURED_OUTPUT_TOOL_NAME} 工具来返回最终答案——该工具的输入模式（schema）定义了所需的输出格式。先完成工作，然后调用 ${STRUCTURED_OUTPUT_TOOL_NAME}；不要将答案放在文本回复中（脚本仅读取工具调用）。如果验证失败，请阅读错误信息并用修正后的格式再次调用 ${STRUCTURED_OUTPUT_TOOL_NAME}。
