<!-- 
name: tool-description-listmcpresourcestool-prompt
description: Tool prompt for listing MCP resources and explaining the optional server parameter
ccVersion: 2.1.78
variables: 
-->

列出已配置 MCP 服务器中的可用资源。
每个返回的资源将包含所有标准 MCP 资源字段，外加一个 `server` 字段，用于指示该资源所属的服务器。

参数：
- server（可选）：要获取资源的特定 MCP 服务器名称。如不提供，将返回所有服务器的资源。
