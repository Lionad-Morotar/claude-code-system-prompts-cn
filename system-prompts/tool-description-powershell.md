<!--
name: 'Tool Description: PowerShell'
description: 描述 PowerShell 命令执行工具，包含语法指导、超时设置，以及优先使用专用工具而非 PowerShell 进行文件操作的说明
ccVersion: 2.1.213
variables:
  - RENDER_COMMAND_NOTES_FN
  - COMMAND_NOTES
  - POWERSHELL_TIMEOUT_NOTE
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
执行给定的 PowerShell 命令，可选超时。工作目录在命令之间持久化；shell 状态（变量、函数）不会。

重要：此工具用于通过 PowerShell 执行终端操作：git、npm、docker 和 PS cmdlet。不要将其用于文件操作（读取、写入、编辑、搜索、查找文件）— 改用专用工具。

${RENDER_COMMAND_NOTES_FN(COMMAND_NOTES)}
${POWERSHELL_TIMEOUT_NOTE}
执行命令前，请遵循以下步骤：

1. 目录验证：
   - 如果命令将创建新目录或文件，先使用 `Get-ChildItem`（或 `ls`）验证父目录存在且位置正确

2. 命令执行：
   - 始终用双引号引用包含空格的文件路径
   - 捕获命令的输出。

PowerShell 语法说明：
   - 变量使用 $ 前缀：$myVar = "value"
   - 转义字符是反引号（`），不是反斜杠
   - 使用 Verb-Noun cmdlet 命名：Get-ChildItem, Set-Location, New-Item, Remove-Item
   - 常用别名：ls (Get-ChildItem), cd (Set-Location), cat (Get-Content), rm (Remove-Item)
   - 管道操作符 | 与 bash 类似但传递的是对象而非文本
   - 使用 Select-Object, Where-Object, ForEach-Object 进行过滤和转换
   - 字符串插值："Hello $name" 或 "Hello $($obj.Property)"
   - 注册表访问使用 PSDrive 前缀：`HKLM:\SOFTWARE\...`, `HKCU:\...` — 而非原始 `HKEY_LOCAL_MACHINE\...`
   - 环境变量：用 `$env:NAME` 读取，用 `$env:NAME = "value"` 设置（不用 `Set-Variable` 或 bash 的 `export`）
   - 通过调用操作符调用路径含空格的 exe：`& "C:\Program Files\App\app.exe" arg1 arg2`

PowerShell 中不存在的 Unix 命令 — 使用等效替代：
   - head / tail → `Get-Content file -TotalCount N` / `-Tail N`；管道：`| Select-Object -First N` / `-Last N`
   - which → `(Get-Command name).Source`
   - touch → `if (-not (Test-Path path)) { New-Item -ItemType File path }`（绝不对文件使用 `New-Item -Force` — 它会截断现有内容）
   - wc -l → `(Get-Content file | Measure-Object -Line).Lines`
   - mkdir -p → `New-Item -ItemType Directory -Force path`（`-p` 不是 PowerShell 标志）
   - rm -rf → `Remove-Item -Recurse -Force path`
   - ln -s → `New-Item -ItemType SymbolicLink -Path link -Target target`
   - chmod / chown → 在 Windows 上不适用；仅在需要 ACL 更改时使用 `icacls`
   - 2>/dev/null → `2>$null`（但 stderr 已为你捕获 — 通常不需要）
   - VAR=x cmd → `$env:VAR = 'x'; cmd`（PowerShell 没有内联环境变量前缀）
   - Bash 控制流（`if [ -f x ]`、`for x in *`、反引号 ``cmd`` 替换）会报解析错误 — 使用 `if (Test-Path x)`、`foreach ($x in ...)`、`$(cmd)`

退出码说明：`-ErrorAction SilentlyContinue` 抑制错误输出但 cmdlet 失败仍会导致此工具报告退出码 1。要使 cmdlet 失败真正非致命，将其提升为终止错误并吞掉：`try { Cmdlet ... -ErrorAction Stop } catch {}`（没有 `-ErrorAction Stop`，非终止错误会跳过 `catch` 仍然退出码 1）。

交互式和阻塞命令（此工具以 -NonInteractive 运行且 stdin 连接到空设备——控制台提示会立即读取 EOF 或报错；GUI 提示仍可能阻塞直到超时）：
   - 绝不使用 `Read-Host`、`Get-Credential`、`Out-GridView`、`$Host.UI.PromptForChoice` 或 `pause`
   - 破坏性 cmdlet（`Remove-Item`、`Stop-Process`、`Clear-Content` 等）可能会提示确认。当你希望操作继续时添加 `-Confirm:$false`。对只读/隐藏项目使用 `-Force`。
   - 绝不使用 `git rebase -i`、`git add -i` 或其他打开交互式编辑器的命令

向原生可执行文件传递多行字符串（提交消息、文件内容）：
   - 使用单引号 here-string 以防止 PowerShell 展开其中的 `$` 或反引号。闭合的 `'@` 必须在第 0 列（无前导空格）独占一行 — 缩进会导致解析错误：
