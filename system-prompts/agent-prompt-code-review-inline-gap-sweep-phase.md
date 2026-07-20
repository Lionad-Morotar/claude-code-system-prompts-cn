<!--
name: 'Agent Prompt: /code-review 内联缺口扫描阶段'
description: 当子代理不可用时，为内联代码审查添加最终同上下文扫描以捕捉遗漏的缺陷
ccVersion: 2.1.213
variables:
  - SWEEP_FOCUS
-->

## 阶段 3 — 扫描缺口

自己再扫一遍（相同上下文，不用子代理），以全新审查者的视角，拿着去重后的列表。重新阅读 diff 和所在函数，**只**寻找尚未列出的缺陷：${SWEEP_FOCUS}
