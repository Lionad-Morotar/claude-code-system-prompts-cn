<!--
name: 'Data: Cowork plugin component schemas'
description: Cowork 插件组件格式参考文档，涵盖技能、智能体、钩子、MCP 服务器、传统命令、CONNECTORS.md 和 README.md
ccVersion: 2.1.163
-->
# 组件模式

每种插件组件类型的详细格式规范。在阶段 4 实现组件时参考。

## 技能

**位置**：`skills/skill-name/SKILL.md`
**格式**：带 YAML frontmatter 的 Markdown

### Frontmatter 字段

| 字段            | 是否必需 | 类型   | 说明                                                   |
| --------------- | -------- | ------ | ------------------------------------------------------ |
| `name`          | 是       | 字符串 | 技能标识符（小写、连字符分隔；与目录名匹配）            |
| `description`   | 是       | 字符串 | 第三人称描述，包含触发短语                             |
| `metadata`      | 否       | 映射   | 任意键值对（例如 `version`、`author`）                 |

### 技能示例

```yaml
---
name: api-design
description: >
  当用户请求"设计 API"、"创建 API 端点"、"审查 API 结构"，
  或需要 REST API 最佳实践、端点命名、请求/响应设计方面的指导时，
  应使用此技能。
metadata:
  version: "0.1.0"
---
```

### 写作风格规则

- **Frontmatter description**：第三人称（"当……时应使用此技能"），用引号标注具体的触发短语。
- **正文**：祈使句/不定式形式（"解析配置文件"，而非"你应该解析配置文件"）。
- **长度**：保持 SKILL.md 正文在 3000 词以内（理想为 1500-2000 词）。将详细内容移至 `references/`。

### 技能目录结构

```
skill-name/
├── SKILL.md              # 核心知识（必需）
├── references/           # 按需加载的详细文档
│   ├── patterns.md
│   └── advanced.md
├── examples/             # 可运行的代码示例
│   └── sample-config.json
└── scripts/              # 工具脚本
    └── validate.sh
```

### 渐进式信息披露层级

1. **元数据**（始终在上下文中）：名称 + 描述（约 100 词）
2. **SKILL.md 正文**（技能触发时加载）：核心知识（<5k 词）
3. **捆绑资源**（按需加载）：参考资料、示例、脚本（无限制）

## 智能体

**位置**：`agents/agent-name.md`
**格式**：带 YAML frontmatter 的 Markdown

### Frontmatter 字段

| 字段            | 是否必需 | 类型   | 说明                                               |
| --------------- | -------- | ------ | -------------------------------------------------- |
| `name`          | 是       | 字符串 | 小写、连字符分隔、3-50 个字符                        |
| `description`   | 是       | 字符串 | 触发条件，使用 `<example>` 块                      |
| `model`         | 是       | 字符串 | `inherit`、`sonnet`、`opus` 或 `haiku`              |
| `color`         | 是       | 字符串 | `blue`、`cyan`、`green`、`yellow`、`magenta`、`red` |
| `tools`         | 否       | 数组   | 限制为特定工具                                     |

### 智能体示例

```markdown
---
name: code-reviewer
description: 当用户请求全面的代码审查或需要对代码质量、安全性和最佳实践进行详细分析时，使用此智能体。

<example>
Context: 用户刚写了一个新模块
user: "你能深度审查一下这段代码吗？"
assistant: "我将使用 code-reviewer 智能体来提供全面的分析。"
<commentary>
用户明确请求了详细审查，这与该智能体的专长相匹配。
</commentary>
</example>

<example>
Context: 用户即将合并一个 PR
user: "合并前审查一下这个"
assistant: "让我用 code-reviewer 智能体进行一次全面的审查。"
<commentary>
合并前的审查可以受益于该智能体的结构化分析流程。
</commentary>
</example>

model: inherit
color: blue
tools: ["Read", "Grep", "Glob"]
---

你是一名专注于在安全性、性能、可维护性和正确性方面发现问题的代码审查专家。

**你的核心职责：**

1. 分析代码结构和组织
2. 识别安全漏洞
3. 标记性能问题
4. 检查是否遵循最佳实践

**分析流程：**

1. 读取范围内所有文件
2. 识别模式和反模式
3. 按严重程度分类发现的问题
4. 提供具体的修复建议

**输出格式：**
按严重程度（严重、警告、信息）分组呈现发现的问题，包含：

- 文件路径和行号
- 问题描述
- 建议的修复方案
```

