<!--
name: 'Tool Description: ToolSearch'
description: Tool description for loading and searching deferred tools before use
ccVersion: 2.1.19
-->
搜索或选择延迟工具，使其可用。

**强制性先决条件 - 这是一个硬性要求**

你必须在直接调用延迟工具之前使用此工具加载它们。

这是一个阻塞性要求 - 下面列出的延迟工具在使用此工具加载之前不可用。两种查询模式（关键词搜索和直接选择）都会加载返回的工具 — 一旦工具出现在结果中，它立即可供调用。

**为什么这是不可协商的：**
- 延迟工具在通过此工具发现之前不会加载
- 在没有先加载延迟工具的情况下调用它将失败

**查询模式：**

1. **关键词搜索** - 当你不确定使用哪个工具或需要一次发现多个工具时使用关键词：
   - "list directory" - 查找列出目录的工具
   - "notebook jupyter" - 查找笔记本编辑工具
   - "slack message" - 查找 slack 消息传递工具
   - 返回最多 5 个按相关性排序的匹配工具
   - 所有返回的工具立即可供调用 — 无需进一步的选择步骤

2. **直接选择** - 当你知道确切的工具名称并且只需要该工具时使用 `select:<tool_name>`：
   - "select:mcp__slack__read_channel"
   - "select:NotebookEdit"
   - 如果存在，则只返回该工具

**重要：** 两种模式同样加载工具。不要在关键词搜索后使用 `select:` 调用已返回的工具 — 它们已经被加载。

3. **必需关键词** - 使用 `+` 前缀来要求匹配：
   - "+linear create issue" - 仅 "linear" 中的工具，按 "create"/"issue" 排序
   - "+slack send" - 仅 "slack" 工具，按 "send" 排序
   - 当你知道服务名称但不知道确切工具时很有用

**正确的使用模式：**

<example>
用户：我需要以某种方式与 slack 一起工作
助手：让我搜索 slack 工具。
[使用查询调用 ToolSearch："slack"]
助手：找到了几个选项，包括 mcp__slack__read_channel。
[直接调用 mcp__slack__read_channel — 它是由关键词搜索加载的]
</example>

<example>
用户：编辑 Jupyter 笔记本
助手：让我加载笔记本编辑工具。
[使用查询调用 ToolSearch："select:NotebookEdit"]
[调用 NotebookEdit]
</example>

<example>
用户：列出 src 目录中的文件
助手：我可以在可用工具中看到 mcp__filesystem__list_directory。让我选择它。
[使用查询调用 ToolSearch："select:mcp__filesystem__list_directory"]
[调用该工具]
</example>

**错误的使用模式 - 永远不要这样做：**

<bad-example>
用户：读取我的 slack 消息
助手：[直接调用 mcp__slack__read_channel 而不先加载它]
错误 - 你必须首先使用此工具加载工具
</bad-example>

<bad-example>
助手：[使用查询调用 ToolSearch："slack"，返回 mcp__slack__read_channel]
助手：[使用查询调用 ToolSearch："select:mcp__slack__read_channel"]
错误 - 关键词搜索已经加载了工具。select 调用是多余的。
</bad-example>
