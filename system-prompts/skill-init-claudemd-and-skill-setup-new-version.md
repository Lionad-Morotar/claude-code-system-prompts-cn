<!--
name: 'Skill: /init CLAUDE.md and skill setup (new version)'
description: 为当前仓库设置 CLAUDE.md 及相关 skill/hook 的全面引导流程，包括代码库探索、用户访谈和迭代式提案优化。
ccVersion: 2.1.119
-->
为此仓库设置最小化的 CLAUDE.md（以及可选的 skill 和 hook）。CLAUDE.md 会在每个 Claude Code 会话中加载，因此必须简洁 —— 只包含没有它 Claude 就会出错的内容。

## 第零阶段：检查现有的 CLAUDE.md

在询问任何问题之前，检查项目根目录是否已存在 CLAUDE.md（只需 `cat ./CLAUDE.md` —— 只有项目根目录的文件才算数；暂不探索目录树）。这将影响第一阶段的走向。

## 第一阶段：询问需要设置什么

使用 AskUserQuestion 了解用户想要什么。根据第零阶段的结果决定询问哪个问题。**只使用 Q1** 调用 AskUserQuestion —— 不要在同一次调用中包含 Q2。只有在看到 Q1 的答案后才询问 Q2，因为"让 Claude 决定"选项会跳过 Q2。

在第一个问题之前，以普通助手文本形式打印这段入门说明，让首次使用的用户了解术语：

> 快速了解：
> - **CLAUDE.md** 文件为 Claude 提供项目、个人工作流或组织的持久化指令。Claude 在每个会话开始时读取它们。
> - **Skill** 是打包的指令，Claude 在任务匹配时自动调用，或者由你通过斜杠命令触发（例如 `/frontend-design`、`/commit-push-pr`）。
> - **Hook** 允许你在生命周期事件上自动运行 shell 命令：当 Claude 等待你输入时获得通知、每次编辑后自动格式化、在提交前执行检查 —— 这些都是确定性的，Claude 无法跳过。

**如果 CLAUDE.md 已存在**，询问：
- "我发现一个已存在的 CLAUDE.md。你想做什么？"
  选项："审查并改进它" | "保留它，设置其他东西" | "重新开始（替换它）"
  改进的描述："探索代码库中的变更，并对现有文件提出针对性的编辑建议。"
  保留它的描述："跳过 CLAUDE.md。直接进入 skill 和 hook。"
  重新开始的描述："丢弃它并编写新文件。"
  路由：
  - "审查并改进它" → 跳过 Q1/Q2；探索（第二阶段），询问单个第三阶段精简版问题，然后进入第四阶段的 diff 提案，最后第八阶段。
  - "保留它" → 跳过 Q1，询问 Q2（将其第四个选项重命名为"都不 —— 跳过设置"）。如果选择了"都不 —— 跳过设置"，直接跳转到第八阶段："无需设置 —— 你的 CLAUDE.md 保持不变。"否则：第二阶段 → 第三阶段提案（无填空访谈）→ 按队列执行第六/七阶段 → 第八阶段。对于第七阶段 hook 目标文件的默认值，将此路径视为"项目"（`.claude/settings.json`）。
  - "重新开始" → 继续下面的 Q1，就像文件不存在一样。

**如果 CLAUDE.md 不存在**（或用户选择了"重新开始"），询问：
- Q1："/init 应该设置哪些 CLAUDE.md 文件？"
  选项："项目 CLAUDE.md" | "个人 CLAUDE.local.md" | "项目 + 个人两者" | "让 Claude 决定"
  项目的描述："团队共享的指令，已纳入源代码控制 —— 架构、编码标准、常用工作流。"
  个人的描述："你在此项目中的私人偏好（gitignored，不共享）—— 你的角色、沙盒 URL、首选测试数据、工作流习惯。"
  让 Claude 决定的描述："最快路径 —— 项目 CLAUDE.md 加上适合此仓库的 skill 或 hook。无需跟进问题；在写入之前你都会审批所有内容。"
  如果用户选择"让 Claude 决定"，跳过 Q2 —— 将其视为项目 CLAUDE.md，无 skill/hook 约束。