### 智能体命名规则

- 3-50 个字符
- 仅允许小写字母、数字和连字符
- 必须以字母数字开头和结尾
- 不允许下划线、空格或特殊字符

### 颜色指南

- 蓝色/青色：分析、审查
- 绿色：面向成功的任务
- 黄色：警告、验证
- 红色：严重、安全
- 品红色：创意、生成

## 钩子

**位置**：`hooks/hooks.json`
**格式**：JSON

### 可用事件

| 事件                | 触发时机                     |
| ------------------- | ---------------------------- |
| `PreToolUse`        | 工具调用执行前               |
| `PostToolUse`       | 工具调用完成后               |
| `Stop`              | Claude 完成响应时            |
| `SubagentStop`      | 子智能体完成时               |
| `SessionStart`      | 会话开始时                   |
| `SessionEnd`        | 会话结束时                   |
| `UserPromptSubmit`  | 用户发送消息时               |
| `PreCompact`        | 上下文压缩前                 |
| `Notification`      | 通知触发时                   |

### 钩子类型

**基于提示词**（推荐用于复杂逻辑）：

```json
{
  "type": "prompt",
  "prompt": "评估此次文件写入是否符合项目规范：$TOOL_INPUT",
  "timeout": 30
}
```

支持的事件：Stop、SubagentStop、UserPromptSubmit、PreToolUse。

**基于命令**（用于确定性检查）：

```json
{
  "type": "command",
  "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/validate.sh",
  "timeout": 60
}
```

### hooks.json 示例

```json
{
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "检查此次文件写入是否符合项目编码规范。如果违反规范，请说明原因并阻止。",
          "timeout": 30
        }
      ]
    }
  ],
  "SessionStart": [
    {
      "matcher": "",
      "hooks": [
        {
          "type": "command",
          "command": "cat ${CLAUDE_PLUGIN_ROOT}/context/project-context.md",
          "timeout": 10
        }
      ]
    }
  ]
}
```

### 钩子输出格式（命令钩子）

命令钩子将 JSON 输出到 stdout：

```json
{
  "decision": "block",
  "reason": "文件写入违反了命名规范"
}
```

决策类型：`approve`（批准）、`block`（阻止）、`ask_user`（请求用户确认）。

## MCP 服务器

**位置**：插件根目录下的 `.mcp.json`
**格式**：JSON

### 服务器类型

