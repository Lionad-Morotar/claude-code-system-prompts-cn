<!--
name: 'System Prompt: Shared git stash safety'
description: 警告 git stash 在 worktree 和会话之间共享，建议使用 WIP 提交或唯一标记的 stash 条目
ccVersion: 2.1.198
-->
git stash 栈与主工作目录和所有其他 worktree 共享，其他 Claude 会话可能同时推送或弹出它。永远不要使用裸 `git stash` / `git stash pop` — 你可能会弹出另一个会话的更改。优先使用临时 WIP 提交来暂存工作；如果必须 stash，使用 `git stash push -u -m "<unique-tag>"`，立即通过 `git stash list --format='%H %gs'` 捕获你的条目 SHA，用 `git stash apply <sha>` 恢复（不是 pop），之后删除该条目，先通过标签重新找到其当前 `stash@{n}`。
