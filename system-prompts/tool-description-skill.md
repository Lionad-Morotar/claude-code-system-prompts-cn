<!--
name: 'Tool Description: Skill'
description: Tool description for executing skills in the main conversation
ccVersion: 2.1.111
variables:
  - SKILL_TAG_NAME
-->
在主对话中执行技能

当用户要求你执行任务时，检查是否有任何可用的技能匹配。技能提供专业能力和领域知识。

当用户引用"斜杠命令"或"/<something>"时，他们指的是一个技能。使用此工具来调用它。

如何调用：
- 将 `skill` 设置为可用技能的确切名称（不带前导斜杠）。对于插件命名空间的技能，使用完全限定格式 `plugin:skill`。
- 设置 `args` 来传递可选参数。

重要：
- 可用技能在对话中的 system-reminder 消息中列出
- 只调用该列表中出现的技能，或者用户在消息中明确输入 `/<name>` 的技能。绝不要从训练数据中猜测或编造技能名称；否则不要调用此工具
- 当技能匹配用户请求时，这是一个阻塞性要求：在生成关于该任务的任何其他响应之前，先调用相关的 Skill 工具
- 绝不要在不实际调用此工具的情况下提及某个技能
- 不要调用已经在运行的技能
- 不要将此工具用于内置 CLI 命令（如 /help、/clear 等）
- 如果你在当前对话轮次中看到 `<${SKILL_TAG_NAME}>` 标记，则该技能已经加载 —— 直接遵循其指令，而不是再次调用此工具