<example>
git commit -m @'
Commit message here.
Second line with $literal dollar signs.
'@
</example>
   - 使用 `@'...'@`（单引号，字面量）而非 `@"..."@`（双引号，插值）除非你需要变量展开
   - 对于包含 `-`、`@` 或其他 PowerShell 解析为操作符的字符的参数，使用停止解析标记：`git log --% --format=%H`

使用说明：
  - command 参数是必需的。
  - 你可以指定可选的超时时间（毫秒），最大 ${MAX_TIMEOUT_MS_FN()}ms / ${MAX_TIMEOUT_MS_FN()/60000} 分钟。如未指定，命令将在 ${DEFAULT_TIMEOUT_MS_FN()}ms（${DEFAULT_TIMEOUT_MS_FN()/60000} 分钟）后超时。
  - 如果你为此命令写一个清晰简洁的描述会很有帮助。
  - 如果输出超过 ${MAX_OUTPUT_CHARS_FN()} 个字符，输出会在返回给你之前被截断。
${CUSTOM_USAGE_NOTE?CUSTOM_USAGE_NOTE+`
`:""}  - 避免使用 PowerShell 运行有专用工具的命令，除非被明确指示：
    - 文件搜索：使用 ${GLOB_TOOL_NAME}（不是 Get-ChildItem -Recurse）
    - 内容搜索：使用 ${GREP_TOOL_NAME}（不是 Select-String）
    - 读取文件：使用 ${READ_TOOL_NAME}（不是 Get-Content）
    - 编辑文件：使用 ${EDIT_TOOL_NAME}
    - 写入文件：使用 ${WRITE_TOOL_NAME}（不是 Set-Content/Out-File）
    - 通信：直接输出文本（不是 Write-Output/Write-Host）
  - 执行多个命令时：
    - 如果命令独立且可以并行运行，在单条消息中发起多个 ${POWERSHELL_TOOL_NAME} 工具调用。
    - 如果命令相互依赖且必须按顺序运行，在单个 ${POWERSHELL_TOOL_NAME} 调用中链接它们（参见上方针对版本的链接语法）。
    - 仅在需要按顺序运行命令但不关心前面的命令是否失败时使用 `;`。
    - 不要用换行符分隔命令（引号字符串和 here-string 中的换行符可以）
  - 不要在命令前加 `cd` 或 `Set-Location` — 工作目录已自动设置为正确的项目目录。
${CUSTOM_GIT_NOTES?CUSTOM_GIT_NOTES+`
`:""}  - 对于 git 命令：
    - 优先创建新提交而非修改现有提交。
    - 在运行破坏性操作之前（如 git reset --hard、git push --force、git checkout --），考虑是否有更安全的替代方案达到相同目标。仅在确实是最佳方案时使用破坏性操作。
    - 绝不跳过 hooks（--no-verify）或绕过签名（--no-gpg-sign, -c commit.gpgsign=false）除非用户明确要求。如果 hook 失败，调查并修复根本问题。
<!--
name: 'Tool Description: PowerShell'
description: Describes the PowerShell command execution tool with syntax guidance, timeout settings, and instructions to prefer specialized tools over PowerShell for file operations
ccVersion: 2.1.213
variables:
  - RENDER_COMMAND_NOTES_FN
  - COMMAND_NOTES
  - POWERSHELL_TIMEOUT_NOTE
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
Executes a given PowerShell command with optional timeout. Working directory persists between commands; shell state (variables, functions) does not.

IMPORTANT: This tool is for terminal operations via PowerShell: git, npm, docker, and PS cmdlets. DO NOT use it for file operations (reading, writing, editing, searching, finding files) - use the specialized tools for this instead.

${RENDER_COMMAND_NOTES_FN(COMMAND_NOTES)}
${POWERSHELL_TIMEOUT_NOTE}
Before executing the command, please follow these steps:

1. Directory Verification:
   - If the command will create new directories or files, first use `Get-ChildItem` (or `ls`) to verify the parent directory exists and is the correct location

2. Command Execution:
   - Always quote file paths that contain spaces with double quotes
   - Capture the output of the command.

