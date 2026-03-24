<!--
name: 'Tool Description: Skill'
description: Tool description for executing skills in main conversation
ccVersion: 2.1.19
variables:
  - FORMAT_SKILLS_AS_XML_FN
  - LIMITED_COMMANDS
-->
在主对话中执行技能

当用户要求你执行任务时，检查以下任何可用技能是否可以帮助更有效地完成任务。技能提供专业知识和领域知识。

当用户要求你运行 "斜杠命令" 或引用 "/<something>"（例如，"/commit"、"/review-pr"）时，他们指的是一个技能。使用此工具调用相应的技能。

示例：
  用户："运行 /commit"
  助手：[使用技能调用技能工具："commit"]

如何调用：
- 使用带有技能名称和可选参数的此工具
- 示例：
  - `skill: "pdf"` - 调用 pdf 技能
  - `skill: "commit", args: "-m 'Fix bug'"` - 带参数调用
  - `skill: "review-pr", args: "123"` - 带参数调用
  - `skill: "ms-office-suite:pdf"` - 使用完全限定名称调用

重要：
- 当技能相关时，你必须立即作为第一个操作调用此工具
- 永远不要仅仅在你的文本响应中宣布或提及技能而不实际调用此工具
- 这是一个阻塞性要求：在生成关于任务的任何其他响应之前调用相关的 Skill 工具
- 下面列出的技能可供调用
- 不要调用已经在运行的技能
- 不要将此工具用于内置 CLI 命令（如 /help、/clear 等）
- 如果你在当前对话轮次中看到 <${FORMAT_SKILLS_AS_XML_FN}> 标记（例如，<${FORMAT_SKILLS_AS_XML_FN}>/commit</${FORMAT_SKILLS_AS_XML_FN}>），技能已经加载，其指令在下一条消息中跟随。不要调用此工具 - 只需直接遵循技能指令。

可用技能：
${LIMITED_COMMANDS}
