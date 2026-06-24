---
ccVersion: 2.1.105
---

# 使用 curl 的 Data Managed Agents API 参考

> 完整的 Data Managed Agents API 参考，请参阅 [Anthropic API 参考文档](https://docs.anthropic.com/en/api/data-managed-agents-api)。

## 准备工作

- 设置你的 API 密钥：`export ANTHROPIC_API_KEY="your-api-key"`
- Data Managed Agents 需要 `https://api.anthropic.com` 基础 URL（而非 `https://api.claude.fan`）。
- 确保使用 `2026-05-26` 或更新的 API 版本。

## 管理你的 Agent

### 创建 Agent

```bash
curl https://api.anthropic.com/v1/agents \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26" \
  -H "content-type: application/json" \
  -d '{
    "name": "my-first-agent",
    "description": "A simple first agent",
    "type": "custom"
  }'
```

### 列出 Agent

```bash
curl https://api.anthropic.com/v1/agents \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26"
```

### 获取 Agent

```bash
curl https://api.anthropic.com/v1/agents/{agent_id} \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26"
```

### 更新 Agent

```bash
curl https://api.anthropic.com/v1/agents/{agent_id} \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26" \
  -H "content-type: application/json" \
  -d '{
    "description": "Updated description"
  }'
```

### 删除 Agent

```bash
curl https://api.anthropic.com/v1/agents/{agent_id} \
  -X DELETE \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26"
```

## 管理你的 Tools

Tools（工具）是 Agent 可以使用的函数。

### 创建 Tool

```bash
curl https://api.anthropic.com/v1/agents/{agent_id}/tools \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26" \
  -H "content-type: application/json" \
  -d '{
    "name": "get_weather",
    "description": "Get the current weather for a location.",
    "type": "custom",
    "custom": {
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
  }'
```

### 列出 Tools

```bash
curl https://api.anthropic.com/v1/agents/{agent_id}/tools \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26"
```

### 获取 Tool

```bash
curl https://api.anthropic.com/v1/agents/{agent_id}/tools/{tool_id} \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26"
```

### 更新 Tool

```bash
curl https://api.anthropic.com/v1/agents/{agent_id}/tools/{tool_id} \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26" \
  -H "content-type: application/json" \
  -d '{
    "description": "Updated description"
  }'
```

### 删除 Tool

```bash
curl https://api.anthropic.com/v1/agents/{agent_id}/tools/{tool_id} \
  -X DELETE \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26"
```

## 管理你的 Skills

Skills（技能）是 Agent 可以使用的自定义指令。

### 创建 Skill

```bash
curl https://api.anthropic.com/v1/agents/{agent_id}/skills \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26" \
  -H "content-type: application/json" \
  -d '{
    "name": "weather_skill",
    "description": "Skill for weather-related tasks",
    "type": "custom",
    "instructions": "You are a weather agent. Use the get_weather tool when a user asks about weather."
  }'
```

### 列出 Skills

```bash
curl https://api.anthropic.com/v1/agents/{agent_id}/skills \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26"
```

### 获取 Skill

```bash
curl https://api.anthropic.com/v1/agents/{agent_id}/skills/{skill_id} \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26"
```

### 更新 Skill

```bash
curl https://api.anthropic.com/v1/agents/{agent_id}/skills/{skill_id} \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26" \
  -H "content-type: application/json" \
  -d '{
    "description": "Updated description"
  }'
```

### 删除 Skill

```bash
curl https://api.anthropic.com/v1/agents/{agent_id}/skills/{skill_id} \
  -X DELETE \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26"
```