- Q2："还要设置 skill 和 hook 吗？"
  选项："Skill + hook" | "仅 skill" | "仅 hook" | "都不需要，只要 CLAUDE.md"
  Skill 的描述："打包的指令，Claude 在任务匹配时自动调用，或者由你通过斜杠命令触发（例如 `/frontend-design`、`/commit-push-pr`）。"
  Hook 的描述："在工具事件上运行的确定性 shell 命令（例如每次编辑后格式化）。Claude 无法跳过它们。"
  Q2 是一个提示，不是过滤器 —— 第三阶段会提出适合代码库的内容，并注明任何偏差。

## 第二阶段：探索代码库

启动一个子代理来调查代码库，并要求它读取关键文件以了解项目：清单文件（package.json、Cargo.toml、pyproject.toml、go.mod、pom.xml 等）、README、Makefile/构建配置、CI 配置、现有的 CLAUDE.md、.claude/rules/、AGENTS.md、.cursor/rules 或 .cursorrules、.github/copilot-instructions.md、.windsurfrules、.clinerules、.mcp.json。

检测：
- 构建、测试和 lint 命令（尤其是非标准命令）
- 语言、框架和包管理器
- 项目结构（带有工作区的 monorepo、多模块或单项目）
- 与语言默认值不同的代码风格规则
- 不明显的陷阱、必需的环境变量或工作流怪癖
- 现有的 .claude/skills/ 和 .claude/rules/ 目录
- 格式化器配置（prettier、biome、ruff、black、gofmt、rustfmt，或统一的格式化脚本如 `npm run format` / `make fmt`）
- Git worktree 使用情况：运行 `git worktree list` 检查此仓库是否有多个工作树（仅在用户想要个人 CLAUDE.local.md 时相关）

记录无法仅从代码中弄清楚的内容 —— 这些将成为访谈问题。

## 第三阶段：填补空白

使用 AskUserQuestion 收集编写好的 CLAUDE.md 文件和 skill 仍然需要的信息。只询问代码无法回答的内容。

如果用户选择了项目 CLAUDE.md、两者或"让 Claude 决定"：询问代码库实践 —— 不明显的命令、陷阱、分支/PR 约定、必需的环境设置、测试怪癖。跳过 README 中已有的或清单文件中显而易见的内容。不要将任何选项标记为"推荐"—— 这是关于他们团队如何工作，而不是最佳实践。

如果用户选择了个人 CLAUDE.local.md 或两者：询问关于他们本人的信息，而不是代码库。不要将任何选项标记为"推荐"—— 这是关于他们的个人偏好，而不是最佳实践。问题示例：
  - 他们在团队中担任什么角色？（例如，"后端工程师"、"数据科学家"、"新员工入职"）
  - 他们对这个代码库及其语言/框架的熟悉程度如何？（以便 Claude 可以调整解释深度）
  - 他们是否有 Claude 应该知道的个人沙盒 URL、测试账户、API 密钥路径或本地设置详细信息？
  - 仅在第二阶段发现多个 git worktree 时：询问他们的 worktree 是嵌套在主仓库内部（例如，`.claude/worktrees/<name>/`）还是同级/外部（例如，`../myrepo-feature/`）。如果是嵌套的，向上文件遍历会自动找到主仓库的 CLAUDE.local.md —— 不需要特殊处理。如果是同级/外部的，个人内容应放在主目录文件中（例如，`~/.claude/<project-name>-instructions.md`），每个 worktree 获得一个单行 CLAUDE.local.md 存根来导入它：`@~/.claude/<project-name>-instructions.md`。永远不要将此导入放在项目 CLAUDE.md 中 —— 那会将个人引用纳入团队共享的文件。
  - 任何沟通偏好？（例如，"简洁"、"始终解释权衡"、"不要在最后总结"）

如果用户在第零阶段选择了"审查并改进"：只询问一个问题 —— "自从这个 CLAUDE.md 编写以来，团队的工作方式是否有任何变化（新的约定、命令、陷阱）？"选项为"没有，没有变化" | "有 —— 让我描述"。如果选择了"有"，在继续之前询问具体变化（自由文本）。然后跳到第四阶段。

