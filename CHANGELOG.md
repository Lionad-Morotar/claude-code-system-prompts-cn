<!--
注意：**NEW:** 仅用于全新的提示词文件，而不是现有提示词中的新增/章节。
-->

### Claude Code 系统提示词变更日志

# [2.1.77](https://github.com/Piebald-AI/claude-code-system-prompts/commit/87fae2a)

_+6,494 tokens_

- **NEW:** Skill: /init CLAUDE.md 和技能设置（新版本）—— 一个全面的引导流程，用于在当前仓库中设置 CLAUDE.md 和相关技能/钩子，包括代码库探索、用户访谈和迭代提案优化。
- **NEW:** Skill: update-config（7步验证流程）—— 一个引导 Claude 完成7步流程以构建和验证 Claude Code 钩子的技能，确保它们在用户的特定项目环境中正常工作。
- Data: Claude API 参考 —— Java —— SDK 版本从 2.15.0 升级到 2.16.0；添加了 Memory Tool 章节，包含 `BetaMemoryToolHandler` 示例，展示如何使用 `BetaToolRunner` 实现基于文件系统的内存后端。
- Data: Tool use concepts —— 将 Java 添加到提供内存工具后端辅助类/函数的 SDK 列表中。
- Skill: /loop 斜杠命令 —— 将操作步骤重新格式化为编号列表；添加了第3步，指示 Claude 立即执行解析后的提示词，而不是等待第一次 cron 触发（通过 Skill 工具调用斜杠命令或直接执行）。
- Skill: /stuck 斜杠命令 —— 仅在发现卡住会话时才发送 Slack 报告（不再发送一切正常的消息）；引入了两消息结构，包含简短顶层消息和线程详细回复，以提高频道可读性；在线程回复中添加了相关调试日志尾部或 `sample` 输出。
- Skill: Update Claude Code Config —— 添加了对新 constructing-hook 提示词的引用；将 prettier 钩子示例命令从 `xargs prettier --write` 更新为更安全的 `read -r f; prettier --write "$f"` 模式。

# [2.1.76](https://github.com/Piebald-AI/claude-code-system-prompts/commit/6cc7a81)

_+43 tokens_

- Skill: /init CLAUDE.md 和技能设置（新版本）—— 修复了步骤编号（从步骤1、2、2、4 → 步骤1、2、3、4）。

# [2.1.75](https://github.com/Piebald-AI/claude-code-system-prompts/commit/3a7b4b2)

_+2,104 tokens_

- **NEW:** Skill: /init CLAUDE.md 和技能设置（新版本）—— 一个全面的引导流程，用于在当前仓库中设置 CLAUDE.md 和相关技能/钩子，包括代码库探索、用户访谈和迭代提案优化。
- **NEW:** Skill: update-config（7步验证流程）—— 一个引导 Claude 完成7步流程以构建和验证 Claude Code 钩子的技能，确保它们在用户的特定项目环境中正常工作。
- **NEW:** Data: Claude API 参考 —— Java —— Java SDK 示例代码，展示如何初始化 Anthropic 客户端、创建消息、处理工具使用和实现内存工具。
- **NEW:** Data: 工具使用概念 —— 关于工具使用核心概念的文档，包括工具定义格式、工具结果格式、实现模式（函数式、基于类、多工具）以及支持工具使用的 SDK。
- **REMOVED:** Skill: /init CLAUDE.md 和技能设置（旧版本）—— 被新版本替代。
- **REMOVED:** Skill: update-config（旧版本）—— 被新版本替代。

# [2.1.74](https://github.com/Piebald-AI/claude-code-system-prompts/commit/3b9438c)

_+1,047 tokens_

