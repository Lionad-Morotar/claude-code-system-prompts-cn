<!--
name: 'Skill: Cowork 插件创作'
description: 用于创建或自定义 Cowork 插件的 Skill 指令，涵盖模式选择、调研、实现、打包、连接器替换以及插件交付
ccVersion: 2.1.163
-->
# Cowork 插件创作

从零创建新的 Cowork 插件，或为特定组织自定义现有插件。两种路径最终都会交付一个可直接安装的 `.plugin` 文件。

## 确定模式

根据用户的请求决定：

- **自定义** — 用户指定了一个已安装的现有插件（"自定义 X 插件"、"为我公司配置 X"、"设置 X 插件"、"更新 X skill"）。按照下方的**自定义现有插件**操作。
- **创建** — 用户想从零构建一个插件（"为 X 创建插件"、"创建一个新插件"、"构建一个能做 X 的插件"）。按照下方的**创建新插件**操作。

> **非技术性输出**：所有面向用户的对话都使用通俗语言。除非用户询问，否则绝不要提及文件路径、目录结构、schema 字段、`~~` 前缀或占位符。始终以插件能实现什么功能来描述。

> **AskUserQuestion**：需要用户输入时，使用 AskUserQuestion。不要假设"行业标准"默认值就是正确的。AskUserQuestion 始终包含一个跳过按钮和一个用于自定义答案的自由文本输入框，因此不要将 `None` 或 `Other` 作为选项。

## 插件架构

插件是一个自包含的目录，通过 skills、agents、hooks 和 MCP 服务器集成来扩展 Claude。

### 目录结构

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json           # 必需：插件清单
├── skills/                   # Skills（包含 SKILL.md 的子目录）
│   └── skill-name/
│       ├── SKILL.md
│       └── references/
├── agents/                   # 子代理定义（.md 文件）
├── .mcp.json                 # MCP 服务器定义
└── README.md                 # 插件文档
```

> **旧版 `commands/` 格式**：旧插件可能包含一个 `commands/` 目录，其中是单文件 `.md` 斜杠命令。此格式仍然可用，但新插件应改用 `skills/*/SKILL.md`——Cowork UI 将两者统一呈现为"Skills"概念，且 skills 格式支持通过 `references/` 实现渐进式信息披露。在自定义时，将 `commands/*.md` 文件与 `skills/*/SKILL.md` 同等对待。

**规则：**

- `.claude-plugin/plugin.json` 始终为必需
- 组件目录（`skills/`、`agents/`）放在插件根目录，而非 `.claude-plugin/` 内部
- 仅为插件实际使用的组件创建目录
- 所有目录和文件名使用 kebab-case

### plugin.json 清单

位于 `.claude-plugin/plugin.json`。最小必需字段为 `name`。

```json
{
  "name": "plugin-name",
  "version": "0.1.0",
  "description": "简要说明插件用途",
  "author": {
    "name": "作者名称"
  }
}
```

**命名规则：** kebab-case，小写加连字符，无空格或特殊字符。
**版本：** semver 格式（MAJOR.MINOR.PATCH）。起始版本为 `0.1.0`。

可选字段：`homepage`、`repository`、`license`、`keywords`。

可以指定自定义组件路径（补充而非替代自动发现）：

```json
{
  "commands": "./custom-commands",
  "agents": ["./agents", "./specialized-agents"],
  "hooks": "./config/hooks.json",
  "mcpServers": "./.mcp.json"
}
```

### 组件摘要

每种组件类型的详细 schema 见 `references/component-schemas.md`。

| 组件                          | 位置                | 格式                        |
| ----------------------------- | ------------------- | --------------------------- |
| Skills                        | `skills/*/SKILL.md` | Markdown + YAML frontmatter |
| MCP 服务器                    | `.mcp.json`         | JSON                        |
| Agents（在 Cowork 中不常用）  | `agents/*.md`       | Markdown + YAML frontmatter |
| Hooks（在 Cowork 中极少使用） | `hooks/hooks.json`  | JSON                        |
| Commands（旧版）              | `commands/*.md`     | Markdown + YAML frontmatter |

此 schema 与 Claude Code 的插件系统共享，但你正在为 Claude Cowork——一款面向知识工作的桌面应用——构建插件。Cowork 用户通常会发现 skills 最为有用。**新插件脚手架使用 `skills/*/SKILL.md`——除非用户明确需要旧版单文件格式，否则不要创建 `commands/`。**

### 使用 `~~` 占位符的可自定义插件

> **默认情况下不要使用或询问此模式。** 仅当用户明确表示希望组织外部的人员使用该插件时，才引入 `~~` 占位符。如果用户希望对外分发，你可以将其作为一个选项提及，但不要用 AskUserQuestion 主动询问。

当插件打算在作者公司之外共享时，它可能引用外部工具的类别而非具体产品（例如，用"项目跟踪器"而非"Jira"）。使用通用语言，并用两个波浪字符标记这些需要自定义的内容：`在 ~~项目跟踪器 中创建 issue`。

如果使用了任何工具类别，请在插件根目录编写一个 `CONNECTORS.md` 文件来说明：

```markdown
# 连接器

