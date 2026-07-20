<!--
name: 'Skill: Agent Design Patterns'
description: 参考指南，涵盖在 Claude API 上构建代理的决策启发式，包括工具表面设计、上下文管理、缓存策略和组合工具调用
ccVersion: 2.1.198
-->
# 代理设计模式

本文件涵盖在 Claude API 上构建代理的决策启发式：选择什么原语、如何设计工具表面，以及如何在长时间运行中管理上下文和成本。关于每个工具的机制和代码示例，参见 `tool-use-concepts.md` 和语言特定文件夹。

---

## 模型参数

| 参数 | 何时使用 | 预期效果 |
| --- | --- | --- |
| **自适应思考** (`thinking: {type: "adaptive"}`) | 当你想让 Claude 控制何时和思考多少时。 | Claude 根据每个请求决定思考深度，并自动在工具调用之间交错思考。无需调整 token 预算。 |
| **力度** (`output_config: {effort: ...}`) | 调整彻底性和 token 效率之间的权衡时。 | 更低力度 → 更少且更合并的工具调用，更少前导，更简洁的确认。`medium` 通常是有利的平衡。当正确性比成本更重要时使用 `max`。 |

参见 `SKILL.md` §Thinking & Effort 了解模型支持和参数详情。

---

## 设计你的工具表面

### Bash vs. 专用工具

Claude 不知道你的应用的安全边界、批准策略或 UX 表面。Claude 发出工具调用；你的框架处理它们。这些工具调用的形状决定了框架能做什么。

**bash 工具**给 Claude 广泛的编程能力 — 它可以执行几乎任何操作。但它只给框架一个不透明的命令字符串，每个操作形状相同。将操作提升为**专用工具**给框架一个具有类型参数的操作特定钩子，可以拦截、门控、渲染或审计。

**何时将操作提升为专用工具：**

- **安全边界。** 需要门控的操作是自然候选。可逆性是有用的标准：难以逆转的操作（外部 API 调用、发送消息、删除数据）可以放在用户确认之后。`send_email` 工具容易门控；`bash -c "curl -X POST ..."` 不行。
- **新鲜度检查。** 专用 `edit` 工具可以在文件自 Claude 上次读取后发生更改时拒绝写入。Bash 无法强制执行该不变量。
- **渲染。** 某些操作受益于自定义 UI。Claude Code 将提问提升为工具，以便它可以渲染为模态框、展示选项，并在回答之前阻止代理循环。
- **调度。** 只读工具如 `glob` 和 `grep` 可以标记为并行安全。当相同操作通过 bash 运行时，框架无法区分并行安全的 `grep` 和并行不安全的 `git push`，所以必须序列化。

**经验法则：** 先用 bash 获取广度。当你需要门控、渲染、审计或并行化操作时提升为专用工具。

---

## Anthropic 提供的工具

| 工具 | 端 | 何时使用 | 预期效果 |
| --- | --- | --- | --- |
| **Bash** | 客户端 | Claude 需要执行 shell 命令。 | Claude 发出命令；你的框架执行它们。提供参考实现。 |
| **文本编辑器** | 客户端 | Claude 需要读取或编辑文件。 | Claude 通过你的实现查看、创建和编辑文件。提供参考实现。 |
| **计算机使用** | 客户端或服务端 | Claude 需要与 GUI、Web 应用或视觉界面交互。 | Claude 截图并发出鼠标/键盘命令。可以自托管（你运行环境）或 Anthropic 托管。 |
| **代码执行** | 服务端 | Claude 需要在沙箱中运行代码。 | Anthropic 托管的容器，内置文件和 bash 子工具。无客户端执行。 |
| **Web 搜索/获取** | 服务端 | Claude 需要训练截止日期之后的信息（新闻、时事、近期文档）或特定 URL 的内容。 | Claude 发出查询或 URL；Anthropic 执行并返回带引用的结果。 |
| **记忆** | 客户端 | Claude 需要跨会话保存上下文。 | Claude 读写 `/memories` 目录。你实现存储后端。 |

