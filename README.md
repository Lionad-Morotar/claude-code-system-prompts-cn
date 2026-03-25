<div>
<div align="right">
<a href="https://piebald.ai"><img width="200" top="20" align="right" src="https://github.com/Piebald-AI/.github/raw/main/Wordmark.svg"></a>
</div>

<div align="left">

### 试试 Piebald
我们发布了 **Piebald**，终极的智能体 AI 开发体验。\
下载它并免费试用！**https://piebald.ai/**

<a href="https://piebald.ai/discord"><img src="https://img.shields.io/badge/加入%20我们的%20Discord-5865F2?style=flat&logo=discord&logoColor=white" alt="Join our Discord"></a>
<a href="https://x.com/PiebaldAI"><img src="https://img.shields.io/badge/关注%20%40PiebaldAI-000000?style=flat&logo=x&logoColor=white" alt="X"></a>

<sub>[**向下滚动查看 Claude Code 的系统提示词。**](#claude-code-system-prompts) :point_down:</sub>

</div>
</div>

<div align="left">
<a href="https://piebald.ai">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://piebald.ai/screenshot-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="https://piebald.ai/screenshot-light.png">
  <img alt="hero" width="800" src="https://piebald.ai/screenshot-light.png">
</picture>
</a>
</div>

# Claude Code 系统提示词

[![Mentioned in Awesome Claude Code](https://awesome.re/mentioned-badge.svg)](https://github.com/hesreallyhim/awesome-claude-code)

> [!important]
> **新增（2026 年 1 月 23 日）：我们已在此列表中添加了所有 Claude Code 的约 40 个系统提醒——请参阅 [系统提醒](#system-reminders)。**

此仓库包含截至 **[Claude Code v2.1.81](https://www.npmjs.com/package/@anthropic-ai/claude-code/v/2.1.81)（2026 年 3 月 20 日）** 的所有 Claude Code 各种系统提示词及其相关 token 计数的最新列表。它还包含了自 v2.0.14 以来 131 个版本的系统提示词的 [**CHANGELOG.md**](./CHANGELOG.md)。来自 [<img src="https://github.com/Piebald-AI/piebald/raw/main/assets/logo.svg" width="15"> **Piebald.**](https://piebald.ai/) 背后的团队。

**此仓库在每次 Claude Code 发布后的几分钟内更新。请查看 [更新日志](./CHANGELOG.md)，并在 X 上关注 [@PiebaldAI](https://x.com/PiebaldAI) 以获取每次发布中系统提示词变更的摘要。**

---

为什么有多个"系统提示词"？

**Claude Code 的系统提示词不仅仅是一个单一的字符串。**

相反，包括：
- 根据环境和各种配置有条件添加的大型部分。
- 内置工具的描述，如 `Write`、`Bash` 和 `TodoWrite`，其中一些相当大。
- 内置代理（如 Explore 和 Plan）的独立系统提示词。
- 众多 AI 驱动的实用函数，如对话压缩、`CLAUDE.md` 生成、会话标题生成等，它们都有自己的系统提示词。

结果——110+ 个不断变化并在一个非常大的压缩 JS 文件中移动的字符串。

> [!TIP]
> 想要在你自己的 Claude Code 安装中**修改系统提示词的特定部分**？**使用 [tweakcc](https://github.com/Piebald-AI/tweakcc)。** 它——
> - 允许你将系统提示词的各个部分自定义为 markdown 文件，然后
> - 使用它们修补你的基于 npm 或原生（二进制）的 Claude Code 安装，并且
> - 为当您和 Anthropic 对同一个提示词文件有冲突修改时提供差异和冲突管理。

## 提取

此仓库包含使用脚本从最新 npm 版本的 Claude Code 中提取的系统提示词。由于它们直接从 Claude Code 的编译源代码中提取，因此保证与 Claude Code 使用的完全相同。如果你使用 [tweakcc](https://github.com/Piebald-AI/tweakcc) 来自定义系统提示词，它的工作方式类似——它会修补本地安装中与提取到此仓库中的完全相同的字符串。

## 提示词

请注意，某些提示词包含插值位，如内置工具名称引用、可用子代理列表以及各种其他上下文特定变量，因此在特定 Claude Code 会话中的实际计数会有所不同——但可能不会超过 ±20 个 token。

### 代理提示词

子代理和实用程序。

#### 子代理

- [代理提示词：Explore](./system-prompts/agent-prompt-explore.md) (**516** tks) - Explore 子代理的系统提示词。
- [代理提示词：Plan 模式（增强）](./system-prompts/agent-prompt-plan-mode-enhanced.md) (**633** tks) - Plan 子代理的增强提示词。
- [代理提示词：Task 工具（额外说明）](./system-prompts/agent-prompt-task-tool-extra-notes.md) (**129** tks) - Task 工具使用的额外说明（绝对路径、无表情符号、工具调用前无冒号）。
- [代理提示词：Task 工具](./system-prompts/agent-prompt-task-tool.md) (**294** tks) - 通过 Task 工具生成的子代理的系统提示词。

### 创建助手

- [代理提示词：代理创建架构师](./system-prompts/agent-prompt-agent-creation-architect.md) (**1110** tks) - 用于创建具有详细规范的自定义 AI 代理的系统提示词。
- [代理提示词：CLAUDE.md 创建](./system-prompts/agent-prompt-claudemd-creation.md) (**384** tks) - 用于分析代码库并创建 CLAUDE.md 文档文件的系统提示词。
- [代理提示词：状态栏设置](./system-prompts/agent-prompt-status-line-setup.md) (**1999** tks) - 用于配置状态栏显示的 statusline-setup 代理的系统提示词。

### 斜杠命令

- [代理提示词：/batch 斜杠命令](./system-prompts/agent-prompt-batch-slash-command.md) (**1106** tks) - 用于在代码库中协调大规模、可并行化更改的说明。
- [代理提示词：/pr-comments 斜杠命令](./system-prompts/agent-prompt-pr-comments-slash-command.md) (**402** tks) - 用于获取和显示 GitHub PR 注释的系统提示词。
- [代理提示词：/review 斜杠命令（远程）](./system-prompts/agent-prompt-review-slash-command-remote.md) (**238** tks) - /review 斜杠命令的远程版本。
- [代理提示词：/review-pr 斜杠命令](./system-prompts/agent-prompt-review-pr-slash-command.md) (**211** tks) - 用于通过代码分析审查 GitHub 拉取请求的系统提示词。
- [代理提示词：/schedule 斜杠命令](./system-prompts/agent-prompt-schedule-slash-command.md) (**2468** tks) - 引导用户通过 Anthropic 云 API 在 cron 触发器上调度、更新、列出或运行远程 Claude Code 代理。
- [代理提示词：/security-review 斜杠命令](./system-prompts/agent-prompt-security-review-slash-command.md) (**2610** tks) - 综合安全审查提示词，用于分析代码更改，重点关注可利用的漏洞。

### 实用程序

- [代理提示词：代理 Hook](./system-prompts/agent-prompt-agent-hook.md) (**133** tks) - '代理 hook' 的提示词。
- [代理提示词：自动模式规则审查器](./system-prompts/agent-prompt-auto-mode-rule-reviewer.md) (**257** tks) - 审查和评估用户定义的自动模式分类器规则，检查其清晰度、完整性、冲突和可操作性。
- [代理提示词：Bash 命令描述编写器](./system-prompts/agent-prompt-bash-command-description-writer.md) (**207** tks) - 用于以主动语气为 bash 命令生成清晰、简洁命令描述的说明。
- [代理提示词：Bash 命令文件路径提取](./system-prompts/agent-prompt-bash-command-file-path-extraction.md) (**286** tks) - 用于从 bash 命令输出中提取文件路径的系统提示词。
- [代理提示词：Bash 命令前缀检测](./system-prompts/agent-prompt-bash-command-prefix-detection.md) (**835** tks) - 用于检测命令前缀和命令注入的系统提示词。
- [代理提示词：Claude 指南代理](./system-prompts/agent-prompt-claude-guide-agent.md) (**761** tks) - 用于 claude-guide 代理的系统提示词，该代理帮助用户有效地理解和使用 Claude Code、Claude Agent SDK 和 Claude API。
- [代理提示词：命令执行专家](./system-prompts/agent-prompt-command-execution-specialist.md) (**109** tks) - 专注于 bash 命令的命令执行代理的系统提示词。
- [代理提示词：带有附加说明的对话总结](./system-prompts/agent-prompt-conversation-summarization-with-additional-instructions.md) (**1133** tks) - 支持自定义附加说明的扩展总结提示词。
- [代理提示词：对话总结](./system-prompts/agent-prompt-conversation-summarization.md) (**1121** tks) - 用于创建详细对话摘要的系统提示词。
- [代理提示词：通过 Swarm 退出计划模式](./system-prompts/agent-prompt-exit-plan-mode-with-swarm.md) (**440** tks) - 当调用 ExitPlanMode 并将 `isSwarm` 设置为 true 时的系统提醒。
- [代理提示词：提示词 Hook 执行](./system-prompts/agent-prompt-prompt-hook-execution.md) (**134** tks) - 在评估是传递还是失败提示词 hook 时给予 Claude 的提示词。
- [代理提示词：提示词建议生成器（明确意图）](./system-prompts/agent-prompt-prompt-suggestion-generator-stated-intent.md) (**166** tks) - 用于根据用户明确说明的下一步生成提示词建议的说明。
- [代理提示词：提示词建议生成器 v2](./system-prompts/agent-prompt-prompt-suggestion-generator-v2.md) (**296** tks) - 用于为 Claude Code 生成提示词建议的 v2 说明。
- [代理提示词：Remember 技能](./system-prompts/agent-prompt-remember-skill.md) (**1048** tks) - /remember 技能的系统提示词，该技能审查会话记忆并使用重复模式和学习更新 CLAUDE.local.md。
- [代理提示词：会话搜索助手](./system-prompts/agent-prompt-session-search-assistant.md) (**439** tks) - 用于会话搜索助手的代理提示词，该助手根据用户查询和元数据查找相关会话。
- [代理提示词：会话记录模板](./system-prompts/agent-prompt-session-notes-template.md) (**292** tks) - 用于跟踪编码工作和决策的会话记录的模板结构。
- [代理提示词：会话记录更新说明](./system-prompts/agent-prompt-session-notes-update-instructions.md) (**756** tks) - 用于在对话期间更新会话记录文件的说明。
- [代理提示词：会话标题和分支生成](./system-prompts/agent-prompt-session-title-and-branch-generation.md) (**355** tks) - 用于为编码会话生成简洁标题和 git 分支名称的系统提示词。
- [代理提示词：更新 Magic Docs](./system-prompts/agent-prompt-update-magic-docs.md) (**718** tks) - 用于 magic-docs 代理的提示词。
- [代理提示词：用户情感分析](./system-prompts/agent-prompt-user-sentiment-analysis.md) (**205** tks) - 用于分析用户沮丧和 PR 创建请求的系统提示词。
- [代理提示词：WebFetch 总结器](./system-prompts/agent-prompt-webfetch-summarizer.md) (**185** tks) - 用于为主模型总结 WebFetch 冗长输出的代理的提示词。

<!--
### 数据

其他大型字符串。

- [数据：用于 @claude 提及的 GitHub Actions 工作流](./system-prompts/data-github-actions-workflow-for-claude-mentions.md) (**527** tks) - 用于通过 @claude 提及触发 Claude Code 的 GitHub Actions 工作流模板。
- [数据：GitHub App 安装 PR 描述](./system-prompts/data-github-app-installation-pr-description.md) (**424** tks) - 安装 Claude Code GitHub App 集成时的 PR 描述模板。
-->

### 系统提示词

主系统提示词的部分内容。

- [**系统提示词：主系统提示词**](./system-prompts/system-prompt-main-system-prompt.md) (**2896** tks) - Claude Code 的核心系统提示词，定义行为、语气和工具使用策略。
- [系统提示词：审查恶意活动协助](./system-prompts/system-prompt-censoring-assistance-with-malicious-activities.md) (**98** tks) - 用于协助授权安全测试、防御性安全、CTF 挑战和教育背景的指导，同时审查恶意活动请求。
- [系统提示词：Chrome 浏览器 MCP 工具](./system-prompts/system-prompt-chrome-browser-mcp-tools.md) (**158** tks) - 在使用前通过 MCPSearch 加载 Chrome 浏览器 MCP 工具的说明。
- [系统提示词：Chrome 浏览器自动化中的 Claude](./system-prompts/system-prompt-claude-in-chrome-browser-automation.md) (**761** tks) - 有效使用 Chrome 浏览器自动化工具中的 Claude 的说明。
- [系统提示词：Git 状态](./system-prompts/system-prompt-git-status.md) (**95** tks) - 用于在对话开始时显示当前 git 状态的系统提示词。
- [系统提示词：Hooks 配置](./system-prompts/system-prompt-hooks-configuration.md) (**1268** tks) - hooks 配置的系统提示词。用于上述 Claude Code 配置技能。
- [系统提示词：学习模式（见解）](./system-prompts/system-prompt-learning-mode-insights.md) (**142** tks) - 在学习模式处于活动状态时提供教育见解的说明。
- [系统提示词：学习模式](./system-prompts/system-prompt-learning-mode.md) (**1042** tks) - 带有人类协作说明的学习模式的主系统提示词。
- [系统提示词：MCP CLI](./system-prompts/system-prompt-mcp-cli.md) (**1335** tks) - 使用 mcp-cli 与模型上下文协议服务器交互的说明。
- [系统提示词：临时目录](./system-prompts/system-prompt-scratchpad-directory.md) (**172** tks) - 使用专用临时目录存储临时文件的说明。
- [系统提示词：队友通信](./system-prompts/system-prompt-teammate-communication.md) (**138** tks) - 用于 swarm 中队友通信的系统提示词。
- [系统提示词：工具执行被拒绝](./system-prompts/system-prompt-tool-execution-denied.md) (**157** tks) - 工具执行被拒绝时的系统提示词。

### 系统提醒

所有 Claude Code 系统提醒。

- [系统提醒：代理提及](./system-prompts/system-reminder-agent-mention.md) (**45** tks) - 通知用户想要调用代理。
- [系统提醒：紧凑文件引用](./system-prompts/system-reminder-compact-file-reference.md) (**57** tks) - 对话总结之前读取的文件的引用。
- [系统提醒：委派模式提示词](./system-prompts/system-reminder-delegate-mode-prompt.md) (**185** tks) - 委派模式的系统提醒。
- [系统提醒：退出委派模式](./system-prompts/system-reminder-exited-delegate-mode.md) (**50** tks) - 在 swarm 中退出委派模式时的通知。
- [系统提醒：退出计划模式](./system-prompts/system-reminder-exited-plan-mode.md) (**73** tks) - 退出计划模式时的通知。
- [系统提醒：文件存在但为空](./system-prompts/system-reminder-file-exists-but-empty.md) (**27** tks) - 读取空文件时的警告。
- [系统提醒：文件被用户或 linter 修改](./system-prompts/system-reminder-file-modified-by-user-or-linter.md) (**97** tks) - 文件被外部修改的通知。
- [系统提醒：文件在 IDE 中打开](./system-prompts/system-reminder-file-opened-in-ide.md) (**37** tks) - 用户在 IDE 中打开文件的通知。
- [系统提醒：文件短于偏移量](./system-prompts/system-reminder-file-shorter-than-offset.md) (**59** tks) - 文件读取偏移量超过文件长度时的警告。
- [系统提醒：文件被截断](./system-prompts/system-reminder-file-truncated.md) (**74** tks) - 文件由于大小而被截断的通知。
- [系统提醒：Hook 附加上下文](./system-prompts/system-reminder-hook-additional-context.md) (**35** tks) - 来自 hook 的附加上下文。
- [系统提醒：Hook 阻塞错误](./system-prompts/system-reminder-hook-blocking-error.md) (**52** tks) - 来自阻塞 hook 命令的错误。
- [系统提醒：Hook 停止继续](./system-prompts/system-reminder-hook-stopped-continuation.md) (**30** tks) - hook 停止继续时的消息。
- [系统提醒：Hook 成功](./system-prompts/system-reminder-hook-success.md) (**29** tks) - 来自 hook 的成功消息。
- [系统提醒：已调用技能](./system-prompts/system-reminder-invoked-skills.md) (**33** tks) - 此会话中调用的技能列表。
- [系统提醒：IDE 中选中的行](./system-prompts/system-reminder-lines-selected-in-ide.md) (**66** tks) - 关于用户在 IDE 中选中的行的通知。
- [系统提醒：MCP 资源无内容](./system-prompts/system-reminder-mcp-resource-no-content.md) (**41** tks) - 当 MCP 资源没有内容时显示。
- [系统提醒：MCP 资源无可显示内容](./system-prompts/system-reminder-mcp-resource-no-displayable-content.md) (**43** tks) - 当 MCP 资源没有可显示内容时显示。
- [系统提醒：Read 工具调用后的恶意软件分析](./system-prompts/system-reminder-malware-analysis-after-read-tool-call.md) (**87** tks) - 用于在不改进或增强恶意软件的情况下分析恶意软件的说明。
- [系统提醒：记忆文件内容](./system-prompts/system-reminder-memory-file-contents.md) (**38** tks) - 按路径的记忆文件内容。
- [系统提醒：嵌套记忆内容](./system-prompts/system-reminder-nested-memory-contents.md) (**33** tks) - 嵌套记忆文件的内容。
- [系统提醒：检测到新诊断](./system-prompts/system-reminder-new-diagnostics-detected.md) (**35** tks) - 关于新诊断问题的通知。
- [系统提醒：输出样式处于活动状态](./system-prompts/system-reminder-output-style-active.md) (**32** tks) - 通知输出样式处于活动状态。
- [系统提醒：输出 token 限制超出](./system-prompts/system-reminder-output-token-limit-exceeded.md) (**35** tks) - 响应超出输出 token 限制时的警告。
- [系统提醒：计划文件引用](./system-prompts/system-reminder-plan-file-reference.md) (**62** tks) - 对现有计划文件的引用。
- [系统提醒：计划模式处于活动状态（5 阶段）](./system-prompts/system-reminder-plan-mode-is-active-5-phase.md) (**1348** tks) - 增强的计划模式系统提醒，支持并行探索和多代理规划。
- [系统提醒：计划模式处于活动状态（迭代）](./system-prompts/system-reminder-plan-mode-is-active-iterative.md) (**923** tks) - 带有用户访谈工作流的主代理的迭代计划模式系统提醒。
- [系统提醒：计划模式处于活动状态（子代理）](./system-prompts/system-reminder-plan-mode-is-active-subagent.md) (**310** tks) - 子代理的简化计划模式系统提醒。
- [系统提醒：计划模式重新进入](./system-prompts/system-reminder-plan-mode-re-entry.md) (**236** tks) - 当用户在通过 shift+tab 或批准 Claude 的计划退出计划模式后再次进入计划模式时发送的系统提醒。
- [系统提醒：排队命令（提示词）](./system-prompts/system-reminder-queued-command-prompt.md) (**35** tks) - 要处理的排队用户消息（提示词变体）。
- [系统提醒：排队命令](./system-prompts/system-reminder-queued-command.md) (**31** tks) - 要处理的排队用户消息。
- [系统提醒：会话继续](./system-prompts/system-reminder-session-continuation.md) (**37** tks) - 会话从另一台机器继续的通知。
- [系统提醒：会话记忆](./system-prompts/system-reminder-session-memory.md) (**105** tks) - 可能相关的过去会话摘要。
- [系统提醒：任务状态](./system-prompts/system-reminder-task-status.md) (**18** tks) - 带有 TaskOutput 工具引用的任务状态。
- [系统提醒：任务工具提醒](./system-prompts/system-reminder-task-tools-reminder.md) (**123** tks) - 使用任务跟踪工具的提醒。
- [系统提醒：团队协调](./system-prompts/system-reminder-team-coordination.md) (**247** tks) - 团队协调的系统提醒。
- [系统提醒：团队关闭](./system-prompts/system-reminder-team-shutdown.md) (**136** tks) - 团队关闭的系统提醒。
- [系统提醒：待办事项列表已更改](./system-prompts/system-reminder-todo-list-changed.md) (**61** tks) - 待办事项列表已更改的通知。
- [系统提醒：待办事项列表为空](./system-prompts/system-reminder-todo-list-empty.md) (**83** tks) - 待办事项列表为空的提醒。
- [系统提醒：TodoWrite 提醒](./system-prompts/system-reminder-todowrite-reminder.md) (**98** tks) - 使用 TodoWrite 工具进行任务跟踪的提醒。
- [系统提醒：Token 使用情况](./system-prompts/system-reminder-token-usage.md) (**39** tks) - 当前 token 使用情况统计。
- [系统提醒：USD 预算](./system-prompts/system-reminder-usd-budget.md) (**42** tks) - 当前 USD 预算统计。
- [系统提醒：验证计划提醒](./system-prompts/system-reminder-verify-plan-reminder.md) (**47** tks) - 验证已完成计划的提醒。

### 内置工具描述

- [工具描述：AskUserQuestion](./system-prompts/tool-description-askuserquestion.md) (**194** tks) - 用于向用户提问的工具描述。
- [工具描述：Bash](./system-prompts/tool-description-bash.md) (**1067** tks) - Bash 工具的描述，允许 Claude 运行 shell 命令。
- [工具描述：Computer](./system-prompts/tool-description-computer.md) (**161** tks) - Chrome 浏览器计算机自动化工具的主描述。
- [工具描述：Edit](./system-prompts/tool-description-edit.md) (**278** tks) - 用于在文件中执行精确字符串替换的工具描述。
- [工具描述：EnterPlanMode](./system-prompts/tool-description-enterplanmode.md) (**970** tks) - 用于进入计划模式以探索和设计实现方法的工具描述。
- [工具描述：ExitPlanMode](./system-prompts/tool-description-exitplanmode.md) (**417** tks) - ExitPlanMode 工具的描述，它显示计划对话框供用户批准。
- [工具描述：Glob](./system-prompts/tool-description-glob.md) (**122** tks) - 用于文件模式匹配和按名称搜索的工具描述。
- [工具描述：Grep](./system-prompts/tool-description-grep.md) (**300** tks) - 使用 ripgrep 进行内容搜索的工具描述。
- [工具描述：LSP](./system-prompts/tool-description-lsp.md) (**255** tks) - LSP 工具的描述。
- [工具描述：NotebookEdit](./system-prompts/tool-description-notebookedit.md) (**121** tks) - 用于编辑 Jupyter notebook 单元格的工具描述。
- [工具描述：ReadFile](./system-prompts/tool-description-readfile.md) (**439** tks) - 用于读取文件的工具描述。
- [工具描述：Skill](./system-prompts/tool-description-skill.md) (**442** tks) - 用于在主对话中执行技能的工具描述。
- [工具描述：TaskCreate](./system-prompts/tool-description-taskcreate.md) (**558** tks) - TaskCreate 工具的工具描述。
- [工具描述：Task](./system-prompts/tool-description-task.md) (**1311** tks) - 用于启动专门的子代理来处理复杂任务的工具描述。
- [工具描述：TeammateTool 的操作参数](./system-prompts/tool-description-teammatetools-operation-parameter.md) (**173** tks) - TeammateTool 操作参数的工具描述。
- [工具描述：TeammateTool](./system-prompts/tool-description-teammatetool.md) (**3811** tks) - TeammateTool 的工具描述。
- [工具描述：TodoWrite](./system-prompts/tool-description-todowrite.md) (**2167** tks) - 用于创建和管理任务列表的工具描述。
- [工具描述：ToolSearch](./system-prompts/tool-description-toolsearch.md) (**792** tks) - 用于在使用前加载和搜索延迟工具的工具描述。
- [工具描述：WebFetch](./system-prompts/tool-description-webfetch.md) (**297** tks) - 用于 Web 获取功能的工具描述。
- [工具描述：WebSearch](./system-prompts/tool-description-websearch.md) (**329** tks) - 用于 Web 搜索功能的工具描述。
- [工具描述：Write](./system-prompts/tool-description-write.md) (**159** tks) - 用于创建和覆盖单个文件的工具描述。

**某些工具描述的额外说明**

- [工具描述：Bash（Git 提交和 PR 创建说明）](./system-prompts/tool-description-bash-git-commit-and-pr-creation-instructions.md) (**1557** tks) - 用于创建 git 提交和 GitHub 拉取请求的说明。
- [工具描述：Bash（沙箱说明）](./system-prompts/tool-description-bash-sandbox-note.md) (**454** tks) - 关于 bash 命令沙箱的说明。
