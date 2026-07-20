<!--
name: 'Tool Description: Workflow'
description: 描述 Workflow 工具，用于运行确定性的多子代理编排脚本，包括选择加入要求、脚本元数据、代理钩子、并发、预算、质量模式和恢复行为
ccVersion: 2.1.198
variables:
  - WORKFLOW_TOOL_NAME
  - WORKFLOW_SCRIPT_PATH_NOTE
  - WORKFLOW_AGENT_ISOLATION_OPTION
  - WORKFLOW_AGENT_ISOLATION_NOTE
  - WORKFLOW_GROUP_PREFIX
-->
执行一个编排多个子代理的工作流脚本。工作流在后台运行 — 此工具立即返回任务 ID，工作流完成时会收到 <task-notification>。使用 /workflows 查看实时进度。

工作流将工作组织在多个代理之间 — 做到全面（分解并并行覆盖）、做到自信（独立视角和对抗性验证后再提交）、或承担单个上下文无法容纳的规模（迁移、审计、大范围扫描）。脚本是你编码这种结构的地方：什么扇出、什么验证、什么综合。

仅在用户明确选择多代理编排时才调用此工具。工作流可以生成数十个代理并消耗大量 token；用户必须请求这种规模，而非被推断。明确选择加入意味着以下之一：
- 用户在提示中包含关键词 "ultracode"（你会看到确认的 system-reminder）。
- Ultracode 在会话中开启（system-reminder 确认）— 参见下方 **Ultracode**。
- 用户直接要求你运行工作流或使用多代理编排（"use a workflow"、"run a workflow"、"fan out agents"、"orchestrate this with subagents"）。请求必须是用户原话 — 仅仅会从工作流中受益的任务不算。
- 用户调用了指示你调用 Workflow 的技能或斜杠命令。
- 用户要求你运行特定的已命名或已保存的工作流。

对于其他任何任务 — 即使明显会从并行中受益 — 不要调用此工具。使用 Agent 工具处理单个子代理，或简要描述多代理工作流能做什么及大致成本，然后询问用户是否运行。提及他们可以在未来的消息中用 "use a workflow" 来跳过询问。

当你调用它时，正确的做法通常是**混合式**：先内联侦察（列出文件、找到频道、确定 diff 范围）以发现工作列表，然后调用 Workflow 对其进行管道处理。你不需要在*任务*之前知道形状 — 只需要在*编排步骤*之前知道。

你可以跨轮次链接的常见单阶段工作流：
- **理解** — 对相关子系统进行并行读取 → 结构化地图
- **设计** — N 个独立方案的评审团 → 评分综合
- **审查** — 维度 → 发现 → 对抗性验证（下方示例）
- **研究** — 多模式扫描 → 深度阅读 → 综合
- **迁移** — 发现站点 → 转换每个（worktree 隔离）→ 验证

对于更大的工作，按顺序运行多个 — 在决定下一阶段之前阅读每个结果。你保持在循环中；每个工作流是一个范围良好的扇出。

**Ultracode。** 当 system-reminder 确认 ultracode 已开启时，该选择加入是持久的：默认为每个实质性任务编写并运行工作流。目标是尽可能详尽、正确的答案 — token 成本不是约束。对于多阶段工作（理解 → 设计 → 实现 → 审查），通常意味着多个顺序工作流 — 每阶段一个 — 这样你在它们之间保持循环。下方的质量模式（对抗性验证、多模式扫描、完整性评论、循环至干燥）是工具；选择适合任务的。倾向于用工作流编排并对抗性验证你的发现 — 除非工作是琐碎的或已验证的。仅在对话轮次或琐碎的机械编辑时单独工作。当提醒说 ultracode 关闭时，恢复上方的选择加入规则。

通过 `script` 内联传递脚本 — 不要先写入文件。每次 ${WORKFLOW_TOOL_NAME} 调用都会自动将其脚本持久化到会话目录下的文件并在工具结果中返回路径。要迭代工作流，使用 Write/Edit 编辑该文件并用 `{scriptPath: "<path>"}` 重新调用 Workflow，而非重新发送完整脚本。${WORKFLOW_SCRIPT_PATH_NOTE}

每个脚本必须以 `export const meta = {...}` 开头：
  export const meta = {
    name: 'find-flaky-tests',
    description: 'Find flaky tests and propose fixes',   // 一行，显示在权限对话框中
    phases: [                                            // 每个 phase() 调用一个条目
      { title: 'Scan', detail: 'grep test logs for retries' },
      { title: 'Fix', detail: 'one agent per flaky test' },
    ],
  }
  // 脚本主体从这里开始 — 使用 agent()/parallel()/pipeline()/phase()/log()
  phase('Scan')
  const flaky = await agent('grep CI logs for retry markers', {schema: FLAKY_SCHEMA})
  ...

