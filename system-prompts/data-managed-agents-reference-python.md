<!--
name: 'Data: Managed Agents reference — Python'
description: 使用 Anthropic Python SDK 创建和管理智能体、会话、环境、流式传输、自定义工具、文件及 MCP 服务器的参考指南
ccVersion: 2.1.154
-->
# Managed Agents — Python

> **此处未展示的绑定：** 本 README 涵盖 Python 最常见的 managed-agents 流程。如果需要未展示的类、方法、命名空间、字段或行为，请从 `shared/live-sources.md` WebFetch Python SDK 仓库**或相关文档页面**，而不是猜测。不要从 cURL 形式或其他语言的 SDK 推断。

> **代理是持久化的——创建一次，按 ID 引用。** 存储 `agents.create` 返回的代理 ID，并将其传递给后续每次 `sessions.create`；不要在请求路径中调用 `agents.create`。Anthropic CLI 是从版本控制的 YAML 创建代理和环境的便捷方式——其 URL 在 `shared/live-sources.md` 中。以下示例为完整性展示代码内创建；在生产环境中，create 调用应放在设置中，而非请求路径中。

## 安装

```bash
pip install anthropic
```

## 客户端初始化

```python
import anthropic

# 默认 —— 从环境解析凭据：
# ANTHROPIC_API_KEY，或 ANTHROPIC_AUTH_TOKEN，或 `ant auth login` profile。
# 本地开发时优先使用此方式；不要硬编码密钥。
client = anthropic.Anthropic()

# 显式 API key（仅在必须注入特定密钥时使用）
client = anthropic.Anthropic(api_key="your-api-key")
```

---

## 创建环境

```python
environment = client.beta.environments.create(
    name="my-dev-env",
    config={
        "type": "cloud",
        "networking": {"type": "unrestricted"},
    },
)
print(environment.id)  # env_...
```

---

## 创建代理（必需的第一步）

> ⚠️ **不存在内联代理配置。** `model`/`system`/`tools` 存在于代理对象上，而非会话。始终从 `agents.create()` 开始——会话只接受 `agent={"type": "agent", "id": agent.id}`。

### 最简示例

```python
# 1. 创建代理（可复用，带版本管理）
agent = client.beta.agents.create(
    name="Coding Assistant",
    model="{{OPUS_ID}}",
    tools=[{"type": "agent_toolset_20260401", "default_config": {"enabled": True}}],
)

# 2. 启动会话
session = client.beta.sessions.create(
    agent={"type": "agent", "id": agent.id, "version": agent.version},
    environment_id=environment.id,
)
print(session.id, session.status)
```

### 带系统提示词和自定义工具

```python
import os

agent = client.beta.agents.create(
    name="Code Reviewer",
    model="{{OPUS_ID}}",
    system="You are a senior code reviewer.",
    tools=[
        {"type": "agent_toolset_20260401"},
        {
            "type": "custom",
            "name": "run_tests",
            "description": "Run the test suite",
            "input_schema": {
                "type": "object",
                "properties": {
                    "test_path": {"type": "string", "description": "Path to test file"}
                },
                "required": ["test_path"],
            },
        },
    ],
)

session = client.beta.sessions.create(
    agent={"type": "agent", "id": agent.id, "version": agent.version},
    environment_id=environment.id,
    title="Code review session",
    resources=[
        {
            "type": "github_repository",
            "url": "https://github.com/owner/repo",
            "mount_path": "/workspace/repo",
            "authorization_token": os.environ["GITHUB_TOKEN"],
            "branch": "main",
        }
    ],
)
```

---

## 发送用户消息

```python
client.beta.sessions.events.send(
    session_id=session.id,
    events=[
        {
            "type": "user.message",
            "content": [{"type": "text", "text": "Review the auth module"}],
        }
    ],
)
```