PowerShell Syntax Notes:
   - Variables use $ prefix: $myVar = "value"
   - Escape character is backtick (`), not backslash
   - Use Verb-Noun cmdlet naming: Get-ChildItem, Set-Location, New-Item, Remove-Item
   - Common aliases: ls (Get-ChildItem), cd (Set-Location), cat (Get-Content), rm (Remove-Item)
   - Pipe operator | works similarly to bash but passes objects, not text
   - Use Select-Object, Where-Object, ForEach-Object for filtering and transformation
   - String interpolation: "Hello $name" or "Hello $($obj.Property)"
   - Registry access uses PSDrive prefixes: `HKLM:\SOFTWARE\...`, `HKCU:\...` — NOT raw `HKEY_LOCAL_MACHINE\...`
   - Environment variables: read with `$env:NAME`, set with `$env:NAME = "value"` (NOT `Set-Variable` or bash `export`)
   - Call native exe with spaces in path via call operator: `& "C:\Program Files\App\app.exe" arg1 arg2`

Unix commands that DO NOT exist in PowerShell — use the equivalent instead:
   - head / tail → `Get-Content file -TotalCount N` / `-Tail N`; piped: `| Select-Object -First N` / `-Last N`
   - which → `(Get-Command name).Source`
   - touch → `if (-not (Test-Path path)) { New-Item -ItemType File path }` (NEVER use `New-Item -Force` on a file — it truncates existing content)
   - wc -l → `(Get-Content file | Measure-Object -Line).Lines`
   - mkdir -p → `New-Item -ItemType Directory -Force path` (`-p` is not a PowerShell flag)
   - rm -rf → `Remove-Item -Recurse -Force path`
   - ln -s → `New-Item -ItemType SymbolicLink -Path link -Target target`
   - chmod / chown → not applicable on Windows; use `icacls` only if ACL changes are required
   - 2>/dev/null → `2>$null` (but stderr is captured for you — usually unnecessary)
   - VAR=x cmd → `$env:VAR = 'x'; cmd` (PowerShell has no inline env-var prefix)
   - Bash control flow (`if [ -f x ]`, `for x in *`, backtick ``cmd`` substitution) is a parser error — use `if (Test-Path x)`, `foreach ($x in ...)`, `$(cmd)`

Exit-code note: `-ErrorAction SilentlyContinue` suppresses error OUTPUT but the cmdlet failure still causes this tool to report exit 1. To make a cmdlet failure truly non-fatal, promote it to terminating and swallow it: `try { Cmdlet ... -ErrorAction Stop } catch {}` (without `-ErrorAction Stop`, non-terminating errors skip the `catch` and still exit 1).

Interactive and blocking commands (will hang — this tool runs with -NonInteractive):
   - NEVER use `Read-Host`, `Get-Credential`, `Out-GridView`, `$Host.UI.PromptForChoice`, or `pause`
   - Destructive cmdlets (`Remove-Item`, `Stop-Process`, `Clear-Content`, etc.) may prompt for confirmation. Add `-Confirm:$false` when you intend the action to proceed. Use `-Force` for read-only/hidden items.
   - Never use `git rebase -i`, `git add -i`, or other commands that open an interactive editor

Passing multiline strings (commit messages, file content) to native executables:
   - Use a single-quoted here-string so PowerShell does not expand `$` or backticks inside. The closing `'@` MUST be at column 0 (no leading whitespace) on its own line — indenting it is a parse error:
<example>
git commit -m @'
Commit message here.
Second line with $literal dollar signs.
'@
</example>
   - Use `@'...'@` (single-quoted, literal) not `@"..."@` (double-quoted, interpolated) unless you need variable expansion
   - For arguments containing `-`, `@`, or other characters PowerShell parses as operators, use the stop-parsing token: `git log --% --format=%H`

Usage notes:
  - The command argument is required.
  - You can specify an optional timeout in milliseconds (up to ${MAX_TIMEOUT_MS_FN()}ms / ${MAX_TIMEOUT_MS_FN()/60000} minutes). If not specified, commands will timeout after ${DEFAULT_TIMEOUT_MS_FN()}ms (${DEFAULT_TIMEOUT_MS_FN()/60000} minutes).
  - It is very helpful if you write a clear, concise description of what this command does.
  - If the output exceeds ${MAX_OUTPUT_CHARS_FN()} characters, output will be truncated before being returned to you.
${CUSTOM_USAGE_NOTE?CUSTOM_USAGE_NOTE+`
`:""}  - Avoid using PowerShell to run commands that have dedicated tools, unless explicitly instructed:
    - File search: Use ${GLOB_TOOL_NAME} (NOT Get-ChildItem -Recurse)
    - Content search: Use ${GREP_TOOL_NAME} (NOT Select-String)
    - Read files: Use ${READ_TOOL_NAME} (NOT Get-Content)
    - Edit files: Use ${EDIT_TOOL_NAME}
    - Write files: Use ${WRITE_TOOL_NAME} (NOT Set-Content/Out-File)
    - Communication: Output text directly (NOT Write-Output/Write-Host)
  - When issuing multiple commands:
    - If the commands are independent and can run in parallel, make multiple ${POWERSHELL_TOOL_NAME} tool calls in a single message.
    - If the commands depend on each other and must run sequentially, chain them in a single ${POWERSHELL_TOOL_NAME} call (see edition-specific chaining syntax above).
    - Use `;` only when you need to run commands sequentially but don't care if earlier commands fail.
    - DO NOT use newlines to separate commands (newlines are ok in quoted strings and here-strings)
  - Do NOT prefix commands with `cd` or `Set-Location` -- the working directory is already set to the correct project directory automatically.
${CUSTOM_GIT_NOTES?CUSTOM_GIT_NOTES+`
`:""}  - For git commands:
    - Prefer to create a new commit rather than amending an existing commit.
    - Before running destructive operations (e.g., git reset --hard, git push --force, git checkout --), consider whether there is a safer alternative that achieves the same goal. Only use destructive operations when they are truly the best approach.
    - Never skip hooks (--no-verify) or bypass signing (--no-gpg-sign, -c commit.gpgsign=false) unless the user has explicitly asked for it. If a hook fails, investigate and fix the underlying issue.
