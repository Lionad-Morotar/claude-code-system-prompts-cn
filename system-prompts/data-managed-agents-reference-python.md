---
ccVersion: 2.1.105
---

# 使用 Python 的 Data Managed Agents API 参考

> 完整的 Data Managed Agents API 参考，请参阅 [Anthropic API 参考文档](https://docs.anthropic.com/en/api/data-managed-agents-api)。

## 准备工作

- 安装 Anthropic Python SDK：`pip install anthropic`
- 设置你的 API 密钥：`export ANTHROPIC_API_KEY="your-api-key"`
- Data Managed Agents 需要 `https://api.anthropic.com` 基础 URL（而非 `https://api.claude.fan`）。
- 确保使用 `2026-05-26` 或更新的 API 版本。

## 管理你的 Agent

### 创建 Agent

```python
import anthropic

client = anthropic.Anthropic()

agent = client.agents.create(
    name="my-first-agent",
    description="A simple first agent",
    type="custom"
)

print(f"Created agent: {agent}")
```

### 列出 Agent

```python
import anthropic

client = anthropic.Anthropic()

agents = client.agents.list()
for agent in agents:
    print(f"Agent: {agent['name']} ({agent['id']})")
```

### 获取 Agent

```python
import anthropic

client = anthropic.Anthropic()

agent = client.agents.retrieve(agent_id="{agent_id}")
print(f"Agent: {agent}")
```

### 更新 Agent

```python
import anthropic

client = anthropic.Anthropic()

updated_agent = client.agents.update(
    agent_id="{agent_id}",
    description="Updated description"
)
print(f"Updated agent: {updated_agent}")
```

### 删除 Agent

```python
import anthropic

client = anthropic.Anthropic()

client.agents.delete(agent_id="{agent_id}")
```

## 管理你的 Tools

Tools（工具）是 Agent 可以使用的函数。

### 创建 Tool

```python
import anthropic

client = anthropic.Anthropic()

tool = client.agents.tools.create(
    agent_id="{agent_id}",
    name="get_weather",
    description="Get the current weather for a location.",
    type="custom",
    custom={
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the current weather for a location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The location to get weather for"
                    }
                },
                "required": ["location"]
            }
        }
    }
)
```

### 列出 Tools

```python
import anthropic

client = anthropic.Anthropic()

tools = client.agents.tools.list(agent_id="{agent_id}")
for tool in tools:
    print(f"Tool: {tool['name']} ({tool['id']})")
```

### 获取 Tool

```python
import anthropic

client = anthropic.Anthropic()

tool = client.agents.tools.retrieve(
    agent_id="{agent_id}",
    tool_id="{tool_id}"
)
print(f"Tool: {tool}")
```

### 更新 Tool

```python
import anthropic

client = anthropic.Anthropic()

updated_tool = client.agents.tools.update(
    agent_id="{agent_id}",
    tool_id="{tool_id}",
    description="Updated description"
)
print(f"Updated tool: {updated_tool}")
```

### 删除 Tool

```python
import anthropic

client = anthropic.Anthropic()

client.agents.tools.delete(
    agent_id="{agent_id}",
    tool_id="{tool_id}"
)
```

## 管理你的 Skills

Skills（技能）是 Agent 可以使用的自定义指令。

### 创建 Skill

```python
import anthropic

client = anthropic.Anthropic()

skill = client.agents.skills.create(
    agent_id="{agent_id}",
    name="weather_skill",
    description="Skill for weather-related tasks",
    type="custom",
    instructions="You are a weather agent. Use the get_weather tool when a user asks about weather."
)
```

### 列出 Skills

```python
import anthropic

client = anthropic.Anthropic()

skills = client.agents.skills.list(agent_id="{agent_id}")
for skill in skills:
    print(f"Skill: {skill['name']} ({skill['id']})")
```

### 获取 Skill

```python
import anthropic

client = anthropic.Anthropic()

skill = client.agents.skills.retrieve(
    agent_id="{agent_id}",
    skill_id="{skill_id}"
)
print(f"Skill: {skill}")
```

### 更新 Skill

```python
import anthropic

client = anthropic.Anthropic()

updated_skill = client.agents.skills.update(
    agent_id="{agent_id}",
    skill_id="{skill_id}",
    description="Updated description"
)
print(f"Updated skill: {updated_skill}")
```

### 删除 Skill

```python
import anthropic

client = anthropic.Anthropic()

client.agents.skills.delete(
    agent_id="{agent_id}",
    skill_id="{skill_id}"
)
```
