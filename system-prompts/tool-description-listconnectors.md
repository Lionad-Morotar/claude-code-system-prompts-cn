<!--
name: 'Tool Description: ListConnectors'
description: 描述 ListConnectors 工具，用于列出已安装的 claude.ai MCP 连接器，按关键词过滤，并解读组织级连接状态和聊天启用状态
ccVersion: 2.1.199
-->
列出为用户的 claude.ai 组织安装的 MCP 连接器。当用户询问他们有哪些连接器时调用此工具。传入关键词进行主题过滤；不传则列出全部。

返回名称、描述、每个连接器是否在组织级已连接（当状态检查不可用时 connected 可能为 null —— 将其视为未知，而非已断开），以及 enabledInChat（其工具是否在本次会话中加载）。enabledInChat: false 且 connected: true 表示连接器已认证但在本次聊天中被切换关闭 —— 告知用户在此聊天的连接器设置中启用它。要推荐用户尚未拥有的连接器，请使用 SearchMcpRegistry → SuggestConnectors；此工具本身不会连接任何东西。
