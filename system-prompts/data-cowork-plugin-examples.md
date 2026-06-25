<!--
name: 'Data: Cowork plugin examples'
description: 最简、中等和复杂 Cowork 插件结构的参考示例，包含插件元数据、技能、智能体、钩子、MCP 配置、README 和连接器
ccVersion: 2.1.163
-->
# 插件示例

三种不同复杂度级别的完整插件结构。在阶段 4 实现时用作模板。

## 最简插件：单个技能

一个简单的插件，包含一个技能，无其他组件。

### 结构

```
meeting-notes/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── meeting-notes/
│       └── SKILL.md
└── README.md
```

### plugin.json

```json
{
  "name": "meeting-notes",
  "version": "0.1.0",
  "description": "从会议记录生成结构化的会议笔记",
  "author": {
    "name": "User"
  }
}
```

### skills/meeting-notes/SKILL.md

```markdown
---
name: meeting-notes
description: >
  从会议记录生成结构化的会议笔记。当用户请求
  "总结此次会议"、"创建会议笔记"、"从此会议记录中提取行动事项"，
  或提供了会议记录文件时使用。
---

读取用户提供的会议记录文件，生成结构化的会议笔记。

包含以下章节：

1. **参会人员** — 列出所有被提及的参会者
2. **摘要** — 2-3 句话概括会议内容
3. **关键决策** — 已做出决策的编号列表
4. **行动事项** — 表格，包含：负责人、任务、截止日期
5. **待解决问题** — 所有未解决的事项

将笔记写入一个新文件，文件名在原始会议记录文件名后追加 `-notes`。
```

---

## 标准插件：技能 + MCP

结合领域知识、用户主动操作和外部服务集成的插件。

### 结构

```
code-quality/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── coding-standards/
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── style-rules.md
│   ├── review-changes/
│   │   └── SKILL.md
│   └── fix-lint/
│       └── SKILL.md
├── .mcp.json
└── README.md
```

### plugin.json

```json
{
  "name": "code-quality",
  "version": "0.1.0",
  "description": "通过审查、Lint 和风格指导来强制执行编码规范",
  "author": {
    "name": "User"
  }
}
```

### skills/review-changes/SKILL.md

```markdown
---
name: review-changes
description: >
  审查代码变更中的风格和质量问题。当用户请求
  "审查我的更改"、"检查此 diff"、"审查风格违规"，
  或希望对未提交的工作进行代码质量检查时使用。
---

运行 `git diff --name-only` 获取已更改文件的列表。

对每个已更改的文件：

1. 读取文件
2. 根据 coding-standards 技能检查风格违规
3. 识别潜在的 bug 或反模式
4. 标记任何安全问题

呈现总结，包含：

- 文件路径
- 问题严重程度（错误、警告、信息）
- 描述和建议的修复方案
```

### skills/fix-lint/SKILL.md

```markdown
---
name: fix-lint
description: >
  自动修复已更改文件中的 Lint 问题。当用户请求
  "修复 lint 错误"、"清理 lint 问题"或"自动修复我的 lint 问题"时使用。
---

运行 linter：`npm run lint -- --format json 2>&1`

解析 linter 输出并修复每个问题：

- 对于可自动修复的问题，直接应用修复
- 对于需要手动修复的问题，按项目约定进行修正
- 跳过需要架构变更的问题

所有修复完成后，再次运行 linter 以确认输出干净。
```

### skills/coding-standards/SKILL.md

```yaml
---
name: coding-standards
description: >
  当用户询问"编码规范"、"风格指南"、"命名约定"、
  "代码格式化规则"，或需要项目特定代码质量期望的指导时，
  应使用此技能。
metadata:
  version: "0.1.0"
---
```

```markdown
# 编码规范

项目编码规范和约定，确保代码一致且高质量。

## 核心规则

- 变量和函数使用 camelCase
- 类和类型使用 PascalCase
- 优先使用 const 而非 let；避免使用 var
- 最大行长度：100 字符
- 所有导出函数需显式指定返回类型

## 导入顺序

1. 外部包
2. 内部包（使用 @/ 别名）
3. 相对导入
4. 仅类型导入放在最后

## 补充资源

- **`references/style-rules.md`** — 按语言划分的完整风格规则
```

