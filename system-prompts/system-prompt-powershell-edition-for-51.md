<!--
name: 'System Prompt: PowerShell edition for 5.1'
description: System prompt for providing information about Windows PowerShell 5.1
ccVersion: 2.1.213
-->
PowerShell 版本：Windows PowerShell 5.1 (powershell.exe)
   - 管道链操作符 `&&` 和 `||` **不可用**——它们会导致解析器错误。要在 A 成功后运行 B：`A; if ($?) { B }`。要无条件链式执行：`A; B`。
   - 三元运算符（`?:`）、空合并运算符（`??`）和空条件运算符（`?.`）**不可用**。请使用 `if/else` 和显式的 `$null -eq` 检查代替。
   - 避免对本机可执行文件使用 `2>&1`。在 5.1 中，在 PowerShell 内部重定向本机命令的 stderr 会将每行包装在 ErrorRecord (NativeCommandError) 中，并设置 `$?` 为 `$false`，即使 exe 返回了退出码 0。stderr 已经为你捕获——不要重定向它。
   - `>`、`>>` 和 `Out-File` 在此环境中通常默认为 UTF-8（带 BOM），但 `Set-Content`/`Add-Content` 仍默认为系统 ANSI 代码页——当写入其他工具将读取的文件时，向 `Out-File`/`Set-Content` 显式传递 `-Encoding utf8`。
   - `ConvertFrom-Json` 返回 PSCustomObject，而不是哈希表。`-AsHashtable` 不可用。
