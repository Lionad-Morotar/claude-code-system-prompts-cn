---
ccVersion: 2.1.105
---

# Data Managed Agents：Tools 和 Skills

在 Data Managed Agents 中，有 3 种核心资源类型：

| 资源      | 描述                             | 示例                                          |
| --------- | -------------------------------- | --------------------------------------------- |
| **Agent** | 可配置的 AI Agent 定义。         | 客户支持助手、天气机器人、代码审查者          |
| **Tool**  | Agent 可以调用的函数。           | `get_weather`、`search_database`、`send_email` |
| **Skill** | 包含自定义指令的提示词模板。     | "You are a weather agent..."                  |

此文档涵盖了 Tools 和 Skills。Agent 的 CRUD 操作请参考参考文件。

## Tools

Tools 是 Agent 可以调用的函数。它们允许 Agent 执行操作，如获取天气数据、搜索数据库或发送邮件。每个 Tool 定义包含一个名称、描述和实现 Agent 可以使用的函数。Claude 使用 [tool use](/docs/en/build-with-claude/tool-use) 来决定何时以及如何使用每个 Tool。

### 参数

**`name`**（必填，字符串）：
Tool 的名称。必须以小写字母开头，仅包含小写字母、数字和下划线。例如：`get_weather`、`search_database`、`send_email`。

**`description`**（可选，字符串）：
Tool 的可选描述。

**`type`**（必填，字符串）：
Tool 的类型。目前仅支持 `"custom"`。

**`custom`**（必填，对象）：
Tool 的自定义配置。包含函数定义。

**`custom.type`**（必填，字符串）：
自定义 Tool 的类型。目前仅支持 `"function"`。

**`custom.function`**（必填，对象）：
函数定义。

**`custom.function.name`**（必填，字符串）：
函数的名称。必须以小写字母开头，仅包含小写字母、数字和下划线。例如：`get_weather`、`search_database`。

**`custom.function.description`**（可选，字符串）：
函数的描述。帮助模型理解何时以及如何使用函数。

**`custom.function.parameters`**（可选，对象）：
函数的参数，以 JSON Schema 格式定义。描述函数期望接收的输入。

## Skills

Skills 是包含自定义指令的提示词模板。它们提供系统级指令，指导 Agent 的行为方式。

### 参数

**`name`**（必填，字符串）：
Skill 的名称。必须以小写字母开头，仅包含小写字母、数字和下划线。例如：`weather_skill`、`code_review_skill`。

**`description`**（可选，字符串）：
Skill 的可选描述。

**`type`**（必填，字符串）：
Skill 的类型。目前仅支持 `"custom"`。

**`instructions`**（必填，字符串）：
自定义 Skill 指令。定义 Agent 的行为、能力和约束。

## 会话创建

在创建会话以与你的 Agent 交互时，你可以引用关联的 Tools 和 Skills。

### 使用所有 Tools 和 Skills 创建会话

```bash
curl https://api.anthropic.com/v1/agents/{agent_id}/sessions \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26" \
  -H "content-type: application/json" \
  -d '{
    "agent_id": "{agent_id}",
    "agent_version_id": "{agent_version_id}",
    "include_all_tools": true,
    "include_all_skills": true
  }'
```

```python
import anthropic

client = anthropic.Anthropic()

session = client.agents.sessions.create(
    agent_id="{agent_id}",
    agent_version_id="{agent_version_id}",
    include_all_tools=True,
    include_all_skills=True
)
```

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const session = await client.agents.sessions.create({
  agent_id: '{agent_id}',
  agent_version_id: '{agent_version_id}',
  include_all_tools: true,
  include_all_skills: true,
});
```

### 使用特定 Tools 和 Skills 创建会话

```bash
curl https://api.anthropic.com/v1/agents/{agent_id}/sessions \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-05-26" \
  -H "content-type: application/json" \
  -d '{
    "agent_id": "{agent_id}",
    "agent_version_id": "{agent_version_id}",
    "tool_ids": ["tool_abc123", "tool_def456"],
    "skill_ids": ["skill_abc123", "skill_def456"]
  }'
```

```python
import anthropic

client = anthropic.Anthropic()

session = client.agents.sessions.create(
    agent_id="{agent_id}",
    agent_version_id="{agent_version_id}",
    tool_ids=["tool_abc123", "tool_def456"],
    skill_ids=["skill_abc123", "skill_def456"]
)
```

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const session = await client.agents.sessions.create({
  agent_id: '{agent_id}',
  agent_version_id: '{agent_version_id}',
  tool_ids: ['tool_abc123', 'tool_def456'],
  skill_ids: ['skill_abc123', 'skill_def456'],
});
```
