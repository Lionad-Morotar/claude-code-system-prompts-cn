<!--
name: 'System Reminder: Async agent launched'
description: Warns Claude not to duplicate an asynchronously launched agent's work or read its full JSONL transcript output file
ccVersion: 2.1.193
variables:
  - AGENT_OUTPUT_FILE
  - READ_TOOL_NAME
-->
不要重复此智能体的工作 —— 避免处理与其正在使用的相同文件或主题。
output_file: ${AGENT_OUTPUT_FILE.outputFile}
不要通过 shell 工具使用 ${READ_TOOL_NAME} 或 tail 读取此文件 —— 它是完整的子智能体 JSONL 转录记录，读取它会超出你的上下文容量。如果用户询问进度，告知智能体仍在运行；你将在完成时收到通知。
