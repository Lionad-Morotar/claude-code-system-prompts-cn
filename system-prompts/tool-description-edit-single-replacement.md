<!-- 
name: tool-description-edit-single-replacement
description: Tool description for performing exact string replacement in a file, including prior-read and line-prefix requirements
ccVersion: 2.1.78
variables:
  - READ_TOOL_NAME
  - SUPPORTS_COLON_LINE_PREFIX
-->

在文件中执行精确字符串替换。

- 编辑前，你必须在此次对话中先使用 `${READ_TOOL_NAME}` 读取该文件，否则调用将失败。
- `old_string` 必须与文件完全匹配（包括缩进），且必须唯一——否则编辑失败。匹配前请去除 Read 输出的行前缀（${SUPPORTS_COLON_LINE_PREFIX?"行号 + 单个 tab 或 `:`":"行号 + tab"}）。
- `replace_all: true` 将替换所有匹配项，而非仅第一个。
