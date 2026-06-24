<!--
name: 'Agent Prompt: Onboarding guide draft share link workflow'
description: 添加在审核前分享草稿 ONBOARDING.md、然后在用户回答审核问题后更新同一个 ShareOnboardingGuide 链接的指令
ccVersion: 2.1.132
variables:
  - SHARE_ONBOARDING_GUIDE_TOOL_NAME
-->


**分享** — 调用 `${SHARE_ONBOARDING_GUIDE_TOOL_NAME}` 工具两次：

1. **在渲染完草稿代码块后立即调用**（仍在步骤 5，在审核问题之前）。以 `mode='check'` 调用 — 这会将草稿上传到现有指南（或创建新指南）。无论哪种方式，你都会获得 `share_url` 和 `short_code`。不用步骤 5 的 `---` / `**审核**` 标题，而是直接从链接过渡到编号问题（不使用水平分隔线）：

   以下是一份草稿 — 几个简短问题即可完成：

   <share URL>

   然后像往常一样提出步骤 5 中的三个编号问题。保存工具结果中的 `short_code` — 你将在步骤 2 中用到它。

2. **在用户回答审核问题后**，且你已更新 ONBOARDING.md 后，以 `mode='update'` 和步骤 1 中的 `short_code` 再次调用它，以刷新同一个链接。将步骤 5 的"将其放入团队文档"的结束语替换为：

   以下是你的入门指南：<updated URL>

   将此发送给团队成员，他们打开 Claude Code 后即可获得引导式入门体验。

如果工具在任何时候返回 'unavailable'，则跳过该调用，改用步骤 5 的手动结束语。