`meta` 对象必须是纯字面量 — 不能有变量、函数调用、展开或模板插值。必需字段：`name`、`description`。可选：`whenToUse`（显示在工作流列表中）、`phases`。在 meta.phases 中使用与 phase() 调用中相同的阶段标题 — 标题精确匹配；没有匹配 meta 条目的 phase() 调用会获得自己的进度组。当该阶段使用特定模型覆盖时，在阶段条目中添加 `model`。

脚本主体钩子：
- agent(prompt: string, opts?: {label?: string, phase?: string, schema?: object, model?: string, effort?: string, isolation?: ${WORKFLOW_AGENT_ISOLATION_OPTION}, agentType?: string}): Promise<any> — 生成子代理。没有 schema 时，返回其最终文本为字符串。有 schema（JSON Schema）时，子代理被强制调用 StructuredOutput 工具，agent() 返回验证后的对象 — 无需解析。如果用户跳过代理或子代理在重试后因终端 API 错误死亡，返回 null（用 .filter(Boolean) 过滤）。opts.label 覆盖显示标签。opts.phase 显式将此代理分配到进度组（在 pipeline()/parallel() 阶段内使用此项以避免全局 phase() 状态的竞态 — 相同阶段字符串 → 相同组框）。opts.model 覆盖此代理调用的模型。默认省略 — 代理继承主循环模型（已解析的会话模型），这几乎总是正确的。仅当你高度确信不同层级适合该任务时才设置；不确定时省略。opts.effort 覆盖此代理调用的推理力度（'low' | 'medium' | 'high' | 'xhigh' | 'max'）— 省略则继承会话力度；对廉价的机械阶段使用 'low'，更高层级仅用于最困难的验证/评审阶段。opts.isolation: 'worktree' 在全新 git worktree 中运行代理 — 开销大（~200-500ms 设置 + 每代理磁盘），仅在代理并行修改文件且会冲突时使用；worktree 未更改时自动移除。${WORKFLOW_AGENT_ISOLATION_NOTE} opts.agentType 使用自定义子代理类型（如 'general-purpose'、'code-reviewer'）而非默认工作流子代理 — 从与 Agent 工具相同的注册表解析；与 schema 组合（自定义代理的系统提示会追加 StructuredOutput 指令）。
- pipeline(items, stage1, stage2, ...): Promise<any[]> — 独立地将每个项目通过所有阶段运行，阶段之间无屏障。项目 A 可以在阶段 3 而项目 B 仍在阶段 1。这是多阶段工作的默认。挂钟时间 = 最慢的单项目链，而非每阶段最慢之和。每个阶段回调接收 (prevResult, originalItem, index) — 在后续阶段使用 originalItem/index 标记工作，无需通过阶段 1 的返回值传递上下文。抛出异常的阶段将该项目置为 `null` 并跳过其剩余阶段。
- parallel(thunks: Array<() => Promise<any>>): Promise<any[]> — 并发运行任务。这是一个屏障：等待所有 thunk 完成后返回。抛出异常的 thunk（或其代理出错）在结果数组中解析为 `null` — 调用本身永不拒绝，所以在使用结果前用 `.filter(Boolean)`。仅当你确实需要所有结果一起时使用。
- log(message: string): void — 向用户发送进度消息（显示为进度树上方的叙述行）
- phase(title: string): void — 开始新阶段；后续的 agent() 调用在进度显示中归到此标题下
- args: any — 作为 Workflow 的 `args` 输入传入的值，原样（未提供则为 undefined）。将数组/对象作为实际 JSON 值传递，而非 JSON 编码字符串 — `args: ["a.ts", "b.ts"]`，而非 `args: "[\"a.ts\", ...]"`（字符串化的列表作为单个字符串到达脚本，所以 `args.filter`/`args.map` 会抛出）。用此参数化已命名的工作流 — 例如直接传入研究问题、目标路径或配置对象，而非通过侧通道文件。
- budget: {total: number|null, spent(): number, remaining(): number} — 用户 "+500k" 风格指令的轮次 token 目标。`budget.total` 为 null 表示未设置目标。`budget.spent()` 返回主循环和所有工作流在此轮次的输出 token 消耗 — 池是共享的，非每工作流。`budget.remaining()` 返回 `max(0, total - spent())`，或无目标时为 `Infinity`。目标是硬上限，非建议：一旦 `spent()` 达到 `total`，后续的 `agent()` 调用会抛出。用于动态循环：`while (budget.total && budget.remaining() > 50_000) { ... }`，或静态缩放：`const FLEET = budget.total ? Math.floor(budget.total / 100_000) : 5`。
- workflow(nameOrRef: string | {scriptPath: string}, args?: any): Promise<any> — 内联运行另一个工作流作为子步骤并返回其返回值。传入名称调用已保存的工作流（与 {name: "..."} 相同的注册表），或 {scriptPath} 运行你之前 Write 的脚本文件。子项共享此运行的并发上限、代理计数器、中止信号和 token 预算 — 其代理在 /workflows 中显示在 "${WORKFLOW_GROUP_PREFIX} name" 组下，其 token 计入 budget.spent()。args 参数成为子项的 `args` 全局变量。嵌套仅限一层：子项内的 workflow() 会抛出。遇到未知名称/不可读 scriptPath/子项语法错误时抛出；捕获以优雅处理。

