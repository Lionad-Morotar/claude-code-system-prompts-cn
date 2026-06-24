# Claude Code 系统提示词（中文翻译）

> **当前版本：** v2.1.137（2026 年 5 月 8 日）—— 174 个版本

从 [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) npm 包中提取的系统提示词。由社区维护，非 Anthropic 官方出品。

## 文件

### 系统提示词

| 文件 | Tokens | 描述 |
|------|-------|------|
| [system-prompt-core.md](./system-prompts/system-prompt-core.md) | 26,500+ | 主系统提示词：身份、工具、规则 |
| [system-prompt-compaction.md](./system-prompts/system-prompt-compaction.md) | 11,500+ | 对话压缩：上下文窗口管理 |
| [system-prompt-autonomous-agent.md](./system-prompts/system-prompt-autonomous-agent.md) | 5,600+ | 自主代理：无提示执行模式 |
| [system-prompt-memory-staleness-verification.md](./system-prompts/system-prompt-memory-staleness-verification.md) | 700+ | 记忆过期验证：校验文件是否过时 |
| [system-prompt-partial-compaction-instructions.md](./system-prompts/system-prompt-partial-compaction-instructions.md) | 2,200+ | 部分压缩：选择性上下文保留 |
| [system-prompt-communication-style.md](./system-prompts/system-prompt-communication-style.md) | 1,100+ | 沟通风格：简洁更新与面向用户的文本指南 |
| [system-prompt-user-facing-communication-style.md](./system-prompts/system-prompt-user-facing-communication-style.md) | 1,800+ | 用户沟通指南：清晰、简洁、可读的写作风格 |
| [system-prompt-exploratory-questions-analyze-before-implementing.md](./system-prompts/system-prompt-exploratory-questions-analyze-before-implementing.md) | 700+ | 探索性问题：分析后再实现 |
| [system-prompt-dream-team-memory-handling.md](./system-prompts/system-prompt-dream-team-memory-handling.md) | 1,000+ | Dream 团队记忆处理：共享记忆的合并与保守修剪规则 |
| [system-prompt-dream-claudemd-memory-reconciliation.md](./system-prompts/system-prompt-dream-claudemd-memory-reconciliation.md) | 200+ | Dream CLAUDE.md 记忆调校：对照 CLAUDE.md 调校反馈和项目记忆 |
| [system-prompt-background-session-instructions.md](./system-prompts/system-prompt-background-session-instructions.md) | 100+ | 后台会话指令：后台作业使用作业专用临时目录并遵循工作树隔离指南 |
| [system-prompt-remote-plan-mode-ultraplan.md](./system-prompts/system-prompt-remote-plan-mode-ultraplan.md) | 7,200+ | 远程规划模式：云辅助规划 |
| [system-prompt-writing-subagent-prompts.md](./system-prompts/system-prompt-writing-subagent-prompts.md) | 1,700+ | 编写子代理提示词：结构化子代理指令 |

### 代理提示词

| 文件 | Tokens | 描述 |
|------|-------|------|
| [agent-prompt-background-agent-state-classifier.md](./system-prompts/agent-prompt-background-agent-state-classifier.md) | 800+ | 后台代理状态分类器：将后台代理记录尾部分类为工作中/阻塞/完成/失败 |
| [agent-prompt-dream-memory-consolidation.md](./system-prompts/agent-prompt-dream-memory-consolidation.md) | 5,100+ | 记忆整合：后台内存处理 |
| [agent-prompt-memory-synthesis.md](./system-prompts/agent-prompt-memory-synthesis.md) | 2,500+ | 记忆合成：将观察结果编译为持久记忆 |
| [agent-prompt-onboarding-guide-generator.md](./system-prompts/agent-prompt-onboarding-guide-generator.md) | 4,300+ | 入手指南生成：为新用户创建指南 |
| [agent-prompt-prompt-hook-execution.md](./system-prompts/agent-prompt-prompt-hook-execution.md) | 1,600+ | 提示钩子执行：在提示前/后运行钩子 |
| [agent-prompt-session-search.md](./system-prompts/agent-prompt-session-search.md) | 2,500+ | 会话搜索：通过向量搜索查找相关会话 |
| [agent-prompt-session-title-and-branch-generation.md](./system-prompts/agent-prompt-session-title-and-branch-generation.md) | 1,700+ | 会话标题与分支生成 |
| [agent-prompt-worker-fork.md](./system-prompts/agent-prompt-worker-fork.md) | 2,000+ | Worker Fork：后台任务分发 |
| [agent-prompt-determine-which-memory-files-to-attach.md](./system-prompts/agent-prompt-determine-which-memory-files-to-attach.md) | 2,400+ | 确定附加哪些记忆文件：选择相关记忆文件 |

