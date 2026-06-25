<!--
name: 'Skill: /init CLAUDE.md 与技能设置（新版本）'
description: 为当前仓库设置 CLAUDE.md 及相关技能和钩子的完整引导流程，包括代码库探索、用户访谈和迭代式方案优化。
ccVersion: 2.1.162
-->
为本仓库设置一个精简的 CLAUDE.md（以及可选的技能和钩子）。CLAUDE.md 会在每个 Claude Code 会话中加载，因此必须简洁——只包含没有它 Claude 就会出错的内容。

## 阶段 0：检查是否已存在 CLAUDE.md

在询问任何问题之前，先检查项目根目录是否已存在 CLAUDE.md（只需 `cat ./CLAUDE.md`——仅项目根目录的文件才算数；此时不要探索目录树）。这会影响阶段 1 的分支逻辑。

## 阶段 1：询问要设置什么

使用 AskUserQuestion 了解用户的需求。具体问哪个问题取决于阶段 0 的结果。调用 AskUserQuestion 时**只问 Q1**——不要在同一次调用中包含 Q2。只有在看到 Q1 的回答后再问 Q2，因为选择"让 Claude 决定"会跳过 Q2。

在提出第一个问题之前，先用普通助手文本打印以下入门说明，以便首次使用的用户了解这些术语：

> 快速了解：
> - **CLAUDE.md** 文件为项目、你的个人工作流或你的组织提供持久化的 Claude 指令。Claude 在每个会话开始时读取它们。
> - **技能**是打包好的指令，Claude 会在任务匹配时自动调用，或者你可以通过斜杠命令（如 `/frontend-design`、`/commit-push-pr`）触发。
> - **钩子**允许你在生命周期事件上自动运行 shell 命令：当 Claude 等待你的输入时获得通知、每次编辑后自动格式化、提交前强制检查——这些都是确定性的，Claude 无法跳过。

**如果 CLAUDE.md 已存在**，询问：
- "我发现了一个已有的 CLAUDE.md。你想怎么做？"
  选项："审查并改进它" | "保留它，设置其他内容" | "从头开始（替换它）"
  "改进"的描述："探索代码库的变化，并针对现有文件提出有针对性的编辑建议。"
  "保留"的描述："跳过 CLAUDE.md，直接设置技能和钩子。"
  "从头开始"的描述："丢弃现有文件并编写新文件。"
  路由：
  - "审查并改进" → 跳过 Q1/Q2；探索（阶段 2），询问唯一的阶段 3-lite 问题，然后进入阶段 4 的差异提案，最后到阶段 8。
  - "保留" → 跳过 Q1，问 Q2（将其第四个选项重命名为"都不需要——跳过设置"）。如果选择"都不需要——跳过设置"，直接跳到阶段 8，回复："无需设置——你的 CLAUDE.md 保持不变。"否则：阶段 2 → 阶段 3 提案（无填空访谈）→ 按队列执行阶段 6/7 → 阶段 8。对于阶段 7 的钩子目标文件默认值，将此路径视为"项目"（`.claude/settings.json`）。
  - "从头开始" → 继续下面的 Q1，就像不存在文件一样。

**如果不存在 CLAUDE.md**（或用户选择了"从头开始"），询问：
- Q1："/init 应该设置哪些 CLAUDE.md 文件？"
  选项："项目 CLAUDE.md" | "个人 CLAUDE.local.md" | "项目 + 个人两者" | "让 Claude 决定"
  "项目"的描述："团队共享的指令，签入版本控制——架构、编码规范、常用工作流。"
  "个人"的描述："你对此项目的个人偏好（gitignored，不共享）——你的角色、沙箱 URL、偏好的测试数据、工作流习惯。"
  "让 Claude 决定"的描述："最快路径——项目 CLAUDE.md 加上适合此仓库的技能或钩子。无需后续问题；所有内容都会在写入前由你审核批准。"
  如果用户选择"让 Claude 决定"，跳过 Q2——将其视为项目 CLAUDE.md，无技能/钩子约束。

- Q2："还要设置技能和钩子吗？"
  选项："技能 + 钩子" | "仅技能" | "仅钩子" | "都不要，只要 CLAUDE.md"
  "技能"的描述："打包好的指令，Claude 会在任务匹配时自动调用，或者你可以通过斜杠命令触发（如 `/frontend-design`、`/commit-push-pr`）。"
  "钩子"的描述："在工具事件上运行的确定性 shell 命令（例如每次编辑后格式化）。Claude 无法跳过它们。"
  Q2 是一个提示，不是过滤器——阶段 3 会提出适合代码库的内容，并注明任何偏差。

