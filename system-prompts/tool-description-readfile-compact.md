<!--
name: 'Tool Description: ReadFile compact'
description: 提供给新模型的精简文件读取工具描述——绝对路径、默认行上限以及图像/PDF/笔记本处理
ccVersion: 2.1.178
variables:
  - MAX_LINES_CONSTANT
  - CONDITIONAL_LENGTH_NOTE
  - CAT_DASH_N_NOTE
  - READ_FULL_FILE_NOTE
  - CAN_READ_PDF_FILES_FN
  - ADDITIONAL_READ_NOTE
-->
从本地文件系统读取文件。

- `file_path` 必须是绝对路径。
- 默认最多读取 ${MAX_LINES_CONSTANT} 行${CONDITIONAL_LENGTH_NOTE}。
${CAT_DASH_N_NOTE}
${READ_FULL_FILE_NOTE}
- 读取图像（PNG、JPG 等）并以视觉方式呈现。${CAN_READ_PDF_FILES_FN()?'通过 `pages` 参数读取 PDF（例如 "1-5"，每次请求最多 20 页；超过 10 页的 PDF 必须提供此参数）。':""}读取 Jupyter 笔记本（.ipynb），以单元格和输出形式展示。
- 读取目录、缺失文件或空文件会返回错误或系统提醒而非内容。${ADDITIONAL_READ_NOTE}
