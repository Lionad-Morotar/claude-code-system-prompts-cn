<!-- 
name: tool-description-listmcpresourcestool
description: Tool description for listing available MCP resources from all configured servers or a specific server
ccVersion: 2.1.78
variables: 
-->

列出已配置 MCP 服务器中的可用资源。
每个资源对象包含一个 `server` 字段，用于指示其所属的服务器。

使用示例：
- 列出所有服务器的所有资源：`listMcpResources`
- 列出特定服务器的资源：`listMcpResources({ server: "myserver" })`
