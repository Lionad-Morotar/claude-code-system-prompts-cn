<!--
name: 'Tool Description: EnterWorktree'
description: Tool description for the EnterWorktree tool.
ccVersion: 2.1.203
-->
仅当被明确指示在 worktree 中工作时使用此工具——无论是用户直接指示，还是项目指令（CLAUDE.md / memory）的要求。此工具创建一个隔离的 git worktree 并将当前会话切换到其中。

## 何时使用

- 用户明确提到 "worktree"（例如 "start a worktree", "work in a worktree", "create a worktree", "use a worktree"）
- CLAUDE.md 或 memory 指令指示你为当前任务在 worktree 中工作

## 何时不使用

- 用户要求创建分支、切换分支或在不同分支上工作 —— 改用 git 命令
- 用户要求修复 bug 或开发某个功能 —— 除非用户或项目指令明确要求使用 worktree，否则使用正常的 git 工作流
- 除非用户或 CLAUDE.md / memory 指令明确提及 "worktree"，否则切勿使用此工具

## 要求

- 必须位于 git 仓库中，或者在 settings.json 中配置了 WorktreeCreate/WorktreeRemove 钩子
- 创建新 worktree（`name`）时，当前不能已在 worktree 会话中；通过 `path` 切换到另一个已有 worktree 是允许的

## 行为

- 在 git 仓库中：在 `.claude/worktrees/` 内创建一个新的 git worktree，基于新分支创建。基础引用由 `worktree.baseRef` 设置控制：`fresh`（默认）从 origin/<默认分支> 分支；`head` 从当前本地 HEAD 分支
- 在 git 仓库外：委托给 WorktreeCreate/WorktreeRemove 钩子以实现与版本控制系统无关的隔离
- 将会话的工作目录切换到新的 worktree
- 使用 ExitWorktree 在会话中途离开 worktree（保留或删除）。会话退出时，如果仍在 worktree 中，系统将提示用户保留或删除它

## 进入已有工作树

传递 `path` 而非 `name` 将会话切换到已存在的工作树（例如，你刚刚用 `git worktree add` 创建的）。从启动目录首次进入时，路径必须出现在拥有它的仓库的 `git worktree list` 中——当前仓库，或在多仓库工作区中嵌套在其中的仓库；两者都未注册的路径将被拒绝。通过此方式进入的工作树，ExitWorktree 不会将其删除；使用 `action: "keep"` 返回原始目录。

通过 `path` 切换在以下情况也适用：会话已在工作树中时（先前的工作树保留在磁盘上，不做修改，仅跟踪新的工作树以在退出时清理），以及工作目录在启动时被固定的代理（子代理隔离或显式 cwd）。在这两种情况下，目标必须是同一仓库 `.claude/worktrees/` 下的工作树，且对于固定代理，切换仅影响此代理，不影响父会话。再次切换后，之前访问过的工作树将不再可写——重新使用 EnterWorktree 并传递 `path` 以返回。

## 参数

- `name`（可选）：新 worktree 的名称。如果 `name` 和 `path` 都未提供，将生成一个随机名称。
- `path`（可选）：要进入的已有工作树的路径，而非创建新工作树——属于当前仓库，或（从启动目录首次进入时）属于嵌套在其中的仓库。与 `name` 互斥。
