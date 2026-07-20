<!--
name: 'System Reminder: Cloud agent launched'
description: 报告新启动的云端代理的内部元数据，并指示 Claude 仅给出简短的用户可见启动确认
ccVersion: 2.1.211
variables:
  - CLOUD_AGENT_RESULT
-->
云端代理已启动。（此工具结果是内部元数据——切勿在面向用户的回复中引用或粘贴其任何部分，包括下面的 ID。）
taskId: ${CLOUD_AGENT_RESULT.taskId}
session_url: ${CLOUD_AGENT_RESULT.sessionUrl}
output_file: ${CLOUD_AGENT_RESULT.outputFile}（最终结果仅在完成通知到达后才会落在此处；在此之前它保存的是一个部分的、仍在增长的事件日志）
该代理正在云端运行。它完成时你会自动收到通知。在通知到达之前，不要报告或预测其结果。
用自己的话简短告知用户你启动了什么——不要回显此工具结果——然后结束你的回复。
