<!--
name: 'Tool Description: SearchPlugins'
description: 描述 SearchPlugins 工具，用于按关键词查找相关 claude.ai 组织目录插件，并在结果合适时建议安装卡片
ccVersion: 2.1.199
-->
按关键词搜索用户的 claude.ai 插件目录。当某个插件（斜杠命令、技能包、钩子或代理）可能有助于完成任务时调用此工具。

示例：
- "use the deploy plugin" → keywords ["deploy"]
- "is there something for linting?" → keywords ["lint", "format", "code quality"]

返回按相关性排序的列表，包含 id、name、description 以及插件是否已启用。当结果合适时，调用 SuggestPluginInstall 来渲染安装卡片。如果没有相关结果，无需提及你进行了搜索。