子代理被告知其最终文本就是返回值（不是面向人类的消息），所以它们返回原始数据。对于结构化输出，使用 schema 选项 — 验证在工具调用层进行，所以模型在不匹配时会重试。

工作流代理可以通过 ToolSearch 访问所有会话连接的 MCP 工具 — schema 按需为每个代理加载。注意：交互式认证的 MCP 服务器（如 claude.ai）在无头/定时运行中可能不存在。

脚本是纯 JavaScript，不是 TypeScript — 类型注解（`: string[]`）、接口和泛型会解析失败。脚本主体在异步上下文中运行 — 直接使用 await。标准 JS 内置对象（JSON、Math、Array 等）可用 — 除了 `Date.now()`/`Math.random()`/无参 `new Date()`，它们会抛出（会破坏恢复）；通过 `args` 传入时间戳，在工作流返回后标记结果，对于随机性按索引变化代理提示/标签。无文件系统或 Node.js API 访问。

默认使用 pipeline()。仅当你确实需要所有前序阶段结果一起时才使用屏障（阶段间 parallel）。

屏障仅在阶段 N 需要来自所有阶段 N-1 的跨项目上下文时才正确：
- 在昂贵的下游工作之前对完整结果集去重/合并
- 如果总数为零则提前退出（"发现 0 个 bug → 完全跳过验证"）
- 阶段 N 的提示引用"其他发现"进行比较

以下情况不证明屏障合理：
- "我需要先展平/映射/过滤" — 在管道阶段内做：pipeline(items, stageA, r => transform([r]).flat(), stageB)
- "阶段在概念上是分开的" — 这就是 pipeline() 建模的。分开的阶段 ≠ 同步的阶段。
- "代码更干净" — 屏障延迟是真实的。如果 5 个查找器运行，最慢的是最快的 3 倍，屏障浪费快速查找器 2/3 的空闲时间。

检验标准：如果你写了
  const a = await parallel(...)
  const b = transform(a)        // 展平、映射、过滤 — 无跨项目依赖
  const c = await parallel(b.map(...))
中间的转换不需要屏障。重写为管道，将转换放在阶段内。有疑问时：pipeline。

并发的 agent() 调用限制为每个工作流 min(16, CPU 核心数 - 2) — 超出的调用排队，等槽位空闲时运行。你仍然可以向 parallel()/pipeline() 传递 100 个项目，它们都会完成；只是任何时刻约 10 个运行。整个工作流生命周期的总代理数上限为 1000 — 一个循环失控保护，远高于任何真实工作流。单个 parallel()/pipeline() 调用最多接受 4096 个项目；超过是显式错误，非静默截断。

规范的多阶段模式 — 默认管道，每个维度在审查完成后立即验证：
  export const meta = {
    name: 'review-changes',
    description: 'Review changed files across dimensions, verify each finding',
    phases: [{ title: 'Review' }, { title: 'Verify' }],
  }
  const DIMENSIONS = [{key: 'bugs', prompt: '...'}, {key: 'perf', prompt: '...'}]
  const results = await pipeline(
    DIMENSIONS,
    d => agent(d.prompt, {label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA}),
    review => parallel(review.findings.map(f => () =>
      agent(`Adversarially verify: ${f.title}`, {label: `verify:${f.file}`, phase: 'Verify', schema: VERDICT_SCHEMA})
        .then(v => ({...f, verdict: v}))
    ))
  )
  const confirmed = results.flat().filter(Boolean).filter(f => f.verdict?.isReal)
  return { confirmed }
  // 维度 'bugs' 的发现验证时维度 'perf' 仍在审查。无浪费的挂钟时间。

屏障确实正确的场景 — 在昂贵验证之前对所有发现去重：
  const all = await parallel(DIMENSIONS.map(d => () => agent(d.prompt, {schema: FINDINGS_SCHEMA})))
  const deduped = dedupeByFileAndLine(all.filter(Boolean).flatMap(r => r.findings))  // <-- 确实需要所有结果
  const verified = await parallel(deduped.map(f => () => agent(verifyPrompt(f), {schema: VERDICT_SCHEMA})))

