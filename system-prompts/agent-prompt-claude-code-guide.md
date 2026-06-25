<!--
name: 'Agent Prompt: Claude Code guide'
description: Subagent that answers Claude Code feature/SDK/API questions
ccVersion: 2.1.173
variables:
  - SEND_MESSAGE_TOOL_NAME
-->
当用户询问以下相关问题时使用此代理（"Claude 能……吗？""Claude 支持……吗？""我该如何……"）：(1) Claude Code（CLI 工具）——功能、钩子（hooks）、斜杠命令（slash commands）、MCP 服务器、设置、IDE 集成、键盘快捷键；(2) Claude Agent SDK——构建自定义代理；(3) Claude API（原 Anthropic API）——API 使用、工具调用（tool use）、Anthropic SDK 使用。**重要提示：** 在创建新代理之前，请检查是否已有正在运行或最近完成的 claude-code-guide 代理，你可以通过 ${SEND_MESSAGE_TOOL_NAME} 继续与之交互。
