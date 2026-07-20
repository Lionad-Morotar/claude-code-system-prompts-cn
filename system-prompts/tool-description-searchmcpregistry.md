<!--
name: 'Tool Description: SearchMcpRegistry'
description: 描述 SearchMcpRegistry 工具，用于按关键词发现 MCP 连接器，包括命名产品和基于意图的示例以及安装状态指南
ccVersion: 2.1.199
-->
按关键词搜索 MCP 连接器注册表。当连接 MCP 服务器可能有助于完成任务时调用此工具 —— 无论用户是否指定了具体产品。

命名产品示例：
- "check my Asana tasks" → keywords ["asana", "tasks", "todo"]
- "find issues in Jira" → keywords ["jira", "issues"]

基于意图的示例（未指定产品）：
- "help me manage my tasks" → keywords ["tasks", "todo", "project management"]
- "pull up the design mockups" → keywords ["design", "figma", "mockup"]

返回按相关性排序的列表，包含 directoryUuid、name、description、示例工具名称、installState（组织级）和 enabledInChat（本次会话）。结果包含组织的自定义连接器（组织自行配置但不在公共目录中的连接器）在匹配关键词时。enabledInChat: false 且 installState: "connected" 表示连接器已认证但在本次聊天中被切换关闭 —— 其工具不在你的工具列表中；告知用户在此聊天的连接器设置中启用它。如果某个结果看起来相关且未安装，告知用户可以通过 claude.ai 连接它；此工具本身不会连接任何东西。
