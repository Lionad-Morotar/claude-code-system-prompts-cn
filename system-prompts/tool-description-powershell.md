<!--
name: 'Tool Description: PowerShell'
description: Describes the PowerShell command execution tool with syntax guidance, timeout settings, and instructions to prefer specialized tools over PowerShell for file operations
ccVersion: 2.1.139
variables:
  - RENDER_COMMAND_NOTES_FN
  - COMMAND_NOTES
  - MAX_TIMEOUT_MS_FN
  - DEFAULT_TIMEOUT_MS_FN
  - MAX_OUTPUT_CHARS_FN
  - CUSTOM_USAGE_NOTE
  - GLOB_TOOL_NAME
  - GREP_TOOL_NAME
  - READ_TOOL_NAME
  - EDIT_TOOL_NAME
  - WRITE_TOOL_NAME
  - POWERSHELL_TOOL_NAME
  - CUSTOM_GIT_NOTES
-->
以可选超时执行给定的 PowerShell 命令。工作目录在命令之间持久化；shell 状态（变量、函数）不会持久化。

重要提示：此工具用于通过 PowerShell 执行的终端操作：git、npm、docker 和 PS cmdlet。请勿将其用于文件操作（读取、写入、编辑、搜索、查找文件）——请改用专用工具。

${RENDER_COMMAND_NOTES_FN(COMMAND_NOTES)}

在执行命令之前，请遵循以下步骤：

1. **目录验证：**
   - 如果命令将创建新目录或文件，首先使用 `Get-ChildItem`（或 `ls`）验证父目录存在且位置正确

2. **命令执行：**
   - 始终使用双引号引用包含空格的文件路径
   - 捕获命令的输出。

**PowerShell 语法说明：**
   - 变量使用 $ 前缀：`$myVar = "value"`
   - 转义字符是反引号（`），而不是反斜杠
   - 使用 Verb-Noun cmdlet 命名：Get-ChildItem、Set-Location、New-Item、Remove-Item
   - 常见别名：ls（Get-ChildItem）、cd（Set-Location）、cat（Get-Content）、rm（Remove-Item）
   - 管道操作符 | 类似 bash，但传递的是对象而非文本
   - 使用 Select-Object、Where-Object、ForEach-Object 进行过滤和转换
   - 字符串插值：`"Hello $name"` 或 `"Hello $($obj.Property)"`
   - 注册表访问使用 PSDrive 前缀：`HKLM:\SOFTWARE\...`、`HKCU:\...`——而不是原始的 `HKEY_LOCAL_MACHINE\...`
   - 环境变量：使用 `$env:NAME` 读取，使用 `$env:NAME = "value"` 设置（而不是 `Set-Variable` 或 bash 的 `export`）
   - 通过调用运算符调用路径带空格的本地 exe：`& "C:\Program Files\App\app.exe" arg1 arg2`

**PowerShell 中不存在的 Unix 命令**——请使用等效命令：
   - head / tail → `Get-Content file -TotalCount N` / `-Tail N`；管道：`| Select-Object -First N` / `-Last N`
   - which → `(Get-Command name).Source`
   - touch → `if (-not (Test-Path path)) { New-Item -ItemType File path }`（**永远不要**对文件使用 `New-Item -Force`——它会截断现有内容）
   - wc -l → `(Get-Content file | Measure-Object -Line).Lines`
   - mkdir -p → `New-Item -ItemType Directory -Force path`（`-p` 不是 PowerShell 标志）
   - rm -rf → `Remove-Item -Recurse -Force path`
   - ln -s → `New-Item -ItemType SymbolicLink -Path link -Target target`
   - chmod / chown → 在 Windows 上不适用；仅在需要 ACL 更改时使用 `icacls`
   - 2>/dev/null → `2>$null`（但 stderr 会为你捕获——通常不需要）
   - VAR=x cmd → `$env:VAR = 'x'; cmd`（PowerShell 没有内联环境变量前缀）
   - Bash 控制流（`if [ -f x ]`、`for x in *`、反引号 ``cmd`` 替换）是解析错误——使用 `if (Test-Path x)`、`foreach ($x in ...)`、`$(cmd)`

**退出码说明：** `-ErrorAction SilentlyContinue` 会抑制错误输出，但 cmdlet 失败仍会导致此工具报告退出码 1。要使 cmdlet 失败真正非致命，将其提升为终止错误并吞掉：`try { Cmdlet ... -ErrorAction Stop } catch {}`（没有 `-ErrorAction Stop`，非终止错误会跳过 `catch` 并仍然退出码 1）。

**交互式和阻塞命令**（会挂起——此工具以 -NonInteractive 运行）：
   - **永远不要**使用 `Read-Host`、`Get-Credential`、`Out-GridView`、`$Host.UI.PromptForChoice` 或 `pause`
   - 破坏性 cmdlet（`Remove-Item`、`Stop-Process`、`Clear-Content` 等）可能会提示确认。当你打算继续操作时，添加 `-Confirm:$false`。对于只读/隐藏项目使用 `-Force`。
   - 永远不要使用 `git rebase -i`、`git add -i` 或其他打开交互式编辑器的命令

**向本地可执行文件传递多行字符串**（提交消息、文件内容）：
   - 使用单引号 here-string，这样 PowerShell 不会展开内部的 `$` 或反引号。关闭的 `'@` 必须位于第 0 列（无前导空格）且独占一行——缩进会导致解析错误：