**从第二阶段发现和填空答案中综合提案。**对于每个项目，选择适合证据的产物类型：

  - **Hook** —— 确定性的、快速的、每次编辑的 shell 命令（格式化、对更改的文件进行 lint）。
  - **Skill** —— 按需的多步骤工作流（`/verify`、`/deploy-staging`、会话报告）。
  - **CLAUDE.md 注释** —— 影响行为但不强制执行的指导（约定、沟通风格）。

将 Q1 隐含的 CLAUDE.md 文件（项目、个人、两者，或"让 Claude 决定"→ 项目）作为提案的第一个项目符号，并附上每个文件将涵盖内容的一行摘要。然后列出 skill/hook/注释。在"保留它"路径上，省略 CLAUDE.md 文件项目符号和注释（第四阶段不会运行）。在"重新开始"路径且 Q1 = 仅个人时，添加一个项目符号注明现有的项目 CLAUDE.md 将保持不变（他们选择不将其替换为项目文件）。

提出适合的内容。如果用户给出了 Q2 提示而你的提案有偏差（例如他们说"仅 hook"但没有任何适合 hook 的内容），在提案顶部用一行说明，但仍然提出更合适的产物。

**以普通助手文本形式打印提案**，每项一个项目符号：

> 以下是我建议设置的内容：
> • **[产物类型：文件/hook/skill/注释]** —— [一行描述]
> • …

然后调用 AskUserQuestion，询问一个简单的问题（"这样看起来对吗？"），选项如"看起来不错 —— 继续" | "删除 hook" | "删除 skill"。不要使用 `preview` 字段 —— 提案已经在上面的滚动记录中可见。工具会自动添加"其他"选项用于自定义调整。

**从接受的提案构建偏好队列**。每个条目：{type: hook|skill|note, description, target file, 任何第二阶段来源的详细信息，如实际的测试/格式化命令}。第六阶段和第七阶段的 hook 子项消耗此队列；第四/五阶段取决于已批准提案的文件项目符号；第七阶段的 GitHub CLI 和 linting 检查无论队列内容如何都会运行。

## 第四阶段：编写 CLAUDE.md（如果已批准的提案包含它，或在"审查并改进"路径上）

在项目根目录编写最小化的 CLAUDE.md。每一行都必须通过这个测试："删除这行会导致 Claude 出错吗？"如果不会，就删掉。

如果用户在第零阶段选择了"审查并改进它"：不要从头编写 —— 读取现有文件，对照第二阶段发现和第三阶段精简版答案进行比较，并以 diff 形式提出具体的添加/删除建议，每项附上一行理由。现有文件是基线；你的工作是找出遗漏、过时或冗余的内容。在打印 diff 后，在写入任何内容之前调用 AskUserQuestion（"应用这些编辑？"选项如"全部应用" | "让我挑选" | "跳过 —— 保持原样"）。

**消耗第三阶段偏好队列中目标为 CLAUDE.md 的 `note` 条目**（团队级注释）—— 将每条作为最相关部分中的简洁一行添加。这些是用户希望 Claude 遵循但不需要保证的行为（例如，"实施前提出规划"、"重构时解释权衡"）。将针对个人的注释留给第五阶段。

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
- 详细的 API 文档或长引用 —— 改为使用 `@path/to/import` 语法（例如，`@docs/api-reference.md`）按需内联内容，而不使 CLAUDE.md 膨胀
- 经常变化的信息 —— 使用 `@path/to/import` 引用源文件，以便 Claude 始终读取当前版本
- 长教程或演练（移到单独的文件并使用 `@path/to/import` 引用，或放在 skill 中）
- 清单文件中显而易见的命令（例如，标准的"npm test"、"cargo test"、"pytest"）

具体明确："在 TypeScript 中使用 2 空格缩进"比"正确格式化代码"更好。

不要重复自己，也不要编造像"常见开发任务"或"开发技巧"这样的部分 —— 只包含你明确从读取的文件中找到的信息。

在文件前添加：

```
# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在此仓库中处理代码时提供指导。
```