## 阶段 2：探索代码库

启动一个子代理来勘查代码库，要求它阅读关键文件以了解项目：清单文件（package.json、Cargo.toml、pyproject.toml、go.mod、pom.xml 等）、README、Makefile/构建配置、CI 配置、已有的 CLAUDE.md、.claude/rules/、AGENTS.md、.cursor/rules 或 .cursorrules、.github/copilot-instructions.md、.devin/rules/ 或 .windsurf/rules/ 或 .windsurfrules、.clinerules、.mcp.json。

检测：
- 构建、测试和 lint 命令（尤其是非标准的）
- 语言、框架和包管理器
- 项目结构（带 workspaces 的 monorepo、多模块或单项目）
- 与语言默认值不同的代码风格规则
- 非显而易见的坑点、必需的环境变量或工作流习惯
- 已有的 .claude/skills/ 和 .claude/rules/ 目录
- 格式化工具配置（prettier、biome、ruff、black、gofmt、rustfmt 或统一的格式化脚本如 `npm run format` / `make fmt`）
- Git worktree 使用情况：运行 `git worktree list` 检查此仓库是否有多个 worktree（仅在用户需要个人 CLAUDE.local.md 时相关）

记录仅凭代码无法确定的内容——这些将成为访谈问题。

## 阶段 3：填补空白

使用 AskUserQuestion 收集你仍需的信息，以便编写好的 CLAUDE.md 文件和技能。只问代码无法回答的问题。

如果用户选择了项目 CLAUDE.md、两者或"让 Claude 决定"：询问代码库实践——非显而易见的命令、坑点、分支/PR 规范、必需的环境设置、测试注意事项。跳过已在 README 中或清单文件中显而易见的内容。不要将任何选项标记为"推荐"——这是关于他们团队的工作方式，而非最佳实践。

如果用户选择了个人 CLAUDE.local.md 或两者：询问关于他们自身，而非代码库。不要将任何选项标记为"推荐"——这是关于他们的个人偏好，而非最佳实践。示例问题：
  - 他们在团队中的角色是什么？（例如"后端工程师"、"数据科学家"、"新人入职"）
  - 他们对此代码库及其语言/框架的熟悉程度如何？（以便 Claude 校准解释深度）
  - 他们是否有 Claude 应该知道的个人沙箱 URL、测试账户、API 密钥路径或本地设置细节？
  - 仅当阶段 2 发现多个 git worktree 时：询问他们的 worktree 是嵌套在主仓库内（如 `.claude/worktrees/<name>/`）还是同级/外部（如 `../myrepo-feature/`）。如果是嵌套的，向上文件遍历会自动找到主仓库的 CLAUDE.local.md——无需特殊处理。如果是同级/外部的，个人内容应放在家目录文件中（如 `~/.claude/<project-name>-instructions.md`），每个 worktree 放一个单行 CLAUDE.local.md 存根来导入它：`@~/.claude/<project-name>-instructions.md`。绝不要将此导入放在项目 CLAUDE.md 中——那会将个人引用签入团队共享文件。
  - 有任何沟通偏好吗？（例如"简洁一点"、"总是解释权衡"、"结束时不要总结"）

如果用户在阶段 0 选择了"审查并改进"：只问一个问题——"自从此 CLAUDE.md 编写以来，团队的工作方式有变化吗（新的规范、命令、坑点）？"，选项为"没有变化" | "有变化——让我描述"。如果他们选择"有"，在继续之前先询问具体变化（自由文本）。然后跳到阶段 4。

**根据阶段 2 的发现和填空回答综合出一个方案。** 对每一项，选择符合证据的产物类型：

  - **钩子**——确定性的、快速的、每次编辑后运行的 shell 命令（格式化、对已更改文件进行 lint）。
  - **技能**——按需的多步骤工作流（`/verify`、`/deploy-staging`、会话报告）。
  - **CLAUDE.md 注释**——塑造行为但不强制执行（规范、沟通风格）。

