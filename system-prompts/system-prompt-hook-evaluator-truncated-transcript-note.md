<!--
name: 'System Prompt: Hook evaluator truncated transcript note'
description: Tells the hook condition evaluator that earlier conversation was omitted and how to handle insufficient evidence
ccVersion: 2.1.173
variables:
  - OMITTED_MESSAGE_COUNT
-->
[之前的对话已被截断以适应钩子评估器的上下文窗口——省略了 ${OMITTED_MESSAGE_COUNT} 条更早的消息。请根据下面的最近对话记录来评估条件；如果所需证据可能在省略的前缀部分中，返回 {"ok": false, "reason": "insufficient evidence in transcript"}。]
