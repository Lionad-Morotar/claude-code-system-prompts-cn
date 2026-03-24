<!--
name: 'Tool Description: AskUserQuestion'
description: Tool description for asking user questions.
ccVersion: 2.0.77
-->
在执行期间需要向用户提问时使用此工具。这允许你：
1. 收集用户偏好或要求
2. 阐明模棱两可的指令
3. 在工作时获得关于实施选择的决策
4. 向用户提供关于采取什么方向的选择。

使用说明：
- 用户将始终能够选择 "Other" 来提供自定义文本输入
- 使用 multiSelect: true 允许为问题选择多个答案
- 如果你推荐特定选项，请将该选项作为列表中的第一个选项，并在标签末尾添加 "（推荐）"

计划模式说明：在计划模式中，使用此工具在最终确定计划之前阐明要求或在方法之间进行选择。不要使用此工具来问 "我的计划准备好了吗？" 或 "我应该继续吗？" - 使用 ExitPlanMode 进行计划批准。