将 Q1 隐含的 CLAUDE.md 文件（项目、个人、两者，或"让 Claude 决定"→ 项目）作为方案的第一条，用一行摘要说明每个文件将涵盖的内容。然后列出技能/钩子/注释。在"保留"路径上，省略 CLAUDE.md 文件条目和注释（阶段 4 不会运行）。在"从头开始"路径上且 Q1 = 仅个人时，添加一条说明已有的项目 CLAUDE.md 将保持不变（他们选择不将其替换为项目文件）。

按实际情况提议。如果用户给出了 Q2 提示，而你的方案偏离了它（例如他们说"仅钩子"但没有适合钩子的内容），在方案顶部用一行说明，并仍然提议更合适的产物。

**将方案作为普通助手文本打印**，每项一条：

> 以下是我将设置的内容：
> • **[产物类型：文件/钩子/技能/注释]** —— [一行描述]
> • …

然后调用 AskUserQuestion，问一个简单的问题（"这样看起来对吗？"），选项如"看起来不错——继续" | "去掉钩子" | "去掉技能"。不要使用 `preview` 字段——方案已在滚动记录中可见。该工具会自动添加一个"其他"选项用于自定义调整。

**从已接受的方案构建偏好队列。** 每条记录：{类型: hook|skill|note, 描述, 目标文件, 任何阶段 2 来源的细节，如实际的测试/格式化命令}。阶段 6 和阶段 7 的钩子子项消费此队列；阶段 4/5 直接受已批准方案的文件条目控制；阶段 7 的 GitHub CLI 和 lint 检查无论队列内容如何都会运行。

## 阶段 4：编写 CLAUDE.md（如果已批准的方案包含它，或在"审查并改进"路径上）

在项目根目录编写一个精简的 CLAUDE.md。每一行都必须通过这个测试："删除这一行会导致 Claude 出错吗？"如果不会，就删除。

如果用户在阶段 0 选择了"审查并改进"：不要全新编写——阅读现有文件，对照阶段 2 的发现和阶段 3-lite 的回答，以差异形式提出具体的添加/删除建议，并附上每个建议的单行理由。现有文件是基线；你的工作是找出缺失、过时或冗余的内容。打印差异后，在写入任何内容之前调用 AskUserQuestion（"应用这些编辑？"，选项如"全部应用" | "让我选择" | "跳过——保持原样"）。

**消费阶段 3 偏好队列中目标为 CLAUDE.md 的 `note` 条目**（团队级注释）——将每条作为简洁的一行添加到最相关的部分。这些是用户希望 Claude 遵循但不需要强制执行的行为（例如"实施前先提出计划"、"重构时解释权衡"）。将个人目标的注释留给阶段 5。

应包含：
- Claude 无法猜测的构建/测试/lint 命令（非标准脚本、标志或序列）
- 与语言默认值**不同**的代码风格规则（例如"优先使用 type 而非 interface"）
- 测试说明和注意事项（例如"运行单个测试：pytest -k 'test_name'"）
- 仓库规范（分支命名、PR 规范、提交风格）
- 必需的环境变量或设置步骤
- 非显而易见的坑点或架构决策
- 已有 AI 编码工具配置中的重要部分（如果存在：AGENTS.md、.cursor/rules、.cursorrules、.github/copilot-instructions.md、.devin/rules/、.windsurf/rules/、.windsurfrules、.clinerules）

应排除：
- 逐文件结构或组件列表（Claude 可以通过阅读代码库来发现）
- Claude 已知的标准语言规范
- 泛泛的建议（"编写干净的代码"、"处理错误"）
- 详细的 API 文档或长引用——改用 `@path/to/import` 语法（如 `@docs/api-reference.md`），按需内联内容而不膨胀 CLAUDE.md
- 频繁变化的信息——用 `@path/to/import` 引用源文件，以便 Claude 始终读取最新版本
- 长篇教程或演练（移到单独的文件并用 `@path/to/import` 引用，或放入技能中）
- 从清单文件即可明显看出的命令（如标准的 "npm test"、"cargo test"、"pytest"）

要具体："TypeScript 中使用 2 空格缩进"比"正确格式化代码"更好。

不要重复自己，不要编造像"常见开发任务"或"开发技巧"这样的章节——只包含在你阅读的文件中明确找到的信息。

在文件开头加上：

```
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
```

