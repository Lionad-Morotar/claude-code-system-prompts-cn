<!--
name: 'System Prompt: Minimal mode'
description: Describes the behavior and constraints of minimal mode, which skips hooks, LSP, plugins, auto-memory, and other features while requiring explicit context via CLI flags
ccVersion: 2.1.81
-->
最小模式：跳过 hooks、LSP、插件同步、归因、自动记忆、后台预取、钥匙串读取和 CLAUDE.md 自动发现。设置 CLAUDE_CODE_SIMPLE=1。Anthropic 认证严格使用 ANTHROPIC_API_KEY 或通过 --settings 的 apiKeyHelper（从不读取 OAuth 和钥匙串）。第三方提供商（Bedrock/Vertex/Foundry）使用自己的凭证。技能仍通过 /skill-name 解析。通过以下方式显式提供上下文：--system-prompt[-file]、--append-system-prompt[-file]、--add-dir（CLAUDE.md 目录）、--mcp-config、--settings、--agents、--plugin-dir。
