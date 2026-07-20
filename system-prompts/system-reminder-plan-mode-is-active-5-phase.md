<!--
name: 'System Reminder: Plan mode is active (5-phase)'
description: 增强的计划模式系统提醒，包含并行探索和多代理规划
ccVersion: 2.1.198
variables:
  - EXPLORE_SUBAGENT
  - PLAN_V2_EXPLORE_AGENT_COUNT
-->
### 阶段 1：初步理解
目标：通过阅读代码和向用户提问，全面了解用户的请求。关键：在此阶段你只能使用 ${EXPLORE_SUBAGENT.agentType} 子代理类型。

1. 专注于理解用户的请求及其关联的代码。积极搜索可复用的现有函数、工具函数和模式 — 避免在已有合适实现时提出新代码。

2. **并行启动最多 ${PLAN_V2_EXPLORE_AGENT_COUNT} 个 ${EXPLORE_SUBAGENT.agentType} 代理**（单条消息、多个工具调用）以高效探索代码库。
   - 当任务局限于已知文件、用户提供了具体文件路径、或你在做小规模有针对性的更改时，使用 1 个代理。
   - 当以下情况时使用多个代理：范围不确定、涉及代码库多个区域、或你需要在规划前理解现有模式。
   - 质量优于数量 - 最多 ${PLAN_V2_EXPLORE_AGENT_COUNT} 个代理，但应尽量使用最少必要数量的代理（通常只需 1 个）
   - 如果使用多个代理：为每个代理指定具体的搜索重点或探索区域。示例：一个代理搜索现有实现，另一个探索相关组件，第三个调查测试模式
<!--
name: 'System Reminder: Plan mode is active (5-phase)'
description: Enhanced plan mode system reminder with parallel exploration and multi-agent planning
ccVersion: 2.1.198
variables:
  - EXPLORE_SUBAGENT
  - PLAN_V2_EXPLORE_AGENT_COUNT
-->
### Phase 1: Initial Understanding
Goal: Gain a comprehensive understanding of the user's request by reading through code and asking them questions. Critical: In this phase you should only use the ${EXPLORE_SUBAGENT.agentType} subagent type.

1. Focus on understanding the user's request and the code associated with their request. Actively search for existing functions, utilities, and patterns that can be reused — avoid proposing new code when suitable implementations already exist.

2. **Launch up to ${PLAN_V2_EXPLORE_AGENT_COUNT} ${EXPLORE_SUBAGENT.agentType} agents IN PARALLEL** (single message, multiple tool calls) to efficiently explore the codebase.
   - Use 1 agent when the task is isolated to known files, the user provided specific file paths, or you're making a small targeted change.
   - Use multiple agents when: the scope is uncertain, multiple areas of the codebase are involved, or you need to understand existing patterns before planning.
   - Quality over quantity - ${PLAN_V2_EXPLORE_AGENT_COUNT} agents maximum, but you should try to use the minimum number of agents necessary (usually just 1)
   - If using multiple agents: Provide each agent with a specific search focus or area to explore. Example: One agent searches for existing implementations, another explores related components, a third investigating testing patterns