- **NEW:** Agent Prompt: Bash 命令描述编写器 —— 为 bash 命令生成清晰、简洁的主动语态命令描述的说明。
- **NEW:** Agent Prompt: Bash 命令解释器 —— 解释 bash 命令的说明，包含推理、风险评估和风险级别分类。
- **NEW:** Agent Prompt: Remember 技能 —— /remember 技能的系统提示词，用于回顾会话记忆并使用重复模式和学习更新 CLAUDE.local.md。
- **REMOVED:** Agent Prompt: Bash 命令风险分类器 —— 被新的 bash 命令解释器代理替代。
- Tool Description: Bash —— 更新了描述字段说明，为复杂命令（管道命令、晦涩标志等）提供更多上下文，同时保持简单命令简洁。
- Tool Description: Bash（Git 提交和 PR 创建说明）—— 添加了警告，永远不要使用 `git status -uall` 标志，因为它可能导致大型仓库的内存问题。
- Tool Description: Task —— 更新了内部变量引用并改进了后台代理监控说明。

# [2.1.73](https://github.com/Piebald-AI/claude-code-system-prompts/commit/701b0e2)

_-24 tokens_

- Tool Description: Bash —— 在元数据中将 `GIT_COMMIT_AND_PR_CREATION_INSTRUCTION` 变量替换为 `BASH_TOOL_NAME` 变量。
- Tool Description: Task —— 重新排序了变量声明，将 `IS_TRUTHY_FN` 和 `PROCESS_OBJECT` 移到列表前面。

# [2.1.72](https://github.com/Piebald-AI/claude-code-system-prompts/commit/42537cb)

_-19 tokens_

- Tool Description: Bash —— 将 `run_in_background` 参数文档移到新的 `BASH_BACKGROUND_TASK_NOTES_FN` 函数变量；添加了 `BASH_TOOL_EXTRA_NOTES()` 占位符；修复了专用工具列表中错位的变量引用（文件搜索、内容搜索、读取文件、编辑文件、写入文件各自引用了错误的工具名称）。
- Tool Description: Task —— 添加了 `IS_TRUTHY_FN` 和 `PROCESS_OBJECT` 变量用于条件渲染；后台任务说明现在基于 `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` 环境变量进行条件渲染。

# [2.1.71](https://github.com/Piebald-AI/claude-code-system-prompts/commit/1be49c8)

_+948 tokens_

- **NEW:** System Prompt: Claude in Chrome 浏览器自动化 —— 有效使用 Claude in Chrome 浏览器自动化工具的说明。
- **NEW:** Tool Description: Computer —— Chrome 浏览器计算机自动化工具的主描述。
- **NEW:** Tool Description: Computer action parameter —— 与 Computer 工具一起使用的计算机操作参数的描述。
- Tool Description: Bash（Git 提交和 PR 创建说明）—— 扩展了修订安全规则，明确条件：（1）用户请求或钩子自动修改文件，（2）HEAD 由你创建，（3）尚未推送；添加了关于被拒绝的钩子和已推送提交的关键警告；澄清了钩子失败与自动修改的处理。
- **REMOVED:** Agent Prompt: Prompt suggestion generator
- **REMOVED:** System Reminder: MCP CLI large output

# [2.1.70](https://github.com/Piebald-AI/claude-code-system-prompts/commit/d1f3263)

_+2283 tokens_

- **NEW:** Agent Prompt: /review-pr 斜杠命令 —— 使用代码分析审查 GitHub PR 的系统提示词。
- **NEW:** Agent Prompt: Task tool（额外说明）—— Task 工具使用的额外说明（绝对路径、无表情符号、工具调用前无冒号）。
- **NEW:** System Reminder: Delegate mode prompt —— 具有受限工具访问权限的委托模式的系统提醒。
- **NEW:** Tool Description: MCPSearch —— 在使用前搜索/选择 MCP 工具的工具（强制先决条件）。
- **NEW:** Tool Description: MCPSearch（with available tools）—— 列出可用 MCP 工具的 MCPSearch 变体。
- **NEW:** Tool Description: TaskList —— 列出任务列表中所有任务的工具。
- **NEW:** Tool Description: TeammateTool's operation parameter —— TeammateTool 操作（spawn、assignTask、claimTask、shutdown 等）的描述。
- Agent Prompt: Status line setup —— 在 context_window 模式中添加了 `current_usage` 对象，包含 `input_tokens`、`output_tokens`、`cache_creation_input_tokens` 和 `cache_read_input_tokens` 字段；添加了计算上下文窗口百分比的示例。
- Tool Description: TaskUpdate —— 添加了解决任务后调用 TaskList 的说明；添加了关于队友在工作时添加评论的说明。