**客户端**工具由 Anthropic 定义（名称、schema、Claude 的使用模式）但由你的框架执行。Anthropic 提供参考实现。**服务端**工具完全在 Anthropic 基础设施上运行 — 在 `tools` 中声明它们，Claude 处理其余部分。

---

## 组合工具调用：编程式工具调用

在标准工具使用中，每个工具调用都是一次往返：Claude 调用工具，结果进入 Claude 的上下文，Claude 推理它，然后调用下一个工具。三个顺序操作（读取配置 → 查找订单 → 检查库存）意味着三次往返。每次增加延迟和 token，且大多数中间数据再也不需要。

**编程式工具调用（PTC）**让 Claude 将这些调用组合为脚本。脚本在代码执行容器中运行。当脚本调用工具时，容器暂停，调用被执行（客户端或服务端），结果返回到运行中的代码 — 而非 Claude 的上下文。脚本用正常控制流（循环、过滤、分支）处理它。只有脚本的最终输出返回给 Claude。

| 何时使用 | 预期效果 |
| --- | --- |
| 许多顺序工具调用，或大型中间结果你希望在进入上下文窗口之前过滤。 | Claude 编写调用工具为函数的代码。在代码执行容器中运行。Token 成本随最终输出缩放，而非中间结果。 |

---

## 缩放工具和指令集

| 功能 | 何时使用 | 预期效果 |
| --- | --- | --- |
| **工具搜索** | 许多工具可用，但每个请求只有少数相关。不想预先将所有 schema 放入上下文。 | Claude 搜索工具集并仅加载相关 schema。工具定义是追加的，不是替换的 — 保留缓存（参见下方缓存）。 |
| **技能** | Claude 应仅在相关时加载的任务特定指令。 | 每个技能是一个带有 `SKILL.md` 的文件夹。技能的描述默认在上下文中；Claude 在任务需要时读取完整文件。 |

两种模式都保持固定上下文小并按需加载详情。

---

## 长时间运行的代理：管理上下文

| 模式 | 何时使用 | 预期效果 |
| --- | --- | --- |
| **上下文编辑** | 上下文在许多轮次后变得过时（旧工具结果、已完成的思考）。 | 工具结果和思考块根据可配置阈值清除。保持对话记录精简而不需要总结。 |
| **压缩** | 对话可能达到或超过上下文窗口限制。 | 较早的上下文在服务端被总结为压缩块。参见 `SKILL.md` §Compaction 了解关键的 `response.content` 处理。 |
| **记忆** | 状态必须跨会话持久化（不仅在一个对话内）。 | Claude 读写记忆目录中的文件。在进程重启后存活。 |

**在它们之间选择：** 上下文编辑和压缩在会话内操作 — 编辑修剪过时轮次，压缩在接近限制时总结。记忆用于跨会话持久化。许多长时间运行的代理同时使用三者。

---

## 代理缓存

**先阅读 `prompt-caching.md`。** 它涵盖前缀匹配不变量、断点放置、静默失效器审计，以及为什么在会话中途更改工具或模型会破坏缓存。本节仅涵盖针对这些约束的代理特定变通方法。

| 约束（来自 `prompt-caching.md`） | 代理特定变通方法 |
| --- | --- |
| 在会话中途编辑系统提示会使缓存失效。 | 改为向 `messages[]` 追加 `{"role": "system", ...}` 消息（无 beta 标头；在支持的模型上 — 参见 `prompt-caching.md` §中途系统消息）。缓存前缀保持完整，模型将其视为操作员权威指令而非用户文本。在不支持的模型上，回退到用户轮次中的 `<system-reminder>` 文本块。 |
| 在会话中途切换模型会使缓存失效。 | 为子任务用更便宜的模型生成**子代理**；保持主循环在一个模型上。 |
| 在会话中途添加/移除工具会使缓存失效。 | 使用**工具搜索**进行动态发现 — 它追加工具 schema 而非替换它们，所以现有前缀被保留。 |