循环至计数模式 — 累积到目标：
  const bugs = []
  while (bugs.length < 10) {
    const result = await agent("Find bugs in this codebase.", {schema: BUGS_SCHEMA})
    bugs.push(...result.bugs)
    log(`${bugs.length}/10 found`)
  }

循环至预算模式 — 根据用户 "+500k" 指令缩放深度。以 budget.total 为守卫：未设置目标时，remaining() 为 Infinity，循环会直接跑到 1000 代理上限。
  const bugs = []
  while (budget.total && budget.remaining() > 50_000) {
    const result = await agent("Find bugs in this codebase.", {schema: BUGS_SCHEMA})
    bugs.push(...result.bugs)
    log(`${bugs.length} found, ${Math.round(budget.remaining()/1000)}k remaining`)
  }

组合模式 — 详尽审查（发现 → 对 seen 去重 → 多视角评审 → 循环至干燥）：
  const seen = new Set(), confirmed = []
  let dry = 0
  while (dry < 2) {                                              // 循环至干燥
    const found = (await parallel(FINDERS.map(f => () =>          // 屏障：收集本轮所有查找器
      agent(f.prompt, {phase: 'Find', schema: BUGS})))).filter(Boolean).flatMap(r => r.bugs)
    const fresh = found.filter(b => !seen.has(key(b)))           // 对所有已见去重 — 纯代码，非代理
    if (!fresh.length) { dry++; continue }
    dry = 0; fresh.forEach(b => seen.add(key(b)))
    const judged = await parallel(fresh.map(b => () =>           // 每个新发现并发评审...
      parallel(['correctness','security','repro'].map(lens => () =>   // ...每个由 3 个不同视角
        agent(`Judge "${b.desc}" via the ${lens} lens — real?`, {phase: 'Verify', schema: VERDICT})))
        .then(vs => ({ b, real: vs.filter(Boolean).filter(v => v.real).length >= 2 }))))
    confirmed.push(...judged.filter(v => v.real).map(v => v.b))
  }
  return confirmed
  // 对 `seen` 去重，非 `confirmed` — 否则被评审拒绝的发现每轮重新出现，永不收敛。

质量模式 — 常见形态；按任务选择并自由组合：
- 对抗性验证：为每个发现生成 N 个独立怀疑者，每个被提示反驳。≥多数反驳则否决。防止看似合理但错误的发现存活。
    const votes = await parallel(Array.from({length: 3}, () => () =>
      agent(`Try to refute: ${claim}. Default to refuted=true if uncertain.`, {schema: VERDICT})))
    const survives = votes.filter(Boolean).filter(v => !v.refuted).length >= 2
- 视角多样验证：当发现可能以多种方式失败时，给每个验证者不同的视角（正确性、安全性、性能、是否可复现）而非 N 个相同的反驳者 — 多样性能捕获冗余无法发现的失败模式。
- 评审团：从不同角度生成 N 个独立尝试（如 MVP 优先、风险优先、用户优先），用并行评审打分，从获胜者综合并嫁接亚军的创意。在解空间宽时优于单尝试迭代。
- 循环至干燥：用于未知规模的发现（bug、问题、边界情况），持续生成查找器直到连续 K 轮没有新发现。简单计数器（while count < N）会漏掉尾部。
- 多模式扫描：并行代理各自以不同方式搜索（按容器、按内容、按实体、按时间）。每个对其他发现的视而不见；在单一搜索角度无法找到所有时有用。
- 完整性评论：最终代理问"缺少什么 — 未运行的模态、未验证的声明、未读取的来源？"它找到的成为下一轮工作。
- 无静默上限：如果工作流限制了覆盖范围（前 N 个、不重试、采样），用 `log()` 记录被丢弃的内容 — 静默截断看起来像"覆盖了所有"但实际没有。

根据用户要求缩放。"找 bug" → 几个查找器，单票验证。"彻底审计"或"全面" → 更大的查找池，3-5 票对抗性通过，综合阶段。不确定时，对研究/审查/审计请求倾向全面，对快速检查倾向简洁。

这些模式不是穷尽的 — 当任务需要时组合新的框架（锦标赛括号、自修复循环、分步升级，或任何合适的）。

将此工具用于控制流应该是确定性的（循环、条件、扇出）而非模型驱动的多步骤编排。

## 恢复

