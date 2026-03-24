<!--
name: 'Skill: /stuck slash command'
description: 诊断冻结或运行缓慢的 Claude Code 会话
ccVersion: 2.1.77
-->
# /stuck — 诊断冻结/运行缓慢的 Claude Code 会话

用户认为此机器上的另一个 Claude Code 会话已冻结、卡住或运行非常缓慢。请进行调查并向 #claude-code-feedback 发布报告。

## 需要关注的内容

扫描其他 Claude Code 进程（排除当前进程 — PID 在 `process.pid` 中，但对于 shell 命令，只需排除运行此提示词时看到的 PID）。进程名称通常为 `claude`（已安装版本）或 `cli`（原生开发构建版本）。

会话卡住的迹象：
- **持续高 CPU（≥90%）** — 可能是无限循环。间隔 1-2 秒采样两次，以确认不是短暂峰值。
- **进程状态 `D`（不可中断睡眠）** — 通常是 I/O 挂起。`ps` 输出中的 `state` 列；第一个字符很重要（忽略 `+`、`s`、`<` 等修饰符）。
- **进程状态 `T`（已停止）** — 用户可能意外按下了 Ctrl+Z。
- **进程状态 `Z`（僵尸进程）** — 父进程未回收。
- **非常高的 RSS（≥4GB）** — 可能存在内存泄漏导致会话变慢。
- **卡住的子进程** — 挂起的 `git`、`node` 或 shell 子进程可能会冻结父进程。检查每个会话的 `pgrep -lP <pid>`。

## 调查步骤

1. **列出所有 Claude Code 进程**（macOS/Linux）：
   ```
   ps -axo pid=,pcpu=,rss=,etime=,state=,comm=,command= | grep -E '(claude|cli)' | grep -v grep
   ```
   过滤 `comm` 为 `claude` 或（`cli` 且命令路径包含 "claude"）的行。

2. **对于任何可疑情况**，收集更多上下文：
   - 子进程：`pgrep -lP <pid>`
   - 如果 CPU 高：1-2 秒后再次采样以确认是持续的
   - 如果子进程看起来挂起（例如 git 命令），使用 `ps -p <child_pid> -o command=` 记录其完整命令行
   - 如果可以推断出会话 ID，检查会话的调试日志：`~/.claude/debug/<session-id>.txt`（最后几百行通常显示挂起前正在执行的操作）

3. **考虑堆栈转储**（针对真正冻结的进程，高级，可选）：
   - macOS：`sample <pid> 3` 提供 3 秒的原生堆栈采样
   - 这会产生大量输出 — 仅在进程明显挂起且你想知道*原因*时才获取

## 报告

**仅在实际发现卡住的内容时才发布到 Slack。** 如果每个会话看起来都正常，请直接告知用户 — 不要向频道发布"一切正常"的消息。

如果发现卡住/运行缓慢的会话，请使用 Slack MCP 工具发布到 **#claude-code-feedback**（频道 ID：`C07VBSHV7EV`）。如果未加载，请使用 ToolSearch 查找 `slack_send_message`。

**使用两条消息的结构**以保持频道可读性：

1. **顶层消息** — 一行简短内容：主机名、Claude Code 版本和简洁的症状描述（例如"会话 PID 12345 持续 10 分钟 CPU 占用 100%"或"git 子进程在 D 状态下挂起"）。不要使用代码块，不要包含详细信息。
2. **线程回复** — 完整的诊断转储。将顶层消息的 `ts` 作为 `thread_ts` 传递。包括：
   - PID、CPU%、RSS、状态、运行时间、命令行、子进程
   - 你对可能存在的问题的诊断
   - 如果捕获了相关调试日志尾部或 `sample` 输出，请包含

如果 Slack MCP 不可用，请将报告格式化为用户可以复制粘贴到 #claude-code-feedback 的消息（并告知他们需要自行在线程中回复详细信息）。

## 注意事项
- 不要终止或向任何进程发送信号 — 这仅用于诊断。
- 如果用户提供了参数（例如特定的 PID 或症状），请首先关注该内容。
