<!--
name: 'Data: Live documentation sources'
description: WebFetch URLs for fetching current Claude API and Agent SDK documentation from official sources
ccVersion: 2.1.63
-->
# 实时文档源

本文件包含用于从 platform.claude.com 和 Agent SDK 仓库获取最新信息的 WebFetch URL。当用户需要获取自缓存内容上次更新以来可能已更改的最新数据时，请使用这些 URL。

## 何时使用 WebFetch

- 用户明确要求获取"最新"或"当前"信息
- 缓存数据似乎不正确
- 用户询问缓存内容未涵盖的功能
- 用户需要特定的 API 详情或示例

## Claude API 文档 URL

### 模型与定价

| 主题           | URL                                                                   | 提取提示                                                               |
| --------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 模型概览 | `https://platform.claude.com/docs/en/about-claude/models/overview.md` | "提取所有 Claude 模型的当前模型 ID、上下文窗口和定价信息" |
| 定价         | `https://platform.claude.com/docs/en/pricing.md`                      | "提取每百万输入和输出 token 的当前定价"               |

### 核心功能

| 主题             | URL                                                                          | 提取提示                                                                      |
| ----------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 扩展思考 | `https://platform.claude.com/docs/en/build-with-claude/extended-thinking.md` | "提取扩展思考参数、budget_tokens 要求和使用示例" |
| 自适应思考 | `https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking.md` | "提取自适应思考设置、努力级别和 {{OPUS_NAME}} 使用示例"         |
| 努力参数  | `https://platform.claude.com/docs/en/build-with-claude/effort.md`            | "提取努力级别、成本与质量的权衡以及与思考功能的交互"        |
| 工具使用          | `https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview.md`  | "提取工具定义模式、tool_choice 选项和处理工具结果的方法"       |
| 流式传输         | `https://platform.claude.com/docs/en/build-with-claude/streaming.md`         | "提取流式事件类型、SDK 示例和最佳实践"                      |
| 提示缓存    | `https://platform.claude.com/docs/en/build-with-claude/prompt-caching.md`    | "提取 cache_control 用法、定价优势和实现示例"           |

### 媒体与文件

| 主题       | URL                                                                    | 提取提示                                                 |
| ----------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 视觉功能      | `https://platform.claude.com/docs/en/build-with-claude/vision.md`      | "提取支持的图像格式、大小限制和代码示例" |
| PDF 支持 | `https://platform.claude.com/docs/en/build-with-claude/pdf-support.md` | "提取 PDF 处理能力、限制和示例"         |

### API 操作

| 主题            | URL                                                                         | 提取提示                                                                                       |
| ---------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 批处理 | `https://platform.claude.com/docs/en/build-with-claude/batch-processing.md` | "提取批处理 API 端点、请求格式和轮询结果的方法"                                  |
| 文件 API        | `https://platform.claude.com/docs/en/build-with-claude/files.md`            | "提取文件上传、下载和在消息中引用的方法，包括支持的类型和 beta 请求头" |
| Token 计数   | `https://platform.claude.com/docs/en/build-with-claude/token-counting.md`   | "提取 Token 计数 API 的用法和示例"                                                         |
| 速率限制      | `https://platform.claude.com/docs/en/api/rate-limits.md`                    | "提取按层级和模型划分的当前速率限制"                                                         |
| 错误           | `https://platform.claude.com/docs/en/api/errors.md`                         | "提取 HTTP 错误代码、含义和重试指南"                                                |

### 工具

| 主题          | URL                                                                                    | 提取提示                                                                        |
| -------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 代码执行 | `https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool.md` | "提取代码执行工具设置、文件上传、容器复用和响应处理方法" |
| 计算机使用   | `https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use.md`        | "提取计算机使用工具设置、功能和实现示例"             |

### 高级功能

| 主题              | URL                                                                           | 提取提示                                   |
| ------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| 结构化输出 | `https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md` | "提取 output_config.format 用法和模式强制执行"                           |
| 压缩         | `https://platform.claude.com/docs/en/build-with-claude/compaction.md`         | "提取压缩设置、触发器配置和流式压缩"             |
| 引用          | `https://platform.claude.com/docs/en/build-with-claude/citations.md`          | "提取引用格式和实现方法"        |
| 上下文窗口    | `https://platform.claude.com/docs/en/build-with-claude/context-windows.md`    | "提取上下文窗口大小和 Token 管理方法" |

---

## Claude API SDK 仓库

| SDK        | URL                                                       | 描述                    |
| ---------- | --------------------------------------------------------- | ------------------------------ |
| Python     | `https://github.com/anthropics/anthropic-sdk-python`     | `anthropic` pip 包源 |
| TypeScript | `https://github.com/anthropics/anthropic-sdk-typescript` | `@anthropic-ai/sdk` npm 源 |
| Java       | `https://github.com/anthropics/anthropic-sdk-java`       | `anthropic-java` Maven 源  |
| Go         | `https://github.com/anthropics/anthropic-sdk-go`         | Go 模块源               |
| Ruby       | `https://github.com/anthropics/anthropic-sdk-ruby`       | `anthropic` gem 源         |
| C#         | `https://github.com/anthropics/anthropic-sdk-csharp`     | NuGet 包源           |
| PHP        | `https://github.com/anthropics/anthropic-sdk-php`        | Composer 包源        |

---

## Agent SDK 文档 URL

### 核心文档

| 主题                | URL                                                         | 提取提示                                               |
| -------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| Agent SDK 概览   | `https://platform.claude.com/docs/en/agent-sdk.md`          | "提取 Agent SDK 概览、主要功能和使用场景"   |
| Agent SDK Python     | `https://github.com/anthropics/claude-agent-sdk-python`     | "提取 Python SDK 安装、导入和基本用法"     |
| Agent SDK TypeScript | `https://github.com/anthropics/claude-agent-sdk-typescript` | "提取 TypeScript SDK 安装、导入和基本用法" |

### SDK 参考（GitHub README）

| 主题          | URL                                                                                       | 提取提示                                            |
| -------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Python SDK     | `https://raw.githubusercontent.com/anthropics/claude-agent-sdk-python/main/README.md`     | "提取 Python SDK API 参考、类和方法"     |
| TypeScript SDK | `https://raw.githubusercontent.com/anthropics/claude-agent-sdk-typescript/main/README.md` | "提取 TypeScript SDK API 参考、类型和函数" |

### npm/PyPI 包

| 包                             | URL                                                            | 描述               |
| ----------------------------------- | -------------------------------------------------------------- | ------------------------- |
| claude-agent-sdk (Python)           | `https://pypi.org/project/claude-agent-sdk/`                   | PyPI 上的 Python 包    |
| @anthropic-ai/claude-agent-sdk (TS) | `https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk` | npm 上的 TypeScript 包 |

### GitHub 仓库

| 资源       | URL                                                         | 描述                         |
| -------------- | ----------------------------------------------------------- | ----------------------------------- |
| Python SDK     | `https://github.com/anthropics/claude-agent-sdk-python`     | Python 包源               |
| TypeScript SDK | `https://github.com/anthropics/claude-agent-sdk-typescript` | TypeScript/Node.js 包源   |
| MCP 服务器    | `https://github.com/modelcontextprotocol`                   | 官方 MCP 服务器实现 |

---

## 回退策略

如果 WebFetch 失败（网络问题、URL 更改）：

1. 使用各语言特定文件中的缓存内容（注意缓存日期）
2. 告知用户数据可能已过时
3. 建议用户直接查看 platform.claude.com 或 GitHub 仓库
