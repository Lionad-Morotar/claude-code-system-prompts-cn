<!--
name: '数据：在线文档来源'
description: 用于从官方来源获取 Claude API 和 Agent SDK 当前文档的 WebFetch URL
ccVersion: 2.1.203
-->
# 在线文档来源

本文件包含用于从 platform.claude.com 和 Agent SDK 仓库获取当前信息的 WebFetch URL。当用户需要可能已超过缓存内容的最新数据时使用这些 URL。

## 何时使用 WebFetch

- 用户明确要求"最新"或"当前"信息
- 缓存数据似乎不正确
- 用户询问缓存内容未涵盖的功能
- 用户需要特定的 API 细节或示例

## Claude API 文档 URL

### 模型与定价

| 主题           | URL                                                                          | 提取提示                                                               |
| --------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 模型概览 | `https://platform.claude.com/docs/en/about-claude/models/overview.md`        | "提取所有 Claude 模型的当前模型 ID、上下文窗口和定价信息" |
| 迁移指南 | `https://platform.claude.com/docs/en/about-claude/models/migration-guide.md` | "提取迁移到新版 Claude 模型时的破坏性变更、已弃用参数和各模型的迁移步骤" |
| 定价         | `https://platform.claude.com/docs/en/pricing.md`                             | "提取每百万 token 输入和输出的当前定价"               |

### 核心功能

| 主题             | URL                                                                          | 提取提示                                                                      |
| ----------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 扩展思考 | `https://platform.claude.com/docs/en/build-with-claude/extended-thinking.md` | "提取扩展思考参数、budget_tokens 要求和使用示例" |
| 自适应思考 | `https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking.md` | "提取自适应思考设置、effort 级别和 {{OPUS_NAME}} 使用示例"         |
| Effort 参数  | `https://platform.claude.com/docs/en/build-with-claude/effort.md`            | "提取 effort 级别、成本-质量权衡及其与 thinking 的交互"        |
| 工具使用          | `https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview.md`  | "提取工具定义 schema、tool_choice 选项和处理工具结果的方法"       |
| 流式传输         | `https://platform.claude.com/docs/en/build-with-claude/streaming.md`         | "提取流式事件类型、SDK 示例和最佳实践"                      |
| 提示词缓存    | `https://platform.claude.com/docs/en/build-with-claude/prompt-caching.md`    | "提取 cache_control 用法、定价优势和实现示例"           |

### 媒体与文件

| 主题       | URL                                                                    | 提取提示                                                 |
| ----------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 视觉      | `https://platform.claude.com/docs/en/build-with-claude/vision.md`      | "提取支持的图片格式、大小限制和代码示例" |
| PDF 支持 | `https://platform.claude.com/docs/en/build-with-claude/pdf-support.md` | "提取 PDF 处理能力、限制和示例"         |

### API 操作

| 主题            | URL                                                                         | 提取提示                                                                                       |
| ---------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 批量处理 | `https://platform.claude.com/docs/en/build-with-claude/batch-processing.md` | "提取批量 API 端点、请求格式和结果轮询方式"                                  |
| Files API        | `https://platform.claude.com/docs/en/build-with-claude/files.md`            | "提取文件上传、下载和在消息中引用的方式，包括支持的类型和 beta 请求头" |
| Token 计数   | `https://platform.claude.com/docs/en/build-with-claude/token-counting.md`   | "提取 token 计数 API 的用法和示例"                                                         |
| 速率限制      | `https://platform.claude.com/docs/en/api/rate-limits.md`                    | "提取各层级和模型的当前速率限制"                                                         |
| 错误           | `https://platform.claude.com/docs/en/api/errors.md`                         | "提取 HTTP 错误码、含义和重试指导"                                                |
| Amazon Bedrock   | `https://platform.claude.com/docs/en/build-with-claude/claude-on-amazon-bedrock.md` | "提取各语言的 AnthropicBedrockMantle 客户端、`anthropic.` 前缀的模型 ID、认证路径、功能可用性和区域" |
| AWS 上的 Claude Platform | `https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws.md` | "提取各语言的 AnthropicAWS 客户端、SigV4 认证、凭据优先级、短期 API key、workspace_id 和区域要求" |
| AWS 上的 Claude Platform — IAM 操作 | `https://platform.claude.com/docs/en/api/claude-platform-on-aws-iam-actions.md` | "提取每种 API 能力所需的 IAM 操作名称、资源 ARN 和策略示例" |

### 工具

