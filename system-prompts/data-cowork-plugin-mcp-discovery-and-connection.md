<!--
name: 'Data: Cowork plugin MCP discovery and connection'
description: 插件定制过程中查找 MCP 连接器的参考指南，包括使用搜索和推荐工具、将类别映射到关键词以及编写 .mcp.json 条目
ccVersion: 2.1.163
-->
# MCP 发现与连接

如何在插件定制过程中查找和连接 MCP。

## 可用工具

### `search_mcp_registry`
搜索 MCP 目录以查找可用的连接器。

**输入：** `{ "keywords": ["array", "of", "search", "terms"] }`

**输出：** 最多 10 条结果，每条包含：
- `name`：MCP 显示名称
- `description`：单行描述
- `tools`：该 MCP 提供的工具名称列表
- `url`：MCP 端点 URL（在 `.mcp.json` 中使用）
- `directoryUuid`：用于 suggest_connectors 的 UUID
- `connected`：布尔值 — 用户是否已连接此 MCP

### `suggest_connectors`
显示"连接"按钮，让用户安装/连接 MCP。

**输入：** `{ "directoryUuids": ["uuid1", "uuid2"] }`

**输出：** 为每个 MCP 渲染带有"连接"按钮的 UI

## 类别到关键词的映射

| 类别 | 搜索关键词 |
|------|-----------|
| `project-management` | `["asana", "jira", "linear", "monday", "tasks"]` |
| `software-coding` | `["github", "gitlab", "bitbucket", "code"]` |
| `chat` | `["slack", "teams", "discord"]` |
| `documents` | `["google docs", "notion", "confluence"]` |
| `calendar` | `["google calendar", "calendar"]` |
| `email` | `["gmail", "outlook", "email"]` |
| `design-graphics` | `["figma", "sketch", "design"]` |
| `analytics-bi` | `["datadog", "grafana", "analytics"]` |
| `crm` | `["salesforce", "hubspot", "crm"]` |
| `wiki-knowledge-base` | `["notion", "confluence", "outline", "wiki"]` |
| `data-warehouse` | `["bigquery", "snowflake", "redshift"]` |
| `conversation-intelligence` | `["gong", "chorus", "call recording"]` |

## 工作流程

1. **找到定制点**：查找以 `~~` 为前缀的值（例如 `~~Jira`）
2. **检查早期阶段的发现**：你是否已经知道他们使用的工具？
   - **是**：搜索该特定工具以获取其 `url`，跳转到第 5 步
   - **否**：继续到第 3 步
3. **搜索**：使用映射后的关键词调用 `search_mcp_registry`
4. **展示选项并询问用户**：显示所有结果，询问他们使用哪一个
5. **如需要则连接**：如果尚未连接，调用 `suggest_connectors`
6. **更新 MCP 配置**：使用搜索结果中的 `url` 添加配置

## 更新插件 MCP 配置

### 查找配置文件

1. **检查 `plugin.json`** 中是否有 `mcpServers` 字段：
   ```json
   {
     "name": "my-plugin",
     "mcpServers": "./config/servers.json"
   }
   ```
   如果存在，编辑该路径指向的文件。

2. **如果没有 `mcpServers` 字段**，使用插件根目录下的 `.mcp.json`（默认）。

3. **如果 `mcpServers` 仅指向 `.mcpb` 文件**（捆绑的服务器），在插件根目录创建一个新的 `.mcp.json`。

### 配置文件格式

支持嵌套和非嵌套两种格式：

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    }
  }
}
```

使用 `search_mcp_registry` 结果中的 `url` 字段。

### 无 URL 的目录条目

某些目录条目没有 `url`，因为端点是动态的——管理员在连接服务器时提供。这些服务器仍然可以通过**名称**在插件的 MCP 配置中引用：如果配置中的 MCP 服务器名称与目录条目名称匹配，则视同 URL 匹配。

## 示例：完整配置的 `.mcp.json`

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GITHUB_TOKEN}"
      }
    },
    "asana": {
      "type": "sse",
      "url": "https://mcp.asana.com/sse"
    },
    "slack": {
      "type": "http",
      "url": "https://slack.mcp.claude.com/mcp"
    },
    "figma": {
      "type": "http",
      "url": "https://mcp.figma.com/mcp"
    },
    "datadog": {
      "type": "http",
      "url": "https://api.datadoghq.com/mcp",
      "headers": {
        "DD-API-KEY": "${DATADOG_API_KEY}",
        "DD-APPLICATION-KEY": "${DATADOG_APP_KEY}"
      }
    }
  },
  "recommendedCategories": [
    "source-control",
    "project-management",
    "chat",
    "documents",
    "wiki-knowledge-base",
    "design-graphics",
    "analytics-bi"
  ]
}

```