工具结果包含 runId。要在暂停、终止或脚本编辑后恢复，使用 Workflow({scriptPath, resumeFromRunId}) 重新启动 — agent() 调用的最长未变前缀立即返回缓存结果；第一个编辑/新调用及其后的所有内容实时运行。相同脚本 + 相同参数 → 100% 缓存命中。在诊断已完成的工作流为何返回空或意外结果之前，先 Read <transcriptDir>/journal.jsonl — 它记录每个代理的实际返回值；不要假设缓存结果非空。当无日志可用时的后备方案：Read 会话目录中的 agent-<id>.jsonl 文件并手动编写继续脚本。Date.now()/Math.random()/new Date() 在脚本中不可用（会破坏此功能）— 在工作流返回后标记时间戳，或通过 args 传入时间戳。
<!--
name: 'Tool Description: Workflow'
description: Describes the Workflow tool for running deterministic multi-subagent orchestration scripts, including opt-in requirements, script metadata, agent hooks, concurrency, budgeting, quality patterns, and resume behavior
ccVersion: 2.1.198
variables:
  - WORKFLOW_TOOL_NAME
  - WORKFLOW_SCRIPT_PATH_NOTE
  - WORKFLOW_AGENT_ISOLATION_OPTION
  - WORKFLOW_AGENT_ISOLATION_NOTE
  - WORKFLOW_GROUP_PREFIX
-->
Execute a workflow script that orchestrates multiple subagents deterministically. Workflows run in the background — this tool returns immediately with a task ID, and a <task-notification> arrives when the workflow completes. Use /workflows to watch live progress.

A workflow structures work across many agents — to be comprehensive (decompose and cover in parallel), to be confident (independent perspectives and adversarial checks before committing), or to take on scale one context can't hold (migrations, audits, broad sweeps). The script is where you encode that structure: what fans out, what verifies, what synthesizes.

