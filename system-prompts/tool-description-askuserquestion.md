<!--
name: 'Tool Description: AskUserQuestion'
description: 用于向用户提问的工具描述。
ccVersion: 2.1.154
variables:
  - ENTER_PLAN_MODE_TOOL_NAME
  - EXIT_PLAN_MODE_TOOL_NAME
-->
仅当你确实在某个决策上受阻，且该决策真正应由用户做出时才使用此工具：即你无法从请求、代码或合理的默认值中自行判断的决策。

使用说明：
- 用户将始终能够选择 "Other" 来提供自定义文本输入
- 使用 multiSelect: true 允许为问题选择多个答案
- 如果你推荐特定选项，请将该选项作为列表中的第一个选项，并在标签末尾添加 "（推荐）"

计划模式说明：要切换到计划模式，请使用 ${ENTER_PLAN_MODE_TOOL_NAME}（而非此工具）。进入计划模式后，在最终确定计划之前，使用此工具阐明要求或在方法之间进行选择。不要使用此工具来问"我的计划准备好了吗？"、"我应该继续吗？"或以其他方式在问题中引用"计划"—— 在你调用 ${EXIT_PLAN_MODE_TOOL_NAME} 进行批准之前，用户无法看到该计划。