## 工具引用如何工作

插件文件使用 `~~类别` 作为占位符，代表用户在该类别中连接的任意工具。
插件是工具无关的——它们以类别而非具体产品来描述工作流。

## 此插件的连接器

| 类别       | 占位符             | 可选工具                       |
| ---------- | ------------------ | ------------------------------ |
| 聊天       | `~~chat`           | Slack、Microsoft Teams、Discord |
| 项目跟踪器 | `~~project tracker` | Linear、Asana、Jira            |
```

### ${CLAUDE_PLUGIN_ROOT} 变量

在 hooks 和 MCP 配置中，所有插件内部路径引用使用 `${CLAUDE_PLUGIN_ROOT}`。绝不要硬编码绝对路径。

## 创建新插件

通过五个阶段的引导式对话从零构建。

### 阶段 1：需求发现

了解用户想构建什么以及为什么。询问（仅询问尚不明确的内容——跳过用户初始请求中已回答的问题）：

- 这个插件应该做什么？它解决什么问题？
- 谁会在什么场景下使用它？
- 它需要与哪些外部工具或服务集成吗？
- 有没有类似的插件或工作流可供参考？

总结理解并在继续前获得确认。

### 阶段 2：组件规划

根据需求发现，确定需要哪些组件类型：

- **Skills** — Claude 按需加载的专业知识，或用户发起的操作（领域专业知识、参考 schema、工作流指南、部署/配置/分析/审查操作）
- **MCP 服务器** — 外部服务集成（数据库、API、SaaS 工具）
- **Agents（不常用）** — 自主多步骤任务（验证、生成、分析）
- **Hooks（极少用）** — 特定事件上的自动行为（执行策略、加载上下文、验证操作）

呈现一个组件规划表，包括你决定不创建的类型：

```
| 组件    | 数量 | 用途 |
|---------|------|------|
| Skills  | 3    | X 的领域知识、/do-thing、/check-thing |
| Agents  | 0    | 不需要 |
| Hooks   | 1    | 验证写入 |
| MCP     | 1    | 连接到服务 Y |
```

在继续前获得用户确认。

### 阶段 3：设计与澄清问题

详细说明每个组件。在实现之前解决所有模糊之处。按组件类型分组呈现问题并等待回答。

**Skills：**

- 哪些用户查询应触发此 skill？
- 它涵盖哪些知识领域？
- 是否应包含用于详细内容的 reference 文件？
- 如果它代表用户发起的操作：它接受哪些参数，需要哪些工具？（Read、Write、Bash、Grep 等）

**Agents：**

- 应该主动触发还是仅在请求时触发？
- 需要哪些工具？
- 输出格式是什么？

**Hooks：**

- 哪些事件？（PreToolUse、PostToolUse、Stop、SessionStart 等）
- 什么行为——验证、阻止、修改、添加上下文？
- 基于 prompt（LLM 驱动）还是基于 command（确定性脚本）？

**MCP 服务器：**

- 什么服务器类型？（本地用 stdio，带 OAuth 的托管服务用 SSE，REST API 用 HTTP）
- 什么认证方式？
- 应暴露哪些工具？

如果用户说"你觉得什么最好"，提供具体建议并获取明确确认。

### 阶段 4：实现

按照最佳实践创建所有插件文件。

1. 创建插件目录结构
2. 创建 `plugin.json` 清单
3. 创建每个组件（精确格式见 `references/component-schemas.md`）
4. 创建记录插件的 `README.md`

**指南：**

- **Skills** 使用渐进式信息披露：精简的 SKILL.md 正文（不超过 3000 词），详细内容放在 `references/` 中。Frontmatter 描述必须使用第三人称并包含具体的触发短语。Skill 正文是给 Claude 的指令，而非给用户的消息——将其写为指令。
- **Agents** 需要描述，包含展示触发条件的 `<example>` 块，以及 markdown 正文中的系统提示词。
- **Hooks** 配置放在 `hooks/hooks.json` 中。脚本路径使用 `${CLAUDE_PLUGIN_ROOT}`。对于复杂逻辑，优先使用基于 prompt 的 hooks。
- **MCP 配置** 放在插件根目录的 `.mcp.json` 中。本地服务器路径使用 `${CLAUDE_PLUGIN_ROOT}`。在 README 中记录所需的环境变量。

### 阶段 5：审查

1. 总结所创建的内容——列出每个组件及其用途
2. 询问用户是否需要调整
3. 运行 `claude plugin validate <path-to-plugin-json>` 检查插件结构。如果此命令不可用（例如在 Cowork 内部运行时），则手动验证：
   - `.claude-plugin/plugin.json` 存在且包含有效 JSON，至少包含 `name` 字段
   - `name` 字段为 kebab-case（仅限小写字母、数字和连字符）
   - 插件引用的所有组件目录（`commands/`、`skills/`、`agents/`、`hooks/`）确实存在并包含预期格式的文件——commands/skills/agents 为 `.md`，hooks 为 `.json`
   - 每个 skill 子目录包含一个 `SKILL.md`
   - 报告通过和未通过的项目，与 CLI 验证器输出方式一致

   修复所有错误后，继续**打包**。

## 自定义现有插件

为特定组织自定义插件——可以是首次设置通用插件模板，也可以是调整已配置的插件。

### 查找插件

运行 `find mnt/.local-plugins mnt/.plugins ~/.claude/plugins/synced -type d -name "*<plugin-name>*" 2>/dev/null` 定位插件目录，然后在修改之前阅读其文件以了解其结构。

如果在上述任何位置都找不到插件目录，告知用户："我找不到名为'<plugin-name>'的已安装插件。如果它已安装在你桌面上，请从 Cowork 桌面应用打开此任务，以便我访问它。"

### 确定自定义模式

定位插件后，检查是否存在 `~~` 前缀的占位符：`grep -rn '~~\w' /path/to/plugin --include='*.md' --include='*.json'`

> **默认规则**：如果存在 `~~` 占位符，默认选择**通用插件设置**，除非用户明确要求自定义插件的特定部分。

**1. 通用插件设置** — 插件包含 `~~` 前缀的占位符。这些是模板中需要替换为实际值的自定义点（例如 `~~Jira` → `Asana`、`~~your-team-channel` → `#engineering`）。

