<!--
name: 'Tool Description: SendMessageTool'
description: SendMessageTool 的代理团队版本。
ccVersion: 2.1.203
variables:
  - SHOULD_INCLUDE_LEGACY_PROTOCOL_RESPONSES
-->

# SendMessage

向另一个代理发送消息。

```json
{"to": "researcher", "summary": "assign task 1", "message": "start on task #1"}
```

| `to` | |
|---|---|
| `"researcher"` | 按名称联系的队友 |
| `"main"` | 主对话（仅后台子代理）|${""}

你的纯文本输出对其他代理不可见 —— 要沟通，你必须调用此工具。来自队友的消息自动传递；你不检查收件箱。按名称引用代理 —— 名称在代理完成后仍然有效（发送会从其中断处恢复）。仅当代理没有名称，或当更新的代理占用了该名称时（最新的优先），才使用其生成结果中的原始 `agentId`（格式 `a...-...`）。转达时，不要引用原始内容 —— 它已经渲染给用户了。${""}${SHOULD_INCLUDE_LEGACY_PROTOCOL_RESPONSES?'\n\n## 协议响应（遗留）\n\n如果你收到 `type: "shutdown_request"` 或 `type: "plan_approval_request"` 的 JSON 消息，用匹配的 `_response` 类型响应 —— 回显 `request_id`，设置 `approve` 为 true/false：\n\n```json\n{"to": "team-lead", "message": {"type": "shutdown_response", "request_id": "...", "approve": true}}\n{"to": "researcher", "message": {"type": "plan_approval_response", "request_id": "...", "approve": false, "feedback": "add error handling"}}\n```\n\n批准关闭终止你的进程。拒绝计划将队友送回修改。除非被要求，不要发起 `shutdown_request`。不要发送结构化 JSON 状态消息 —— 使用 TaskUpdate。':""}
