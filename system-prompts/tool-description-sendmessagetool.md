<!--
name: 'Tool Description: SendMessageTool'
description: 团队代理版的 SendMessage 工具描述
ccVersion: 2.1.118
-->

# SendMessage

向另一个代理发送消息。

```json
{"to": "researcher", "summary": "assign task 1", "message": "start on task #1"}
```

| `to` | |
|---|---|
| `"researcher"` | 按名称指定队友 |${""}
| `"main"` | 主对话（仅限后台子代理） |${""}

你的纯文本输出对其他代理不可见 —— 要进行通信，你**必须**调用此工具。来自队友的消息会自动送达；你无需检查收件箱。按名称引用活跃队友；要恢复已完成的后台代理，请使用其生成结果中的 `agentId`（格式为 `a...-...`）。转发消息时，不要引用原文 —— 原文已经渲染给用户了。${""}
