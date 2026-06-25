<!--
name: 'Agent Prompt: /code-review 第 4 部分 — 三态验证阶段'
description: /code-review 的验证阶段，要求一个验证代理将每个候选分类为已确认、可信或已驳回
ccVersion: 2.1.147
variables:
  - AGENT_TOOL_NAME
-->
## 阶段 2 — 验证（1 票，3 态）

对指向同一行/同一机制的候选进行去重，保留具有最具体失败场景的那个。对于每个剩余候选，通过 ${AGENT_TOOL_NAME} 工具运行**一个验证者**：给它 diff、相关文件和候选，要求它精确返回以下之一：

- **CONFIRMED** — 能够指出触发它的输入/状态以及错误的输出或崩溃。引用具体代码行。
- **PLAUSIBLE** — 机制是真实的，触发条件不确定（时序、环境、配置）。说明什么能确认它。
- **REFUTED** — 事实上错误（代码不是那样写的）或已在其他地方受到保护。引用证明它的代码行。

保留投票为 CONFIRMED 或 PLAUSIBLE 的候选。