| 主题          | URL                                                                                    | 提取提示                                                                        |
| -------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 代码执行 | `https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool.md` | "提取代码执行工具的设置、文件上传、容器复用和响应处理方式" |
| Computer Use   | `https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use.md`        | "提取 computer use 工具的设置、能力和实现示例"             |
| Bash 工具      | `https://platform.claude.com/docs/en/agents-and-tools/tool-use/bash-tool.md`           | "提取 bash 工具的 schema、参考实现和安全注意事项"        |
| 文本编辑器    | `https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool.md`    | "提取文本编辑器工具的命令、schema 和参考实现"                |
| Memory 工具    | `https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool.md`         | "提取 memory 工具的命令、目录结构和实现模式"         |
| Tool Search    | `https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool.md`    | "提取 tool search 的设置、使用时机和缓存交互"                          |
| 程序化工具调用 | `https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling.md` | "提取 PTC 设置、脚本执行模型和代码中调用工具的方式"    |
| Skills         | `https://platform.claude.com/docs/en/agents-and-tools/skills.md`                       | "提取 skill 文件夹结构、SKILL.md 格式和加载行为"                  |

### 高级功能

| 主题              | URL                                                                           | 提取提示                                   |
| ------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| 结构化输出 | `https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md` | "提取 output_config.format 的用法和 schema 强制执行方式"                           |
| Compaction         | `https://platform.claude.com/docs/en/build-with-claude/compaction.md`         | "提取 compaction 设置、触发配置和流式传输中的 compaction"             |
| 上下文编辑    | `https://platform.claude.com/docs/en/build-with-claude/context-editing.md`    | "提取上下文编辑的阈值、清除内容和配置方式"            |
| Citations          | `https://platform.claude.com/docs/en/build-with-claude/citations.md`          | "提取引文格式和实现方式"        |
| 上下文窗口    | `https://platform.claude.com/docs/en/build-with-claude/context-windows.md`    | "提取上下文窗口大小和 token 管理方式" |

### 托管代理

当缓存的 `shared/managed-agents-*.md` 概念文件或 `{lang}/managed-agents/README.md` 中未涵盖托管代理的绑定、行为或线级细节时使用。

| 主题                 | URL                                                                              | 提取提示                                                                               |
| --------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 概览              | `https://platform.claude.com/docs/en/managed-agents/overview.md`                 | "提取高层架构以及 agents/sessions/environments/vaults 如何协同工作" |
| 快速入门            | `https://platform.claude.com/docs/en/managed-agents/quickstart.md`               | "提取最小的端到端 agent → environment → session → stream 代码路径"              |
| Agent 设置           | `https://platform.claude.com/docs/en/managed-agents/agent-setup.md`              | "提取 agent 的 create/update/list-versions/archive 生命周期和参数"                   |
| 定义产出       | `https://platform.claude.com/docs/en/managed-agents/define-outcomes.md`          | "提取 outcome 定义、评估钩子和成功标准配置"             |
| Sessions              | `https://platform.claude.com/docs/en/managed-agents/sessions.md`                 | "提取 session 生命周期、状态转换、idle/terminated 语义和恢复规则"    |
| Environments          | `https://platform.claude.com/docs/en/managed-agents/environments.md`             | "提取环境配置（云/网络）、管理端点和复用模型"          |
| 自托管沙箱 | `https://platform.claude.com/docs/en/managed-agents/self-hosted-sandboxes.md`    | "提取 config:{type:self_hosted}、ANTHROPIC_ENVIRONMENT_KEY、EnvironmentWorker.run/run_one、beta_agent_toolset、ant beta:worker poll/run、webhook 驱动唤醒" |
| 自托管沙箱 — 安全 | `https://platform.claude.com/docs/en/managed-agents/self-hosted-sandboxes-security.md` | "提取客户负责的部分（加固、出站流量、密钥保管、信任边界）vs Anthropic 无法负责的部分" |
| 事件与流式传输  | `https://platform.claude.com/docs/en/managed-agents/events-and-streaming.md`     | "提取事件流类型、先流后发的顺序、重连/去重和引导模式"    |
| Tools                 | `https://platform.claude.com/docs/en/managed-agents/tools.md`                    | "提取内置工具集、自定义工具定义和工具结果的线格式"                |
| Files                 | `https://platform.claude.com/docs/en/managed-agents/files.md`                    | "提取文件上传、挂载路径、会话资源和会话输出的列出/下载"  |
| 权限策略   | `https://platform.claude.com/docs/en/managed-agents/permission-policies.md`      | "提取权限策略类型（allow/deny/confirm）和按工具配置方式"                     |
| Multi-Agent           | `https://platform.claude.com/docs/en/managed-agents/multi-agent.md`              | "提取多 agent 组合模式、子 agent 调用和结果交接方式"            |
| Observability         | `https://platform.claude.com/docs/en/managed-agents/observability.md`            | "提取托管代理暴露的日志、追踪和使用遥测"                       |
| Webhooks              | `https://platform.claude.com/docs/en/managed-agents/webhooks.md`                 | "提取 webhook 端点注册、HMAC 签名验证、支持的事件类型和投递语义" |
| GitHub                | `https://platform.claude.com/docs/en/managed-agents/github.md`                   | "提取 github_repository 资源形态、多仓库挂载和 token 轮换"             |
| MCP Connector         | `https://platform.claude.com/docs/en/managed-agents/mcp-connector.md`            | "提取 agent 上的 MCP 服务器声明和基于 vault 的凭据注入（会话级别）"     |
| Vaults                | `https://platform.claude.com/docs/en/managed-agents/vaults.md`                   | "提取 vault 创建、凭据添加/轮换、OAuth 刷新形态和归档"                 |
| Skills                | `https://platform.claude.com/docs/en/managed-agents/skills.md`                   | "提取托管代理的 skill 打包和加载模型"                                  |
| Memory                | `https://platform.claude.com/docs/en/managed-agents/memory.md`                   | "提取 memory 资源形态、作用域和生命周期"                                         |
| 入门            | `https://platform.claude.com/docs/en/managed-agents/onboarding.md`               | "提取首次运行设置、先决条件和账户/区域要求"                      |
| Cloud Containers      | `https://platform.claude.com/docs/en/managed-agents/cloud-containers.md`         | "提取云容器运行时、镜像配置和网络/存储配置项"                     |
| Migration             | `https://platform.claude.com/docs/en/managed-agents/migration.md`                | "提取从早期 API/预览形态到 GA 托管代理的迁移路径"                 |