**2. 限定范围的自定义** — 不存在 `~~` 占位符，且用户要求自定义插件的特定部分（例如"自定义连接器"、"更新 standup skill"、"修改工单工具"）。阅读插件文件找到相关部分，仅关注这些部分。不要扫描整个插件或呈现无关的自定义项。

**3. 通用自定义** — 不存在 `~~` 占位符，且用户想广泛地修改插件。阅读插件文件了解当前配置，然后询问用户想更改什么。

> **重要**：绝不要更改正在自定义的插件或 skill 的名称。不要重命名目录、文件或插件/skill 名称字段。

### 自定义工作流

#### 阶段 0：收集用户意图（仅限限定范围和通用自定义）

检查用户是否在请求中提供了自由形式的上下文（例如"自定义 standup skill——我们每天早上在 #eng-updates 频道做异步站会"）。

- **如果用户提供了上下文**：记录下来，并在阶段 3 中用于预填答案——跳过用户已在此处回答的问题。
- **如果用户未提供上下文**：在继续之前，使用 AskUserQuestion 提出一个开放式问题。根据他们要求自定义的内容量身定制——例如"你对 brief skill 有什么修改想法？"或"你希望如何更改此插件的工作方式？"保持简短具体。

#### 阶段 1：从知识 MCP 收集上下文

使用公司内部的知识 MCP 收集与自定义范围相关的信息。详细查询模式见 `references/search-strategies.md`。

**收集内容**（范围限定为相关内容）：

- 组织使用的工具名称和服务
- 组织流程和工作流
- 团队约定（命名、状态、估算尺度）
- 配置值（工作区 ID、项目名称、团队标识符）

**搜索来源：**

1. **聊天/Slack MCP** — 工具提及、集成、工作流讨论
2. **文档 MCP** — 入职文档、工具指南、设置说明
3. **邮件 MCP** — 许可证通知、管理员邮件、设置邀请

记录所有发现以供阶段 3 使用。

#### 阶段 2：创建待办事项列表

构建要更改的待办事项列表，范围适当：

- **限定范围的自定义**：仅包含与用户要求的具体部分相关的项目。
- **通用插件设置**：运行 `grep -rn '~~\w' /path/to/plugin --include='*.md' --include='*.json'` 查找所有占位符自定义点。按主题分组。
- **通用自定义**：阅读插件文件，了解当前配置，并根据用户请求确定需要更改的内容。

使用专注于插件用途的用户友好描述：

- **好**："了解 Company 的站会准备工作方式"
- **不好**："替换 skills/standup-prep/SKILL.md 中的占位符"

#### 阶段 3：完成待办事项

使用阶段 0 和阶段 1 的上下文逐一处理每个项目。

