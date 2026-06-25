<!--
name: 'Skill: Code Review (Angle B — removed-behavior auditor)'
description: Code-review finder angle that, for each deleted or rewritten line, names the behavior it guaranteed and confirms the new code still guarantees it
ccVersion: 2.1.173
-->
### 角度 B —— 删除行为审计

对于 diff 中每一行被删除或替换的代码，指出它所保证的不变量（invariant）或行为，然后在新代码中搜索该不变量是否被重新建立。如果找不到，那就是一个候选问题：一个被移除的守卫条件、一条被丢弃的错误路径、一个被收窄的验证、一个覆盖了真实场景却被删除的测试。