对于多轮断点放置，使用顶层自动缓存 — 参见 `prompt-caching.md` §放置模式。

---

关于这些功能的实时文档，参见 `live-sources.md`。
<!--
name: 'Skill: Agent Design Patterns'
description: Reference guide covering decision heuristics for building agents on the Claude API, including tool surface design, context management, caching strategies, and composing tool calls
ccVersion: 2.1.198
-->
# Agent Design Patterns

This file covers decision heuristics for building agents on the Claude API: which primitives to reach for, how to design your tool surface, and how to manage context and cost over long runs. For per-tool mechanics and code examples, see `tool-use-concepts.md` and the language-specific folders.

---

## Model Parameters

| Parameter | When to use it | What to expect |
| --- | --- | --- |
| **Adaptive thinking** (`thinking: {type: "adaptive"}`) | When you want Claude to control when and how much to think. | Claude determines thinking depth per request and automatically interleaves thinking between tool calls. No token budget to tune. |
| **Effort** (`output_config: {effort: ...}`) | When adjusting the tradeoff between thoroughness and token efficiency. | Lower effort → fewer and more-consolidated tool calls, less preamble, terser confirmations. `medium` is often a favorable balance. Use `max` when correctness matters more than cost. |

See `SKILL.md` §Thinking & Effort for model support and parameter details.

---

## Designing Your Tool Surface

### Bash vs. dedicated tools

Claude doesn't know your application's security boundary, approval policy, or UX surface. Claude emits tool calls; your harness handles them. The shape of those tool calls determines what the harness can do.

A **bash tool** gives Claude broad programmatic leverage — it can perform almost any action. But it gives the harness only an opaque command string, the same shape for every action. Promoting an action to a **dedicated tool** gives the harness an action-specific hook with typed arguments it can intercept, gate, render, or audit.

**When to promote an action to a dedicated tool:**

- **Security boundary.** Actions that require gating are natural candidates. Reversibility is a useful criterion: hard-to-reverse actions (external API calls, sending messages, deleting data) can be gated behind user confirmation. A `send_email` tool is easy to gate; `bash -c "curl -X POST ..."` is not.
- **Staleness checks.** A dedicated `edit` tool can reject writes if the file changed since Claude last read it. Bash can't enforce that invariant.
- **Rendering.** Some actions benefit from custom UI. Claude Code promotes question-asking to a tool so it can render as a modal, present options, and block the agent loop until answered.
- **Scheduling.** Read-only tools like `glob` and `grep` can be marked parallel-safe. When the same actions run through bash, the harness can't tell a parallel-safe `grep` from a parallel-unsafe `git push`, so it must serialize.

**Rule of thumb:** Start with bash for breadth. Promote to dedicated tools when you need to gate, render, audit, or parallelize the action.

---

## Anthropic-Provided Tools

| Tool | Side | When to use it | What to expect |
| --- | --- | --- | --- |
| **Bash** | Client | Claude needs to execute shell commands. | Claude emits commands; your harness executes them. Reference implementation provided. |
| **Text editor** | Client | Claude needs to read or edit files. | Claude views, creates, and edits files via your implementation. Reference implementation provided. |
| **Computer use** | Client or Server | Claude needs to interact with GUIs, web apps, or visual interfaces. | Claude takes screenshots and issues mouse/keyboard commands. Can be self-hosted (you run the environment) or Anthropic-hosted. |
| **Code execution** | Server | Claude needs to run code in a sandbox you don't want to manage. | Anthropic-hosted container with built-in file and bash sub-tools. No client-side execution. |
| **Web search / fetch** | Server | Claude needs information past its training cutoff (news, current events, recent docs) or the content of a specific URL. | Claude issues a query or URL; Anthropic executes it and returns results with citations. |
| **Memory** | Client | Claude needs to save context across sessions. | Claude reads/writes a `/memories` directory. You implement the storage backend. |

