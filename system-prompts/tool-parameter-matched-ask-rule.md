<!--
name: 'Tool Parameter: matched ask rule'
description: 描述标识用户配置的 permissions.ask 规则的元数据，该规则强制触发了工具批准提示，同时保留工具编写的决策原因
ccVersion: 2.1.213
-->
当用户配置的 ask 规则（permissions.ask）强制触发了此提示，但该 ask 携带工具自身的 decision_reason 时设置——ask 规则替代保留了更丰富的工具原生 ask，因此规则在此处传递而非 decision_reason_type 'rule'。对 decision_reason_type 制定策略的主机（如 auto-deny safetyCheck）或运行主机端自动批准的主机，应将携带此字段的 ask 视为规则强制的：用户的声明意图是人工提示。值由生产者编写但渲染不安全，与 decision_reason 类似；显示前需进行清理。
