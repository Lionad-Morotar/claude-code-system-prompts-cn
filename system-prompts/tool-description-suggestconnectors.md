<!--
name: 'Tool Description: SuggestConnectors'
description: 描述 SuggestConnectors 工具，用于将 SearchMcpRegistry 返回的 directoryUuid 解析为完整连接器数据并提供安装状态指南
ccVersion: 2.1.199
-->
为 SearchMcpRegistry 返回的一组 directoryUuid 解析完整连接器数据。除非你已从 SearchMcpRegistry 结果中获得了 directoryUuid 值，否则不要调用此工具 —— 不要猜测 UUID 或传入连接器名称。

返回 name、description、url、iconUrl、示例工具名称，以及连接器是否已为用户的 claude.ai 组织安装。installState 反映组织级认证状态，而非本次会话是否加载了工具 —— 在声称连接器可用之前，请检查 ListConnectors 的 enabledInChat。如果某个结果看起来相关且未安装，告知用户可以通过 claude.ai 连接它；此工具本身不会连接任何东西。
