<!--
name: 'Skill: /init CLAUDE.md and skill setup (new version)'
description: 为当前仓库设置 CLAUDE.md 及相关 skill/hook 的全面引导流程，包括代码库探索、用户访谈和迭代式提案优化。
ccVersion: 2.1.77
-->
为此仓库设置最小化的 CLAUDE.md（以及可选的 skill 和 hook）。CLAUDE.md 会在每个 Claude Code 会话中加载，因此必须简洁——只包含没有它 Claude 就会出错的内容。

## 第一阶段：询问需要设置什么

使用 AskUserQuestion 了解用户想要什么：

- "/init 应该设置哪些 CLAUDE.md 文件？"
  选项："项目 CLAUDE.md" | "个人 CLAUDE.local.md" | "项目 + 个人两者"
  项目描述："团队共享的指令，已纳入源代码控制——架构、编码标准、常用工作流。"
  个人描述："您在此项目中的私人偏好（gitignored，不共享）——您的角色、沙盒 URL、首选测试数据、工作流习惯。"

- "还要设置 skill 和 hook 吗？"
  选项："Skill + hook" | "仅 skill" | "仅 hook" | "都不需要，只要 CLAUDE.md"
  Skill 描述："按需调用的能力，您或 Claude 通过 \`/skill-name\` 调用——适用于可重复的工作流和参考知识。"
  Hook 描述："在工具事件上运行的确定性 shell 命令（例如每次编辑后格式化）。Claude 无法跳过它们。"

## 第二阶段：探索代码库

使用 Explore 子智能体来调查代码库，并要求它读取关键文件以了解项目：清单文件（package.json、Cargo.toml、pyproject.toml、go.mod、pom.xml 等）、README、Makefile/构建配置、CI 配置、现有的 CLAUDE.md、.claude/rules/、AGENTS.md、.cursor/rules 或 .cursorrules、.github/copilot-instructions.md、.windsurfrules、.clinerules、.mcp.json。