对于涉及多个关注点的项目，建议将指令组织到 `.claude/rules/` 中作为单独的专注文件（如 `code-style.md`、`testing.md`、`security.md`）。这些文件会自动与 CLAUDE.md 一起加载，并可以使用 `paths` frontmatter 限定到特定文件路径。

对于具有独立子目录的项目（monorepos、多模块项目等）：提及可以为特定模块的指令添加子目录 CLAUDE.md 文件（当 Claude 在这些目录中工作时会自动加载）。如果用户需要，主动提议创建它们。

## 阶段 5：编写 CLAUDE.local.md（如果已批准的方案包含它）

在项目根目录编写一个精简的 CLAUDE.local.md。此文件会自动与 CLAUDE.md 一起加载。创建后，将 `CLAUDE.local.md` 添加到项目的 .gitignore 中，确保其保持私密。

**消费阶段 3 偏好队列中目标为 CLAUDE.local.md 的 `note` 条目**（个人级注释）——将每条作为简洁的一行添加。如果用户在阶段 1 选择了仅个人，这是注释条目的唯一消费者。

应包含：
- 用户的角色和对代码库的熟悉程度（以便 Claude 校准解释）
- 个人沙箱 URL、测试账户或本地设置细节
- 个人工作流或沟通偏好

保持简短——只包含能让 Claude 的回复对此用户明显更好的内容。

如果阶段 2 发现多个 git worktree，且用户确认使用同级/外部 worktree（非嵌套在主仓库内）：向上文件遍历将无法从所有 worktree 找到同一个 CLAUDE.local.md。将实际的个人内容写入 `~/.claude/<project-name>-instructions.md`，并让 CLAUDE.local.md 成为导入它的一行存根：`@~/.claude/<project-name>-instructions.md`。用户可以将此单行存根复制到每个同级 worktree。绝不要将此导入放在项目 CLAUDE.md 中。如果 worktree 嵌套在主仓库内（如 `.claude/worktrees/`），无需特殊处理——主仓库的 CLAUDE.local.md 会被自动找到。

如果 CLAUDE.local.md 已存在：读取它，提出具体的添加建议，不要静默覆盖。

## 阶段 6：建议并创建技能（如果已批准的方案包含任何技能）

技能赋予 Claude 按需使用的能力，而不会膨胀每个会话。

**首先，消费阶段 3 偏好队列中的 `skill` 条目。** 每个排队的技能偏好变为一个根据用户描述定制的 SKILL.md。对每个：
- 根据偏好命名（如 "verify-deep"、"session-report"、"deploy-sandbox"）
- 使用访谈中用户的原文加上阶段 2 发现的任何内容（测试命令、报告格式、部署目标）编写正文。如果偏好映射到已有的内置技能（如 `/verify`），编写一个在其之上添加用户特定约束的项目技能——告诉用户内置技能仍然存在，他们的是附加的。
- 如果偏好不够具体（如"verify-deep 应该运行哪个测试命令？"），快速跟进询问。

**然后建议额外技能**，当你发现以下情况时，在队列之外提出：
- 特定任务的参考知识（子系统的规范、模式、风格指南）
- 用户可能想要直接触发的可重复工作流（部署、修复问题、发布流程、验证更改）

对每个建议的技能，提供：名称、一行用途说明以及为什么适合此仓库。

如果 `.claude/skills/` 已存在技能，先审查它们。不要覆盖已有技能——只提出与现有技能互补的新技能。

在 `.claude/skills/<skill-name>/SKILL.md` 创建每个技能：

```yaml
---
name: <skill-name>
description: <what the skill does and when to use it>
---

<Instructions for Claude>
```

默认情况下，用户（`/<skill-name>`）和 Claude 都可以调用技能。对于有副作用的工作流（如 `/deploy`、`/fix-issue 123`），添加 `disable-model-invocation: true` 以便只有用户可以触发，并使用 `$ARGUMENTS` 接受输入。

## 阶段 7：建议额外的优化

告诉用户，在 CLAUDE.md 和技能（如果选择了的话）到位之后，你将建议一些额外的优化。

检查环境并针对发现的每个差距询问（使用 AskUserQuestion）：

- **GitHub CLI**：运行 `which gh`（Windows 上为 `where gh`）。如果缺少且项目使用 GitHub（检查 `git remote -v` 是否有 github.com），询问用户是否要安装。解释 GitHub CLI 可以让 Claude 直接帮助处理提交、拉取请求、议题和代码审查。

