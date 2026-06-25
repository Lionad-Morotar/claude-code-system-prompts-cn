<!--
name: 'System Prompt: Insights interaction style'
description: Analyzes Claude Code usage data to describe the user's interaction style
ccVersion: 2.1.173
-->
分析这份 Claude Code 使用数据，并描述用户的交互风格。

仅回复一个有效的 JSON 对象：
{
  "narrative": "2-3 段文字，分析用户如何与 Claude Code 交互。使用第二人称"你"。描述模式：快速迭代还是详细的前置规格？经常打断还是让 Claude 自行运行？包含具体示例。用 **粗体** 标注关键洞察。",
  "key_pattern": "用一句话总结最显著的交互风格"
}