### Anthropic CLI

`ant` CLI 提供对 Claude API 的终端访问。每个 API 资源作为子命令暴露。它是从版本控制的 YAML 创建代理和环境的推荐方式（`ant beta:agents create < agent.yaml` ——参见 `shared/anthropic-cli.md`），同时也暴露 session 及所有其他 API 资源，可用于脚本编写和交互式检查。

| 主题         | URL                                                     | 提取提示                                                                                  |
| ------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Anthropic CLI | `https://platform.claude.com/docs/en/api/sdks/cli.md`   | "提取 CLI 安装、认证、命令结构以及 beta:agents/environments/sessions 命令" |
| 认证概览 | `https://platform.claude.com/docs/en/manage-claude/authentication.md` | "提取凭据选项（API key、交互式 OAuth 登录、Workload Identity Federation）以及各自的使用场景" |
| WIF 参考 | `https://platform.claude.com/docs/en/manage-claude/wif-reference.md`  | "提取凭据优先级顺序、配置文件 schema 和配置目录布局" |

---

## Claude API SDK 仓库

当缓存的 `{lang}/` skill 文件或上述托管代理文档中未涵盖某个绑定（类、方法、命名空间、字段）时，WebFetch 这些仓库。SDK 包含对 `/v1/agents`、`/v1/sessions`、`/v1/environments` 及相关资源的 beta 托管代理支持——在仓库中搜索 `BetaManagedAgents`、`beta.agents`、`beta.sessions` 或对应语言的等效命名空间。

| SDK        | URL                                                      | 提取提示                                                                                                       |
| ---------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Python     | `https://github.com/anthropics/anthropic-sdk-python`     | "提取 beta 托管代理的命名空间、类和方法签名（`client.beta.agents`、`client.beta.sessions`）" |
| TypeScript | `https://github.com/anthropics/anthropic-sdk-typescript` | "提取 beta 托管代理的命名空间、类和方法签名（`client.beta.agents`、`client.beta.sessions`）" |
| Java       | `https://github.com/anthropics/anthropic-sdk-java`       | "提取 beta 托管代理的类、构建器和方法签名（`client.beta().agents()`、`BetaManagedAgents*`）" |
| Go         | `https://github.com/anthropics/anthropic-sdk-go`         | "提取 beta 托管代理的类型和方法签名（`client.Beta.Agents`、`BetaManagedAgents*` 事件类型）"      |
| Ruby       | `https://github.com/anthropics/anthropic-sdk-ruby`       | "提取 beta 托管代理的方法和参数形态（`client.beta.agents`、`client.beta.sessions`）"               |
| C#         | `https://github.com/anthropics/anthropic-sdk-csharp`     | "提取 beta 托管代理的类和方法签名（NuGet 包、`BetaManagedAgents*` 类型）"                 |
| PHP        | `https://github.com/anthropics/anthropic-sdk-php`        | "提取 beta 托管代理的类和方法签名（`$client->beta->agents`、`BetaManagedAgents*` 参数）"      |

---

## 回退策略

如果 WebFetch 失败（网络问题、URL 变更）：

1. 使用语言特定文件中的缓存内容（注明缓存日期）
2. 告知用户数据可能已过时
3. 建议他们直接查看 platform.claude.com 或 GitHub 仓库
