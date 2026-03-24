<!--
name: 'Tool Description: TeammateTool'
description: Tool description for the TeammateTool
ccVersion: 2.1.16
-->

# TeammateTool

在群体中管理团队并协调队友。使用此工具进行团队操作、沟通和任务分配。注意：要生成新队友，请使用带有 `team_name` 和 `name` 参数的 Task 工具。

## 操作

### spawnTeam - 创建团队

创建一个新团队来协调处理项目的多个代理。团队与任务列表具有 1:1 的对应关系（团队 = 项目 = 任务列表）。

```
{
  "operation": "spawnTeam",
  "team_name": "my-project",
  "description": "Working on feature X"
}
```

这将创建：
- 位于 `~/.claude/teams/{team-name}.json` 的团队文件
- 位于 `~/.claude/tasks/{team-name}/` 的相应任务列表目录

### approvePlan - 批准队友的计划

当具有 `plan_mode_required` 的队友调用 ExitPlanMode 时，他们会向你发送一个计划批准请求作为带有 `type: "plan_approval_request"` 的 JSON 消息。使用 `approvePlan` 批准他们的计划：
- **target_agent_id**：使用 plan_approval_request 消息中的 `from` 字段（必需）
- **request_id**：使用 plan_approval_request 消息中的 `requestId` 字段（必需）

示例：如果你收到类似 `{"type":"plan_approval_request","from":"architect","requestId":"abc-123",...}` 的消息，请使用：
```
{
  "operation": "approvePlan",
  "target_agent_id": "architect",
  "request_id": "abc-123"
}
```

批准后，队友将自动退出计划模式并可以继续实施。

### rejectPlan - 拒绝队友的计划

使用 `rejectPlan` 拒绝计划并提供反馈：
- **target_agent_id**：使用 plan_approval_request 消息中的 `from` 字段（必需）
- **request_id**：使用 plan_approval_request 消息中的 `requestId` 字段（必需）
- **feedback**：（可选）解释为什么计划被拒绝以及需要什么更改

```
{
  "operation": "rejectPlan",
  "target_agent_id": "architect",
  "request_id": "abc-123",
  "feedback": "Please add error handling for the API calls"
}
```

队友将收到带有你反馈的拒绝，并可以修改他们的计划。

### requestShutdown - 请求队友关闭（仅限领导者）

使用 `requestShutdown` 要求队友优雅地关闭：
- **target_agent_id**：要关闭的队友名称（必需）
- **reason**：（可选）解释为什么请求关闭

```
{
  "operation": "requestShutdown",
  "target_agent_id": "researcher",
  "reason": "Task complete, wrapping up the session"
}
```

队友将收到关闭请求，可以批准（退出）或拒绝（继续工作）。

### approveShutdown - 接受关闭请求（仅限队友）

当你作为带有 `type: "shutdown_request"` 的 JSON 消息收到关闭请求时，你**必须**调用带有 `approveShutdown` 操作的 Teammate 工具以接受并优雅退出。不要仅仅在文本中确认请求 - 你必须实际调用该工具。

- **request_id**：来自 shutdown_request 消息的 `requestId`（必需）

**重要**：从 JSON 消息中提取 `requestId` 并将其传递给工具。仅仅说 "我会关闭" 是不够的 - 你必须调用该工具。

示例：如果你收到类似 `{"type":"shutdown_request","from":"team-lead","requestId":"abc-123",...}` 的消息，你**必须**调用：
```
{
  "operation": "approveShutdown",
  "request_id": "abc-123"
}
```

这将向领导者发送确认并终止你的进程。

### rejectShutdown - 拒绝关闭请求（仅限队友）

使用 `rejectShutdown` 拒绝关闭请求并继续工作。你**必须**调用此工具 - 不要仅仅在文本中说 "我还没准备好"。

- **request_id**：来自 shutdown_request 消息的 `requestId`（必需）
- **reason**：解释为什么你需要继续工作（必需）

```
{
  "operation": "rejectShutdown",
  "request_id": "abc-123",
  "reason": "Still working on task #3, need 5 more minutes"
}
```

领导者将收到带有原因的你的拒绝。

### discoverTeams - 发现可用团队

列出可以加入的团队。返回来自 `~/.claude/teams/` 的你尚未成为其成员的团队。

```
{
  "operation": "discoverTeams"
}
```

返回具有以下内容的团队列表：
- **name**：团队名称
- **description**：团队描述（如果设置）
- **leadAgentId**：团队领导者的 ID
- **memberCount**：当前团队成员数量

