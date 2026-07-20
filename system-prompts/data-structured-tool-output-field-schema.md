<!--
name: 'Data: Structured tool output field schema'
description: 用户消息 tool_use_result 字段的 Schema 描述，包括每个工具的输出形状以及已完成的 Agent 或 Task 输出契约
ccVersion: 2.1.207
-->
结构化工具输出 — 工具完整的 Output 对象，而非发送给模型的字符串内容。形状因工具而异，以匹配的 tool_use 块的 name 为键（参见 toolTypes 中的 *Output 类型）；MCP 和动态工具携带自己的形状，因此该字段保持 unknown 类型。对于 Agent/Task 工具，已完成的形状为 AgentToolCompletedOutput：子代理的最终报告（不含模型引导的 agentId/usage 尾部信息），加上运行总计 — 应从中渲染，而非解析 tool_result 文本。