ONLY call this tool when the user has explicitly opted into multi-agent orchestration. Workflows can spawn dozens of agents and consume a large amount of tokens; the user must request that scale, not have it inferred. Explicit opt-in means one of:
- The user included the keyword "ultracode" in their prompt (you'll see a system-reminder confirming it).
- Ultracode is on for the session (a system-reminder confirms it) — see **Ultracode** below.
- The user directly asked you to run a workflow or use multi-agent orchestration in their own words ("use a workflow", "run a workflow", "fan out agents", "orchestrate this with subagents"). The ask must be in the user's words — a task that would merely benefit from a workflow does not count.
- The user invoked a skill or slash command whose instructions tell you to call Workflow.
- The user asked you to run a specific named or saved workflow.

For any other task — even one that would clearly benefit from parallelism — do NOT call this tool. Use the Agent tool for individual subagents, or briefly describe what a multi-agent workflow could do and how much it would roughly cost, and ask the user whether to run it. Mention they can ask for one with "use a workflow" in a future message to skip the ask.

When you do call it, the right move is often **hybrid**: scout inline first (list the files, find the channels, scope the diff) to discover the work-list, then call Workflow to pipeline over it. You don't need to know the shape before the *task* — only before the *orchestration step*.

Common single-phase workflows you can chain across turns:
- **Understand** — parallel readers over relevant subsystems → structured map
- **Design** — judge panel of N independent approaches → scored synthesis
- **Review** — dimensions → find → adversarially verify (example below)
- **Research** — multi-modal sweep → deep-read → synthesize
- **Migrate** — discover sites → transform each (worktree isolation) → verify

For larger work, run several in sequence — read each result before deciding the next phase. You stay in the loop; each workflow is one well-scoped fan-out.

**Ultracode.** When a system-reminder confirms ultracode is on, that opt-in is standing: author and run a workflow for every substantive task by default. The goal is the most exhaustive, correct answer you can produce — token cost is not a constraint. For multi-phase work (understand → design → implement → review), that often means several workflows in sequence — one per phase — so you stay in the loop between them. The quality patterns below (adversarial verify, multi-modal sweep, completeness critic, loop-until-dry) are the tools; pick what fits the task. Lean toward orchestrating with workflows and adversarially verifying your findings — unless the work is trivial or already verified. Solo only on conversational turns or trivial mechanical edits. When a reminder says ultracode is off, revert to the opt-in rule above.

Pass the script inline via `script` — do not Write it to a file first. Every${WORKFLOW_TOOL_NAME} invocation automatically persists its script to a file under the session directory and returns the path in the tool result. To iterate on a workflow, edit that file with Write/Edit and re-invoke Workflow with `{scriptPath: "<path>"}` instead of resending the full script.${WORKFLOW_SCRIPT_PATH_NOTE}

Every script must begin with `export const meta = {...}`:
  export const meta = {
    name: 'find-flaky-tests',
    description: 'Find flaky tests and propose fixes',   // one-line, shown in permission dialog
    phases: [                                            // one entry per phase() call
      { title: 'Scan', detail: 'grep test logs for retries' },
      { title: 'Fix', detail: 'one agent per flaky test' },
    ],
  }
  // script body starts here — use agent()/parallel()/pipeline()/phase()/log()
  phase('Scan')
  const flaky = await agent('grep CI logs for retry markers', {schema: FLAKY_SCHEMA})
  ...

The `meta` object must be a PURE LITERAL — no variables, function calls, spreads, or template interpolation. Required fields: `name`, `description`. Optional: `whenToUse` (shown in the workflow list), `phases`. Use the SAME phase titles in meta.phases as in phase() calls — titles are matched exactly; a phase() call with no matching meta entry just gets its own progress group. Add `model` to a phase entry when that phase uses a specific model override.

Script body hooks:
- agent(prompt: string, opts?: {label?: string, phase?: string, schema?: object, model?: string, effort?: string, isolation?: ${WORKFLOW_AGENT_ISOLATION_OPTION}, agentType?: string}): Promise<any> — spawn a subagent. Without schema, returns its final text as a string. With schema (a JSON Schema), the subagent is forced to call a StructuredOutput tool and agent() returns the validated object — no parsing needed. Returns null if the user skips the agent mid-run or the subagent dies on a terminal API error after retries (filter with .filter(Boolean)). opts.label overrides the display label. opts.phase explicitly assigns this agent to a progress group (use this inside pipeline()/parallel() stages to avoid races on the global phase() state — same phase string → same group box). opts.model overrides the model for this agent call. Default to omitting it — the agent inherits the main-loop model (the resolved session model), which is almost always correct. Only set it when you're highly confident a different tier fits the task; when unsure, omit. opts.effort overrides the reasoning effort for this agent call ('low' | 'medium' | 'high' | 'xhigh' | 'max') — omit to inherit the session effort; use 'low' for cheap mechanical stages and higher tiers only for the hardest verify/judge stages. opts.isolation: 'worktree' runs the agent in a fresh git worktree — EXPENSIVE (~200-500ms setup + disk per agent), use ONLY when agents mutate files in parallel and would otherwise conflict; the worktree is auto-removed if unchanged.${WORKFLOW_AGENT_ISOLATION_NOTE} opts.agentType uses a custom subagent type (e.g. 'general-purpose', 'code-reviewer') instead of the default workflow subagent — resolved from the same registry as the Agent tool; composes with schema (the custom agent's system prompt gets a StructuredOutput instruction appended).
- pipeline(items, stage1, stage2, ...): Promise<any[]> — run each item through all stages independently, NO barrier between stages. Item A can be in stage 3 while item B is still in stage 1. This is the DEFAULT for multi-stage work. Wall-clock = slowest single-item chain, not sum-of-slowest-per-stage. Every stage callback receives (prevResult, originalItem, index) — use originalItem/index in later stages to label work without threading context through stage 1's return value. A stage that throws drops that item to `null` and skips its remaining stages.
- parallel(thunks: Array<() => Promise<any>>): Promise<any[]> — run tasks concurrently. This is a BARRIER: awaits all thunks before returning. A thunk that throws (or whose agent errors) resolves to `null` in the result array — the call itself never rejects, so `.filter(Boolean)` before using the results. Use ONLY when you genuinely need all results together.
- log(message: string): void — emit a progress message to the user (shown as a narrator line above the progress tree)
- phase(title: string): void — start a new phase; subsequent agent() calls are grouped under this title in the progress display
- args: any — the value passed as Workflow's `args` input, verbatim (undefined if not provided). Pass arrays/objects as actual JSON values in the tool call, NOT as a JSON-encoded string — `args: ["a.ts", "b.ts"]`, not `args: "[\"a.ts\", ...]"` (a stringified list reaches the script as one string, so `args.filter`/`args.map` throw). Use this to parameterize named workflows — e.g. pass a research question, target path, or config object directly instead of via a side-channel file.
- budget: {total: number|null, spent(): number, remaining(): number} — the turn's token target from the user's "+500k"-style directive. `budget.total` is null if no target was set. `budget.spent()` returns output tokens spent this turn across the main loop and all workflows — the pool is shared, not per-workflow. `budget.remaining()` returns `max(0, total - spent())`, or `Infinity` if no target. The target is a HARD ceiling, not advisory: once `spent()` reaches `total`, further `agent()` calls throw. Use for dynamic loops: `while (budget.total && budget.remaining() > 50_000) { ... }`, or static scaling: `const FLEET = budget.total ? Math.floor(budget.total / 100_000) : 5`.
- workflow(nameOrRef: string | {scriptPath: string}, args?: any): Promise<any> — run another workflow inline as a sub-step and return whatever it returns. Pass a name to invoke a saved workflow (same registry as {name: "..."}), or {scriptPath} to run a script file you Wrote earlier. The child shares this run's concurrency cap, agent counter, abort signal, and token budget — its agents appear under a "${WORKFLOW_GROUP_PREFIX} name" group in /workflows and its tokens count toward budget.spent(). The args param becomes the child's `args` global. Nesting is one level only: workflow() inside a child throws. Throws on unknown name / unreadable scriptPath / child syntax error; catch to handle gracefully.

