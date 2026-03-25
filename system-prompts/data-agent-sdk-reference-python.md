<!--
name: 'Data: Agent SDK reference — Python'
description: Python Agent SDK reference including installation, quick start, custom tools via MCP, and hooks
ccVersion: 2.1.78
-->
# Agent SDK — Python

Claude Agent SDK 提供了一个更高级的接口，用于构建具有内置工具、安全功能和智能体能力的 AI 智能体。

## 安装

```bash
pip install claude-agent-sdk
```

---

## 快速开始

```python
import anyio
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

async def main():
    async for message in query(
        prompt="解释这个代码库",
        options=ClaudeAgentOptions(allowed_tools=["Read", "Glob", "Grep"])
    ):
        if isinstance(message, ResultMessage):
            print(message.result)

anyio.run(main)
```

---

## 内置工具

| 工具      | 描述                          |
| --------- | ------------------------------------ |
| Read      | 读取工作区中的文件          |
| Write     | 创建新文件                     |
| Edit      | 对现有文件进行精确编辑 |
| Bash      | 执行 shell 命令               |
| Glob      | 按模式查找文件                |
| Grep      | 按内容搜索文件              |
| WebSearch | 搜索网络信息       |
| WebFetch        | 获取并分析网页          |
| AskUserQuestion | 向用户询问澄清问题         |
| Agent           | 生成子智能体                      |

---

## 主要接口

### `query()` — 简单的一次性使用

`query()` 函数是运行智能体的最简单方式。它返回消息的异步迭代器。

```python
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

async for message in query(
    prompt="解释这个代码库",
    options=ClaudeAgentOptions(allowed_tools=["Read", "Glob", "Grep"])
):
    if isinstance(message, ResultMessage):
        print(message.result)
```

### `ClaudeSDKClient` — 完全控制

`ClaudeSDKClient` 提供对智能体生命周期的完全控制。当您需要自定义工具、钩子、流式传输或中断执行的能力时，请使用它。

```python
import anyio
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions, AssistantMessage, TextBlock

async def main():
    options = ClaudeAgentOptions(allowed_tools=["Read", "Glob", "Grep"])
    async with ClaudeSDKClient(options=options) as client:
        await client.query("解释这个代码库")
        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(block.text)

anyio.run(main)
```

`ClaudeSDKClient` 支持：

- **上下文管理器** (`async with`) 用于自动资源清理
- **`client.query(prompt)`** 向智能体发送提示
- **`receive_response()`** 用于流式传输消息直到完成
- **`interrupt()`** 在任务中途停止智能体执行
- **自定义工具必需**（通过 SDK MCP 服务器）

---

## 权限系统

```python
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

async for message in query(
    prompt="重构认证模块",
    options=ClaudeAgentOptions(
        allowed_tools=["Read", "Edit", "Write"],
        permission_mode="acceptEdits"  # 自动接受文件编辑
    )
):
    if isinstance(message, ResultMessage):
        print(message.result)
```

权限模式：

- `"default"`：危险操作前提示
- `"plan"`：仅规划，不执行
- `"acceptEdits"`：自动接受文件编辑
- `"bypassPermissions"`：跳过所有提示（谨慎使用）

---

## MCP（模型上下文协议）支持

```python
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

async for message in query(
    prompt="打开 example.com 并描述你看到的内容",
    options=ClaudeAgentOptions(
        mcp_servers={
            "playwright": {"command": "npx", "args": ["@playwright/mcp@latest"]}
        }
    )
):
    if isinstance(message, ResultMessage):
        print(message.result)
```

---

## 钩子

使用回调函数自定义智能体行为：

```python
from claude_agent_sdk import query, ClaudeAgentOptions, HookMatcher, ResultMessage

async def log_file_change(input_data, tool_use_id, context):
    file_path = input_data.get('tool_input', {}).get('file_path', 'unknown')
    print(f"已修改: {file_path}")
    return {}

async for message in query(
    prompt="重构 utils.py",
    options=ClaudeAgentOptions(
        permission_mode="acceptEdits",
        hooks={
            "PostToolUse": [HookMatcher(matcher="Edit|Write", hooks=[log_file_change])]
        }
    )
):
    if isinstance(message, ResultMessage):
        print(message.result)
```

工具生命周期事件（`PreToolUse`、`PostToolUse`、`PostToolUseFailure`）的钩子回调输入包含 `agent_id` 和 `agent_type` 字段，允许钩子识别哪个智能体（主智能体或子智能体）触发了工具调用。

可用的钩子事件：`PreToolUse`、`PostToolUse`、`PostToolUseFailure`、`UserPromptSubmit`、`Stop`、`SubagentStop`、`PreCompact`、`Notification`、`SubagentStart`、`PermissionRequest`

---

## 常用选项

`query()` 接受顶级 `prompt`（字符串）和 `options` 对象（`ClaudeAgentOptions`）：

```python
async for message in query(prompt="...", options=ClaudeAgentOptions(...)):
```