对于具有多个关注点的项目，建议将指令组织到 `.claude/rules/` 中作为单独的聚焦文件（例如，`code-style.md`、`testing.md`、`security.md`）。这些文件会自动与 CLAUDE.md 一起加载，并可以使用 `paths` 前置元数据限定到特定文件路径。

对于具有不同子目录的项目（monorepo、多模块项目等）：提及可以添加子目录 CLAUDE.md 文件以获取模块特定指令（当 Claude 在这些目录中工作时它们会自动加载）。如果用户需要，主动提出创建它们。

## 第五阶段：编写 CLAUDE.local.md（如果已批准的提案包含它）

在项目根目录编写最小化的 CLAUDE.local.md。此文件会自动与 CLAUDE.md 一起加载。创建后，将 `CLAUDE.local.md` 添加到项目的 .gitignore 中以保持其私有性。

**消耗第三阶段偏好队列中目标为 CLAUDE.local.md 的 `note` 条目**（个人级注释）—— 将每条作为简洁的一行添加。如果用户在第一阶段仅选择个人，这是 note 条目的唯一消费者。

包含：
- 用户的角色和对代码库的熟悉程度（以便 Claude 可以调整解释）
- 个人沙盒 URL、测试账户或本地设置详细信息
- 个人工作流或沟通偏好

保持简短 —— 只包含会使 Claude 的回复对该用户明显更好的内容。

如果第二阶段发现多个 git worktree 且用户确认他们使用同级/外部 worktree（而非嵌套在主仓库内部）：向上文件遍历将无法从所有 worktree 中找到单个 CLAUDE.local.md。将实际的个人内容写入 `~/.claude/<project-name>-instructions.md`，并使 CLAUDE.local.md 成为导入它的单行存根：`@~/.claude/<project-name>-instructions.md`。用户可以将此单行存根复制到每个同级 worktree。永远不要将此导入放在项目 CLAUDE.md 中。如果 worktree 嵌套在主仓库内部（例如，`.claude/worktrees/`），不需要特殊处理 —— 会自动找到主仓库的 CLAUDE.local.md。

如果 CLAUDE.local.md 已存在：读取它，提出具体添加建议，不要静默覆盖。

## 第六阶段：建议和创建 skill（如果已批准的提案包含任何 skill）

Skill 添加 Claude 可以按需使用的能力，而不会使每个会话膨胀。

**首先，消耗第三阶段偏好队列中的 `skill` 条目。** 每个队列中的 skill 偏好都会成为一个根据用户描述定制的 SKILL.md。对于每个：
- 根据偏好命名（例如，"verify-deep"、"session-report"、"deploy-sandbox"）
- 使用访谈中用户的原话加上第二阶段发现的任何内容（测试命令、报告格式、部署目标）编写正文。如果偏好映射到现有的捆绑 skill（例如，`/verify`），编写一个添加用户特定约束的项目 skill —— 告诉用户捆绑的 skill 仍然存在，而他们的 skill 是附加的。
- 如果偏好说明不足，快速跟进询问（例如，"verify-deep 应该运行哪个测试命令？"）

**然后建议额外的 skill**，超出队列范围，当你发现：
- 特定任务的参考知识（约定、模式、子系统的风格指南）
- 用户希望直接触发的可重复工作流（部署、修复问题、发布流程、验证更改）

对于每个建议的 skill，提供：名称、一行目的说明，以及为什么它适合此仓库。

如果 `.claude/skills/` 已存在 skill，先审查它们。不要覆盖现有的 skill —— 只提议补充现有内容的新 skill。

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

告诉用户，既然 CLAUDE.md 和 skill（如果已选择）已经就位，你将建议一些额外的优化。

检查环境并询问发现的每个缺口（使用 AskUserQuestion）：

- **GitHub CLI**：运行 `which gh`（或在 Windows 上运行 `where gh`）。如果它缺失且项目使用 GitHub（检查 `git remote -v` 中的 github.com），询问用户是否要安装它。解释 GitHub CLI 可以让 Claude 直接帮助处理提交、拉取请求、问题和代码审查。

- **Linting**：如果第二阶段没有发现 lint 配置（项目的语言没有 .eslintrc、ruff.toml、.golangci.yml 等），询问用户是否希望 Claude 为此代码库设置 linting。解释 linting 可以及早发现问题并给 Claude 对其编辑的快速反馈。

