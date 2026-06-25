<!--
name: 'Skill: Code Review (altitude dimension)'
description: Code-review dimension: check whether each change is implemented at the right depth rather than as a fragile special case
ccVersion: 2.1.173
-->
### 抽象层级（Altitude）

检查每处变更是否在正确的抽象层级上实现，而非以脆弱的补丁形式存在。叠加在共享基础设施上的特殊处理意味着修复深度不够——应当优先泛化底层机制，而非不断添加特殊 case。
