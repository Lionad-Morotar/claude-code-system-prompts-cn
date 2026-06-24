<!--
name: 'Skill: Build with Claude API (reference guide)'
description: Template for presenting language-specific reference documentation with quick task navigation
ccVersion: 2.1.108
-->
## 参考文档

下方 `<doc>` 标签中包含了针对您检测到的语言的相关文档。每个标签都有一个 `path` 属性，显示其原始文件路径。使用此属性来查找正确的部分：

### 快速任务参考

**单一文本分类/摘要/提取/问答：**
→ 参考 `{lang}/claude-api/README.md`

**聊天界面或实时响应显示：**
→ 参考 `{lang}/claude-api/README.md` + `{lang}/claude-api/streaming.md`

**长时对话（可能超出上下文窗口）：**
→ 参考 `{lang}/claude-api/README.md` —— 参见 Compaction 部分

**提示缓存 / 优化缓存 / "为什么我的缓存命中率低"：**
→ 参考 `shared/prompt-caching.md` + `{lang}/claude-api/README.md`（提示缓存部分）

**函数调用 / 工具使用 / 智能体：**
→ 参考 `{lang}/claude-api/README.md` + `shared/tool-use-concepts.md` + `{lang}/claude-api/tool-use.md`

**批处理（对延迟不敏感）：**
→ 参考 `{lang}/claude-api/README.md` + `{lang}/claude-api/batches.md`

**跨多个请求的文件上传：**
→ 参考 `{lang}/claude-api/README.md` + `{lang}/claude-api/files-api.md`

**Agent 设计（工具面、上下文管理、缓存策略）：**
→ 参考 `shared/agent-design.md`

**托管智能体（服务端管理的状态化智能体）：**
→ 参考 `shared/managed-agents-overview.md` 和其余 `shared/managed-agents-*.md` 文件。对于 Python、TypeScript 和 cURL，语言特定代码示例位于 `{lang}/managed-agents/README.md`。Java、Go、Ruby 和 PHP 也支持该 API —— 使用 `{lang}/claude-api.md` 中的 SDK 模式转换调用。C# 目前不支持托管智能体；使用 `curl/managed-agents.md` 中的原始 HTTP 作为参考。

**错误处理：**
→ 参考 `shared/error-codes.md`

**通过 WebFetch 获取最新文档：**
→ 参考 `shared/live-sources.md` 获取 URL
