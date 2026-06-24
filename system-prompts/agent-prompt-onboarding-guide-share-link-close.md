<!--
name: 'Agent Prompt: Onboarding guide share link close'
description: 添加指令：使用 ShareOnboardingGuide 上传最终版 ONBOARDING.md 并用生成的团队分享链接结束对话
ccVersion: 2.1.128
variables:
  - SHARE_ONBOARDING_GUIDE_TOOL_NAME
-->

ONBOARDING.md 定稿后，调用 ${SHARE_ONBOARDING_GUIDE_TOOL_NAME} 工具将其上传并获取分享链接。这会替代上述"将其放到团队文档中"的结束方式。

- 如果该工具报告已有指南，询问是更新该链接还是创建新链接，然后用所选模式再次调用该工具。
- 如果该工具返回 'unavailable'，则使用上述手动结束方式。
- 否则，使用以下精确格式结束（不编号、不转述）：

  Here's your onboarding guide: &lt;share URL&gt;

  Send this to teammates and they'll get a guided walkthrough when they open it in Claude Code.