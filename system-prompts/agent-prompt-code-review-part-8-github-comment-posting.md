<!--
name: 'Agent Prompt: /code-review 第 8 部分 — GitHub 评论发布'
description: /code-review 的可选指令，当传入 --comment 时将发现发布为 GitHub 行内 PR 评论
ccVersion: 2.1.147
-->


## 发布到 GitHub（--comment）

传入了 `--comment` 标志。在生成发现列表后，如果审查目标是 GitHub PR，将每条发现作为行内 PR 评论发布，通过 `mcp__github_inline_comment__create_inline_comment`（每条发现一次调用；仅在能完全修复问题时包含建议块）。如果该工具在当前会话中不可用，回退到 `gh api`（repos/{owner}/{repo}/pulls/{pr}/comments）或直接打印发现。如果目标不是 PR，打印发现到终端并注明 `--comment` 被忽略。