### 工具描述

| 文件 | Tokens | 描述 |
|------|-------|------|
| [tool-description-agent-usage-notes.md](./system-prompts/tool-description-agent-usage-notes.md) | 2,800+ | 代理使用说明：子代理管理 |
| [tool-description-bash.md](./system-prompts/tool-description-bash.md) | 300+ | Bash 工具描述 |
| [tool-description-bash-alternative-communication.md](./system-prompts/tool-description-bash-alternative-communication.md) | 400+ | Bash 替代通信工具描述 |

### 技能

| 文件 | Tokens | 描述 |
|------|-------|------|
| [skill-catch-up-periodic-heartbeat.md](./system-prompts/skill-catch-up-periodic-heartbeat.md) | 1,500+ | 周期性跟进心跳：扫描当前优先级、分类可操作变更、报告简短摘要并更新跟进状态 |
| [skill-dream-memory-consolidation.md](./system-prompts/skill-dream-memory-consolidation.md) | 500+ | Dream 记忆整合：夜间整理任务，将最近日志和记录整合为持久记忆主题 |
| [skill-morning-checkin-daily-brief.md](./system-prompts/skill-morning-checkin-daily-brief.md) | 1,500+ | 每日晨间简报：准备日历和收件箱摘要、安排会前检查并记录当天首要任务 |
| [skill-pre-meeting-checkin-event-brief.md](./system-prompts/skill-pre-meeting-checkin-event-brief.md) | 400+ | 会前检查事件简报：收集事件材料、最近线索上下文、待解决问题和简洁会议简报 |
| [skill-agent-design-patterns.md](./system-prompts/skill-agent-design-patterns.md) | 5,600+ | 代理设计模式：多代理架构 |
| [skill-team-onboarding-guide.md](./system-prompts/skill-team-onboarding-guide.md) | 1,000+ | 团队入手指南：协作设置 |
| [skill-dream-nightly-schedule.md](./system-prompts/skill-dream-nightly-schedule.md) | 800+ | Dream 夜间调度：设置周期性记忆整合任务 |
| [skill-verify-skill.md](./system-prompts/skill-verify-skill.md) | 3,700+ | 验证技能：安装后验证 |

### 数据/参考

| 文件 | Tokens | 描述 |
|------|-------|------|
| [data-claude-model-catalog.md](./system-prompts/data-claude-model-catalog.md) | 1,400+ | 模型目录：可用模型及定价 |
| [data-claude-api-reference-python.md](./system-prompts/data-claude-api-reference-python.md) | 10,000+ | Python SDK API 参考 |
| [data-claude-api-reference-typescript.md](./system-prompts/data-claude-api-reference-typescript.md) | 8,200+ | TypeScript SDK API 参考 |
| [data-claude-api-reference-curl.md](./system-prompts/data-claude-api-reference-curl.md) | 8,500+ | curl API 参考 |
| [data-claude-api-reference-java.md](./system-prompts/data-claude-api-reference-java.md) | 9,300+ | Java SDK API 参考 |
| [data-claude-api-reference-go.md](./system-prompts/data-claude-api-reference-go.md) | 8,900+ | Go SDK API 参考 |
| [data-claude-api-reference-ruby.md](./system-prompts/data-claude-api-reference-ruby.md) | 8,900+ | Ruby SDK API 参考 |
| [data-claude-api-reference-php.md](./system-prompts/data-claude-api-reference-php.md) | 9,200+ | PHP SDK API 参考 |
| [data-tool-use-concepts.md](./system-prompts/data-tool-use-concepts.md) | 6,800+ | 工具使用概念指南 |
| [data-assistant-voice-and-values-template.md](./system-prompts/data-assistant-voice-and-values-template.md) | 400+ | 助手声音与价值观模板：描述 Claude 的声音、价值观和沟通风格 |
| [data-managed-agents-memory-stores-reference.md](./system-prompts/data-managed-agents-memory-stores-reference.md) | 2,700+ | 托管智能体记忆存储参考：存储创建、会话挂载、FUSE 挂载、记忆 CRUD、并发、版本、编辑及端点路径 |
| [data-user-profile-memory-template.md](./system-prompts/data-user-profile-memory-template.md) | 200+ | 用户画像记忆模板：涵盖个人信息、工作上下文、日程和沟通偏好 |
| [data-prompt-caching-design-optimization.md](./system-prompts/data-prompt-caching-design-optimization.md) | 4,400+ | 提示缓存设计优化 |

