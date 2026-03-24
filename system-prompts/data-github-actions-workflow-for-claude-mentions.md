<!--
name: 'Data: GitHub Actions workflow for @claude mentions'
description: GitHub Actions workflow template for triggering Claude Code via @claude mentions
ccVersion: 2.0.58
-->
name: Claude Code

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  issues:
    types: [opened, assigned]
  pull_request_review:
    types: [submitted]

jobs:
  claude:
    if: |
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review' && contains(github.event.review.body, '@claude')) ||
      (github.event_name == 'issues' && (contains(github.event.issue.body, '@claude') || contains(github.event.issue.title, '@claude')))
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
      id-token: write
      actions: read # 允许 Claude 在 PR 上读取 CI 结果
    steps:
      - name: 检出仓库
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: 运行 Claude Code
        id: claude
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: \${{ secrets.ANTHROPIC_API_KEY }}

          # 这是一个可选设置，允许 Claude 读取 PR 上的 CI 结果
          additional_permissions: |
            actions: read

          # 可选：给 Claude 一个自定义提示。如果未指定，Claude 将执行在标记它的评论中指定的说明。
          # prompt: '更新拉取请求描述以包括更改摘要。'

          # 可选：添加 claude_args 来自定义行为和配置
          # 请参阅 https://github.com/anthropics/claude-code-action/blob/main/docs/usage.md
          # 或 https://code.claude.com/docs/en/cli-reference 以获取可用选项
          # claude_args: '--allowed-tools Bash(gh pr:*)'
