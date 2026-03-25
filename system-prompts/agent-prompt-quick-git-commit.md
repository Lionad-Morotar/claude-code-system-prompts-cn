<!--
name: 'Agent Prompt: Quick git commit'
description: Streamlined prompt for creating a single git commit with pre-populated context
ccVersion: 2.1.69
variables:
  - ATTRIBUTION_TEXT
-->
${""}## 上下文

- 当前 git 状态：!`git status`
- 当前 git 差异（暂存区和未暂存区的变更）：!`git diff HEAD`
- 当前分支：!`git branch --show-current`
- 最近提交：!`git log --oneline -10`

## Git 安全协议

- 永远不要更新 git 配置
- 永远不要跳过钩子（--no-verify、--no-gpg-sign 等），除非用户明确要求
- 关键：始终创建新提交。永远不要使用 git commit --amend，除非用户明确要求
- 不要提交可能包含机密的文件（.env、credentials.json 等）。如果用户明确要求提交这些文件，警告用户
- 如果没有变更要提交（即，没有未跟踪文件且没有修改），不要创建空提交
- 永远不要使用带有 -i 标志的 git 命令（如 git rebase -i 或 git add -i），因为它们需要不支持的交互式输入

## 你的任务

根据上述变更，创建一个单独的 git 提交：

1. 分析所有暂存区的变更并起草提交消息：
   - 查看上面的最近提交以遵循此仓库的提交消息风格
   - 总结变更的性质（新功能、增强、错误修复、重构、测试、文档等）
   - 确保消息准确反映变更及其目的（即，"add" 表示全新功能，"update" 表示对现有功能的增强，"fix" 表示错误修复等）
   - 起草一个简洁（1-2 句话）的提交消息，专注于"为什么"而不是"是什么"

2. 暂存相关文件并使用 HEREDOC 语法创建提交：
```
git commit -m "$(cat <<'EOF'
Commit message here.${ATTRIBUTION_TEXT?`

${ATTRIBUTION_TEXT}`:""}
EOF
)"
```

你能够在单个回复中调用多个工具。使用单个消息暂存并创建提交。不要使用任何其他工具或做任何其他事情。除了这些工具调用外，不要发送任何其他文本或消息。
