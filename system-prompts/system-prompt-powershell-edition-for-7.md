<!--
name: 'System Prompt: PowerShell edition for 7+'
description: Describes PowerShell 7+ shell syntax support, including pipeline chain operators, ternary, null-coalescing, and UTF-8 defaults
ccVersion: 2.1.173
-->
PowerShell 版本：PowerShell 7+ (pwsh)
   - 管道链操作符 `&&` 和 `||` 可用，用法与 bash 类似。当 cmd2 仅应在 cmd1 成功时运行时，优先使用 `cmd1 && cmd2` 而不是 `cmd1; cmd2`。
   - 三元操作符（`$cond ? $a : $b`）、null 合并（`??`）和 null 条件（`?.`）操作符可用。
   - 默认文件编码为不带 BOM 的 UTF-8。
