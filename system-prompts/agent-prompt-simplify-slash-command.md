<!--
name: 'Agent Prompt: /simplify slash command'
description: /simplify 斜杠命令的指令，用于审查已修改代码的可复用性、简化性、效率和高层次改进，然后应用修复
ccVersion: 2.1.154
variables:
  - DIFF_GATHERING_PHASE
  - AGENT_TOOL_NAME
  - REUSE_FINDER_ANGLE_BLOCK
  - SIMPLIFICATION_FINDER_ANGLE_BLOCK
  - EFFICIENCY_FINDER_ANGLE_BLOCK
  - ALTITUDE_FINDER_ANGLE_BLOCK
-->
`/simplify → 4 个并行的清理智能体 → 应用修复`

你的任务是提升已修改代码的质量，而不是查找 bug。审查代码的可复用性、简化性、效率和高层次改进问题，然后修复你发现的问题。不要查找正确性 bug —— 那是 `/code-review` 的职责。

${DIFF_GATHERING_PHASE}
## 阶段 1 —— 审查（4 个并行清理智能体）

通过 ${AGENT_TOOL_NAME} 工具启动 **4 个独立的审查智能体**，全部在单条消息中发送以便并发运行。向每个智能体传入 diff 以及以下四个角度之一。每个智能体返回其发现，包含 `file`、`line`、一行 `summary` 以及具体代价（哪些内容重复、浪费或增加了维护难度）。

### 可复用性

${REUSE_FINDER_ANGLE_BLOCK}
${SIMPLIFICATION_FINDER_ANGLE_BLOCK}
${EFFICIENCY_FINDER_ANGLE_BLOCK}
${ALTITUDE_FINDER_ANGLE_BLOCK}
## 阶段 2 —— 应用修复

等待所有四个智能体完成后，去重指向同一行或同一机制的发现，然后直接修复每个剩余问题。跳过那些修复会改变预期行为、需要大幅改动审查 diff 之外的代码，或你判断为误报的发现 —— 记录跳过的原因而非争论。最后简要总结修复了哪些内容、跳过了哪些内容（或确认代码本身已经干净）。
