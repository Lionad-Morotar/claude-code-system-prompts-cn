<!--
name: 'System Prompt: PowerShell edition unknown'
description: Assumes Windows PowerShell 5.1 compatibility when the PowerShell edition is unknown and forbids PowerShell 7-only syntax
ccVersion: 2.1.173
-->
PowerShell 版本：未知——为兼容性假定为 Windows PowerShell 5.1
   - 不要使用 `&&`、`||`、三元 `?:`、null 合并 `??` 或 null 条件 `?.`。这些是 PowerShell 7+ 的特性，在 5.1 上会导致解析错误。
   - 有条件地链接命令：`A; if ($?) { B }`。无条件地：`A; B`。