**stdio**（本地进程）：

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/server.js"],
      "env": {
        "API_KEY": "${API_KEY}"
      }
    }
  }
}
```

**SSE**（远程服务器，Server-Sent Events 传输）：

```json
{
  "mcpServers": {
    "asana": {
      "type": "sse",
      "url": "https://mcp.asana.com/sse"
    }
  }
}
```

**HTTP**（远程服务器，Streamable HTTP 传输）：

```json
{
  "mcpServers": {
    "api-service": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}"
      }
    }
  }
}
```

### 环境变量展开

所有 MCP 配置都支持 `${VAR_NAME}` 替换：

- `${CLAUDE_PLUGIN_ROOT}` — 插件目录（为保持可移植性，应始终使用）
- `${ANY_ENV_VAR}` — 用户环境变量

在插件 README 中记录所有必需的环境变量。

### 无 URL 的目录服务器

某些 MCP 目录条目没有 `url`，因为端点是动态的。插件可以通过**名称**引用这些服务器——如果插件 MCP 配置中的服务器名称与目录条目名称匹配，则视同 URL 匹配。

## 命令（传统）

> **新插件优先使用 `skills/*/SKILL.md`。** Cowork UI 现在将命令和技能统一为单一的"技能"概念。`commands/` 格式仍然可用，但仅在确实需要单文件格式配合 `$ARGUMENTS`/`$1` 替换和内联 bash 执行时才使用。

**位置**：`commands/command-name.md`
**格式**：Markdown，可选的 YAML frontmatter

### Frontmatter 字段

| 字段              | 是否必需 | 类型            | 说明                                       |
| ----------------- | -------- | --------------- | ------------------------------------------ |
| `description`     | 否       | 字符串          | 在 `/help` 中显示的简要描述（60 字符以内）   |
| `allowed-tools`   | 否       | 字符串或数组     | 命令可以使用的工具                          |
| `model`           | 否       | 字符串          | 模型覆盖：`sonnet`、`opus`、`haiku`         |
| `argument-hint`   | 否       | 字符串          | 为自动补全记录期望的参数                    |

### 命令示例

```markdown
---
description: 审查代码中的安全问题
allowed-tools: Read, Grep, Bash(git:*)
argument-hint: [file-path]
---

审查 @$1 中的安全漏洞，包括：

- SQL 注入
- XSS 攻击
- 认证绕过
- 不安全的数据处理

提供具体的行号、严重等级和修复建议。
```

### 关键规则

- 命令是给 Claude 的指令，而非给用户的消息。以指令的形式书写。
- `$ARGUMENTS` 将所有参数捕获为单个字符串；`$1`、`$2`、`$3` 捕获位置参数。
- `@path` 语法将文件内容包含在命令上下文中。
- `!` 反引号语法执行内联 bash 以获取动态上下文（例如 `` !`git diff --name-only` ``）。
- 使用 `${CLAUDE_PLUGIN_ROOT}` 以可移植的方式引用插件文件。

### allowed-tools 模式

```yaml
# 指定特定工具
allowed-tools: Read, Write, Edit, Bash(git:*)

# 仅允许特定 Bash 命令
allowed-tools: Bash(npm:*), Read

# MCP 工具（指定具体的工具）
allowed-tools: ["mcp__plugin_name_server__tool_name"]
```

## CONNECTORS.md

**位置**：插件根目录
**何时创建**：当插件通过类别而非具体产品引用外部工具时

### 格式

```markdown
# 连接器

## 工具引用的工作原理

插件文件使用 `~~category` 作为占位符，表示用户在该类别中连接的任何工具。
例如，`~~project tracker` 可能指 Asana、Linear、Jira 或任何其他具有 MCP 服务器的项目管理工具。

插件与工具无关——它们以类别而非具体产品的形式描述工作流。

## 此插件的连接器

| 类别          | 占位符              | 内置服务器 | 其他选项                  |
| ------------- | ------------------- | ---------- | ------------------------- |
| 聊天          | `~~chat`            | Slack      | Microsoft Teams、Discord   |
| 项目跟踪      | `~~project tracker` | Linear     | Asana、Jira、Monday        |
```

### 使用 ~~ 占位符

在插件文件（技能、智能体）中，以通用方式引用工具：

```markdown
检查 ~~project tracker 中分配给该用户的待处理工单。
将摘要发布到 ~~chat 中的团队频道。
```

在定制过程中（通过 cowork-plugin-customizer 技能），这些占位符会被替换为具体的工具名称。

## README.md

每个插件都应包含 README，其中包含：

1. **概述** — 插件的功能
2. **组件** — 技能、智能体、钩子、MCP 服务器的列表
3. **设置** — 任何必需的环境变量或配置
4. **用法** — 如何触发每个技能
5. **定制** — 如果存在 CONNECTORS.md，请提及它
