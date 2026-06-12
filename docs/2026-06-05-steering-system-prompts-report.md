# Claude Code Steering 相关系统提示完整报告

> 调研范围：本项目 `system-prompts/` 目录 + `zRefs/` 二进制安装包中动态拼接的提示
> 二进制版本：v2.1.162 (darwin-arm64)

---

## 一、项目中已提取的 Steering 文件

### 1.1 `data-managed-agents-events-and-steering.md` (ccVersion: 2.1.132)

这是项目中唯一明确以 "Steering" 命名的系统提示文件，属于 Managed Agents API 的参考文档。

**核心内容 —— Steering Patterns 章节：**

| 模式 | 描述 |
|------|------|
| **Stream-first ordering** | 先开 SSE 流再发送事件，否则事件会缓冲为单一批量 |
| **Reconnecting after dropped stream** | SSE 无回放，需重叠历史获取去重 |
| **Message queuing** | 用户事件服务器端排队，无需等待响应即可连续发送 |
| **Interrupt** | `user.interrupt` 跳队强制 idle，用于停止/取消 |

**关键代码示例（stream-first ordering）：**

```ts
// 正确 —— 并发开启流和发送
const [response] = await Promise.all([
  streamEvents(sessionId),   // 先开 SSE
  sendMessage(sessionId, text),
]);

// 错误 —— 流之前的事件会缓冲为单一批量
await sendMessage(sessionId, text);
const response = await streamEvents(sessionId);
```

### 1.2 `system-prompt-skillify-current-session.md` (ccVersion: 2.1.111)

包含 steering 相关描述（非核心 steering 文档，但涉及用户引导概念）：

> "Pay particular attention to the user's messages (**how they steered and corrected the process**)"

---

## 二、二进制中动态拼接的 Steering 提示（不存在于本项目）

> 以下提示在 `zRefs/claude-code-2.1.162/claude` 二进制中被发现，是 Claude Code 运行时动态拼接的系统提示组成部分。**这些提示不存在于 `system-prompts/` 目录中。**

### 2.1 `appendSubagentSystemPrompt` —— Task-tool Subagent 附加提示

**类型：** 配置项（非固定提示内容）

**描述：**

```
@internal Additional system prompt appended to every Task-tool subagent
(and propagated to nested subagents).
Gated by CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT.
```

**说明：**
- 这是一个**用户可配置的附加提示**，通过环境变量 `CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT` 控制是否启用
- 实际提示内容由用户通过 `--append-system-prompt` 或 `--append-system-prompt-file` 参数提供
- 该提示会被追加到每个 Task-tool 子 agent 的系统提示末尾，并传播到嵌套子 agent

### 2.2 `tengu_mcp_subagent_prompt` —— MCP Subagent 截断提示

**类型：** Feature Flag 控制的行为提示

**控制逻辑（函数 `Vg8()`）：**

```js
function Vg8() {
  let H = process.env.MCP_TRUNCATION_PROMPT_OVERRIDE;
  return H ? H !== "legacy" : M_("tengu_mcp_subagent_prompt", !1);
}
```

**说明：**
- 默认关闭（`false`）
- 环境变量 `MCP_TRUNCATION_PROMPT_OVERRIDE` 可覆盖：设为 `"legacy"` 时关闭，其他值开启
- Feature flag 名：`tengu_mcp_subagent_prompt`
- 控制 MCP subagent 在结果截断时的提示行为

### 2.3 Workflow Subagent Prompts

**变量名：** `GQO`（文本返回模式）、`kQO`（schema 返回模式）

**`GQO` —— 基础 Workflow Subagent 提示：**

```
You are a subagent spawned by a workflow orchestration script.
Use the tools available to complete the task.

CRITICAL: Your final text response is returned **verbatim** as a string
to the calling script — it is your return value, not a message to a human.
- Output the literal result (data, JSON, text).
  Do NOT output confirmations like "Done." or "Sent."
- If asked for JSON, return ONLY the raw JSON — no code fences, no prose, no markdown.
- Do NOT use SendUserMessage to deliver your answer.
  Put your answer in your final text response.
- Be concise. The script will parse your output.
```

**`kQO` —— Schema 模式 Workflow Subagent 提示：**

```
You are a subagent spawned by a workflow orchestration script.
Use the tools available to complete the task.

CRITICAL: You MUST call the ${A$} tool exactly once to return your final answer.
The tool's input schema defines the required shape.
- Do your work (Read files, run commands, etc.), then call ${A$} with your answer.
- Do NOT put your answer in a text response. The script reads ONLY the ${A$} tool call.
- If the schema validation fails, read the error and call ${A$} again with a corrected shape.
- After calling ${A$} successfully, end your turn. No acknowledgment needed.
```

**附加说明变量：**
- `RQO` —— 文本返回模式的附加提示片段
- `LQO` —— Schema 返回模式的附加提示片段

### 2.4 Output Style Prompts —— 用户可配置的行为引导

**类型：** 动态注入的用户偏好提示（通过 `lp3()` 和 `np3()` 函数拼接）

**`I53` —— Proactive 风格：**

