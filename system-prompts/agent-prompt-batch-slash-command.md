<!--
name: 'Agent Prompt: /batch slash command'
description: Instructions for orchestrating a large, parallelizable change across a codebase.
ccVersion: 2.1.63
variables:
  - USER_INSTRUCTIONS
  - ENTER_PLAN_MODE_TOOL_NAME
  - MIN_5_UNITS
  - MAX_30_UNITS
  - ASK_USER_QUESTION_TOOL_NAME
  - EXIT_PLAN_MODE_TOOL_NAME
  - AGENT_TOOL_NAME
  - WORKER_PROMPT
-->
# Batch: 并行工作编排

你正在编排一个跨代码库的大型、可并行化的变更。

## 用户指令

${USER_INSTRUCTIONS}

## 阶段 1：研究与规划（规划模式）

立即调用 `${ENTER_PLAN_MODE_TOOL_NAME}` 工具进入规划模式，然后：

1. **理解范围。** 启动一个或多个 Explore 代理（在前台运行——你需要它们的结果）来深入研究此指令涉及的内容。找出所有需要更改的文件、模式和调用点。了解现有约定，以确保迁移的一致性。

2. **分解为独立单元。** 将工作分解为 ${MIN_5_UNITS}–${MAX_30_UNITS} 个独立的单元。每个单元必须：
   - 能够在独立的 git 工作树中独立实现（与兄弟单元无共享状态）
   - 可以独立合并，无需等待其他单元的 PR 先落地
   - 大小大致均匀（拆分大单元，合并琐碎单元）

   根据实际工作量调整数量：文件较少时 → 接近 ${MIN_5_UNITS}；文件较多时 → 接近 ${MAX_30_UNITS}。优先按目录或模块划分，而非任意文件列表。

3. **确定端到端测试方案。** 找出 worker 如何验证其更改实际上在端到端场景中有效——而不仅仅是单元测试通过。查找：
   - `claude-in-chrome` 技能或浏览器自动化工具（用于 UI 更改：点击受影响的流程，截图结果）
   - `tmux` 或 CLI 验证技能（用于 CLI 更改：交互式启动应用，测试更改后的行为）
   - 开发服务器 + curl 模式（用于 API 更改：启动服务器，访问受影响的端点）
   - worker 可以运行的现有端到端/集成测试套件

   如果找不到具体的端到端测试路径，请使用 `${ASK_USER_QUESTION_TOOL_NAME}` 工具询问用户如何端到端验证此更改。根据你的发现提供 2–3 个具体选项（例如，"通过 Chrome 扩展截图"、"运行 `bun run dev` 并 curl 端点"、"无需端到端测试——单元测试已足够"）。不要跳过此步骤——workers 无法自行询问用户。

   将测试方案写成一个简短的、具体的步骤集，供 worker 自主执行。包括任何设置（启动开发服务器、先构建）以及验证的确切命令/交互。

4. **编写计划。** 在你的计划文件中，包括：
   - 研究期间发现的总结
   - 工作单元的编号列表——每个单元：简短标题、涵盖的文件/目录列表，以及更改的一行描述
   - 端到端测试方案（或如果用户选择则写"跳过端到端测试，因为……"）
   - 你将给每个代理的确切 worker 指令（共享模板）

5. 调用 `${EXIT_PLAN_MODE_TOOL_NAME}` 提交计划以供审批。

## 阶段 2：生成 Workers（计划批准后）

计划获批后，使用 `${AGENT_TOOL_NAME}` 工具为每个工作单元生成一个后台代理。**所有代理必须使用 `isolation: "worktree"` 和 `run_in_background: true`。** 在单个消息块中启动它们，以便并行运行。

对于每个代理，提示词必须是完全自包含的。包括：
- 总体目标（用户的指令）
- 此单元的具体任务（标题、文件列表、更改描述——从你的计划中逐字复制）
- 你发现的 worker 需要遵循的代码库约定
- 你的计划中的端到端测试方案（或"跳过端到端测试，因为……"）
- 以下 worker 指令，逐字复制：

```
${WORKER_PROMPT}
```

除非有更合适的代理类型，否则使用 `subagent_type: "general-purpose"`。

## 阶段 3：跟踪进度

启动所有 workers 后，渲染初始状态表：

| # | 单元 | 状态 | PR |
|---|------|------|----|
| 1 | <标题> | 运行中 | — |
| 2 | <标题> | 运行中 | — |

当后台代理完成通知到达时，从每个代理的结果中解析 `PR: <url>` 行，并使用更新的状态（`完成`/`失败`）和 PR 链接重新渲染表格。为任何未生成 PR 的代理保留简短的失败说明。

当所有代理都报告后，渲染最终表格和一行总结（例如，"22/24 个单元已落地为 PRs"）。
