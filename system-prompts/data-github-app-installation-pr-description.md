<!--
name: 'Data: GitHub App installation PR description'
description: Template for PR description when installing Claude Code GitHub App integration
ccVersion: 2.0.14
-->
## 🤖 安装 Claude Code GitHub App

此 PR 添加了一个 GitHub Actions 工作流，在我们的存储库中启用 Claude Code 集成。

### 什么是 Claude Code？

[Claude Code](https://claude.com/claude-code) 是一个 AI 编码代理，可以帮助：
- 错误修复和改进
- 文档更新
- 实现新功能
- 代码审查和建议
- 编写测试
- 以及更多！

### 它如何工作

一旦此 PR 合并，我们将能够通过在拉取请求或问题评论中提及 @claude 来与 Claude 交互。
一旦工作流被触发，Claude 将分析评论和周围上下文，并在 GitHub 操作中执行请求。

### 重要说明

- **此工作流在此 PR 合并之前不会生效**
- **@claude 提及在合并完成后之前不会工作**
- 每当在 PR 或问题评论中提及 Claude 时，工作流会自动运行
- Claude 获得对整个 PR 或问题上下文的访问权限，包括文件、差异和以前的评论

### 安全性

- 我们的 Anthropic API 密钥作为 GitHub Actions 密钥安全存储
- 只有对存储库具有写访问权限的用户才能触发工作流
- 所有 Claude 运行都存储在 GitHub Actions 运行历史中
- Claude 的默认工具限于读取/写入文件并通过创建评论、分支和提交与我们的存储库交互。
- 我们可以通过将它们添加到工作流文件中来添加更多允许的工具，例如：

```
allowed_tools: Bash(npm install),Bash(npm run build),Bash(npm run lint),Bash(npm run test)
```

在 [Claude Code action repo](https://github.com/anthropics/claude-code-action) 中有更多信息。

合并此 PR 后，让我们尝试在任何 PR 的评论中提及 @claude 来开始！
