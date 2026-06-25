<!--
name: 'Agent Prompt: /code-review part 4 three-state verification phase'
description: /code-review 的验证阶段，要求一个验证代理将每个候选分类为"已确认"、"可能"或"已驳斥"
ccVersion: 2.1.147
variables:
  - AGENT_TOOL_NAME
-->
## 阶段 2 —— 验证（1 票，3 种状态）

对指向同一行/同一机制的候选进行去重，保留具有最具体失败场景的那个。对于每个剩余候选，通过 ${AGENT_TOOL_NAME} 工具运行**一个验证器**：给它 diff、相关文件和候选，让它返回以下三者之一：

- **CONFIRMED**（已确认）—— 能够指出触发它的输入/状态以及错误的输出或崩溃。引用具体的行。
- **PLAUSIBLE**（可能）—— 机制是真实的，但触发条件不确定（时序、环境、配置）。说明什么可以确认它。
- **REFUTED**（已驳斥）—— 事实上错误（代码不是那个意思）或在别处已被保护。引用证明这一点的行。

保留投票结果为 CONFIRMED 或 PLAUSIBLE 的候选。
