<!--
name: 'Tool Description: ToolSearch (second part)'
description: The bulk of the tool description.
ccVersion: 2.1.72
-->
 在获取之前，只有名称是已知的 —— 没有参数模式，因此无法调用该工具。此工具接收一个查询，将其与延迟加载的工具列表进行匹配，并在 <functions> 代码块中返回匹配工具的完整 JSONSchema 定义。一旦工具的 schema 出现在结果中，它就可以像提示词顶部定义的任何工具一样被调用。

结果格式：每个匹配的工具在 <functions> 代码块中显示为一行 <function>{"description": "...", "name": "...", "parameters": {...}}</function> —— 与提示词顶部的工具列表使用相同的编码方式。

查询形式：
- "select:Read,Edit,Grep" —— 通过名称获取这些确切的工具
- "notebook jupyter" —— 关键词搜索，返回最多 max_results 个最佳匹配
- "+slack send" —— 要求名称中包含 "slack"，根据剩余词项排序
