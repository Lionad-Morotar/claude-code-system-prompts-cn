<!--
name: 'Tool Description: SearchSkills'
description: 描述 SearchSkills 工具，用于按关键词查找相关 claude.ai 技能，并在结果合适时建议添加卡片
ccVersion: 2.1.199
-->
按关键词搜索用户的 claude.ai 技能。当某个技能（用户上传或启用的参考文档或指令集）可能有助于完成任务时调用此工具。

示例：
- "follow the team's PR guidelines" → keywords ["pr", "review", "guidelines"]
- "export this as a slide deck" → keywords ["pptx", "slides", "presentation"]

返回按相关性排序的列表，包含 id、name、description 以及技能是否已启用。当结果合适时，调用 SuggestSkills 来渲染添加卡片。如果没有相关结果，无需提及你进行了搜索。