#### [2.1.69](https://github.com/Piebald-AI/claude-code-system-prompts/commit/b1a1784488f3f3bccdbe5bc6449c0ba6a34e4b39)

<sub>_v2.1.69 中系统提示词无变更。_</sub>

# [2.1.68](https://github.com/Piebald-AI/claude-code-system-prompts/commit/56e7a6a14afc956118ad8458b23aaa073d97416b)

_-191 tokens_

- Main system prompt: 添加了关于工具调用前不使用冒号的说明（"Let me read the file." 而不是 "Let me read the file:"）
- **REMOVED:** Agent Prompt: /review-pr 斜杠命令

#### [2.1.67](https://github.com/Piebald-AI/claude-code-system-prompts/commit/11cb562530596ac533e8ca1c0b8e59c56d59e68a)

<sub>_v2.1.67 中系统提示词无变更。_</sub>

# [2.1.66](https://github.com/Piebald-AI/claude-code-system-prompts/commit/fa26cb89380bbb0f83117a14015104defa41861e)

_+172 tokens_

- **NEW:** System Prompt: Scratchpad directory —— 使用专用会话特定草稿目录而不是 `/tmp` 的临时文件说明。

# [2.1.65](https://github.com/Piebald-AI/claude-code-system-prompts/commit/c527901340dda30950eb667af9d7a31d7dcb30ee)

_+97 tokens_

- Agent Prompt: Status line setup —— 在状态行数据模式中添加了 `context_window` 对象，包含 `total_input_tokens`、`total_output_tokens` 和 `context_window_size` 字段。
- `LSP` tool: 添加了 `goToImplementation` 操作；将行/字符文档从0索引更改为1索引。

#### [2.1.64](https://github.com/Piebald-AI/claude-code-system-prompts/commit/824243c6fb80fefb4f3ed1d5f6c489df908e0663)

<sub>_v2.1.64 中系统提示词无变更。_</sub>

# [2.1.63](https://github.com/Piebald-AI/claude-code-system-prompts/commit/f3953ffe61eef3dbf6cdb232041f4b39bd2f4a7b)

_+10 tokens_

- Main system prompt: 在配置变量插值中添加了 `BUILD_TIME`。

# [2.1.62](https://github.com/Piebald-AI/claude-code-system-prompts/commit/69bdc5ab93ccf071b44eb4aac29507ccd64d0b25)

_+381 tokens_

- **NEW:** `AskUserQuestion` tool description —— 包含通过在标签后添加 "(Recommended)" 来推荐选项的指南。
- Main system prompt: 添加了关于完整完成任务而不中途停止或声称上下文限制阻止完成的说明。
- `EnterPlanMode` tool: 重大重写，鼓励对非平凡任务主动使用；扩展了"何时使用"示例，包括新功能和代码修改；将指南从"偏向实现"转变为"偏向规划"。
- `Skill` tool: 添加了在相关时立即调用技能工具作为第一个操作的阻塞要求，然后再生成任何其他响应。
- `Task` tool: 添加了 `resume` 参数文档，用于继续具有保留上下文的代理；澄清了后续工作的代理 ID 返回。
- `WebFetch` tool: 简化了 MCP 工具偏好说明（删除了 "All MCP-provided tools start with mcp__"）。

#### [2.1.61](https://github.com/Piebald-AI/claude-code-system-prompts/commit/09e9a9f1961da38ce3b9d6f771f071e43b4746ea)

<sub>_v2.1.61 中系统提示词无变更。_</sub>

# [2.1.60](https://github.com/Piebald-AI/claude-code-system-prompts/commit/7b38ff38e8fc1b6f4e1a88b3d41f0a6d4e70f7c8)

_+1339 tokens_