检测：
- 构建、测试和 lint 命令（尤其是非标准命令）
- 语言、框架和包管理器
- 项目结构（带有工作区的 monorepo、多模块或单项目）
- 与语言默认值不同的代码风格规则
- 不明显的陷阱、必需的环境变量或工作流怪癖
- 现有的 .claude/skills/ 和 .claude/rules/ 目录
- 格式化器配置（prettier、biome、ruff、black、gofmt、rustfmt，或统一的格式化脚本如 \`npm run format\` / \`make fmt\`）
- Git worktree 使用情况：运行 \`git worktree list\` 检查此仓库是否有多个工作树（仅在用户想要个人 CLAUDE.local.md 时相关）

记录无法仅从代码中弄清楚的内容——这些将成为访谈问题。

## 第三阶段：填补空白

使用 AskUserQuestion 收集编写好的 CLAUDE.md 文件和 skill 仍然需要的信息。只询问代码无法回答的内容。

如果用户选择了项目 CLAUDE.md 或两者：询问代码库实践——不明显的命令、陷阱、分支/PR 约定、必需的环境设置、测试怪癖。跳过 README 中已有的或清单文件中显而易见的内容。不要将任何选项标记为"推荐"——这是关于他们团队如何工作，而不是最佳实践。

如果用户选择了个人 CLAUDE.local.md 或两者：询问关于他们本人的信息，而不是代码库。不要将任何选项标记为"推荐"——这是关于他们的个人偏好，而不是最佳实践。问题示例：
  - 他们在团队中担任什么角色？（例如，"后端工程师"、"数据科学家"、"新员工入职"）
  - 他们对这个代码库及其语言/框架的熟悉程度如何？（以便 Claude 可以调整解释深度）
  - 他们是否有 Claude 应该知道的个人沙盒 URL、测试账户、API 密钥路径或本地设置详细信息？
  - 仅在第二阶段发现多个 git worktree 时：询问他们的 worktree 是嵌套在主仓库内部（例如，\`.claude/worktrees/<name>/\`）还是同级/外部（例如，\`../myrepo-feature/\`）。如果是嵌套的，向上文件遍历会自动找到主仓库的 CLAUDE.local.md——不需要特殊处理。如果是同级/外部的，个人内容应放在主目录文件中（例如，\`~/.claude/<project-name>-instructions.md\`），每个 worktree 获得一个单行 CLAUDE.local.md 存根来导入它：\`@~/.claude/<project-name>-instructions.md\`。永远不要将此导入放在项目 CLAUDE.md 中——那会将个人引用纳入团队共享的文件。
  - 任何沟通偏好？（例如，"简洁"、"始终解释权衡"、"不要在最后总结"）

**从第二阶段发现中综合提案**——例如，如果存在格式化器则使用编辑时格式化，如果存在测试则使用 \`/verify\` skill，对于填补空白答案中属于指南而非工作流的任何内容使用 CLAUDE.md 注释。为每个选择适合的产物类型，**受第一阶段 skill+hook 选择的约束**：

  - **Hook**（更严格）——工具事件上的确定性 shell 命令；Claude 无法跳过。适合机械的、快速的、每次编辑的步骤：格式化、lint、在更改的文件上运行快速测试。
  - **Skill**（按需）——您或 Claude 在需要时调用 \`/skill-name\`。适合不属于每次编辑的工作流：深度验证、会话报告、部署。
  - **CLAUDE.md 注释**（更宽松）——影响 Claude 的行为但不强制执行。适合沟通/思考偏好："编码前规划"、"简洁"、"解释权衡"。

  **将第一阶段的 skill+hook 选择作为硬性过滤器**：如果用户选择"仅 skill"，将您建议的任何 hook 降级为 skill 或 CLAUDE.md 注释。如果"仅 hook"，将 skill 降级为 hook（在机械可行的情况下）或注释。如果"都不"，所有内容都变为 CLAUDE.md 注释。永远不要提议用户未选择加入的产物类型。

**通过 AskUserQuestion 的 \`preview\` 字段显示提案，而不是作为单独的文本消息**——对话框会覆盖您的输出，因此前面的文本被隐藏。\`preview\` 字段在侧面板中渲染 markdown（类似计划模式）；\`question\` 字段是纯文本。结构如下：

  - \`question\`：简短明了，例如"这个提案看起来对吗？"
  - 每个选项都有一个 \`preview\`，其中包含完整的 markdown 提案。"看起来不错——继续"选项的预览显示所有内容；每项删除选项的预览显示删除后剩余的内容。
  - **保持预览紧凑——预览框会截断且没有滚动。**每项一行，项目之间没有空行，没有标题。示例预览内容：

    • **编辑时格式化 hook**（自动）——通过 PostToolUse 执行 \`ruff format <file>\`
    • **/verify skill**（按需）——\`make lint && make typecheck && make test\`
    • **CLAUDE.md 注释**（指南）——"在标记完成前运行 lint/typecheck/test"

  - 选项标签保持简短（"看起来不错"、"删除 hook"、"删除 skill"）——工具会自动添加"其他"自由文本选项，所以不要添加自己的万能选项。

**从接受的提案构建偏好队列**。每个条目：{type: hook|skill|note, description, target file, 任何第二阶段来源的详细信息，如实际的测试/格式化命令}。第四至第七阶段消耗此队列。

## 第四阶段：编写 CLAUDE.md（如果用户选择项目或两者）

在项目根目录编写最小化的 CLAUDE.md。每一行都必须通过这个测试："删除这行会导致 Claude 出错吗？"如果不会，就删掉。

**消耗第三阶段偏好队列中目标为 CLAUDE.md 的 \`note\` 条目**（团队级注释）——将每条作为最相关部分中的简洁一行添加。这些是用户希望 Claude 遵循但不需要保证的行为（例如，"实施前提出规划"、"重构时解释权衡"）。将针对个人的注释留给第五阶段。

包含：
- Claude 无法猜测的构建/测试/lint 命令（非标准脚本、标志或序列）
- 与语言默认值不同的代码风格规则（例如，"优先使用 type 而非 interface"）
- 测试说明和怪癖（例如，"使用以下命令运行单个测试：pytest -k 'test_name'"）
- 仓库礼仪（分支命名、PR 约定、提交风格）
- 必需的环境变量或设置步骤
- 不明显的陷阱或架构决策
- 现有 AI 编码工具配置中的重要部分（如果存在）（AGENTS.md、.cursor/rules、.cursorrules、.github/copilot-instructions.md、.windsurfrules、.clinerules）

排除：
- 逐文件结构或组件列表（Claude 可以通过读取代码库发现这些）
- Claude 已经知道的标准语言约定
- 通用建议（"编写干净的代码"、"处理错误"）
- 详细的 API 文档或长引用——改为使用 \`@path/to/import\` 语法（例如，\`@docs/api-reference.md\`）按需内联内容，而不使 CLAUDE.md 膨胀
- 经常变化的信息——使用 \`@path/to/import\` 引用源文件，以便 Claude 始终读取当前版本
- 长教程或演练（移到单独的文件并使用 \`@path/to/import\` 引用，或放在 skill 中）
- 清单文件中显而易见的命令（例如，标准的"npm test"、"cargo test"、"pytest"）

具体明确："在 TypeScript 中使用 2 空格缩进"比"正确格式化代码"更好。

不要重复自己，也不要编造像"常见开发任务"或"开发技巧"这样的部分——只包含您明确从读取的文件中找到的信息。

在文件前添加：

\`\`\`
# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在此仓库中处理代码时提供指导。
\`\`\`

如果 CLAUDE.md 已存在：读取它，以 diff 形式提出具体更改，并解释每项更改如何改进它。不要静默覆盖。

对于具有多个关注点的项目，建议将指令组织到 \`.claude/rules/\` 中作为单独的聚焦文件（例如，\`code-style.md\`、\`testing.md\`、\`security.md\`）。这些文件会自动与 CLAUDE.md 一起加载，并可以使用 \`paths\` 前置元数据限定到特定文件路径。

对于具有不同子目录的项目（monorepo、多模块项目等）：提及可以添加子目录 CLAUDE.md 文件以获取模块特定指令（当 Claude 在这些目录中工作时它们会自动加载）。如果用户需要，主动提出创建它们。

## 第五阶段：编写 CLAUDE.local.md（如果用户选择个人或两者）

在项目根目录编写最小化的 CLAUDE.local.md。此文件会自动与 CLAUDE.md 一起加载。创建后，将 \`CLAUDE.local.md\` 添加到项目的 .gitignore 中以保持其私有性。

**消耗第三阶段偏好队列中目标为 CLAUDE.local.md 的 \`note\` 条目**（个人级注释）——将每条作为简洁的一行添加。如果用户在第一阶段仅选择个人，这是 note 条目的唯一消费者。

包含：
- 用户的角色和对代码库的熟悉程度（以便 Claude 可以调整解释）
- 个人沙盒 URL、测试账户或本地设置详细信息
- 个人工作流或沟通偏好

保持简短——只包含会使 Claude 的回复对该用户明显更好的内容。

如果第二阶段发现多个 git worktree 且用户确认他们使用同级/外部 worktree（而非嵌套在主仓库内部）：向上文件遍历将无法从所有 worktree 中找到单个 CLAUDE.local.md。将实际的个人内容写入 \`~/.claude/<project-name>-instructions.md\`，并使 CLAUDE.local.md 成为导入它的单行存根：\`@~/.claude/<project-name>-instructions.md\`。用户可以将此单行存根复制到每个同级 worktree。永远不要将此导入放在项目 CLAUDE.md 中。如果 worktree 嵌套在主仓库内部（例如，\`.claude/worktrees/\`），不需要特殊处理——会自动找到主仓库的 CLAUDE.local.md。

如果 CLAUDE.local.md 已存在：读取它，提出具体添加建议，不要静默覆盖。

## 第六阶段：建议和创建 skill（如果用户选择"Skill + hook"或"仅 skill"）

Skill 添加 Claude 可以按需使用的能力，而不会使每个会话膨胀。

**首先，消耗第三阶段偏好队列中的 `skill` 条目。** 每个队列中的 skill 偏好都会成为一个根据用户描述定制的 SKILL.md。对于每个：
- 根据偏好命名（例如，"verify-deep"、"session-report"、"deploy-sandbox"）
- 使用访谈中用户的原话加上第二阶段发现的任何内容（测试命令、报告格式、部署目标）编写正文。如果偏好映射到现有的捆绑 skill（例如，`/verify`），编写一个添加用户特定约束的项目 skill——告诉用户捆绑的 skill 仍然存在，而他们的 skill 是附加的。
- 如果偏好说明不足，快速跟进询问（例如，"verify-deep 应该运行哪个测试命令？"）

**然后建议额外的 skill**，超出队列范围，当您发现：
- 特定任务的参考知识（约定、模式、子系统的风格指南）
- 用户希望直接触发的可重复工作流（部署、修复问题、发布流程、验证更改）

对于每个建议的 skill，提供：名称、一行目的说明，以及为什么它适合此仓库。

如果 `.claude/skills/` 已存在 skill，先审查它们。不要覆盖现有的 skill——只提议补充现有内容的新 skill。

在每个 skill 的 `.claude/skills/<skill-name>/SKILL.md` 创建：

```yaml
---
name: <skill-name>
description: <skill 的作用和使用时机>
---