- **提案来源的 hook**（如果已批准的提案包含任何 hook）：消耗第三阶段偏好队列中的 `hook` 条目。如果第二阶段发现格式化器且队列中没有格式化 hook，则提供编辑时格式化作为后备。

  对于每个 hook 偏好（来自队列或格式化后备）：

  1. 目标文件：基于第一阶段 CLAUDE.md 选择的默认值 —— 项目 → `.claude/settings.json`（团队共享，已提交）；个人 → `.claude/settings.local.json`。仅在用户在第一阶段选择"两者"或偏好不明确时询问。为所有 hook 询问一次，而不是每个 hook 都问。

  2. 从偏好中选择事件和匹配器：
     - "每次编辑后" → `PostToolUse` 匹配器 `Write|Edit`
     - "当 Claude 完成时" / "在我审查前" → `Stop` 事件（在每个回合结束时触发 —— 包括只读回合）
     - "运行 bash 前" → `PreToolUse` 匹配器 `Bash`
     - "提交前"（字面意义的 git-commit 门控）→ **不是 hooks.json hook。** 匹配器无法按命令内容过滤 Bash，因此无法仅针对 `git commit`。改为将其路由到 git pre-commit hook（`.git/hooks/pre-commit`、husky、pre-commit 框架）—— 主动提出编写一个。如果用户实际意思是"在我审查和提交 Claude 的输出之前"，那就是 `Stop` —— 探查以消除歧义。
     如果偏好不明确则进行探查。

  3. **加载 hook 引用**（每次 `/init` 运行一次，在第一个 hook 之前）：使用 `skill: 'update-config'` 和以 `[hooks-only]` 开头的参数调用 Skill 工具，后跟你在构建内容的一行摘要 —— 例如，`[hooks-only] Constructing a PostToolUse/Write|Edit format hook for .claude/settings.json using ruff`。这会将 hook 模式和验证流程加载到上下文中。后续 hook 重用它 —— 不要重新调用。

  4. 遵循 skill 的**"构建 Hook"**流程：去重检查 → 为此项目构建 → 管道测试原始命令 → 包装 → 写入 JSON → `jq -e` 验证 → 实时验证（对于 `Pre|PostToolUse` 在可触发匹配器上）→ 清理 → 交接。目标文件和事件/匹配器来自上面的第 1-2 步。

在继续之前对每个"是"采取行动。

## 第八阶段：总结和后续步骤

回顾设置的内容 —— 编写了哪些文件以及每个文件中包含的要点。提醒用户这些文件只是一个起点：他们应该审查和调整它们，并且可以随时运行 `/init` 重新扫描。

然后告诉用户，基于发现的内容，你将介绍一些优化代码库和 Claude Code 设置的建议。将这些建议作为单个格式良好的待办事项列表呈现，其中每个项目都与此仓库相关。将最具影响力的项目放在前面。

构建列表时，处理这些检查并仅包含适用的内容：
- 如果检测到前端代码（React、Vue、Svelte 等）：`/plugin install frontend-design@claude-plugins-official` 为 Claude 提供设计原则和组件模式，使其生成精美的 UI；`/plugin install playwright@claude-plugins-official` 让 Claude 启动真实浏览器，截图它构建的内容，并自行修复视觉错误。
- 如果在第七阶段发现缺口（缺少 GitHub CLI、缺少 linting）且用户拒绝：在此处列出它们，并说明每项帮助的一行理由。
- 如果测试缺失或稀疏：建议设置测试框架，以便 Claude 可以验证自己的更改。
- 为了帮助你使用 eval 创建 skill 和优化现有 skill，Claude Code 有一个官方 skill-creator 插件可供安装。使用 `/plugin install skill-creator@claude-plugins-official` 安装它，然后运行 `/skill-creator <skill-name>` 创建新 skill 或优化任何现有 skill。（始终包含此项。）
- 使用 `/plugin` 浏览官方插件 —— 这些插件捆绑了你可能觉得有用的 skill、智能体、hook 和 MCP 服务器。你还可以创建自己的自定义插件与他人分享。（始终包含此项。）
