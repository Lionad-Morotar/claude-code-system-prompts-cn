<!--
name: 'Data: Claude Code live documentation sources'
description: 用于从官方来源获取 Claude Code 最新文档的 WebFetch URL 列表
ccVersion: 2.1.154
-->
# 在线文档来源

用于获取 Claude Code 最新文档的 WebFetch URL。当内置参考文档和提示中的实时构建配置无法回答问题时，或当用户询问的行为、内部机制或主题未在实时构建快照中涵盖时，使用这些来源。

Mintlify 为每个页面同时提供 `.md` 和 `.mdx` 格式；优先使用 `.md` 以获得干净的抓取结果。

## 从这里开始

| 主题 | URL | 提取提示 |
|---|---|---|
| 页面索引（所有页面 + 标题） | `https://code.claude.com/docs/en/claude_code_docs_map.md` | "找到涵盖 <主题> 的页面并返回其 URL" |
| 变更日志 | `https://code.claude.com/docs/en/changelog.md` | "提取自 <X.Y.Z> 版本以来的变更" |

## 配置

| 主题 | URL | 提取提示 |
|---|---|---|
| 设置参考 | `https://code.claude.com/docs/en/settings.md` | "提取 <设置项> 的设置键名、类型、作用域和默认值" |
| CLI 参考（标志） | `https://code.claude.com/docs/en/cli-reference.md` | "提取 <标志> 的标志名、参数及其作用" |
| 权限和规则 | `https://code.claude.com/docs/en/permissions.md` | "提取 <工具> 的权限规则语法和示例" |
| 记忆（CLAUDE.md） | `https://code.claude.com/docs/en/memory.md` | "提取如何使用和结构化 CLAUDE.md" |
| `.claude/` 目录布局 | `https://code.claude.com/docs/en/claude-directory.md` | "提取 .claude 目录中各部分的放置规则" |
| 环境变量 | `https://code.claude.com/docs/en/env-vars.md` | "提取 <变量> 的环境变量名称、类型和作用" |

## 扩展性

| 主题 | URL | 提取提示 |
|---|---|---|
| Hooks | `https://code.claude.com/docs/en/hooks.md` | "提取 <hook 事件> 的 hook 事件名称、JSON schema 和配置" |
| 技能 | `https://code.claude.com/docs/en/skills.md` | "提取如何创建和结构化技能" |
| 子智能体 | `https://code.claude.com/docs/en/sub-agents.md` | "提取如何定义和配置子智能体" |
| MCP 服务器 | `https://code.claude.com/docs/en/mcp.md` | "提取如何添加、配置和认证 MCP 服务器" |
| 插件 | `https://code.claude.com/docs/en/plugins.md` | "提取如何安装和开发插件" |
| 输出风格 | `https://code.claude.com/docs/en/output-styles.md` | "提取如何创建和应用输出风格" |

## 工作流和界面

| 主题 | URL | 提取提示 |
|---|---|---|
| 命令参考 | `https://code.claude.com/docs/en/commands.md` | "提取 /<命令> 的命令名称、语法和描述" |
| 交互模式（快捷键） | `https://code.claude.com/docs/en/interactive-mode.md` | "提取 <操作> 的键盘快捷键" |
| 常见工作流 | `https://code.claude.com/docs/en/common-workflows.md` | "提取 <任务> 的工作流步骤" |
| GitHub Actions | `https://code.claude.com/docs/en/github-actions.md` | "提取如何在 GitHub Actions 中设置 Claude Code" |
| Web 版 Claude Code | `https://code.claude.com/docs/en/claude-code-on-the-web.md` | "提取远程会话的工作原理和可配置项" |
| VS Code 集成 | `https://code.claude.com/docs/en/vs-code.md` | "提取如何设置和使用 VS Code 扩展" |
| JetBrains 集成 | `https://code.claude.com/docs/en/jetbrains.md` | "提取如何设置和使用 JetBrains 插件" |

## 部署和安全

| 主题 | URL | 提取提示 |
|---|---|---|
| Amazon Bedrock | `https://code.claude.com/docs/en/amazon-bedrock.md` | "提取在 Bedrock 上的设置、认证和能力差异" |
| Google Vertex AI | `https://code.claude.com/docs/en/google-vertex-ai.md` | "提取在 Vertex 上的设置、认证和能力差异" |
| Microsoft Foundry | `https://code.claude.com/docs/en/microsoft-foundry.md` | "提取在 Foundry 上的设置、认证和能力差异" |
| 沙箱 | `https://code.claude.com/docs/en/sandboxing.md` | "提取沙箱的工作原理和配置方式" |
| 安全 | `https://code.claude.com/docs/en/security.md` | "提取安全模型和信任边界" |
| 网络配置 | `https://code.claude.com/docs/en/network-config.md` | "提取代理、防火墙和离线配置" |
| 费用与追踪 | `https://code.claude.com/docs/en/costs.md` | "提取费用的计算方式和追踪方法" |

## Agent SDK

关于使用 Claude Agent SDK（Python 或 TypeScript）构建自定义智能体，相关文档属于 Claude API 文档的一部分。抓取 `https://platform.claude.com/llms.txt` 以找到正确的页面，或使用 `/claude-api` 技能，该技能已深入涵盖 SDK 的内容。
