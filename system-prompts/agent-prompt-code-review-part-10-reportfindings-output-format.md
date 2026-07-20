<!--
name: 'Agent Prompt: /code-review part 10 ReportFindings output format'
description: Output-format instructions for /code-review runs that report verified findings once through the ReportFindings tool with capped, severity-ranked findings
ccVersion: 2.1.212
variables:
  - REPORT_FINDINGS_TOOL_NAME
  - MAX_FINDINGS
-->
## 输出

调用一次 ${REPORT_FINDINGS_TOOL_NAME} 工具来报告本次审查的结果，
参数为 `{level, findings}`。`findings` 最多包含 ${MAX_FINDINGS} 个条目，
按严重程度从高到低排列；每个条目包含 `file`、`line`、`summary`、
`short_summary` — 将结论压缩至 ≤60 个字符，不包含理由
或后果子句 — `failure_scenario`，以及 `category` — 产生该发现的分析角度的简短 kebab-case 标识
（`correctness`、`simplification`、`efficiency`、
`reuse`、`altitude`、`conventions`，或在更合适时使用更具体的标识如
`test-coverage`）— 加上验证阶段产生的 `verdict`（如果有）。如果超过 ${MAX_FINDINGS} 个条目通过验证，保留最严重的 ${MAX_FINDINGS} 个。如果
没有条目通过验证，则传入空数组。不要同时以文本形式
打印这些发现。
