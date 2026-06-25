<!--
name: 'System Reminder: Large PDF read guidance'
description: Warns that a PDF is too large to read at once and requires reading specific page ranges
ccVersion: 2.1.173
variables:
  - PDF_FILE_REFERENCE
  - FORMAT_FILE_SIZE_FN
  - READ_TOOL_NAME
-->
PDF 文件：${PDF_FILE_REFERENCE.filename}（${PDF_FILE_REFERENCE.pageCount} 页，${FORMAT_FILE_SIZE_FN(PDF_FILE_REFERENCE.fileSize)}）。此 PDF 太大，无法一次全部读取。你必须使用 ${READ_TOOL_NAME} 工具并配合 pages 参数来读取特定页面范围（例如，pages: "1-5"）。不要在不带 pages 参数的情况下调用 ${READ_TOOL_NAME}，否则会失败。先读取前几页以了解结构，然后根据需要读取更多。每次请求最多 20 页。
