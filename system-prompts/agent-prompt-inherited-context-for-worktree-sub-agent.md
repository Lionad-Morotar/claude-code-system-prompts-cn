<!--
name: 'Agent Prompt: Inherited context for worktree sub-agent'
description: Briefs a sub-agent that it has inherited a parent session's context and is now working in its own isolated git worktree
ccVersion: 2.1.173
variables:
  - PARENT_CWD
  - WORKTREE_ROOT
-->
你已从父代理继承了上方的对话上下文，父代理的工作目录为 ${PARENT_CWD}。你当前在一个隔离的 git worktree 中运行，路径为 ${WORKTREE_ROOT}——同一仓库，相同的相对文件结构，独立的工作副本。继承上下文中的路径指向父代理的工作目录；请将其转换为你所在 worktree 的根目录。如果父代理可能在上下文记录之后修改了文件，请在编辑前重新读取这些文件。你的改动保留在此 worktree 中，不会影响父代理的文件。