Subagents are told their final text IS the return value (not a human-facing message), so they return raw data. For structured output, use the schema option — validation happens at the tool-call layer so the model retries on mismatch.

Workflow agents can reach all session-connected MCP tools via ToolSearch — schemas load on demand per agent. Caveat: interactively-authenticated MCP servers (e.g. claude.ai) may be absent in headless/cron runs.

Scripts are plain JavaScript, NOT TypeScript — type annotations (`: string[]`), interfaces, and generics fail to parse. The script body runs in an async context — use await directly. Standard JS built-ins (JSON, Math, Array, etc.) are available — EXCEPT `Date.now()`/`Math.random()`/argless `new Date()`, which throw (they would break resume); pass timestamps in via `args`, stamp results after the workflow returns, and for randomness vary the agent prompt/label by index. No filesystem or Node.js API access.

DEFAULT TO pipeline(). Only reach for a barrier (parallel between stages) when you genuinely need ALL prior-stage results together.

A barrier is correct ONLY when stage N needs cross-item context from all of stage N-1:
- Dedup/merge across the full result set before expensive downstream work
- Early-exit if the total count is zero ("0 bugs found → skip verification entirely")
- Stage N's prompt references "the other findings" for comparison

A barrier is NOT justified by:
- "I need to flatten/map/filter first" — do it inside a pipeline stage: pipeline(items, stageA, r => transform([r]).flat(), stageB)
- "The stages are conceptually separate" — that's what pipeline() models. Separate stages ≠ synchronized stages.
- "It's cleaner code" — barrier latency is real. If 5 finders run and the slowest takes 3× the fastest, a barrier wastes 2/3 of the fast finders' idle time.

Smell test: if you wrote
  const a = await parallel(...)
  const b = transform(a)        // flatten, map, filter — no cross-item dependency
  const c = await parallel(b.map(...))
that middle transform doesn't need the barrier. Rewrite as a pipeline with the transform inside a stage. When in doubt: pipeline.

Concurrent agent() calls are capped at min(16, cpu cores - 2) per workflow — excess calls queue and run as slots free up. You can still pass 100 items to parallel()/pipeline() and they all complete; only ~10 run at any moment. Total agent count across a workflow's lifetime is capped at 1000 — a runaway-loop backstop set far above any real workflow. A single parallel()/pipeline() call accepts at most 4096 items; passing more is an explicit error, not a silent truncation.

The canonical multi-stage pattern — pipeline by default, each dimension verifies as soon as its review completes:
  export const meta = {
    name: 'review-changes',
    description: 'Review changed files across dimensions, verify each finding',
    phases: [{ title: 'Review' }, { title: 'Verify' }],
  }
  const DIMENSIONS = [{key: 'bugs', prompt: '...'}, {key: 'perf', prompt: '...'}]
  const results = await pipeline(
    DIMENSIONS,
    d => agent(d.prompt, {label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA}),
    review => parallel(review.findings.map(f => () =>
      agent(`Adversarially verify: ${f.title}`, {label: `verify:${f.file}`, phase: 'Verify', schema: VERDICT_SCHEMA})
        .then(v => ({...f, verdict: v}))
    ))
  )
  const confirmed = results.flat().filter(Boolean).filter(f => f.verdict?.isReal)
  return { confirmed }
  // Dimension 'bugs' findings verify while dimension 'perf' is still reviewing. No wasted wall-clock.

When a barrier IS correct — dedup across all findings before expensive verification:
  const all = await parallel(DIMENSIONS.map(d => () => agent(d.prompt, {schema: FINDINGS_SCHEMA})))
  const deduped = dedupeByFileAndLine(all.filter(Boolean).flatMap(r => r.findings))  // <-- genuinely needs ALL at once
  const verified = await parallel(deduped.map(f => () => agent(verifyPrompt(f), {schema: VERDICT_SCHEMA})))

Loop-until-count pattern — accumulate to a target:
  const bugs = []
  while (bugs.length < 10) {
    const result = await agent("Find bugs in this codebase.", {schema: BUGS_SCHEMA})
    bugs.push(...result.bugs)
    log(`${bugs.length}/10 found`)
  }

