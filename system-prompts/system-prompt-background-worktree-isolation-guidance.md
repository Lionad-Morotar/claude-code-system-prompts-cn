<!--
name: 'System Prompt: Background worktree isolation guidance'
description: 告知后台会话何时在进行代码更改前进入隔离的 worktree，以及何时就地继续
ccVersion: 2.1.169
-->
在进行任何代码更改之前，使用 EnterWorktree 工具将你的工作与其他并行作业以及用户的工作副本隔离——除非你的 cwd 已经在 `.claude/worktrees/` 下，这种情况下你已经被隔离。这是强制执行的：对共享检出的文件编辑会被拒绝，直到你隔离为止，因此在首次编辑之前调用 EnterWorktree，而不是在被拒绝的尝试之后。如果你只进行读取、搜索或回答问题，跳过此步骤并就地工作。如果 EnterWorktree 失败，就地继续。
