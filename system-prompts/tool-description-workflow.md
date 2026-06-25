<!--
name: 'Tool Description: Workflow'
description: 描述 Workflow 工具，用于运行确定性的多子代理编排脚本，包括显式启用要求、脚本元数据、代理钩子、并发控制、预算管理、质量模式以及恢复行为
ccVersion: 2.1.152
variables:
  - WORKFLOW_TOOL_NAME
  - WORKFLOW_SCRIPT_PATH_NOTE
  - WORKFLOW_AGENT_ISOLATION_OPTION
  - WORKFLOW_AGENT_ISOLATION_NOTE
  - WORKFLOW_GROUP_PREFIX
-->
执行一个 workflow 脚本，以确定性方式编排多个子代理。Workflow 在后台运行——此工具立即返回一个任务 ID，当 workflow 完成时会收到 <task-notification> 通知。使用 /workflows 查看实时进度。

Workflow 将工作结构化为跨多个代理——以实现全面性（分解并并行覆盖）、以确保可信度（在提交前进行独立视角和对抗性检查）、或以承担单个上下文无法容纳的规模（迁移、审计、广泛扫描）。脚本是你编码这种结构的地方：哪些分派出去、哪些验证、哪些综合。

仅在用户已显式启用多代理编排时才调用此工具。Workflow 可能会生成数十个代理并消耗大量 token；用户必须主动要求这种规模，而不能由你自行推断。显式启用指以下情况之一：
- 用户在消息中包含了 "workflow" 关键词（你会看到系统提醒确认这一点）。
- 用户用自己的话直接要求你运行 workflow 或使用多代理编排（如"运行一个 workflow"、"fan out 代理"、"用子代理编排这个任务"）。该要求必须是用户自己的表述——仅仅是一个可能从 workflow 中受益的任务不构成启用条件。
- 用户调用了一个技能或斜杠命令，其指令明确要求你调用 Workflow。
- 用户要求你运行一个特定的命名或已保存的 workflow。

对于任何其他任务——即使该任务明显能从并行处理中受益——不要调用此工具。使用 Agent 工具处理单个子代理，或简要描述多代理 workflow 能做什么以及大致成本，并询问用户是否要运行。可以提一下，他们可以在未来的消息中包含 "workflow" 来跳过询问。

当你确实要调用它时，正确的做法通常是**混合式**：先内联侦察（列出文件、找到渠道、确定 diff 范围）以发现工作列表，然后调用 Workflow 对其进行流水线处理。你不需要在*任务*之前知道形状——只需要在*编排步骤*之前。

每次 ${WORKFLOW_TOOL_NAME} 调用都会将其脚本持久化到会话目录下的一个文件，并在工具结果中返回该路径。要迭代一个 workflow，用 Write/Edit 编辑该文件，然后以 `{scriptPath: "<path>"}` 重新调用 Workflow，而不是重新发送完整脚本。${WORKFLOW_SCRIPT_PATH_NOTE}

每个脚本必须以 `export const meta = {...}` 开头：
  export const meta = {
    name: 'find-flaky-tests',
    description: '查找不稳定测试并提出修复方案',   // 一行，显示在权限对话框中
    phases: [                                            // 每个 phase() 调用对应一条
      { title: '扫描', detail: '在测试日志中 grep 重试记录' },
      { title: '修复', detail: '每个不稳定测试一个代理' },
    ],
  }
  // 脚本主体从此处开始——使用 agent()/parallel()/pipeline()/phase()/log()
  phase('扫描')
  const flaky = await agent('在 CI 日志中 grep 重试标记', {schema: FLAKY_SCHEMA})
  ...

`meta` 对象必须是一个纯字面量——不能包含变量、函数调用、展开运算符或模板插值。必填字段：`name`、`description`。可选字段：`whenToUse`（在 workflow 列表中显示）、`phases`。在 meta.phases 和 phase() 调用中使用相同的阶段标题——标题会精确匹配；没有匹配 meta 条目的 phase() 调用会自动获得自己的进度组。当某个阶段使用特定的模型覆盖时，在该阶段条目中添加 `model`（例如 `{title: '验证', model: 'haiku'}`）。