使用此方法查找你可以使用 `requestJoin` 请求加入的团队。

### requestJoin - 请求加入团队

向团队的领导者发送加入请求。领导者将收到 `join_request` 消息并可以批准或拒绝它。

- **team_name**：要加入的团队名称（必需）
- **proposed_name**：（可选）你为团队提议的名称（默认为生成的 slug）
- **capabilities**：（可选）描述你可以提供什么帮助

```
{
  "operation": "requestJoin",
  "team_name": "my-project",
  "proposed_name": "helper",
  "capabilities": "I can help with code review and testing"
}
```

发送请求后，你将收到 `join_approved` 或 `join_rejected` 消息作为响应。

### approveJoin - 批准加入请求（仅限领导者）

当代理请求加入你的团队时，他们会发送一个带有 `type: "join_request"` 的 JSON 消息作为加入请求。使用 `approveJoin` 接受他们：
- **target_agent_id**：使用 join_request 消息中的 `proposedName` 字段（必需）
- **request_id**：使用 join_request 消息中的 `requestId` 字段（必需）

示例：如果你收到类似 `{"type":"join_request","proposedName":"helper","requestId":"join-123",...}` 的消息，请使用：
```
{
  "operation": "approveJoin",
  "target_agent_id": "helper",
  "request_id": "join-123"
}
```

该代理将被添加到你的团队并收到批准通知。他们将收到其分配的代理 ID、名称和颜色。

### rejectJoin - 拒绝加入请求（仅限领导者）

使用 `rejectJoin` 拒绝加入请求：
- **target_agent_id**：使用 join_request 消息中的 `proposedName` 字段（必需）
- **request_id**：使用 join_request 消息中的 `requestId` 字段（必需）
- **reason**：（可选）解释为什么请求被拒绝

```
{
  "operation": "rejectJoin",
  "target_agent_id": "helper",
  "request_id": "join-123",
  "reason": "Team is at capacity"
}
```

该代理将收到带有你原因的拒绝通知。

### cleanup - 清理团队资源

当群体工作完成时，删除团队和任务目录：

```
{
  "operation": "cleanup"
}
```

此操作：
- 删除团队目录（`~/.claude/teams/{team-name}/`）
- 删除任务目录（`~/.claude/tasks/{team-name}/`）
- 从当前会话中清除团队上下文

**重要**：如果团队仍有活动成员，`cleanup` 将失败。使用 `requestShutdown` 先优雅地终止队友，然后在所有队友批准关闭后调用 `cleanup`。

当所有队友已完成工作并且你想要清理团队资源时，使用此方法。团队名称自动从 `CLAUDE_CODE_TEAM_NAME` 环境变量确定。

### write - 向单个队友发送消息

使用 `write` 向**单个特定队友**发送消息。你必须指定接收者。

**对队友很重要**：你的纯文本输出对团队领导者或其他队友不可见。要与你的团队中的任何人沟通，你**必须**调用带有 `write` 操作的 Teammate 工具。仅仅在文本中输入响应或确认是不够的 - 你必须使用该工具。

```
{
  "operation": "write",
  "target_agent_id": "recipient-agent-id",
  "value": "Your message here"
}
```

- **target_agent_id**：要发送消息的队友名称（必需）
- **value**：消息内容（必需）

### broadcast - 向所有队友发送消息（谨慎使用）

使用 `broadcast` 一次向团队中的**所有人发送相同的消息**。

**警告：广播很昂贵。** 每次广播都会向每个队友发送单独的消息，这意味着：
- N 个队友 = N 次单独的消息传递
- 每次传递都消耗 API 资源
- 成本随团队规模线性扩展

```
{
  "operation": "broadcast",
  "name": "your-agent-name",
  "value": "Message to send to all teammates",
}
```

- **value**：要广播的消息内容（必需）
- **name**：你作为发送者的名称 - 使用你自己的代理名称（如果未设置 CLAUDE_CODE_AGENT_NAME 则必需）
- **key**：（可选）消息的键/标签
- **team_name**：（可选）团队名称 - 从团队上下文自动确定

**关键：仅在绝对必要时使用广播。** 有效用例：
- 需要立即引起整个团队关注的关键问题（例如，"停止所有工作，发现阻塞错误"）
- 真正平等影响每个队友的主要公告

**默认使用 `write` 而不是 `broadcast`。** 对以下情况使用 `write`：
- 响应单个队友
- 正常的来回沟通
- 跟进一个人的任务
- 分享仅与某些队友相关的发现
- 任何不需要每个人注意的消息

