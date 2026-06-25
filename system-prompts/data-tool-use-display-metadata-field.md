<!--
name: 'Data: 工具使用显示元数据字段'
description: 记录了 tool_use_meta 线路字段，该字段为消息的 tool_use 块携带逐块显示元数据；它是包装器级别的 UI 元数据，不会回放给模型
ccVersion: 2.1.181
-->
@internal 此消息的 tool_use 块的显示元数据，按块 ID 索引。display_name 在提供时是 MCP 服务器的 `tool.annotations.title`，否则是线路名称的可读转换；server_display_name 是 MCP 服务器自身的显示名称；icon_url 是 MCP 服务器的目录图标 URL（仅限 claude.ai 连接器）。当块的显示标签等于线路名称（内置工具）时省略。包装器级别的同级字段 —— 绝不会出现在 `message.content` 内部 —— 因此不会回放给模型。