```
The user chose continuous, autonomous execution. You should:
1. **Execute immediately** — Start implementing right away.
   Make reasonable assumptions and proceed on low-risk work.
2. **Minimize interruptions** — Prefer making reasonable assumptions
   over asking questions for routine decisions.
3. **Prefer action over planning** — Do not enter plan mode unless
   the user explicitly asks. When in doubt, start coding.
...
6. **Avoid data exfiltration** — Post even routine messages to chat
   platforms or work tickets only if the user has directed you to.
```

**`UyK` —— Explanatory 风格：**

包含教育性解释的要求，要求在写代码前后提供简短的实现选择解释。

**Learning 风格：**

结合交互式学习和教育解释的模式，包含：
- "Learn by Doing" 请求格式
- `TODO(human)` 模式
- 教育性 Insight 块（`★ Insight ─────────────────`）

### 2.5 `excludeDynamicSections` —— Prompt Cache 与 Steering 权衡

**类型：** 配置选项描述（涉及 steering 概念）

```
When true, omit per-user dynamic sections (working directory, auto-memory path)
from the cached system prompt and re-inject them as the first user message.
Lets cross-user prompt caching hit on a static system prompt prefix.

Tradeoff: the model sees this context slightly later in the prompt, so
steering on the working directory and memory location is marginally less
authoritative. Has no effect when a custom (non-preset) system prompt is in use.
```

**关键概念：** `"steering on the working directory"` —— 系统提示中关于工作目录的位置会影响模型对当前工作环境的认知和决策。

### 2.6 主系统提示（`uDK` 变量）

**类型：** 核心 Agent 身份定义

```
You are an agent for Claude Code, Anthropic's official CLI for Claude.
Given the user's message, you should use the tools available to complete the task.
Complete the task fully — don't gold-plate, but don't leave it half-done.
When you complete the task, respond with a concise report covering what was done
and any key findings — the caller will relay this to the user,
so it only needs the essentials.
```

### 2.7 其他 Steering 相关提示片段

**`OB3` —— 行动指令：**

```
When you have enough information to act, act.
Do not re-derive facts already established in the conversation,
re-litigate a decision the user has already made,
or narrate options you will not pursue.
If you are weighing a choice, give a recommendation, not an exhaustive survey.
```

**`jB3` —— Context Management：**

上下文管理相关提示，涉及对话压缩和状态保持的 steering。

**Explore Agent 提示（`UHO` / `FHO`）：**

```
Fast read-only search agent for locating code.
Use it to find files by pattern, grep for symbols or keywords,
or answer "where is X defined / which files reference Y."
Do NOT use it for code review, design-doc auditing, cross-file consistency checks,
or open-ended analysis — it reads excerpts rather than whole files
and will miss content past its read window.
```

---

## 三、动态提示拼接架构

从二进制反编译可以看出，Claude Code 的系统提示不是静态文件，而是**运行时动态拼接**的：

```
系统提示 = np3(H)      // 主标题 + Output Style 引用
         + ip3()       // 系统指令（工具使用、系统提醒）
         + rp3()       // 编码指令（不不必要的注释、不 premature abstraction）
         + op3(H)      // 行动谨慎指令
         + tp3(w,z,O,j) // 会话特定指导（动态基于可用工具/技能）
         + cp3(H)      // 语言部分
         + $B3(H,_,q)  // 环境信息
         + lp3(H)      // Output Style: ${H.name}\n${H.prompt}
         + (可选) appendSubagentSystemPrompt
         + (可选) excludeDynamicSections 处理
```

---

## 四、Feature Flags 与环境变量汇总

| 名称 | 类型 | 默认值 | 控制内容 |
|------|------|--------|----------|
| `CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT` | 环境变量 | 未设置 | 启用 `appendSubagentSystemPrompt` |
| `MCP_TRUNCATION_PROMPT_OVERRIDE` | 环境变量 | 未设置 | 覆盖 `tengu_mcp_subagent_prompt` |
| `tengu_mcp_subagent_prompt` | Feature Flag | `false` | MCP subagent 截断提示行为 |
| `excludeDynamicSections` | 配置选项 | `false` | 将动态部分移到首条用户消息 |

---

## 五、结论

**Steering 在 Claude Code 中有三层含义：**

1. **Managed Agents API 层面**（已提取）：通过事件流控制 agent 行为的模式（stream-first、interrupt、message queuing 等）

2. **系统提示动态拼接层面**（二进制中）：通过 Output Style、appendSubagentSystemPrompt、workflow subagent prompts 等机制，在运行时注入行为引导

3. **Prompt Cache 权衡层面**：`excludeDynamicSections` 体现了 "steering on the working directory" 的概念 —— 系统提示中环境信息的位置会影响模型决策的权威性

**最重要的发现：**
- 本项目 `system-prompts/` 仅包含 **Managed Agents 事件与 Steering 模式** 的参考文档
- **大量 Steering 相关的动态提示**（Output Style、Workflow Subagent、MCP Subagent、appendSubagentSystemPrompt 等）**仅存在于二进制中**，是运行时动态拼接的，不会出现在提取的文件中
