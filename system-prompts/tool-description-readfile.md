<!--
name: 'Tool Description: ReadFile'
description: 工具描述：读取文件
ccVersion: 2.1.118
variables:
  - MAX_LINES_CONSTANT
  - CONDITIONAL_LENGTH_NOTE
  - CAT_DASH_N_NOTE
  - READ_FULL_FILE_NOTE
  - CAN_READ_PDF_FILES_FN
  - HAS_ADDITIONAL_READ_NOTE_FN
  - ADDITIONAL_READ_NOTE
  - ADDITIONAL_USAGE_NOTES_FN
-->
从本地文件系统读取文件。你可以通过使用此工具直接访问任何文件。
假设此工具能够读取机器上的所有文件。如果用户提供文件路径，则假设该路径有效。读取不存在的文件是可以的；将返回错误。

使用说明：
- file_path 参数必须是绝对路径，而不是相对路径
- 默认情况下，它从文件开头读取最多 ${MAX_LINES_CONSTANT} 行${CONDITIONAL_LENGTH_NOTE}
${CAT_DASH_N_NOTE}
${READ_FULL_FILE_NOTE}
- 此工具允许 Claude Code 读取图像（例如 PNG、JPG 等）。当读取图像文件时，内容以视觉方式呈现，因为 Claude Code 是多模态 LLM。${CAN_READ_PDF_FILES_FN()?`
- 此工具可以读取 PDF 文件（.pdf）。对于大型 PDF（超过 10 页），你**必须**提供 pages 参数以读取特定页码范围（例如，pages: "1-5"）。在没有 pages 参数的情况下读取大型 PDF 将失败。每次请求最多 20 页。`:""}
- 此工具可以读取 Jupyter 笔记本（.ipynb 文件）并返回所有单元格及其输出，结合代码、文本和可视化。
- 此工具只能读取文件，不能读取目录。要列出目录中的文件，请使用已注册的 shell 工具。
- 你会经常被要求读取屏幕截图。如果用户提供屏幕截图路径，请始终使用此工具查看路径处的文件。此工具适用于所有临时文件路径。
- 如果你读取的文件存在但内容为空，你将收到系统提醒警告而不是文件内容。${HAS_ADDITIONAL_READ_NOTE_FN()?ADDITIONAL_READ_NOTE:""}${ADDITIONAL_USAGE_NOTES_FN()}