- **NEW:** System Reminder: Team Coordination —— 基于团队的多代理工作流程说明，包含团队配置、任务列表路径和队友消息传递。
- **NEW:** Agent Prompt: Exit plan mode with swarm —— 当 `ExitPlanMode` 启用 `isSwarm` 时启动工作集群的说明。
- Agent Prompt: Claude Code guide agent → **重命名**为 Claude guide agent，扩展范围涵盖 Claude Code、Claude Agent SDK 和 Claude API（原 Anthropic API）。
- `Task` tool: 添加了 `run_in_background` 参数文档和用于检索后台代理结果的 `TaskOutput` 工具使用。
- `TaskUpdate` tool: 重大扩展，包含任务所有权要求、团队协调、认领任务和详细字段文档。
- `WebFetch` tool: 基于受信任域状态添加了条件说明（受信任域的更简单说明）。
- **REMOVED:** System Prompt: whenToUse note for claude-code-guide subagent（功能合并到更新的指南代理中）。

# [2.1.59](https://github.com/Piebald-AI/claude-code-system-prompts/commit/f01489b6be5c888d3e53a02609710628a29c9a0b)

_+140 tokens_

- **NEW:** 添加了新的 `TaskUpdate` 工具，允许 Claude 更新任务列表。

# [2.1.58](https://github.com/Piebald-AI/claude-code-system-prompts/commit/d1437449dddae84e888f4751e18add2e6153e135)

_+21 tokens_

- Session notes template: 添加了新的 "Current State" 章节，用于跟踪活跃工作和待处理任务。
- Session notes template: 将 "User Corrections / Mistakes" 重命名为 "Errors & Corrections" 并扩展了描述。
- Session notes instructions: 强调在压缩后更新 "Current State" 以保持连续性。
- Session notes instructions: 删除了关于不重复过去会话摘要的说明。
- Session notes instructions: 修复了 markdown 标题引用（`'##'` → `'#'`）。
- Documentation URL: 从 `docs.claude.com/s/claude-code` 更改为 `code.claude.com/docs/en/overview`。
- GitHub Action templates: 将 CLI 参考 URL 更新为 `code.claude.com/docs/en/cli-reference`。

#### [2.1.57](https://github.com/Piebald-AI/claude-code-system-prompts/commit/8b2ecb38493daf677fcba54746d2c3e40de6f657)

<sub>_v2.1.57 中系统提示词无变更。_</sub>

# [2.1.56](https://github.com/Piebald-AI/claude-code-system-prompts/commit/47571b6ad6110bebc89553bba49ebcf94f4605fc)

_-134 tokens_

- 在 WebSearch 工具描述中加强了关于使用当前年份的说明。
- 在主系统提示词中添加了说明，指示 Claude 在呈现选项或计划时永远不要包含时间估计。
- 加强并详细说明了 "plan mode is active" 系统提醒。
- 鼓励 Explore 子代理在工具调用和 token 使用上更高效。
- 在 Plan 子代理中添加了 _"Read any files provided to you in the initial prompt"_ 的说明。
- 将提示建议生成器的提示主题从 _"predict what the user will type next"_ 更改为 _"suggest what Claude could help with"_。
- 当 `claude-code-guide` 子代理无法处理时，停止通过 `/feedback` 引导用户在 Claude Code 仓库上打开 GH。
- 删除了旧的计划模式系统提醒。

# [2.1.55](https://github.com/Piebald-AI/claude-code-system-prompts/commit/5c2f24217280a6c0a0b0ae5f80ba7f195e874ed0)

_+121 tokens_

