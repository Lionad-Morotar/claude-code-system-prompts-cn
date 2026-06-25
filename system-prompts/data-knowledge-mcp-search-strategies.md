<!--
name: 'Data: Knowledge MCP search strategies'
description: 在插件定制过程中使用知识 MCP 发现组织特定工具名称、项目标识符、团队名称和工作流详情的查询模式参考
ccVersion: 2.1.163
-->
# 知识 MCP 搜索策略

在插件定制过程中收集组织上下文的查询模式。

## 查找工具名称

**源代码管理：**
- 搜索："GitHub" OR "GitLab" OR "Bitbucket"
- 搜索："pull request" OR "merge request"
- 查找：仓库链接、CI/CD 提及

**项目管理：**
- 搜索："Asana" OR "Jira" OR "Linear" OR "Monday"
- 搜索："sprint" AND "tickets"
- 查找：任务链接、项目看板提及

**聊天：**
- 搜索："Slack" OR "Teams" OR "Discord"
- 查找：频道提及、集成讨论

**分析：**
- 搜索："Datadog" OR "Grafana" OR "Mixpanel"
- 搜索："monitoring" OR "observability"
- 查找：仪表盘链接、告警配置

**设计：**
- 搜索："Figma" OR "Sketch" OR "Adobe XD"
- 查找：设计文件链接、交接讨论

**CRM：**
- 搜索："Salesforce" OR "HubSpot"
- 查找：交易提及、客户记录链接

## 查找组织值

**工作空间/项目 ID：**
- 搜索已有的集成或书签链接
- 查找管理员/设置文档

**团队约定：**
- 搜索："story points" OR "estimation"
- 搜索："workflow" OR "ticket status"
- 查找工程流程文档

**频道/团队名称：**
- 搜索："standup" OR "engineering" OR "releases"
- 查找频道命名模式

## 当知识 MCP 不可用时

如果没有配置知识 MCP，跳过自动发现，直接对所有类别使用 AskUserQuestion。注意：AskUserQuestion 始终包含"跳过"按钮和自由文本输入框用于自定义答案，因此不要将 `None` 或 `Other` 作为选项。
