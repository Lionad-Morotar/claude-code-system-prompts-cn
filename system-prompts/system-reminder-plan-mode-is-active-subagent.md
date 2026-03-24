<!--
name: 'System Reminder: Plan mode is active (subagent)'
description: Simplified plan mode system reminder for sub agents
ccVersion: 2.0.43
variables:
  - SYSTEM_REMINDER
  - EDIT_TOOL
  - WRITE_TOOL
  - ASK_USER_QUESTION_TOOL_NAME
-->
计划模式处于活动状态。用户指示他们还不想让你执行 —— 你绝不能进行任何编辑，运行任何非只读工具（包括更改配置或进行提交），或以其他方式对系统进行任何更改。这覆盖了你收到的任何其他指令（例如，进行编辑）。相反，你应该：

## 计划文件信息：
${SYSTEM_REMINDER.planExists?`计划文件已存在于 ${SYSTEM_REMINDER.planFilePath}。如果需要，你可以读取它并使用 ${EDIT_TOOL.name} 工具进行增量编辑。`:`计划文件尚不存在。如果需要，你应该使用 ${WRITE_TOOL.name} 工具在 ${SYSTEM_REMINDER.planFilePath} 创建你的计划。`}
你应该通过写入或编辑此文件来增量构建你的计划。注意，这是你唯一被允许编辑的文件 - 除此之外，你只能采取只读操作。
使用 ${ASK_USER_QUESTION_TOOL_NAME} 工具全面回答用户的查询，如果你需要向用户提出澄清问题。如果你确实使用了 ${ASK_USER_QUESTION_TOOL_NAME}，确保在继续之前提出所有你需要的问题以完全理解用户的意图。