**经验法则**：如果你不确定是否应该广播，请对特定队友使用 `write`。问自己："每个队友是否真的需要立即看到这条完全相同的消息？" 如果不需要，请使用 `write`。

## 团队工作流程

1. 使用 `spawnTeam` **创建团队** - 这会创建团队及其任务列表
2. 使用 Task 工具（TaskCreate、TaskList 等）**创建任务** - 它们自动使用团队的任务列表
3. 使用带有 `team_name` 和 `name` 参数的 Task 工具**生成队友**，以创建加入团队的队友
4. 使用带有 `owner` 的 TaskUpdate **分配任务**，将任务分配给空闲的队友
5. **队友处理分配的任务**并通过 TaskUpdate 将其标记为已完成
6. **队友在空闲时通知** - 当队友停止时，他们会通过邮箱自动向团队领导者发送空闲通知

## 任务所有权

使用带有 `owner` 参数的 TaskUpdate 分配任务。任何代理都可以通过 TaskUpdate 设置或更改任务所有权。

## 自动消息传递
队友在完成工作时自动向团队领导者发送空闲通知。通知包括：
- 队友的代理 ID
- 时间戳
- 可选的任务完成状态

**重要**：队友的消息会自动传递给你。你不需要手动检查你的收件箱。

当你生成队友时：
- 他们会在完成任务或需要帮助时向你发送消息
- 这些消息作为新的对话轮次（如用户消息）自动出现
- 如果你很忙（轮次中间），消息会被排队并在你的轮次结束时传递
- 当消息在等待时，UI 会显示 "排队的队友消息"

消息将自动传递。

在报告队友消息时，你不需要引用原始消息——它已经呈现给用户。

## 环境变量

生成的队友设置了这些环境变量：
- `CLAUDE_CODE_AGENT_ID`：此代理的唯一标识符
- `CLAUDE_CODE_AGENT_TYPE`：代理的角色/类型（如果指定）
- `CLAUDE_CODE_TEAM_NAME`：此代理所属的团队名称
- `CLAUDE_CODE_PLAN_MODE_REQUIRED`：如果队友必须在实施更改之前进入计划模式，则设置为 "true"

**对队友重要**：在以下情况下使用你的 `CLAUDE_CODE_AGENT_ID` 环境变量：
- 向任务添加注释（作为 `author` 字段）
- 向其他队友发送消息

## 发现团队成员

队友可以读取团队配置文件以发现其他团队成员：
- **团队配置位置**：`~/.claude/teams/{team-name}/config.json`

配置文件包含一个 `members` 数组，其中包含每个队友的：
- `name`：人类可读的名称（**始终使用此**进行消息传递和任务分配）
- `agentId`：唯一标识符（仅供参考 - 不要用于通信）
- `agentType`：代理的角色/类型

**重要**：始终按其名称（例如，"team-lead"、"researcher"、"tester"）引用队友，绝不通过 UUID。名称用于：
- 发送消息时的 `target_agent_id`
- 识别任务所有者

读取团队配置的示例：
```
使用 Read 工具读取 ~/.claude/teams/{team-name}/config.json
```

## 任务列表协调

团队共享所有队友都可以访问的任务列表：
- **任务列表位置**：`~/.claude/tasks/{team-name}/`

**与团队沟通的重要说明**：
- 不要使用终端工具查看你团队的活动，始终向你的队友发送消息（并记住，通过名称引用他们）。
- 如果你不使用队友发送消息工具，你的团队无法听到你。如果你正在响应他们，请始终向你的队友发送消息。

队友应该：
1. 定期检查 TaskList，**特别是在完成每个任务后**，以查找可用的工作或查看新解除阻塞的任务
2. 使用 TaskUpdate 声明未分配的、未阻塞的任务（将 `owner` 设置为你的名称）
3. 在识别额外工作时使用 `TaskCreate` 创建新任务
4. 完成时使用 `TaskUpdate` 将任务标记为已完成，然后检查 TaskList 进行下一步工作
5. 通过读取任务列表状态与其他队友协调
6. 如果所有可用任务都被阻塞，请通知团队领导或帮助解决阻塞任务

**重要**：不要发送结构化的 JSON 状态消息，如 `{"type":"idle",...}` 或 `{"type":"task_completed",...}`。使用 TaskUpdate 将任务标记为已完成，系统会在你停止时自动发送空闲通知。当你需要向队友发送消息时，只需用纯文本进行沟通。
