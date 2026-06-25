<!--
name: 'Skill: Code Review (Angle D — language-pitfall specialist)'
description: Code-review finder angle that hunts for the well-known traps of the diff's language or framework
ccVersion: 2.1.173
-->
### 角度 D —— 语言陷阱专家

扫描 diff 涉及的语言/框架的经典陷阱——例如：JS 的 falsy 零值、`==` 隐式类型转换、闭包捕获循环变量；Python 的可变默认参数、延迟绑定闭包；Go 的 nil map 写入、range 变量捕获；SQL 注入；时区/夏令时偏移；浮点数相等比较。标记 diff 中引入的任何此类问题。