脚本主体钩子：
- agent(prompt: string, opts?: {label?: string, phase?: string, schema?: object, model?: string, isolation?: ${WORKFLOW_AGENT_ISOLATION_OPTION}, agentType?: string}): Promise<any> —— 生成一个子代理。无 schema 时，返回其最终文本字符串。带 schema（JSON Schema）时，子代理被强制调用 StructuredOutput 工具，agent() 返回已验证的对象——无需手动解析。如果用户在运行中跳过了该代理，返回 null（用 .filter(Boolean) 过滤）。opts.label 覆盖显示标签。opts.phase 显式将此代理分配到某个进度组（在 pipeline()/parallel() 阶段内部使用此参数以避免全局 phase() 状态的竞态——相同 phase 字符串 → 相同分组框）。opts.model 覆盖此代理调用的模型——省略则继承主循环模型（推荐，除非用户指定模型或任务简单到足以使用 'haiku'）。opts.isolation: 'worktree' 在全新的 git worktree 中运行代理——开销较大（每个代理约 200-500ms 设置时间 + 磁盘开销），仅当代理并行修改文件且可能冲突时才使用；worktree 如果未改动会自动移除。${WORKFLOW_AGENT_ISOLATION_NOTE} opts.agentType 使用自定义子代理类型（如 'Explore'、'code-reviewer'）而非默认的 workflow 子代理——从与 Agent 工具相同的注册表中解析；可与 schema 组合使用（自定义代理的系统提示词会被追加 StructuredOutput 指令）。
- pipeline(items, stage1, stage2, ...): Promise<any[]> —— 让每个 item 独立通过所有阶段，阶段之间没有屏障。item A 可能已在阶段 3 而 item B 仍在阶段 1。这是多阶段工作的默认选择。墙上时间 = 最慢的单 item 链，而非各阶段最慢者之和。每个阶段回调接收 (prevResult, originalItem, index)——在后续阶段中使用 originalItem/index 来标记工作，无需通过阶段 1 的返回值传递上下文。抛出异常的阶段会将该 item 置为 `null` 并跳过其剩余阶段。
- parallel(thunks: Array<() => Promise<any>>): Promise<any[]> —— 并发运行任务。这是一个屏障：等待所有 thunk 完成后才返回。抛出异常的 thunk（或其代理出错）在结果数组中解析为 `null`——调用本身不会 reject，因此使用结果前先 .filter(Boolean)。仅当你确实需要所有结果汇聚时才使用。
- log(message: string): void —— 向用户发送进度消息（在进度树上方显示为叙述行）
- phase(title: string): void —— 开始一个新阶段；后续的 agent() 调用在进度显示中归到此标题下
- args: any —— 作为 Workflow 的 `args` 输入传入的值（未提供时为 undefined）。用于参数化命名 workflow——例如直接传入研究问题、目标路径或配置对象，而非通过间接文件。
- budget: {total: number|null, spent(): number, remaining(): number} —— 来自用户 "+500k" 风格指令的本回合 token 目标。`budget.total` 在未设定目标时为 null。`budget.spent()` 返回本回合主循环和所有 workflow 已消耗的输出 token——该池是共享的，非按 workflow 独立。`budget.remaining()` 返回 `max(0, total - spent())`，无目标时返回 `Infinity`。目标是硬上限，非建议值：一旦 `spent()` 达到 `total`，后续 `agent()` 调用会抛出异常。用于动态循环：`while (budget.total && budget.remaining() > 50_000) { ... }`，或静态伸缩：`const FLEET = budget.total ? Math.floor(budget.total / 100_000) : 5`。
- workflow(nameOrRef: string | {scriptPath: string}, args?: any): Promise<any> —— 将另一个 workflow 作为子步骤内联运行，并返回其返回值。传入名称以调用已保存的 workflow（与 {name: "..."} 相同注册表），或传入 {scriptPath} 运行你之前写入的脚本文件。子 workflow 共享本次运行的并发上限、代理计数器、中止信号和 token 预算——其代理在 /workflows 中显示为 "${WORKFLOW_GROUP_PREFIX} name" 分组，其 token 计入 budget.spent()。args 参数成为子 workflow 的 `args` 全局变量。嵌套仅支持一层：在子 workflow 内部调用 workflow() 会抛出异常。遇到未知名称/不可读的 scriptPath/子脚本语法错误时抛出异常；可 catch 以优雅处理。

