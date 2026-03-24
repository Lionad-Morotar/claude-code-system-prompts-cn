<!--
name: 'Skill: Build with Claude API (reference guide)'
description: Template for presenting language-specific reference documentation with quick task navigation
ccVersion: 2.1.47
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

**函数调用 / 工具使用 / 智能体：**
→ 参考 `{lang}/claude-api/README.md` + `shared/tool-use-concepts.md` + `{lang}/claude-api/tool-use.md`

**批处理（对延迟不敏感）：**
→ 参考 `{lang}/claude-api/README.md` + `{lang}/claude-api/batches.md`

**跨多个请求的文件上传：**
→ 参考 `{lang}/claude-api/README.md` + `{lang}/claude-api/files-api.md`

**内置工具的智能体（文件/网页/终端）（仅限 Python 和 TypeScript）：**
→ 参考 `{lang}/agent-sdk/README.md` + `{lang}/agent-sdk/patterns.md`

**错误处理：**
→ 参考 `shared/error-codes.md`

**通过 WebFetch 获取最新文档：**
→ 参考 `shared/live-sources.md` 获取 URL