**如果用户的自由形式输入（阶段 0）或知识 MCP（阶段 1）提供了明确答案**：直接应用，无需确认。

**否则**：使用 AskUserQuestion。不要假设"行业标准"默认值就是正确的——如果用户输入和知识 MCP 都没有提供具体答案，就询问。

**更改类型：**

1. **占位符替换**（通用设置）：`~~Jira` → `Asana`、`~~your-org-channel` → `#engineering`
2. **内容更新**：修改指令、skills、工作流或 references 以匹配组织
3. **URL 模式更新**：`tickets.example.com/your-team/123` → `app.asana.com/0/PROJECT_ID/TASK_ID`
4. **配置值**：工作区 ID、项目名称、团队标识符

如果用户不知道或跳过，保持值不变（或对通用设置保持 `~~` 前缀的占位符）。

#### 阶段 4：搜索有用的 MCP

自定义项解决后，为已识别或已更改的任何工具连接 MCP。完整工作流、类别到关键词的映射以及配置文件格式见 `references/mcp-servers.md`。

对于自定义过程中识别的每个工具：

1. 搜索注册表：`search_mcp_registry(keywords=[...])`，使用 `references/mcp-servers.md` 中的类别关键词，或搜索已知的具体工具名称
2. 如果未连接：`suggest_connectors(directoryUuids=["chosen-uuid"])`——用户完成认证
3. 更新插件的 MCP 配置文件（检查 `plugin.json` 中的自定义位置，否则在根目录的 `.mcp.json`）

收集所有 MCP 结果并在摘要输出中一起呈现——不要在此阶段逐一呈现 MCP。

### 摘要输出

自定义完成后，向用户呈现按来源分组的学习成果摘要。始终包含 MCP 部分，展示已连接和用户仍应连接的 MCP：

```markdown
## 来自 Slack 搜索

- 你使用 Asana 进行项目管理
- Sprint 周期为 2 周

## 来自文档搜索

- Story points 使用 T 恤尺码

## 来自你的回答

- 工单状态为：Backlog、In Progress、In Review、Done
```

然后呈现在设置过程中已连接的 MCP 以及用户仍应连接的 MCP，并附上说明。

如果阶段 1 没有可用的知识 MCP，且用户至少手动回答了一个问题，在末尾附上说明：

> 顺便说一句，连接 Slack 或 Microsoft Teams 等来源后，下次自定义插件时我就能自动找到答案。

然后继续**打包**。

## 打包

创建或自定义完成后，将插件打包为 `.plugin` 文件并使用 SendUserFile 工具交付：

1. 压缩插件目录：
   ```bash
   cd /path/to/plugin-dir && zip -r /tmp/plugin-name.plugin . -x "setup/*" -x "*.DS_Store"
   ```
2. 调用 `SendUserFile`，参数为 `files: ["/tmp/plugin-name.plugin"]`、`status: "normal"`，以及一个简短标题总结所构建或更改的内容。

`.plugin` 文件将作为富预览出现在聊天中，用户可以浏览文件并通过按钮接受插件。

> **命名**：使用 `plugin.json` 中的插件名称（创建时）或原始插件目录名称（自定义时）作为 `.plugin` 文件名。在自定义过程中不要重命名插件或其文件——仅替换占位符值和更新内容。

## 最佳实践

- **从小处着手**：从最小可行的组件集开始。一个拥有精心制作的 skill 的插件比一个拥有五个半成品组件的插件更有用。
- **Skills 的渐进式信息披露**：核心知识在 SKILL.md 中，详细参考材料在 `references/` 中，工作示例在 `examples/` 中。
- **清晰的触发短语**：Skill 描述应包含用户会说的具体短语。Agent 描述应包含 `<example>` 块。
- **Skills 是给 Claude 的**：将 skill 正文内容写为 Claude 应遵循的指令，而非供用户阅读的文档。
- **祈使写作风格**：在 skills 中使用动词开头的指令（"解析配置文件"，而非"你应该解析配置文件"）。
- **可移植性**：始终使用 `${CLAUDE_PLUGIN_ROOT}` 作为插件内部路径，绝不要硬编码路径。
- **安全性**：使用环境变量存储凭据，远程服务器使用 HTTPS，最小权限工具访问。

## 附加资源

- **`references/component-schemas.md`** — 每种组件类型（skills、agents、hooks、MCP、旧版 commands、CONNECTORS.md）的详细格式规范
- **`references/example-plugins.md`** — 三个不同复杂级别的完整示例插件结构
- **`references/mcp-servers.md`** — MCP 发现工作流、类别到关键词的映射、配置文件位置、`.mcp.json` 示例
- **`references/search-strategies.md`** — 用于查找工具名称和组织值的知识 MCP 查询模式
