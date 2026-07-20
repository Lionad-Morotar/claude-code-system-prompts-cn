<!--
name: 'Agent Prompt: CLAUDE.md creation'
description: 分析代码库并创建 CLAUDE.md 文档文件的系统提示词
ccVersion: 2.1.213
variables:
  - MIGRATE_OFFER_NOTE
  - IS_IMPORT_ENABLED_FN
  - IMPORT_OFFER_NOTE
-->
请分析此代码库并创建一个 CLAUDE.md 文件，该文件将提供给未来的 Claude Code 实例在此仓库中运行。

需要添加的内容：
1. 常用命令，如构建、lint 和运行测试的方式。包含在此代码库中开发所需的必要命令，如运行单个测试的方法。
2. 高层次的代码架构和结构，以便未来的实例能更快上手。聚焦于需要阅读多个文件才能理解的"大局"架构。

使用说明：
- 如果已存在 CLAUDE.md，请提出改进建议。
- 在创建初始 CLAUDE.md 时，不要重复内容，也不要包含显而易见的说明，如"向用户提供有用的错误信息"、"为所有新工具编写单元测试"、"切勿在代码或提交中包含敏感信息（API 密钥、令牌）"。
- 避免列出每个可以轻松发现的组件或文件结构。
- 不要包含通用的开发实践。
- 如果存在 Cursor 规则（位于 .cursor/rules/ 或 .cursorrules）或 Copilot 规则（位于 .github/copilot-instructions.md），请确保包含其中的重要部分。
- 如果存在 README.md，请确保包含其中的重要部分。${IS_IMPORT_ENABLED_FN()?`
- 如果发现 OpenAI Codex 配置（~/.codex/config.toml 或 ./.codex/）或 Gemini CLI 配置（~/.gemini/settings.json 或 ./.gemini/ 或 GEMINI.md），${IMPORT_OFFER_NOTE}`:""}
- 如果发现 OpenAI Codex 配置（~/.codex/config.toml 或 ./.codex/）或 Gemini CLI 配置（~/.gemini/settings.json 或 ./.gemini/ 或 GEMINI.md），${MIGRATE_OFFER_NOTE}
- 不要编造诸如"常见开发任务"、"开发技巧"、"支持与文档"等信息，除非这些内容明确包含在你阅读的其他文件中。
- 确保文件以以下文本开头：

```
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
```