## 版本历史

| 版本 | 日期 | 变更摘要 |
|-------|------|-------------|
| v2.1.119 | 2026-04-23 | 新增后台代理状态分类器、用户画像模板、助手声音与价值观模板、记忆存储参考；新增 4 个技能（周期性跟进、Dream 记忆整合、每日晨间简报、会前检查）；新增后台会话指令、Dream CLAUDE.md 记忆调校；更新安全监控 BLOCK/ALLOW 规则、状态行设置、托管智能体文档；删除 invoked-skills，替换为 previously-invoked-skills |
| v2.1.98 | 2026-04-09 | 新增沟通风格提示词、用户沟通指南、探索性问题提示词、Dream 团队记忆处理；更新 Dream 记忆整合/修剪、Advisor 工具指令；新增 Dream 夜间调度技能 |
| v2.1.97 | 2026-04-08 | 新增托管智能体文档、Dream 夜间调度、Worker fork agentMetadata、Bash 替代通信工具、多个提示词更新 |
| v2.1.96 | 2026-04-09 | 核心提示词大量更新（25.8k→26.5k tokens）、新增记忆过期验证提示词、更新工具描述、多个代理提示词更新 |
| v2.1.95 | 2026-04-09 | 核心提示词更新、claude_model_catalog 更新、compaction 更新 |
| v2.1.94 | 2026-04-08 | 核心提示词大量更新（24.9k→25.8k tokens）、模型目录更新、agent-design-patterns 更新、多个小更新 |
| v2.1.93 | 2026-04-07 | 核心提示词更新、compaction 更新、模型目录更新、自动继续修复、agent-design-patterns 更新 |
| v2.1.92 | 2026-04-05 | 核心提示词大量更新（23.5k→24.9k tokens）、agent-design-patterns 拆分 |
| v2.1.91 | 2026-04-04 | 核心提示词更新、Dream 提示词更新、agent-design-patterns 更新 |
| v2.1.90 | 2026-04-04 | 核心提示词大量更新（21.2k→23.5k tokens）、agent-design-patterns 更新、多个提示词更新 |
| v2.1.89 | 2026-04-02 | 核心提示词更新、compaction 更新、Dream 提示词更新、tool-use 概念更新 |
| v2.1.88 | 2026-04-01 | 核心提示词大量更新（18.7k→21.2k tokens）、compaction 更新、Dream 提示词更新、agent-design-patterns 更新 |
| v2.1.87 | 2026-03-28 | 核心提示词更新、compaction 更新、Dream 提示词更新、remote-plan-mode 更新 |
| v2.1.86 | 2026-03-27 | 核心提示词大量更新（17.4k→18.7k tokens）、compaction 大量更新、Dream 提示词更新、agent-design-patterns 更新 |
| v2.1.85 | 2026-03-26 | 核心提示词更新、新 Dream 提示词（agent-prompt-dream-memory-consolidation） |
| v2.1.84 | 2026-03-25 | 核心提示词更新、新 partial-compaction 提示词 |
| v2.1.83 | 2026-03-25 | 核心提示词更新、skill-verify-skill 更新 |
| v2.1.82 | 2026-03-24 | 核心提示词大量更新（16.3k→17.4k tokens）、新 memory-synthesis 提示词、新 onboarding-guide-generator 提示词、新 prompt-hook-execution 提示词、新 session-search 提示词、新 session-title-and-branch-generation 提示词、新 worker-fork 提示词、新 determine-which-memory-files-to-attach 提示词、新 agent-usage-notes 提示词、新 agent-design-patterns 提示词、新 team-onboarding-guide 提示词、新 verify-skill 提示词、新 data-tool-use-concepts 提示词、新 data-prompt-caching-design-optimization 提示词 |
| v2.1.81 | 2026-03-22 | 核心提示词更新、compaction 更新 |
| v2.1.80 | 2026-03-21 | 核心提示词更新 |
| v2.1.79 | 2026-03-21 | 核心提示词更新（自动继续修复） |
| v2.1.78 | 2026-03-20 | 核心提示词大量更新（15.5k→16.3k tokens） |
| v2.1.77 | 2026-03-20 | 核心提示词更新、compaction 更新 |
| v2.1.76 | 2026-03-19 | 核心提示词大量更新（14.2k→15.5k tokens） |
| v2.1.75 | 2026-03-18 | 核心提示词更新、compaction 更新 |
| v2.1.74 | 2026-03-17 | 核心提示词更新 |
| v2.1.73 | 2026-03-15 | 核心提示词更新、compaction 更新 |
| v2.1.72 | 2026-03-14 | 核心提示词更新 |
| v2.1.71 | 2026-03-14 | 核心提示词更新 |
| v2.1.70 | 2026-03-13 | 核心提示词更新、compaction 更新 |
| v2.1.69 | 2026-03-13 | 核心提示词大量更新（13.1k→14.2k tokens）、compaction 更新 |
| v2.1.68 | 2026-03-12 | 核心提示词更新、compaction 更新 |
| v2.1.67 | 2026-03-11 | 核心提示词更新 |
| v2.1.66 | 2026-03-11 | 核心提示词更新 |
| v2.1.65 | 2026-03-10 | 核心提示词大量更新（12.2k→13.1k tokens） |
| v2.1.64 | 2026-03-09 | 核心提示词更新、compaction 更新 |
| v2.1.63 | 2026-03-07 | 核心提示词更新 |
| v2.1.62 | 2026-03-07 | 核心提示词更新 |
| v2.1.61 | 2026-03-06 | 核心提示词更新 |
| v2.1.60 | 2026-03-06 | 核心提示词更新、compaction 更新 |
| v2.1.59 | 2026-03-05 | 核心提示词更新、compaction 更新 |
| v2.1.58 | 2026-03-04 | 核心提示词更新 |
| v2.1.57 | 2026-03-04 | 核心提示词更新 |
| v2.1.56 | 2026-03-03 | 核心提示词更新、compaction 更新 |
| v2.1.55 | 2026-03-03 | 核心提示词更新、compaction 更新 |
| v2.1.54 | 2026-03-03 | 核心提示词更新 |
| v2.1.53 | 2026-03-02 | 核心提示词更新、compaction 更新 |
| v2.1.52 | 2026-03-02 | 核心提示词更新 |
| v2.1.51 | 2026-03-02 | 核心提示词更新 |
| v2.1.50 | 2026-03-01 | 核心提示词更新、compaction 更新 |
| v2.1.49 | 2026-02-28 | 核心提示词更新、compaction 更新 |
| v2.1.48 | 2026-02-28 | 核心提示词更新 |
| v2.1.47 | 2026-02-27 | 核心提示词更新、compaction 更新 |
| v2.1.46 | 2026-02-26 | 核心提示词大量更新（11.3k→12.2k tokens） |
| v2.1.45 | 2026-02-25 | 核心提示词更新 |
| v2.1.44 | 2026-02-25 | 核心提示词更新 |
| v2.1.43 | 2026-02-24 | 核心提示词更新 |
| v2.1.42 | 2026-02-24 | 核心提示词更新 |
| v2.1.41 | 2026-02-24 | 核心提示词更新 |
| v2.1.40 | 2026-02-24 | 核心提示词更新 |
| v2.1.39 | 2026-02-22 | 核心提示词更新、compaction 更新 |
| v2.1.38 | 2026-02-22 | 核心提示词更新 |
| v2.1.37 | 2026-02-21 | 核心提示词更新 |
| v2.1.36 | 2026-02-21 | 核心提示词更新、compaction 更新 |
| v2.1.35 | 2026-02-21 | 核心提示词更新 |
| v2.1.34 | 2026-02-20 | 核心提示词更新、compaction 更新 |
| v2.1.33 | 2026-02-19 | 核心提示词更新 |
| v2.1.32 | 2026-02-19 | 核心提示词更新 |
| v2.1.31 | 2026-02-18 | 核心提示词更新 |
| v2.1.30 | 2026-02-18 | 核心提示词更新、compaction 更新 |
| v2.1.29 | 2026-02-18 | 核心提示词更新 |
| v2.1.28 | 2026-02-17 | 核心提示词更新、compaction 更新 |
| v2.1.27 | 2026-02-17 | 核心提示词更新、compaction 更新 |
| v2.1.26 | 2026-02-16 | 核心提示词更新 |
| v2.1.25 | 2026-02-14 | 核心提示词更新、compaction 更新 |
| v2.1.24 | 2026-02-14 | 核心提示词更新、compaction 更新 |
| v2.1.23 | 2026-02-13 | 核心提示词更新、compaction 更新 |
| v2.1.22 | 2026-02-12 | 核心提示词更新、compaction 更新 |
| v2.1.21 | 2026-02-12 | 核心提示词更新、compaction 更新 |
| v2.1.20 | 2026-02-12 | 核心提示词更新 |
| v2.1.19 | 2026-02-11 | 核心提示词更新、compaction 更新 |
| v2.1.18 | 2026-02-11 | 核心提示词更新、compaction 更新 |
| v2.1.17 | 2026-02-10 | 核心提示词更新 |
| v2.1.16 | 2026-02-10 | 核心提示词更新 |
| v2.1.15 | 2026-02-09 | 核心提示词更新、compaction 更新 |
| v2.1.14 | 2026-02-09 | 核心提示词更新、compaction 更新 |
| v2.1.13 | 2026-02-09 | 核心提示词更新 |
| v2.1.12 | 2026-02-07 | 核心提示词更新、compaction 更新 |
| v2.1.11 | 2026-02-07 | 核心提示词更新 |
| v2.1.10 | 2026-02-07 | 核心提示词更新 |
| v2.1.9 | 2026-02-06 | 核心提示词更新、compaction 更新 |
| v2.1.8 | 2026-02-06 | 核心提示词更新 |
| v2.1.7 | 2026-02-05 | 核心提示词更新 |
| v2.1.6 | 2026-02-05 | 核心提示词更新、compaction 更新 |
| v2.1.5 | 2026-02-04 | 核心提示词更新 |
| v2.1.4 | 2026-02-04 | 核心提示词更新 |
| v2.1.3 | 2026-02-04 | 核心提示词更新 |
| v2.1.2 | 2026-02-03 | 核心提示词更新 |
| v2.1.1 | 2026-02-03 | 核心提示词更新、compaction 更新 |
| v2.1.0 | 2026-02-03 | 初始提取 |

## 提取

提示词通过分析 `@anthropic-ai/claude-code` npm 包的编译后 JavaScript 提取。提取脚本位于 `scripts/` 目录中。

### 工作原理

1. 提取器从 npm 获取指定版本的包
2. 对编译后的 JavaScript 使用正则表达式和 AST 分析来定位提示词模板
3. 提示词被分割为独立文件并清理元数据

## 许可证

本仓库中的提示词提取自 Anthropic 的 Claude Code npm 包，并遵循其原始许可证。请查看 Anthropic 的条款以了解使用限制。

### 署名

本仓库最初基于 [Piebald AI](https://piebald.ai/) 的 [claude-code-system-prompts](https://github.com/Piebalad-AI/claude-code-system-prompts) 仓库。

## 支持

- **问题/讨论：** 在 [anthropics/claude-code](https://github.com/anthropics/claude-code) 仓库（官方）提交问题
- **提取问题：** 在本仓库提交问题
- **本地补丁：** 使用 [tweakcc](https://github.com/Piebald-AI/tweakcc) 自定义你的 Claude Code 安装