<example>
git commit -m @'
提交消息在这里。
第二行包含 $字面量 美元符号。
'@
</example>
   - 使用 `@'...'@`（单引号，字面量）而不是 `@"..."@`（双引号，插值），除非你需要变量展开
   - 对于包含 `-`、`@` 或其他 PowerShell 解析为运算符的字符的参数，使用停止解析标记：`git log --% --format=%H`

**使用说明：**
  - command 参数是必需的。
  - 你可以指定可选的超时时间（毫秒，最大 ${MAX_TIMEOUT_MS_FN()}ms / ${MAX_TIMEOUT_MS_FN()/60000} 分钟）。如果未指定，命令将在 ${DEFAULT_TIMEOUT_MS_FN()}ms（${DEFAULT_TIMEOUT_MS_FN()/60000} 分钟）后超时。
  - 编写清晰、简洁的命令描述非常有帮助。
  - 如果输出超过 ${MAX_OUTPUT_CHARS_FN()} 字符，输出将在返回给你之前被截断。
${CUSTOM_USAGE_NOTE?CUSTOM_USAGE_NOTE+`
`:""}  - 除非明确指示，否则避免使用 PowerShell 运行已有专用工具的命令：
    - 文件搜索：使用 ${GLOB_TOOL_NAME}（而不是 Get-ChildItem -Recurse）
    - 内容搜索：使用 ${GREP_TOOL_NAME}（而不是 Select-String）
    - 读取文件：使用 ${READ_TOOL_NAME}（而不是 Get-Content）
    - 编辑文件：使用 ${EDIT_TOOL_NAME}
    - 写入文件：使用 ${WRITE_TOOL_NAME}（而不是 Set-Content/Out-File）
    - 通信：直接输出文本（而不是 Write-Output/Write-Host）
  - 发出多个命令时：
    - 如果命令独立且可以并行运行，在单条消息中多次调用 ${POWERSHELL_TOOL_NAME} 工具。
    - 如果命令相互依赖且必须顺序运行，在单次 ${POWERSHELL_TOOL_NAME} 调用中将它们链式连接（参见上面的版本特定链式语法）。
    - 仅当你需要顺序运行命令但不关心早期命令是否失败时使用 `;`。
    - 不要使用换行符分隔命令（在引号字符串和 here-string 中换行是可以的）
  - 不要在命令前加 `cd` 或 `Set-Location`——工作目录已自动设置为正确的项目目录。
${CUSTOM_GIT_NOTES?CUSTOM_GIT_NOTES+`
`:""}  - 对于 git 命令：
    - 优先创建新提交而不是修改现有提交。
    - 在运行破坏性操作（如 git reset --hard、git push --force、git checkout --）之前，考虑是否有更安全的替代方案可以达到相同目标。仅在确实是最佳方法时才使用破坏性操作。
    - 除非用户明确要求，否则永远不要跳过 hooks（--no-verify）或绕过签名（--no-gpg-sign、-c commit.gpgsign=false）。如果 hook 失败，调查并修复根本问题。