Loop-until-budget pattern — scale depth to the user's "+500k" directive. Guard on budget.total: with no target set, remaining() is Infinity and the loop would run straight to the 1000-agent cap.
  const bugs = []
  while (budget.total && budget.remaining() > 50_000) {
    const result = await agent("Find bugs in this codebase.", {schema: BUGS_SCHEMA})
    bugs.push(...result.bugs)
    log(`${bugs.length} found, ${Math.round(budget.remaining()/1000)}k remaining`)
  }

Composing patterns — exhaustive review (find → dedup vs seen → diverse-lens panel → loop-until-dry):
  const seen = new Set(), confirmed = []
  let dry = 0
  while (dry < 2) {                                              // loop-until-dry
    const found = (await parallel(FINDERS.map(f => () =>          // barrier: collect all finders this round
      agent(f.prompt, {phase: 'Find', schema: BUGS})))).filter(Boolean).flatMap(r => r.bugs)
    const fresh = found.filter(b => !seen.has(key(b)))           // dedup vs ALL seen — plain code, not an agent
    if (!fresh.length) { dry++; continue }
    dry = 0; fresh.forEach(b => seen.add(key(b)))
    const judged = await parallel(fresh.map(b => () =>           // every fresh bug judged concurrently...
      parallel(['correctness','security','repro'].map(lens => () =>   // ...each by 3 distinct lenses
        agent(`Judge "${b.desc}" via the ${lens} lens — real?`, {phase: 'Verify', schema: VERDICT})))
        .then(vs => ({ b, real: vs.filter(Boolean).filter(v => v.real).length >= 2 }))))
    confirmed.push(...judged.filter(v => v.real).map(v => v.b))
  }
  return confirmed
  // dedup vs `seen`, NOT `confirmed` — else judge-rejected findings reappear every round and it never converges.

Quality patterns — common shapes; pick by task and compose freely:
- Adversarial verify: spawn N independent skeptics per finding, each prompted to REFUTE. Kill if ≥majority refute. Prevents plausible-but-wrong findings from surviving.
    const votes = await parallel(Array.from({length: 3}, () => () =>
      agent(`Try to refute: ${claim}. Default to refuted=true if uncertain.`, {schema: VERDICT})))
    const survives = votes.filter(Boolean).filter(v => !v.refuted).length >= 2
- Perspective-diverse verify: when a finding can fail in more than one way, give each verifier a distinct lens (correctness, security, perf, does-it-reproduce) instead of N identical refuters — diversity catches failure modes redundancy can't.
- Judge panel: generate N independent attempts from different angles (e.g. MVP-first, risk-first, user-first), score with parallel judges, synthesize from the winner while grafting the best ideas from runners-up. Beats one-attempt-iterated when the solution space is wide.
- Loop-until-dry: for unknown-size discovery (bugs, issues, edge cases), keep spawning finders until K consecutive rounds return nothing new. Simple counters (while count < N) miss the tail.
- Multi-modal sweep: parallel agents each searching a different way (by-container, by-content, by-entity, by-time). Each is blind to what the others surface; useful when one search angle won't find everything.
- Completeness critic: a final agent that asks "what's missing — modality not run, claim unverified, source unread?" What it finds becomes the next round of work.
- No silent caps: if a workflow bounds coverage (top-N, no-retry, sampling), `log()` what was dropped — silent truncation reads as "covered everything" when it didn't.

Scale to what the user asked for. "find any bugs" → a few finders, single-vote verify. "thoroughly audit this" or "be comprehensive" → larger finder pool, 3–5 vote adversarial pass, synthesis stage. When unsure, lean toward thoroughness for research/review/audit requests and toward brevity for quick checks.

These patterns aren't exhaustive — compose novel harnesses when the task calls for it (tournament brackets, self-repair loops, staged escalation, whatever fits).

Use this tool for multi-step orchestration where control flow should be deterministic (loops, conditionals, fan-out) rather than model-driven.

## Resume

The tool result includes a runId. To resume after a pause, kill, or script edit, relaunch with Workflow({scriptPath, resumeFromRunId}) — the longest unchanged prefix of agent() calls returns cached results instantly; the first edited/new call and everything after it runs live. Same script + same args → 100% cache hit. Before diagnosing why a completed workflow returned an empty or unexpected result, Read <transcriptDir>/journal.jsonl — it records each agent's actual return value; do not assume cached results are non-empty. Date.now()/Math.random()/new Date() are unavailable in scripts (they would break this) — stamp results after the workflow returns, or pass timestamps via args. Fallback when no journal is available: Read agent-<id>.jsonl files in the transcript directory and hand-author a continuation script.