> 💡 **流优先：** 在发送消息*之前*（或同时）打开流。流只传递打开后发生的事件——发送后再打开流意味着早期事件会缓冲在一批中到达。参见 [操控模式](../../shared/managed-agents-events.md#steering-patterns)。

---

## 流式事件（SSE）

```python
import json

# 流优先：打开流，然后在流激活时发送
with client.beta.sessions.events.stream(
    session_id=session.id,
) as stream:
    client.beta.sessions.events.send(
        session_id=session.id,
        events=[{"type": "user.message", "content": [{"type": "text", "text": "..."}]}],
    )
    for event in stream:
        ...  # process events

# 独立的流迭代：
with client.beta.sessions.events.stream(
    session_id=session.id,
) as stream:
    for event in stream:
        if event.type == "agent.message":
            for block in event.content:
                if block.type == "text":
                    print(block.text, end="", flush=True)
        elif event.type == "agent.custom_tool_use":
            # 自定义工具调用——会话现在处于 idle 状态
            print(f"\
Custom tool call: {event.name}")
            print(f"Input: {json.dumps(event.input)}")
            # 发回结果（见下文）
        elif event.type == "session.status_idle":
            print("\
--- Agent idle ---")
        elif event.type == "session.status_terminated":
            print("\
--- Session terminated ---")
            break
```

---

## 提供自定义工具结果

```python
client.beta.sessions.events.send(
    session_id=session.id,
    events=[
        {
            "type": "user.custom_tool_result",
            "custom_tool_use_id": "sevt_abc123",
            "content": [{"type": "text", "text": "All 42 tests passed."}],
        }
    ],
)
```

---

## 轮询事件

```python
events = client.beta.sessions.events.list(
    session_id=session.id,
)
for event in events.data:
    print(f"{event.type}: {event.id}")
```

> ⚠️ **优先使用 SDK 而非原始的 `requests`/`httpx`。** 如果你手动编写轮询循环，不要假设 `timeout=(5, 60)` 或 `httpx.Timeout(120)` 限制了总调用时长——两者都是**每个数据块**的读取超时（每接收一个字节重置），因此慢速响应可能永远阻塞。如需硬性墙钟截止时间，在循环层面跟踪 `time.monotonic()` 并显式退出，或使用 `asyncio.wait_for()` 包裹。参见 [接收事件](../../shared/managed-agents-events.md#receiving-events)。

---

## 完整的带自定义工具的流式循环

```python
import json


def run_custom_tool(tool_name: str, tool_input: dict) -> str:
    """执行自定义工具并返回结果。"""
    if tool_name == "run_tests":
        # 你的工具实现放这里
        return "All tests passed."
    return f"Unknown tool: {tool_name}"


def run_session(client, session_id: str):
    """流式传输事件并处理自定义工具调用。"""
    while True:
        with client.beta.sessions.events.stream(
            session_id=session_id,
        ) as stream:
            tool_calls = []
            for event in stream:
                if event.type == "agent.message":
                    for block in event.content:
                        if block.type == "text":
                            print(block.text, end="", flush=True)
                elif event.type == "agent.custom_tool_use":
                    tool_calls.append(event)
                elif event.type == "session.status_idle":
                    break
                elif event.type == "session.status_terminated":
                    return

        if not tool_calls:
            break

        # 处理自定义工具调用
        results = []
        for call in tool_calls:
            result = run_custom_tool(call.name, call.input)
            results.append({
                "type": "user.custom_tool_result",
                "custom_tool_use_id": call.id,
                "content": [{"type": "text", "text": result}],
            })

        client.beta.sessions.events.send(
            session_id=session_id,
            events=results,
        )
```

---

## 上传文件

```python
with open("data.csv", "rb") as f:
    file = client.beta.files.upload(
        file=f,
    )

# 在会话中使用
session = client.beta.sessions.create(
    agent={"type": "agent", "id": agent.id, "version": agent.version},
    environment_id=environment.id,
    resources=[{"type": "file", "file_id": file.id, "mount_path": "/workspace/data.csv"}],
)
```

---

## 列出和下载会话文件

列出代理在会话期间写入 `/mnt/session/outputs/` 的文件，然后下载它们。

```python
# 列出与某个会话关联的文件
files = client.beta.files.list(
    scope_id=session.id,
    betas=["managed-agents-2026-04-01"],
)
for f in files.data:
    print(f.filename, f.size_bytes)
    # 下载每个文件并保存到磁盘
    file_content = client.beta.files.download(f.id)
    file_content.write_to_file(f.filename)
```

> 💡 `session.status_idle` 和输出文件出现在 `files.list` 之间有短暂的索引延迟（约 1~3 秒）。如果列表为空，重试一到两次。

---

## 会话管理

```python
# 获取会话详情
session = client.beta.sessions.retrieve(session_id="sesn_011CZxAbc123Def456")
print(session.status, session.usage)

# 列出会话
sessions = client.beta.sessions.list()

# 删除会话
client.beta.sessions.delete(session_id="sesn_011CZxAbc123Def456")

# 归档会话
client.beta.sessions.archive(session_id="sesn_011CZxAbc123Def456")
```

---

## MCP 服务器集成

```python
# 代理声明 MCP 服务器（这里不涉及认证——认证放在 vault 中）
agent = client.beta.agents.create(
    name="MCP Agent",
    model="{{OPUS_ID}}",
    mcp_servers=[
        {"type": "url", "name": "my-tools", "url": "https://my-mcp-server.example.com/sse"},
    ],
    tools=[
        {"type": "agent_toolset_20260401", "default_config": {"enabled": True}},
        {"type": "mcp_toolset", "mcp_server_name": "my-tools"},
    ],
)

# 会话附加包含这些 MCP 服务器 URL 凭据的 vault(s)
session = client.beta.sessions.create(
    agent=agent.id,
    environment_id=environment.id,
    vault_ids=[vault.id],
)
```

参见 `shared/managed-agents-tools.md` §Vaults 了解创建 vault 和添加凭据。
