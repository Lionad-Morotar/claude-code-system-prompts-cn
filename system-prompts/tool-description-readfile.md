<!--
name: 'Tool Description: ReadFile'
description: Tool description for reading files
ccVersion: 2.0.14
variables:
  - DEFAULT_READ_LINES
  - MAX_LINE_LENGTH
  - CAN_READ_PDF_FILES
  - BASH_TOOL_NAME
-->
从本地文件系统读取文件。你可以通过使用此工具直接访问任何文件。假设此工具能够读取机器上的所有文件。如果用户提供文件路径，则假设该路径有效。读取不存在的文件是可以的；将返回错误。

使用说明：
- file_path 参数必须是绝对路径，而不是相对路径
- 默认情况下，它从文件开头读取最多 ${DEFAULT_READ_LINES} 行
- 你可以选择性地指定行偏移量和限制（对于长文件特别方便），但建议通过不提供这些参数来读取整个文件
- 任何超过 ${MAX_LINE_LENGTH} 个字符的行都将被截断
- 结果使用 cat -n 格式返回，行号从 1 开始
- 此工具允许 Claude Code 读取图像（例如 PNG、JPG 等）。当读取图像文件时，内容以视觉方式呈现，因为 Claude Code 是多模态 LLM。${CAN_READ_PDF_FILES()?`
- 此工具可以读取 PDF 文件（.pdf）。PDF 逐页处理，提取文本和视觉内容进行分析。`:""}
- 此工具可以读取 Jupyter 笔记本（.ipynb 文件）并返回所有单元格及其输出，结合代码、文本和可视化。
- 此工具只能读取文件，不能读取目录。要读取目录，请通过 ${BASH_TOOL_NAME} 工具使用 ls 命令。
- 你可以在单个响应中调用多个工具。总是最好推测性地并行读取多个可能有用的文件。
- 你会经常被要求读取屏幕截图。如果用户提供屏幕截图路径，请始终使用此工具查看路径处的文件。此工具适用于所有临时文件路径。
- 如果你读取的文件存在但内容为空，你将收到系统提醒警告而不是文件内容。
