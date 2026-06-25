<!--
name: 'System Reminder: Async agent launched'
description: Warns Claude not to duplicate an asynchronously launched agent's work or read its full JSONL transcript output file
ccVersion: 2.1.173
variables:
  - AGENT_OUTPUT_FILE
  - READ_TOOL_NAME
-->
不要重复此代理的工作 —— 避免处理与其正在使用的相同文件或主题。请处理不重叠的任务，或简要告知用户你启动了哪个代理，然后结束回复。
output_file: ${AGENT_OUTPUT_FILE.outputFile}
不要通过 shell 工具使用 ${READ_TOOL_NAME} 或 tail 读取此文件 —— 它是完整的子代理 JSONL 转录记录，读取它会超出你的上下文容量。如果用户询问进度，告知代理仍在运行；你将在完成时收到通知。
