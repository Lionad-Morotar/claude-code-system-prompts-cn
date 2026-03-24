# Claude Code 系统提示词

## 本仓库是什么

通过脚本从 Claude Code npm 包的编译后 JavaScript 源代码中提取的系统提示词。由 [Piebald AI](https://piebald.ai/) 维护，而非 Anthropic。

有关提取方法的详细信息，请参阅 [README.md 中的提取部分](./README.md#extraction)。

## Claude Code 是什么

Claude Code 是 Anthropic 的智能编程 CLI 工具。它以编译后的 npm 包（`@anthropic-ai/claude-code`）形式分发。源代码不公开。[anthropics/claude-code](https://github.com/anthropics/claude-code) GitHub 仓库仅包含问题和发布。

## 如何使用这些文件

- **参考：** 了解 Claude Code 使用哪些提示词以及它们在不同版本中的变化
- **本地补丁：** 使用 [tweakcc](https://github.com/Piebald-AI/tweakcc) 在本地 Claude Code 安装中自定义单个提示词片段
- **功能请求：** 如需更改 Claude Code 的提示词，请在 [anthropics/claude-code/issues](https://github.com/anthropics/claude-code/issues) 提交问题

## 给使用此仓库的 AI 代理

- 这些文件是**提取的参考材料**，而非可修改的源代码
- 在此处编辑文件不会改变 Claude Code 的行为
- `system-prompts/` 目录包含带有 YAML 前置元数据的 Markdown 文件，标注了 Claude Code 版本和模板变量
- 如 `${BASH_TOOL_NAME}` 之类的模板变量由 Claude Code 在运行时插值——它们在这些文件中显示为字面字符串
- [CHANGELOG.md](./CHANGELOG.md) 跟踪 Claude Code 各版本的提示词变更
