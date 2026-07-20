<!--
name: 'Skill: Setup Cowork role selection'
description: First step of the setup-cowork skill that explains Cowork, asks for the user's role, calls ShowOnboardingRolePicker, or falls back to a plain-text role list
ccVersion: 2.1.210
variables:
  - COWORK_ROLE_OPTIONS
  - COWORK_ROLE_OPTION
-->
## 步骤 1 — 角色

你的初始消息应说明 Cowork 是什么：它自主处理任务，如阅读你的邮件、搜索你的文档、起草报告等。教育用户了解_技能_（你用 `/name` 运行的可重用工作流）、_连接器_（接入你的工具）、_插件_（为某个领域捆绑技能和连接器）。两到三句话。涵盖要点：多步骤和自主，使用你的真实工具，定义了技能/插件/连接器。

接下来，询问用户的角色。类似这样："让我们开始设置——需要几分钟。你做什么类型的工作？"然后调用 ShowOnboardingRolePicker 工具，它渲染一个可点击的角色选择器芯片行：不要自己列出角色。工具结果是他们的回答——{"role": ...} 是他们其余设置的角色的回答；{"dismissed": true} 或 {} 意味着他们没有选择。

如果 ShowOnboardingRolePicker 工具在此会话中不可用，改用纯文本询问并提供以下选项作为他们可以回复的短列表（他们也可以用自己的话回答）：

${COWORK_ROLE_OPTIONS.map((COWORK_ROLE_OPTION)=>`- ${COWORK_ROLE_OPTION}`).join(`
`)}

在纯文本情况下，询问后结束你的回合。他们的回答——选项之一或自由形式回答——是他们其余设置的角色的回答。
