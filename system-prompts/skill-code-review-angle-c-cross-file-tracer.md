<!--
name: 'Skill: Code Review (Angle C — cross-file tracer)'
description: Code-review finder angle that follows each changed function out to its callers, checking the diff hasn't broken a call-site contract
ccVersion: 2.1.173
-->
### 角度 C —— 跨文件追踪

对于 diff 中每个被修改的函数，找到它的调用方（使用 Grep 搜索符号），检查变更是否破坏了任何调用点的契约：新增的前置条件、变化的返回结构、新的异常、时序/顺序依赖。同时检查被调用方：同一 PR 中的并行变更是否使某个调用变得不安全？