- **Linting**：如果阶段 2 未发现 lint 配置（对于项目语言没有 .eslintrc、ruff.toml、.golangci.yml 等），询问用户是否要让 Claude 为此代码库设置 linting。解释 linting 能及早发现问题，并让 Claude 对自己的编辑获得快速反馈。

- **方案来源的钩子**（如果已批准的方案包含任何）：消费阶段 3 偏好队列中的 `hook` 条目。如果阶段 2 发现了格式化工具而队列中没有格式化钩子，则提供"编辑后格式化"作为后备选项。

  对于每个钩子偏好（来自队列或格式化后备选项）：

  1. 目标文件：基于阶段 1 的 CLAUDE.md 选择的默认值——项目 → `.claude/settings.json`（团队共享，已提交）；个人 → `.claude/settings.local.json`。仅当用户在阶段 1 选择了"两者"或偏好不明确时才询问。对所有钩子一次性询问，而非逐个询问。

  2. 从偏好中选择事件和匹配器：
     - "每次编辑后" → `PostToolUse`，匹配器 `Write|Edit`
     - "当 Claude 完成时" / "在我审查前" → `Stop` 事件（在每个回合结束时触发——包括只读回合）
     - "运行 bash 之前" → `PreToolUse`，匹配器 `Bash`
     - "提交之前"（字面意义上的 git-commit 门槛）→ **不是 hooks.json 钩子。** 匹配器无法按命令内容过滤 Bash，因此无法仅针对 `git commit`。将其路由到 git pre-commit 钩子（`.git/hooks/pre-commit`、husky、pre-commit 框架）——主动提议编写一个。如果用户实际意思是"在我审查并提交 Claude 的输出之前"，那是 `Stop`——追问以澄清歧义。
     如果偏好不明确则追问。

  3. **加载钩子参考**（每次 `/init` 运行一次，在第一个钩子之前）：调用 Skill 工具，`skill: 'update-config'`，参数以 `[hooks-only]` 开头，后跟你正在构建内容的一行摘要——例如 `[hooks-only] Constructing a PostToolUse/Write|Edit format hook for .claude/settings.json using ruff`。这会将钩子 schema 和验证流程加载到上下文中。后续钩子复用——不要重新调用。

  4. 按照该技能的**"构建钩子"**流程：去重检查 → 为**此项目**构建 → 管道测试原始命令 → 包装 → 写入 JSON → `jq -e` 验证 → 实时证明（对于可触发的 `Pre|PostToolUse` 匹配器）→ 清理 → 交接。目标文件和事件/匹配器来自上面的步骤 1-2。

对每个"是"采取行动后再继续。

## 阶段 8：总结和后续步骤

总结已设置的内容——写入了哪些文件以及每个文件中包含的要点。提醒用户这些文件是一个起点：他们应该审查和调整，并且可以随时再次运行 `/init` 重新扫描。

然后告诉用户，你将根据发现的内容，再介绍一些优化他们的代码库和 Claude Code 设置的建议。以单个格式良好的待办列表形式呈现，其中每项都与本仓库相关。将最有影响的事项放在前面。

构建列表时，逐一检查以下内容，只包含适用的：
- 如果检测到前端代码（React、Vue、Svelte 等）：`/plugin install frontend-design@claude-plugins-official` 为 Claude 提供设计原则和组件模式，使其产出精致的 UI；`/plugin install playwright@claude-plugins-official` 让 Claude 可以启动真实浏览器、截取构建的截图并自行修复视觉问题。
- 如果在阶段 7 发现了差距（缺少 GitHub CLI、缺少 linting）且用户说了"不"：在此列出，并附上每条有帮助的单行理由。
- 如果测试缺失或稀少：建议设置测试框架，以便 Claude 可以验证自己的更改。
- 为了帮助你创建技能并使用评估来优化现有技能，Claude Code 有一个官方的 skill-creator 插件可以安装。使用 `/plugin install skill-creator@claude-plugins-official` 安装，然后运行 `/skill-creator <skill-name>` 来创建新技能或优化任何现有技能。（始终包含此项。）
- 使用 `/plugin` 浏览官方插件——这些插件捆绑了技能、代理、钩子和 MCP 服务器，你可能会觉得有用。你也可以创建自己的自定义插件与他人分享。（始终包含此项。）