| 选项                              | 类型   | 描述                                                                |
| ----------------------------------- | ------ | -------------------------------------------------------------------------- |
| `cwd`                               | string | 文件操作的工作目录                                      |
| `allowed_tools`                     | list   | 智能体可以使用的工具（例如 `["Read", "Edit", "Bash"]`）                |
| `tools`                             | list   | 可用的内置工具（限制默认集合）               |
| `disallowed_tools`                  | list   | 明确禁止使用的工具                                               |
| `permission_mode`                   | string | 如何处理权限提示                                           |
| `mcp_servers`                       | dict   | 要连接的 MCP 服务器                                                  |
| `hooks`                             | dict   | 用于自定义行为的钩子                                             |
| `system_prompt`                     | string | 自定义系统提示                                                       |
| `max_turns`                         | int    | 停止前的最大智能体轮次                                        |
| `max_budget_usd`                    | float  | 查询的最大预算（美元）                                        |
| `model`                             | string | 模型 ID（默认：由 CLI 确定）                                      |
| `agents`                            | dict   | 子智能体定义（`dict[str, AgentDefinition]`）                        |
| `output_format`                     | dict   | 结构化输出模式                                                   |
| `thinking`                          | dict   | 思考/推理控制                                                 |
| `betas`                             | list   | 要启用的 Beta 功能（例如 `["context-1m-2025-08-07"]`）               |
| `setting_sources`                   | list   | 要加载的设置（例如 `["project"]`）。默认：无（无 CLAUDE.md 文件） |
| `env`                               | dict   | 为会话设置的环境变量                               |

---

## 消息类型

```python
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage, SystemMessage

async for message in query(
    prompt="查找 TODO 注释",
    options=ClaudeAgentOptions(allowed_tools=["Read", "Glob", "Grep"])
):
    if isinstance(message, ResultMessage):
        print(message.result)
        print(f"停止原因: {message.stop_reason}")  # 例如 "end_turn", "max_turns"
    elif isinstance(message, SystemMessage) and message.subtype == "init":
        session_id = message.data.get("session_id")  # 捕获以供稍后恢复
```

处理子智能体任务事件时，可使用类型化的任务消息子类以获得更好的类型安全性：
- `TaskStartedMessage` — 子智能体任务注册时发出
- `TaskProgressMessage` — 实时进度更新，包含累积使用指标
- `TaskNotificationMessage` — 任务完成通知

当速率限制状态转换时（例如，从 `allowed` 到 `allowed_warning` 或 `rejected`），会发出 `RateLimitEvent`。使用它来警告用户或优雅地退避：

```python
from claude_agent_sdk import query, ClaudeAgentOptions, RateLimitEvent

async for message in query(prompt="...", options=ClaudeAgentOptions()):
    if isinstance(message, RateLimitEvent):
        print(f"Rate limit status: {message.rate_limit_info.status}")
        if message.rate_limit_info.resets_at:
            print(f"Resets at: {message.rate_limit_info.resets_at}")
```

---

## 子智能体

```python
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition, ResultMessage

async for message in query(
    prompt="使用代码审查智能体审查此代码库",
    options=ClaudeAgentOptions(
        allowed_tools=["Read", "Glob", "Grep", "Agent"],
        agents={
            "code-reviewer": AgentDefinition(
                description="质量和安全审查的专家代码审查员。",
                prompt="分析代码质量并提出改进建议。",
                tools=["Read", "Glob", "Grep"]
            )
        }
    )
):
    if isinstance(message, ResultMessage):
        print(message.result)
```

---

## 错误处理

```python
from claude_agent_sdk import query, ClaudeAgentOptions, CLINotFoundError, CLIConnectionError, ResultMessage

try:
    async for message in query(
        prompt="...",
        options=ClaudeAgentOptions(allowed_tools=["Read"])
    ):
        if isinstance(message, ResultMessage):
            print(message.result)
except CLINotFoundError:
    print("未找到 Claude Code CLI。使用以下命令安装：pip install claude-agent-sdk")
except CLIConnectionError as e:
    print(f"连接错误: {e}")
```

---

## 会话历史

使用顶级函数检索过去的会话数据：

```python
from claude_agent_sdk import list_sessions, get_session_messages

# 列出所有过去的会话（同步函数 — 无需 await）
sessions = list_sessions()
for session in sessions:
    print(f"{session.session_id}: {session.cwd}")

# 获取特定会话的消息（同步函数 — 无需 await）
messages = get_session_messages(session_id="...")
for msg in messages:
    print(msg)
```

### 会话变更

重命名或标记会话（同步函数 — 无需 await）：

```python
from claude_agent_sdk import rename_session, tag_session

# 重命名会话
rename_session(session_id="...", title="我的重构会话")

# 标记会话（标签会自动进行 Unicode 清理）
tag_session(session_id="...", tag="experiment")

# 清除标签
tag_session(session_id="...", tag=None)

# 可选地限定到特定项目目录
rename_session(session_id="...", title="New title", directory="/path/to/project")
```

---

## MCP 服务器管理

使用 `ClaudeSDKClient` 在运行时管理 MCP 服务器：

```python
async with ClaudeSDKClient(options=options) as client:
    # 重新连接已断开的 MCP 服务器
    await client.reconnect_mcp_server("my-server")

    # 切换 MCP 服务器的开/关状态
    await client.toggle_mcp_server("my-server", enabled=False)

    # 获取所有 MCP 服务器的状态
    status = await client.get_mcp_status()  # 返回 McpStatusResponse
```

---

## 最佳实践

1. **始终指定 allowed_tools** — 明确列出智能体可以使用的工具
2. **设置工作目录** — 始终为文件操作指定 `cwd`
3. **使用适当的权限模式** — 从 `"default"` 开始，仅在需要时升级
4. **处理所有消息类型** — 检查 `ResultMessage` 以获取智能体输出
5. **限制 max_turns** — 使用合理的限制防止智能体失控
