<!--
name: 'Data: Claude Code live documentation sources'
description: WebFetch URLs for fetching current Claude Code documentation from official sources
ccVersion: 2.1.202
-->
# 实时文档来源

用于获取最新 Claude Code 文档的 WebFetch URL。当提示中的捆绑参考和实时构建配置无法回答问题，或用户询问实时构建快照未涵盖的行为、内部机制或主题时，请使用这些资源。

Mintlify 为每个页面同时提供 `.md` 和 `.mdx` 格式；优先使用 `.md` 以获取干净的抓取结果。`.md` 格式仅用于抓取：为用户链接页面时，去掉末尾的 `.md` 以展示渲染后的页面。

## 从这里开始

| 主题 | URL | 提取提示词 |
|---|---|---|
| 页面索引（所有页面 + 标题） | `https://code.claude.com/docs/en/claude_code_docs_map.md` | "Find the page that covers <topic> and return its URL" |
| 变更日志 | `https://code.claude.com/docs/en/changelog.md` | "Extract changes since version <X.Y.Z>" |

## 配置

| 主题 | URL | 提取提示词 |
|---|---|---|
| 设置参考 | `https://code.claude.com/docs/en/settings.md` | "Extract the settings key, type, scope, and default for <setting>" |
| CLI 参考（标志） | `https://code.claude.com/docs/en/cli-reference.md` | "Extract the flag, its arguments, and what it does for <flag>" |
| 权限和规则 | `https://code.claude.com/docs/en/permissions.md` | "Extract the permission rule syntax and examples for <tool>" |
| 记忆（CLAUDE.md） | `https://code.claude.com/docs/en/memory.md` | "Extract how to use and structure CLAUDE.md" |
| `.claude/` 目录结构 | `https://code.claude.com/docs/en/claude-directory.md` | "Extract what goes where in the .claude directory" |
| 环境变量 | `https://code.claude.com/docs/en/env-vars.md` | "Extract the environment variable name, type, and effect for <variable>" |

## 可扩展性

| 主题 | URL | 提取提示词 |
|---|---|---|
| Hooks | `https://code.claude.com/docs/en/hooks.md` | "Extract the hook event names, JSON schema, and configuration for <hook event>" |
| Skills | `https://code.claude.com/docs/en/skills.md` | "Extract how to create and structure a skill" |
| 子代理 | `https://code.claude.com/docs/en/sub-agents.md` | "Extract how to define and configure subagents" |
| MCP 服务器 | `https://code.claude.com/docs/en/mcp.md` | "Extract how to add, configure, and authenticate MCP servers" |
| 插件 | `https://code.claude.com/docs/en/plugins.md` | "Extract how to install and develop plugins" |
| 输出样式 | `https://code.claude.com/docs/en/output-styles.md` | "Extract how to create and apply output styles" |

## 工作流和界面

| 主题 | URL | 提取提示词 |
|---|---|---|
| 命令参考 | `https://code.claude.com/docs/en/commands.md` | "Extract the command name, syntax, and description for /<command>" |
| 交互模式（键绑定） | `https://code.claude.com/docs/en/interactive-mode.md` | "Extract the keyboard shortcut for <action>" |
| 常用工作流 | `https://code.claude.com/docs/en/common-workflows.md` | "Extract the workflow steps for <task>" |
| GitHub Actions | `https://code.claude.com/docs/en/github-actions.md` | "Extract how to set up Claude Code in GitHub Actions" |
| 网页版 Claude Code | `https://code.claude.com/docs/en/claude-code-on-the-web.md` | "Extract how remote sessions work and what's configurable" |
| VS Code 集成 | `https://code.claude.com/docs/en/vs-code.md` | "Extract how to set up and use the VS Code extension" |
| JetBrains 集成 | `https://code.claude.com/docs/en/jetbrains.md` | "Extract how to set up and use the JetBrains plugin" |

## 部署和安全

| 主题 | URL | 提取提示词 |
|---|---|---|
| Amazon Bedrock | `https://code.claude.com/docs/en/amazon-bedrock.md` | "Extract setup, auth, and capability differences on Bedrock" |
| Google Vertex AI | `https://code.claude.com/docs/en/google-vertex-ai.md` | "Extract setup, auth, and capability differences on Vertex" |
| Microsoft Foundry | `https://code.claude.com/docs/en/microsoft-foundry.md` | "Extract setup, auth, and capability differences on Foundry" |
| 沙箱 | `https://code.claude.com/docs/en/sandboxing.md` | "Extract how sandboxing works and how to configure it" |
| 安全性 | `https://code.claude.com/docs/en/security.md` | "Extract the security model and trust boundaries" |
| 网络配置 | `https://code.claude.com/docs/en/network-config.md` | "Extract proxy, firewall, and offline configuration" |
| 成本和跟踪 | `https://code.claude.com/docs/en/costs.md` | "Extract how costs are calculated and how to track them" |

## Slack 中的 Claude（Claude Tag）

先阅读 `references/claude-tag.md`——它是该界面的离线基础参考。然后抓取：

| 主题 | URL | 提取提示词 |
|---|---|---|
| Claude Tag（Slack 中作为团队成员的 Claude，组织管理） | `https://claude.com/docs/claude-tag/overview.md` | "Extract what Claude Tag is, plan availability, and how an org owner enables and configures it" |
| 所有 Claude Tag 页面（claude.com 文档域名的索引） | `https://claude.com/docs/llms.txt` | "Find the Claude Tag page that covers <topic> and return its URL" |
| 组织所有者设置指南（配对 Slack、连接工具、消费上限、启动） | `https://claude.com/docs/claude-tag/admins/setup-overview.md` | "Extract the setup steps and prerequisites for enabling Claude Tag" |
| 最终用户入门指南 | `https://claude.com/docs/claude-tag/users/getting-started.md` | "Extract how a Slack user starts working with Claude Tag" |
| 从早期"Claude in Slack"应用迁移 | `https://claude.com/docs/claude-tag/admins/migrate-from-earlier.md` | "Extract what changes for workspaces moving from the earlier app to Claude Tag" |

## Agent SDK

要使用 Claude Agent SDK（Python 或 TypeScript）构建自定义代理，文档是 Claude API 文档的一部分。抓取 `https://platform.claude.com/llms.txt` 以找到正确的页面，或使用 `/claude-api` 技能深入了解 SDK。