### .mcp.json

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    }
  }
}
```

---

## 全功能插件：所有组件类型

使用技能、智能体、钩子和 MCP 集成并配合工具无关连接器的插件。

### 结构

```
engineering-workflow/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── team-processes/
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── workflow-guide.md
│   ├── standup-prep/
│   │   └── SKILL.md
│   └── create-ticket/
│       └── SKILL.md
├── agents/
│   └── ticket-analyzer.md
├── hooks/
│   └── hooks.json
├── .mcp.json
├── CONNECTORS.md
└── README.md
```

### plugin.json

```json
{
  "name": "engineering-workflow",
  "version": "0.1.0",
  "description": "简化工程工作流：站会准备、工单管理和代码质量",
  "author": {
    "name": "User"
  },
  "keywords": ["engineering", "workflow", "tickets", "standup"]
}
```

### agents/ticket-analyzer.md

```markdown
---
name: ticket-analyzer
description: 当用户需要分析工单、分类传入的问题或对积压工作排定优先级时，使用此智能体。

<example>
Context: 用户正在准备 Sprint 规划
user: "帮我对这些新工单进行分类"
assistant: "我将使用 ticket-analyzer 智能体来审查和分类工单。"
<commentary>
工单分类需要在多个维度上进行系统性分析，适合使用智能体。
</commentary>
</example>

<example>
Context: 用户有大量积压工作
user: "为下一个 Sprint 排定积压工作的优先级"
assistant: "让我使用 ticket-analyzer 智能体分析积压工作，推荐优先级排序。"
<commentary>
积压工作优先级排序是一项多步骤的自主任务，非常适合智能体。
</commentary>
</example>

model: inherit
color: cyan
tools: ["Read", "Grep"]
---

你是一名工单分析专家。分析工单的优先级、工作量和依赖关系。

**你的核心职责：**

1. 按类型分类工单（缺陷、功能、技术债务、改进）
2. 估算相对工作量（S、M、L、XL）
3. 识别工单之间的依赖关系
4. 推荐优先级排序

**分析流程：**

1. 阅读所有工单描述
2. 按类型对每个工单进行分类
3. 根据范围估算工作量
4. 映射依赖关系
5. 按影响-工作量比率排序

**输出格式：**
| 工单 | 类型 | 工作量 | 依赖 | 优先级 |
|------|------|--------|------|--------|
| ... | ... | ... | ... | ... |

随后附上对前 5 个优先级的简要理由说明。
```

### hooks/hooks.json

```json
{
  "SessionStart": [
    {
      "matcher": "",
      "hooks": [
        {
          "type": "command",
          "command": "echo '## 团队上下文\n\nSprint 周期：2 周。每日站会：上午 9:30。使用 ~~project tracker 进行工单管理。'",
          "timeout": 5
        }
      ]
    }
  ]
}
```

### CONNECTORS.md

```markdown
# 连接器

## 工具引用的工作原理

插件文件使用 `~~category` 作为占位符，表示用户在该类别中连接的任何工具。
插件与工具无关。

## 此插件的连接器

| 类别          | 占位符              | 内置服务器 | 其他选项          |
| ------------- | ------------------- | ---------- | ----------------- |
| 项目跟踪      | `~~project tracker` | Linear     | Asana、Jira、Monday |
| 聊天          | `~~chat`            | Slack      | Microsoft Teams    |
| 源代码管理    | `~~source control`  | GitHub     | GitLab、Bitbucket  |
```

### .mcp.json

```json
{
  "mcpServers": {
    "linear": {
      "type": "sse",
      "url": "https://mcp.linear.app/sse"
    },
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "slack": {
      "type": "http",
      "url": "https://slack.mcp.claude.com/mcp"
    }
  }
}
```