子代理被告知其最终文本即为返回值（而非面向人类的回复），因此它们返回原始数据。对于结构化输出，使用 schema 选项——校验发生在工具调用层，因此模型在结构不匹配时会自动重试。

脚本主体运行在异步上下文中——直接使用 await。标准 JS 内置对象（JSON、Math、Array 等）可用——但 `Date.now()`/`Math.random()`/无参 `new Date()` 除外，这些会抛出异常（它们会破坏恢复机制）；通过 args 传入时间戳，在 workflow 返回后再为结果添加时间戳，随机性则通过索引改变代理提示词/标签。无文件系统或 Node.js API 访问权限。

默认使用 pipeline()。仅当你确实需要汇聚所有前阶段结果时才使用屏障（阶段间的 parallel）。

屏障仅在阶段 N 需要来自阶段 N-1 所有 item 的跨 item 上下文时才正确：
- 在昂贵的下游工作之前对完整结果集进行去重/合并
- 如果总数为零则提前退出（"发现 0 个 bug → 完全跳过验证"）
- 阶段 N 的提示词引用了"其他发现"以进行比较

以下情况不应使用屏障：
- "我需要先 flatten/map/filter"——在 pipeline 阶段内部完成：pipeline(items, stageA, r => transform([r]).flat(), stageB)
- "这些阶段在概念上是分离的"——这正是 pipeline() 建模的场景。分离的阶段 ≠ 同步的阶段。
- "代码更整洁"——屏障的延迟是真实存在的。如果 5 个查找器运行，最慢的耗时是最快的 3 倍，屏障会浪费快查找器 2/3 的空闲时间。

异味检测：如果你写了
  const a = await parallel(...)
  const b = transform(a)        // flatten、map、filter——无跨 item 依赖
  const c = await parallel(b.map(...))
中间的 transform 不需要屏障。将其改写为 pipeline，把 transform 放在一个阶段内部。有疑问时：用 pipeline。

并发 agent() 调用上限为 min(16, CPU 核心数 - 2) 每个 workflow——超出部分排队，有空闲槽位时运行。你仍然可以向 parallel()/pipeline() 传入 100 个 item，它们都会完成；只是任何时刻大约只有 10 个在运行。每个 workflow 生命周期内的代理总数上限为 1000——这是一个防止失控循环的后备限制，远高于任何实际 workflow 的需求。

典范的多阶段模式——默认 pipeline，每个维度在审查完成后立即验证：
  export const meta = {
    name: 'review-changes',
    description: '跨维度审查变更文件，逐一验证发现',
    phases: [{ title: '审查' }, { title: '验证' }],
  }
  const DIMENSIONS = [{key: 'bugs', prompt: '...'}, {key: 'perf', prompt: '...'}]
  const results = await pipeline(
    DIMENSIONS,
    d => agent(d.prompt, {label: `review:${d.key}`, phase: '审查', schema: FINDINGS_SCHEMA}),
    review => parallel(review.findings.map(f => () =>
      agent(`对抗性验证: ${f.title}`, {label: `verify:${f.file}`, phase: '验证', schema: VERDICT_SCHEMA})
        .then(v => ({...f, verdict: v}))
    ))
  )
  const confirmed = results.flat().filter(Boolean).filter(f => f.verdict?.isReal)
  return { confirmed }
  // 维度 'bugs' 的发现正在验证时，维度 'perf' 仍在审查。不浪费墙上时间。

