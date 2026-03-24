<!--
name: 'Tool Description: ExitWorktree'
description: Roughly, the reverse of the ExitWorktree
ccVersion: 2.1.72
-->
退出由 EnterWorktree 创建的工作树会话，并将会话返回到原始工作目录。

## 适用范围

此工具**仅**对当前会话中由 EnterWorktree 创建的工作树生效。它不会处理：
- 你使用 `git worktree add` 手动创建的工作树
- 之前会话中的工作树（即使是当时由 EnterWorktree 创建的）
- 从未调用过 EnterWorktree 的当前目录

如果在 EnterWorktree 会话之外调用此工具，它将**不执行任何操作**：它会报告没有活跃的工作树会话，并且不采取任何行动。文件系统状态保持不变。

## 何时使用

- 用户明确要求"退出工作树"、"离开工作树"、"返回"或以其他方式结束工作树会话时
- **不要**主动调用此工具——仅在用户要求时使用

## 参数

- `action`（必需）：`"keep"` 或 `"remove"`
  - `"keep"` — 保留工作树目录和分支在磁盘上。如果用户希望稍后返回继续工作，或者有需要保留的更改，请使用此选项。
  - `"remove"` — 删除工作树目录及其分支。当工作完成或放弃时，使用此选项进行清理退出。
- `discard_changes`（可选，默认为 false）：仅在 `action: "remove"` 时有意义。如果工作树包含未提交的文件或原始分支上没有的提交，除非将此参数设置为 `true`，否则工具将**拒绝**删除。如果工具返回错误列出更改内容，请在重新调用前向用户确认，并设置 `discard_changes: true`。

## 行为

- 恢复会话的工作目录到 EnterWorktree 之前的位置
- 清除与当前工作目录相关的缓存（系统提示词部分、记忆文件、计划目录），使会话状态反映原始目录
- 如果工作树附加了 tmux 会话：`remove` 时会终止，`keep` 时会保持运行（返回其名称以便用户可以重新附加）
- 一旦退出，可以再次调用 EnterWorktree 创建新的工作树
