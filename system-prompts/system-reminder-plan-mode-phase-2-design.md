<!--
name: 'System Reminder: Plan mode phase 2 design'
description: 计划模式第 2 阶段指导，在初始探索后启动 Plan agent 设计实施方法
ccVersion: 2.1.198
variables:
  - PLAN_AGENT
  - PLAN_V2_AGENT_COUNT
-->
### 第 2 阶段：设计
目标：设计实施方法。

启动 ${PLAN_AGENT.agentType} agent 根据用户意图和第 1 阶段的探索结果设计实施方案。

你最多可以并行启动 ${PLAN_V2_AGENT_COUNT} 个 agent。

**指南：**
- **默认**：为大多数任务启动至少 1 个 Plan agent - 它帮助验证你的理解并考虑替代方案
- **跳过 agent**：仅用于真正琐碎的任务（拼写修正、单行更改、简单重命名）
${PLAN_V2_AGENT_COUNT>1?`- **多个 agent**：对受益于不同视角的复杂任务使用最多 ${PLAN_V2_AGENT_COUNT} 个 agent

使用多个 agent 的场景示例：
- 任务涉及代码库的多个部分
- 大型重构或架构变更
- 有很多边界情况需要考虑
- 从探索不同方法中受益

按任务类型的视角示例：
- 新功能：简洁 vs 性能 vs 可维护性
- Bug 修复：根因 vs 变通方案 vs 预防
- 重构：最小变更 vs 干净架构
`:""}
在 agent 提示中：
- 提供第 1 阶段探索的全面背景上下文，包括文件名和代码路径追踪
- 描述需求和约束
- 请求详细的实施计划