**Client-side** tools are defined by Anthropic (name, schema, Claude's usage pattern) but executed by your harness. Anthropic provides reference implementations. **Server-side** tools run entirely on Anthropic infrastructure — declare them in `tools` and Claude handles the rest.

---

## Composing Tool Calls: Programmatic Tool Calling

With standard tool use, each tool call is a round trip: Claude calls the tool, the result lands in Claude's context, Claude reasons about it, then calls the next tool. Three sequential actions (read profile → look up orders → check inventory) means three round trips. Each adds latency and tokens, and most of the intermediate data is never needed again.

**Programmatic tool calling (PTC)** lets Claude compose those calls into a script instead. The script runs in the code execution container. When the script calls a tool, the container pauses, the call is executed (client-side or server-side), and the result returns to the running code — not to Claude's context. The script processes it with normal control flow (loops, filters, branches). Only the script's final output returns to Claude.

| When to use it | What to expect |
| --- | --- |
| Many sequential tool calls, or large intermediate results you want filtered before they hit the context window. | Claude writes code that invokes tools as functions. Runs in the code execution container. Token cost scales with final output, not intermediate results. |

---

## Scaling the Tool and Instruction Set

| Feature | When to use it | What to expect |
| --- | --- | --- |
| **Tool search** | Many tools available, but only a few relevant per request. Don't want all schemas in context upfront. | Claude searches the tool set and loads only relevant schemas. Tool definitions are appended, not swapped — preserves cache (see Caching below). |
| **Skills** | Task-specific instructions Claude should load only when relevant. | Each skill is a folder with a `SKILL.md`. The skill's description sits in context by default; Claude reads the full file when the task calls for it. |

Both patterns keep the fixed context small and load detail on demand.

---

## Long-Running Agents: Managing Context

| Pattern | When to use it | What to expect |
| --- | --- | --- |
| **Context editing** | Context grows stale over many turns (old tool results, completed thinking). | Tool results and thinking blocks are cleared based on configurable thresholds. Keeps the transcript lean without summarizing. |
| **Compaction** | Conversation likely to reach or exceed the context window limit. | Earlier context is summarized into a compaction block server-side. See `SKILL.md` §Compaction for the critical `response.content` handling. |
| **Memory** | State must persist across sessions (not just within one conversation). | Claude reads/writes files in a memory directory. Survives process restarts. |

**Choosing between them:** Context editing and compaction operate within a session — editing prunes stale turns, compaction summarizes when you're near the limit. Memory is for cross-session persistence. Many long-running agents use all three.

---

## Caching for Agents

**Read `prompt-caching.md` first.** It covers the prefix-match invariant, breakpoint placement, the silent-invalidator audit, and why changing tools or models mid-session breaks the cache. This section covers only the agent-specific workarounds for those constraints.

| Constraint (from `prompt-caching.md`) | Agent-specific workaround |
| --- | --- |
| Editing the system prompt mid-session invalidates the cache. | Append a `{"role": "system", ...}` message to `messages[]` instead (no beta header; on supporting models — see `prompt-caching.md` § Mid-conversation system messages). The cached prefix stays intact, and the model treats it as an operator-authority instruction rather than user text. On models that don't support it, fall back to a `<system-reminder>` text block in the user turn. |
| Switching models mid-session invalidates the cache. | Spawn a **subagent** with the cheaper model for the sub-task; keep the main loop on one model. |
| Adding/removing tools mid-session invalidates the cache. | Use **tool search** for dynamic discovery — it appends tool schemas rather than swapping them, so the existing prefix is preserved. |

For multi-turn breakpoint placement, use top-level auto-caching — see `prompt-caching.md` §Placement patterns.

---

For live documentation on any of these features, see `live-sources.md`.