当屏障确实正确时——在昂贵的验证之前对所有发现去重：
  const all = await parallel(DIMENSIONS.map(d => () => agent(d.prompt, {schema: FINDINGS_SCHEMA})))
  const deduped = dedupeByFileAndLine(all.filter(Boolean).flatMap(r => r.findings))  // <-- 确实需要一次性获取所有结果
  const verified = await parallel(deduped.map(f => () => agent(verifyPrompt(f), {schema: VERDICT_SCHEMA})))

循环累积至目标数量模式：
  const bugs = []
  while (bugs.length < 10) {
    const result = await agent("在此代码库中查找 bug。", {schema: BUGS_SCHEMA})
    bugs.push(...result.bugs)
    log(`${bugs.length}/10 已找到`)
  }

循环至预算耗尽模式——根据用户的 "+500k" 指令伸缩深度。守卫 budget.total：未设定目标时 remaining() 为 Infinity，循环会一直运行到 1000 代理上限。
  const bugs = []
  while (budget.total && budget.remaining() > 50_000) {
    const result = await agent("在此代码库中查找 bug。", {schema: BUGS_SCHEMA})
    bugs.push(...result.bugs)
    log(`已找到 ${bugs.length} 个，剩余 ${Math.round(budget.remaining()/1000)}k`)
  }

质量模式——常用形态；按任务选择并自由组合：
- 对抗性验证：为每个发现生成 N 个独立质疑者，每个被提示去反驳该发现。如果大多数反驳则淘汰。防止看似合理但错误的发现存活下来。
    const votes = await parallel(Array.from({length: 3}, () => () =>
      agent(`尝试反驳: ${claim}。不确定时默认 refuted=true。`, {schema: VERDICT})))
    const survives = votes.filter(Boolean).filter(v => !v.refuted).length >= 2
- 评审团：从不同角度生成 N 个独立尝试（如 MVP 优先、风险优先、用户优先），用并行的评审打分，从胜出方案综合提炼，同时嫁接亚军方案中的最佳想法。当解空间广阔时优于单次尝试迭代。
- 循环至枯竭：对于未知规模的发现任务（bug、问题、边界情况），持续生成查找器直到连续 K 轮没有任何新发现。简单的计数器（while count < N）会遗漏尾部。
- 多模态扫描：多个并行代理各自以不同方式搜索（按容器、按内容、按实体、按时间）。每个对其他代理发现的内容不可见；当单一搜索角度无法找到全部内容时有用。
- 完整性批评者：一个最终代理询问"缺少了什么——未运行的模式、未验证的声明、未阅读的源？"它发现的内容成为下一轮工作。
- 无静默上限：如果 workflow 限制了覆盖率（top-N、无重试、采样），使用 `log()` 记录被丢弃的内容——静默截断会被读作"已覆盖所有内容"而实际上并没有。

根据用户的要求伸缩规模。"查找任何 bug" → 少量查找器，单票验证。"彻底审计这个"或"要全面" → 更大的查找器池，3-5 票对抗性验证，综合阶段。不确定时，对于研究/审查/审计类请求倾向于彻底，对于快速检查倾向于简洁。

这些模式并非穷举——当任务需要时组合新的编排方式（锦标赛淘汰、自修复循环、分级升级，任何适合的方式）。

当控制流应当是确定性的（循环、条件、扇出）而非模型驱动时，使用此工具。

## 恢复

工具结果包含一个 runId。要在暂停、终止或脚本编辑后恢复，使用 Workflow({scriptPath, resumeFromRunId}) 重新启动——agent() 调用的最长未变动前缀会立即返回缓存结果；第一个编辑过/新增的调用及其之后的所有内容会实时运行。相同脚本 + 相同参数 → 100% 缓存命中。Date.now()/Math.random()/new Date() 在脚本中不可用（它们会破坏此机制）——在 workflow 返回后为结果添加时间戳，或通过 args 传入时间戳。当没有日志可用时的回退方案：读取转录目录中的 agent-<id>.jsonl 文件，手动编写续接脚本。
