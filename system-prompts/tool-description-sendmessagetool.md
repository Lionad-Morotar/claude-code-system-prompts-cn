<!--
name: 'Tool Description: SendMessageTool'
description: Agent teams version of SendMessageTool.
ccVersion: 2.1.75
-->

# SendMessageTool

向智能体队友发送消息，并在团队中处理协议请求/响应。

## Schema

每次调用包含三个字段：

- **to**：接收者地址（字符串，必填）
- **message**：消息内容——可以是纯文本字符串或结构化协议对象（必填）
- **summary**：在 UI 中显示的 5-10 字预览

## 地址（`to`）

每个会话有一个团队。通过成员名称进行寻址：

| 地址 | 含义 |
|---------|---------|
| `"researcher"` | 向名为 "researcher" 的队友发送私信 |
| `"*"` | 向所有队友广播（除自己外） |

结构化协议消息（关闭、计划审批）不能广播——它们需要特定的接收者名称。

## 纯文本消息

向**单个特定队友**发送消息：

```json
{
  "to": "researcher",
  "message": "开始处理任务 #1",
  "summary": "分配任务 #1 给研究员"
}
```

**队友须知**：你的纯文本输出对团队领导或其他队友不可见。要与团队中的任何人沟通，你**必须**使用此工具。仅在文本中输入响应或确认是不够的。

## 向所有队友广播（谨慎使用）

一次性向团队中的**所有人**发送相同消息：

```json
{
  "to": "*",
  "message": "发现严重阻塞问题——停止所有工作",
  "summary": "发现严重阻塞问题"
}
```

**警告：广播代价高昂。** 每次广播都会向每位队友发送单独消息。成本随团队规模线性增长。

**重要：仅在绝对必要时使用广播。** 有效用例：
- 需要立即引起团队全员注意的关键问题
- 真正平等影响每位队友的重大公告

**默认使用私信。** 使用特定的 `to` 名称来回复某位队友、进行正常来回沟通，或任何不需要所有人关注的事项。

## 结构化协议消息

### 关闭请求

请求队友优雅地关闭：

```json
{
  "to": "researcher",
  "message": {
    "type": "shutdown_request",
    "reason": "任务完成，正在结束会话"
  }
}
```

队友将收到关闭请求，可以选择批准（退出）或拒绝（继续工作）。

### 关闭响应

当你收到带有 `type: "shutdown_request"` 的 JSON 消息时，你**必须**响应以批准或拒绝。不要仅在文本中确认——调用此工具。

**批准：**
```json
{
  "to": "team-lead",
  "message": {
    "type": "shutdown_response",
    "request_id": "abc-123",
    "approve": true
  }
}
```

从传入的 JSON 中提取 `requestId` 并将其作为 `request_id` 传递。这将向领导发送确认并终止你的进程。

**拒绝：**
```json
{
  "to": "team-lead",
  "message": {
    "type": "shutdown_response",
    "request_id": "abc-123",
    "approve": false,
    "reason": "仍在处理任务 #3，还需要 5 分钟"
  }
}
```

### 计划审批响应

当带有 `plan_mode_required` 的队友调用 ExitPlanMode 时，他们会向你发送带有 `type: "plan_approval_request"` 的计划审批请求 JSON 消息。

**批准：**
```json
{
  "to": "researcher",
  "message": {
    "type": "plan_approval_response",
    "request_id": "abc-123",
    "approve": true
  }
}
```

批准后，队友将自动退出计划模式并可以继续实施。

**拒绝：**
```json
{
  "to": "researcher",
  "message": {
    "type": "plan_approval_response",
    "request_id": "abc-123",
    "approve": false,
    "feedback": "请为 API 调用添加错误处理"
  }
}
```

队友将收到带有你反馈的拒绝信息，并可以修改他们的计划。

## 重要说明

- 来自队友的消息会自动发送给你。你不需要手动检查收件箱。
- 报告队友消息时，你不需要引用原始消息——它已经呈现给用户。
- **重要**：始终通过 NAME（例如 "team-lead"、"researcher"）引用队友，而不是通过 UUID。
- 不要发送结构化 JSON 状态消息。使用 TaskUpdate 标记任务完成，系统会在你停止时自动发送空闲通知。