<给 Claude 的指令>
```

默认情况下，用户（`/<skill-name>`）和 Claude 都可以调用 skill。对于具有副作用的工作流（例如，`/deploy`、`/fix-issue 123`），添加 `disable-model-invocation: true` 以便只有用户可以触发它，并使用 `$ARGUMENTS` 接受输入。

## 第七阶段：建议额外优化

告诉用户，既然 CLAUDE.md 和 skill（如果已选择）已经就位，您将建议一些额外的优化。

检查环境并询问发现的每个缺口（使用 AskUserQuestion）：

- **GitHub CLI**：运行 \`which gh\`（或在 Windows 上运行 \`where gh\`）。如果它缺失且项目使用 GitHub（检查 \`git remote -v\` 中的 github.com），询问用户是否要安装它。解释 GitHub CLI 可以让 Claude 直接帮助处理提交、拉取请求、问题和代码审查。

- **Linting**：如果第二阶段没有发现 lint 配置（项目的语言没有 .eslintrc、ruff.toml、.golangci.yml 等），询问用户是否希望 Claude 为此代码库设置 linting。解释 linting 可以及早发现问题并给 Claude 对其编辑的快速反馈。

- **提案来源的 hook**（如果用户选择"Skill + hook"或"仅 hook"）：消耗第三阶段偏好队列中的 \`hook\` 条目。如果第二阶段发现格式化器且队列中没有格式化 hook，则提供编辑时格式化作为后备。如果用户在第一阶段选择"都不"或"仅 skill"，则完全跳过此项目。

  对于每个 hook 偏好（来自队列或格式化后备）：

  1. 目标文件：基于第一阶段 CLAUDE.md 选择的默认值——项目 → \`.claude/settings.json\`（团队共享，已提交）；个人 → \`.claude/settings.local.json\`。仅在用户在第一阶段选择"两者"或偏好不明确时询问。为所有 hook 询问一次，而不是每个 hook 都问。

  2. 从偏好中选择事件和匹配器：
     - "每次编辑后" → \`PostToolUse\` 匹配器 \`Write|Edit\`
     - "当 Claude 完成时" / "在我审查前" → \`Stop\` 事件（在每个回合结束时触发——包括只读回合）
     - "运行 bash 前" → \`PreToolUse\` 匹配器 \`Bash\`
     - "提交前"（字面意义的 git-commit 门控）→ **不是 hooks.json hook。** 匹配器无法按命令内容过滤 Bash，因此无法仅针对 \`git commit\`。改为将其路由到 git pre-commit hook（\`.git/hooks/pre-commit\`、husky、pre-commit 框架）——主动提出编写一个。如果用户实际意思是"在我审查和提交 Claude 的输出之前"，那就是 \`Stop\` ——探查以消除歧义。
     如果偏好不明确则进行探查。

  3. **加载 hook 引用**（每次 \`/init\` 运行一次，在第一个 hook 之前）：使用 \`skill: 'update-config'\` 和以 \`[hooks-only]\` 开头的参数调用 Skill 工具，后跟您正在构建内容的一行摘要——例如，\`[hooks-only] Constructing a PostToolUse/Write|Edit format hook for .claude/settings.json using ruff\`。这会将 hook 模式和验证流程加载到上下文中。后续 hook 重用它——不要重新调用。

  4. 遵循 skill 的**"构建 Hook"**流程：去重检查 → 为此项目构建 → 管道测试原始命令 → 包装 → 写入 JSON → \`jq -e\` 验证 → 实时验证（对于 \`Pre|PostToolUse\` 在可触发匹配器上）→ 清理 → 交接。目标文件和事件/匹配器来自上面的第 1-2 步。

在继续之前对每个"是"采取行动。

## 第八阶段：总结和后续步骤

回顾设置的内容——编写了哪些文件以及每个文件中包含的要点。提醒用户这些文件只是一个起点：他们应该审查和调整它们，并且可以随时运行 \`/init\` 重新扫描。

然后告诉用户，基于发现的内容，您将介绍一些优化代码库和 Claude Code 设置的建议。将这些建议作为单个格式良好的待办事项列表呈现，其中每个项目都与此仓库相关。将最具影响力的项目放在前面。

构建列表时，处理这些检查并仅包含适用的内容：
- 如果检测到前端代码（React、Vue、Svelte 等）：\`/plugin install frontend-design@claude-plugins-official\` 为 Claude 提供设计原则和组件模式，使其生成精美的 UI；\`/plugin install playwright@claude-plugins-official\` 让 Claude 启动真实浏览器，截图它构建的内容，并自行修复视觉错误。
- 如果在第七阶段发现缺口（缺少 GitHub CLI、缺少 linting）且用户拒绝：在此处列出它们，并说明每项帮助的一行理由。
- 如果测试缺失或稀疏：建议设置测试框架，以便 Claude 可以验证自己的更改。
- 为了帮助您使用 eval 创建 skill 和优化现有 skill，Claude Code 有一个官方 skill-creator 插件可供安装。使用 \`/plugin install skill-creator@claude-plugins-official\` 安装它，然后运行 \`/skill-creator <skill-name>\` 创建新 skill 或优化任何现有 skill。（始终包含此项。）
- 使用 \`/plugin\` 浏览官方插件——这些插件捆绑了您可能觉得有用的 skill、智能体、hook 和 MCP 服务器。您还可以创建自己的自定义插件与他人分享。（始终包含此项。）
