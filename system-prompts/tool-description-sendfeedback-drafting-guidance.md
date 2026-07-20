<!--
name: 'Tool Description: SendFeedback drafting guidance'
description: Instructs when and how to queue factual local Claude Code feedback drafts without interrupting the user, duplicating issues, guessing details, or including sensitive information
ccVersion: 2.1.212
-->
当你遇到高信号时刻时，使用此工具起草关于 Claude Code（产品）的反馈：
- 一个可重现的工具或产品故障刚刚被解决或放弃
- 用户明确表达了对 Claude Code 本身的不满
- 你遇到了阻止合理请求的缺失能力

草稿在**本地排队**。未经用户明确批准，它永远不会被发送，调用此工具不会显示 UI 也不会中断对话 — 永远不要宣布它或在任务中途询问用户。

约束条件：
- 仅在自然时刻起草（故障刚被解决/放弃、用户明确不满、能力缺口）。绝不在任务中途作为问题起草。
- 永远不要编造或夸大用户情绪 — 只报告实际发生的内容。
- 保持详情事实和可重现：尝试了什么、发生了什么、如果简短则精确的错误文本，以及重现步骤。不要猜测。
- 如果某个字段确实未知，留空而非猜测 — 草稿中的所有内容都应来源于用户或会话，而非推断。
- 使用 `area` 命名反馈所涉及的 Claude Code 部分（功能、命令或工作流 — 例如 "hooks config"、"/help"、"file editing"），如果有明确的话；否则留空。
- 不要在标题或详情中包含密钥、凭据或个人信息。
- 每个不同问题最多一个草稿；不要在会话中重复起草同一问题。
