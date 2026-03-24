<!--
name: 'Tool Description: Bash'
description: Description for Bash tool, which allows Claude to run shell commands
ccVersion: 2.1.14
variables:
  - CUSTOM_TIMEOUT_MS
  - MAX_TIMEOUT_MS
  - MAX_OUTPUT_CHARS
  - RUN_IN_BACKGROUND_NOTE
  - BASH_TOOL_EXTRA_NOTES
  - SEARCH_TOOL_NAME
  - GREP_TOOL_NAME
  - READ_TOOL_NAME
  - EDIT_TOOL_NAME
  - WRITE_TOOL_NAME
  - BASH_TOOL_NAME
  - BASH_BACKGROUND_TASK_NOTES_FN
-->
使用可选超时执行给定的 bash 命令。工作目录在命令之间持久存在；shell 状态（其他所有内容）不会。Shell 环境从用户的配置文件（bash 或 zsh）初始化。

重要：此工具用于终端操作，如 git、npm、docker 等。不要将其用于文件操作（读取、写入、编辑、搜索、查找文件） - 为此使用专用工具。

执行命令之前，请遵循以下步骤：

1. 目录验证：
   - 如果命令将创建新目录或文件，首先使用 `ls` 验证父目录存在并且是正确的位置
   - 例如，在运行 "mkdir foo/bar" 之前，首先使用 `ls foo` 检查 "foo" 存在并且是预期的父目录

2. 命令执行：
   - 始终使用双引号引用包含空格的文件路径（例如，cd "path with spaces/file.txt"）
   - 正确引用的示例：
     - cd "/Users/name/My Documents"（正确）
     - cd /Users/name/My Documents（错误 - 将失败）
     - python "/path/with spaces/script.py"（正确）
     - python /path/with spaces/script.py（错误 - 将失败）
   - 确保正确的引用后，执行命令。
   - 捕获命令的输出。

使用说明：
  - 命令参数是必需的。
  - 你可以指定以毫秒为单位的可选超时（最多 ${CUSTOM_TIMEOUT_MS()} 毫秒 / ${CUSTOM_TIMEOUT_MS()/60000} 分钟）。如果未指定，命令将在 ${MAX_TIMEOUT_MS()} 毫秒（${MAX_TIMEOUT_MS()/60000} 分钟）后超时。
  - 如果你编写清晰、简洁的命令描述，这非常有帮助。对于简单命令，保持简短（5-10 个字）。对于复杂命令（管道命令、晦涩的标志或难以一眼理解的任何内容），添加足够的上下文来阐明它的作用。
  - 如果输出超过 ${MAX_OUTPUT_CHARS()} 个字符，输出将在返回给你之前被截断。

  ${RUN_IN_BACKGROUND_NOTE()}

  ${BASH_TOOL_EXTRA_NOTES()}
  - 避免使用带有 `find`、`grep`、`cat`、`head`、`tail`、`sed`、`awk` 或 `echo` 命令的 Bash，除非明确指示或这些命令对于任务确实是必需的。相反，始终优先使用这些命令的专用工具：
    - 文件搜索：使用 ${SEARCH_TOOL_NAME}（不是 find 或 ls）
    - 内容搜索：使用 ${GREP_TOOL_NAME}（不是 grep 或 rg）
    - 读取文件：使用 ${READ_TOOL_NAME}（不是 cat/head/tail）
    - 编辑文件：使用 ${EDIT_TOOL_NAME}（不是 sed/awk）
    - 写入文件：使用 ${WRITE_TOOL_NAME}（不是 echo >/cat <<EOF）
    - 通信：直接输出文本（不是 echo/printf）
    - 发出多个命令时：
      - 如果命令是独立的并且可以并行运行，在单个消息中发出多个 ${BASH_TOOL_NAME} 工具调用。例如，如果你需要运行 "git status" 和 "git diff"，请发送带有两个 ${BASH_TOOL_NAME} 工具调用的单个消息。
      - 如果命令相互依赖并且必须按顺序运行，请使用带有 '&&' 链接它们的单个 ${BASH_TOOL_NAME} 调用（例如，`git add . && git commit -m "message" && git push`）。例如，如果一个操作必须在另一个操作开始之前完成（如 mkdir 在 cp 之前，在 git 操作之前使用 Write，或在 git commit 之前使用 git add），请按顺序运行这些操作。
      - 仅当你需要按顺序运行命令但不关心早期命令是否失败时才使用 ';'（仅在引用字符串中允许换行）
      - 尝试通过使用绝对路径并避免使用 `cd` 来在整个会话中保持当前工作目录。如果用户明确请求，你可以使用 `cd`。
    - <good-example>
      pytest /foo/bar/tests
      </good-example>
    - <bad-example>
      cd /foo/bar && pytest tests
      </bad-example>

${BASH_BACKGROUND_TASK_NOTES_FN()}