- **NEW:** 添加了 **Agent Prompt: Suggested Prompt Generator**，用于在 Claude 响应后建议后续提示词。需要 [tweakcc](https://github.com/Piebald-AI/tweakcc) 才能在 Claude Code 中启用该功能：运行 `npx tweakcc@latest --apply`，然后运行 `claude`，然后发送消息。
- 修改了 mcp-cli 提示词中的插值格式化代码。

# [2.1.54](https://github.com/Piebald-AI/claude-code-system-prompts/commit/3bd3a890d18146df0f3699d276133fe92d68e4b5)

_+128 tokens_

- Multi-Agent Planning Note: 添加了关于不滥用多个计划代理的说明：_If the task is simple, you should try to use the minimum number of agents necessary (usually just 1)_
- 在 "Plan mode is active" 系统提醒中添加了类似的更长说明。

#### [2.1.53](https://github.com/Piebald-AI/claude-code-system-prompts/commit/9e92d4f32a00e248ad0883ae432658caa2eb298b)

<sub>_v2.1.53 中系统提示词无变更。_</sub>

# [2.1.52](https://github.com/Piebald-AI/claude-code-system-prompts/commit/74f41c979c84103343d0d92f086678911e0b7d36)

_+42 tokens_

- 在 Plan Mode Re-entry System Prompt 的程序步骤中添加了第4条说明：_"Continue on with the plan process and most importantly you should always edit the plan file one way or the other before calling ExitPlanMode._"

# [2.1.51](https://github.com/Piebald-AI/claude-code-system-prompts/commit/fea594c92014ec7c6133e771afc1a55a034a15ee)

_+906 tokens_

- **NEW:** 新 `EnterPlanMode` 工具的提示词。
- **NEW:** 代理钩子的提示词。

# [2.1.50](https://github.com/Piebald-AI/claude-code-system-prompts/commit/f19b049975ac24bf548b6c95dfe6a385c6bdf4a9)

_+465 tokens_

- **NEW:** 当 `mcp-cli read` 或 `mcp-cli call` 输出超过 `MAX_MCP_OUTPUT_TOKENS` 环境变量（默认为 `25000`）时发送的系统提醒。
- `WebSearch` tool description: 添加了执行网络搜索时必须包含 "Sources:" 章节的 "CRITICAL REQUIREMENT"。
- Session notes template: 添加了包含 "specific outputs" 的 "Key results" 章节，例如 "an answer to question, a table, or other document"。

# [2.1.49](https://github.com/Piebald-AI/claude-code-system-prompts/commit/ec960fe987da2dfdb026f733fcd30120ac1a116e)

- **Explore & Plan agents:**
  - 使用明确的禁止操作项目列表增强了 READ-ONLY 限制。
  - 添加了文件编辑工具不可用的说明。
  - 重新格式化了 Bash 工具限制以提高清晰度。

#### **2.1.48** &ndash; _此版本不存在。_

# [2.1.47](https://github.com/Piebald-AI/claude-code-system-prompts/commit/62075a9489f7edb416970b9e67605c288ce562ac)

- **NEW:** Agent prompt: Multi-Agent Planning Note —— 当 `CLAUDE_CODE_PLAN_V2_AGENT_COUNT` > 1 时的多代理规划说明。
- **NEW:** System reminder: Plan mode re-entry —— 用户在退出后重新进入 Plan 模式时发送。
- Main system prompt: 添加了 "NEVER propose changes to code you haven't read" 说明。
- Main system prompt: 添加了关于简单性的全面 "Avoid over-engineering" 章节。
- Enhanced plan mode reminder: 重构了变量名并简化了结构。
- Enhanced plan mode reminder: 修复了拼写错误 "Syntehsize" → "Synthesize"，"alwasy" → "always"。

#### [2.1.46](https://github.com/Piebald-AI/claude-code-system-prompts/commit/3f9c346)

<sub>_v2.1.46 中系统提示词无变更。_</sub>

# [2.1.45](https://github.com/Piebald-AI/claude-code-system-prompts/commit/9ed4378)

- **NEW:** Agent prompt: Claude Code guide agent，用于帮助用户使用 Claude Code 和 Agent SDK。
- **NEW:** Agent prompt: Session title and branch generation（替代 session title generation）。
- **NEW:** System prompt: whenToUse note for claude-code-guide subagent。
- Main system prompt: 更新为使用带有 claude-code-guide 子代理的 `Task` 工具而不是 `WebFetch` 进行文档查找。
- Enhanced plan mode reminder: 使用 `PLAN_V2_EXPLORE_AGENT_COUNT` 添加了并行探索支持。
- **REMOVED:** Agent prompt: Session title generation（被 session title and branch generation 替代）。

#### [2.1.44](https://github.com/Piebald-AI/claude-code-system-prompts/commit/1841396)

<sub>_v2.1.44 中系统提示词无变更。_</sub>

# [2.1.43](https://github.com/Piebald-AI/claude-code-system-prompts/commit/36fded1)

- **NEW:** Tool description: `ExitPlanMode` v2。
- **NEW:** System reminder: Plan mode is active (for subagents)。
- Main system prompt: 添加了 "Planning without timelines" 章节。
- Main system prompt: 添加了避免向后兼容性黑客的说明。
- Enhanced plan mode reminder: 使用计划文件支持和变量更新进行了重大重构。

#### [2.1.42](https://github.com/Piebald-AI/claude-code-system-prompts/commit/ec54e36)

<sub>_v2.1.42 中系统提示词无变更。_</sub>

# [2.1.41](https://github.com/Piebald-AI/claude-code-system-prompts/commit/0540858)

- **NEW:** Agent prompt: Plan mode (enhanced)。
- **NEW:** System reminder: Plan mode is active (enhanced)。
- Explore agent: 使用明确的禁止命令加强了 READ-ONLY 限制。
- Prompt Hook execution: 修复了 JSON 格式（在键周围添加了引号）。
- Main system prompt: 添加了 `FEEDBACK_CHANNEL` 变量。

#### **2.1.40** &ndash; _此版本不存在。_

#### **2.1.39** &ndash; _此版本不存在。_

#### **2.1.38** &ndash; _此版本不存在。_

# [2.1.37](https://github.com/Piebald-AI/claude-code-system-prompts/commit/a6eb810)

- **NEW:** Agent prompt: Prompt Hook execution。
- Main system prompt: 将 `isCodingRelated` 更改为 `keepCodingInstructions`。

# [2.1.36](https://github.com/Piebald-AI/claude-code-system-prompts/commit/5fd0f76)

- MCP CLI: 添加了用于读取资源的 `mcp-cli read` 命令。
- Main system prompt: 删除了 "Doing tasks" 章节中的空项目符号。
- `Skill` tool: 更新了示例以使用 `skill:` 而不是 `command:`。
- `SlashCommand` tool: 删除了 "Intent Matching" 章节，简化了格式化。

#### [2.1.35](https://github.com/Piebald-AI/claude-code-system-prompts/commit/f07e330)

<sub>_v2.1.35 中系统提示词无变更。_</sub>

# [2.1.34](https://github.com/Piebald-AI/claude-code-system-prompts/commit/66c833d)

- **NEW:** System prompt: MCP CLI instructions。
- Main system prompt: 添加了 "Asking questions as you work" 章节和 `ASKUSERQUESTION_TOOL_NAME`。
- `Task` tool: 添加了关于具有 "access to current context" 的代理的说明。
- Bash sandbox note: 添加了 `CONDITIONAL_NEWLINE_IF_SANDBOX_ENABLED` 变量。

# [2.1.33](https://github.com/Piebald-AI/claude-code-system-prompts/commit/d5f6b72)

- Main system prompt: 删除了额外的空行。

#### [2.1.32](https://github.com/Piebald-AI/claude-code-system-prompts/commit/8e7638b)

<sub>_v2.1.32 中系统提示词无变更。_</sub>

#### [2.1.31](https://github.com/Piebald-AI/claude-code-system-prompts/commit/61f41c8)

<sub>_v2.1.31 中系统提示词无变更。_</sub>

# [2.1.30](https://github.com/Piebald-AI/claude-code-system-prompts/commit/2c67463)

- **NEW:** Agent prompt: Update Magic Docs。
- **NEW:** Tool description: `LSP`。
- Main system prompt: 添加了 OWASP top 10 漏洞的安全警告。
- Plan mode reminder: 澄清了 `AskUserQuestion` 工具的使用。
- `ExitPlanMode` tool: 添加了包含示例的 "Handling Ambiguity in Plans" 章节。
- Bash sandbox note: 删除了 `RESTRICTIONS_LIST` 和临时文件说明。
- **REMOVED:** Agent prompt: Output style creation。

# [2.1.29](https://github.com/Piebald-AI/claude-code-system-prompts/commit/772bca0)

- `Task` tool: 重新添加了 `runsInBackground` 属性和 `AgentOutputTool` 使用说明。

# [2.1.28](https://github.com/Piebald-AI/claude-code-system-prompts/commit/91098d5)

- Main system prompt: 添加了 "Avoid using over-the-top validation or excessive praise" 指南。
- Plan mode reminder: 添加了 `NOTE_ABOUT_USING_PLAN_SUBAGENT` 变量。
- `Task` tool: 删除了 `runsInBackground` 属性和后台代理说明。

#### [2.1.27](https://github.com/Piebald-AI/claude-code-system-prompts/commit/88b0741)

<sub>_v2.1.27 中系统提示词无变更。_</sub>

# [2.1.26](https://github.com/Piebald-AI/claude-code-system-prompts/commit/7a800b2)

- Bash sandbox note: 将 `dangerouslyOverrideSandbox` 重命名为 `dangerouslyDisableSandbox`。

# [2.1.25](https://github.com/Piebald-AI/claude-code-system-prompts/commit/a0566f0)

- Session notes template: 添加了 "Session Title" 章节。
- Session notes update instructions: 增强了多编辑支持和更清晰的结构保留规则。
- `Bash` tool: 删除了关于不将 `run_in_background` 与 'sleep' 一起使用的说明。

# [2.1.24](https://github.com/Piebald-AI/claude-code-system-prompts/commit/bf4bfa4)

- **NEW:** Tool description: Bash (sandbox note)。

#### **2.1.23** &ndash; _此版本不存在。_

#### [2.1.22](https://github.com/Piebald-AI/claude-code-system-prompts/commit/f6910aa)

<sub>_v2.1.22 中系统提示词无变更。_</sub>

# [2.1.21](https://github.com/Piebald-AI/claude-code-system-prompts/commit/01354e8)

- Plan mode reminder: 添加了 `NOTE_ABOUT_AskUserQuestion` 变量。
- `ExitPlanMode` tool: 添加了 `NOTE_ABOUT_AskUserQuestion` 变量。

# [2.1.20](https://github.com/Piebald-AI/claude-code-system-prompts/commit/9319b91)

- **NEW:** Tool description: `Skill`。

#### [2.1.19](https://github.com/Piebald-AI/claude-code-system-prompts/commit/82803b4)

<sub>_v2.1.19 中系统提示词无变更。_</sub>

# [2.1.18](https://github.com/Piebald-AI/claude-code-system-prompts/commit/327b3dc)

- Explore agent: 将 "Be thorough" 指南更改为 "Adapt your search approach based on the thoroughness level specified by the caller"。

# [2.1.17](https://github.com/Piebald-AI/claude-code-system-prompts/commit/8c27c21)

- Main system prompt: 添加了关于将 `Task` 工具与 Explore 子代理一起用于代码库探索的关键说明。
- Main system prompt: 添加了何时使用 Explore 代理与直接搜索的示例。
- Main system prompt: 添加了新变量（`EXPLORE_AGENT`、`GLOB_TOOL_NAME`、`GREP_TOOL_NAME`）。

#### **2.1.16** &ndash; _此版本不存在。_

# [2.1.15](https://github.com/Piebald-AI/claude-code-system-prompts/commit/ed40efa)

- 更新了 `ExitPlanMode` 工具描述格式（添加了 "Examples" 标题）。
- Plan mode reminder 中的轻微标点修复。

# [2.1.14](https://github.com/Piebald-AI/claude-code-system-prompts/commit/8b3c574)

初始全面的系统提示词集合。

**Agent Prompts:**
- Agent creation architect
- Bash command file path extraction
- Bash command prefix detection
- Bash output summarization
- Claude.md creation
- Conversation summarization (with additional instructions variant)
- Explore agent
- Output style creation
- PR comments slash command
- Review PR slash command
- Security review slash command
- Session notes template and update instructions
- Session title generation
- Status line setup
- Task tool agent
- User sentiment analysis
- WebFetch summarizer

**GitHub Integration:**
- GitHub Actions workflow for @claude mentions
- GitHub Actions workflow for automated code review (beta)
- GitHub App installation PR description

**System Prompts:**
- Main system prompt
- Learning mode and learning mode insights
- Plan mode is active reminder

**Tool Descriptions:**
- Bash (with git commit and PR creation instructions)
- Edit
- ExitPlanMode
- Glob
- Grep
- NotebookEdit
- Read file
- SlashCommand
- Task (with async return note)
- TodoWrite
- WebFetch
- WebSearch
- Write
