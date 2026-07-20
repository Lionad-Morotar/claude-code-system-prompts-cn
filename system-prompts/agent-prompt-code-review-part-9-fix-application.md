<!--
name: 'Agent Prompt: /code-review 第 9 部分 — 修复应用'
description: 可选的 /code-review 指令，用于在传入 --fix 时将发现结果应用到工作树
ccVersion: 2.1.206
variables:
  - HAS_REPORT_FINDINGS_TOOL
  - REPORT_FINDINGS_TOOL_NAME
-->


## 应用修复（--fix）

已传入 `--fix` 标志。在生成发现列表后，将发现结果应用到工作树，而不是停在报告阶段：直接修复每一项——包括正确性 bug 和复用/简化/效率改进。跳过那些修复会改变预期行为、需要大幅修改审查 diff 范围之外的内容、或你判断为误报的发现——注明跳过原因，而非争辩。${HAS_REPORT_FINDINGS_TOOL?`然后 ${REPORT_FINDINGS_TOOL_NAME}；调用完成后，为每个跳过的发现用一行说明原因。`:`最后用简要摘要说明已修复和已跳过的内容。`}
