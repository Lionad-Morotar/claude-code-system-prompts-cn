<!--
name: 'Tool Description: Grep compact'
description: 提供给新模型的精简 Grep 工具描述——基于 ripgrep 的内容搜索，优先于原始 grep/rg，集成权限 UI
ccVersion: 2.1.178
variables:
  - BASH_TOOL_NAME
-->
基于 ripgrep 的内容搜索。优先于通过 ${BASH_TOOL_NAME} 使用 `grep`/`rg`——结果与权限 UI 和文件链接集成。

- 完整正则语法（例如 "log.*Error"、"function\s+\w+"）。使用 ripgrep，不是 grep——转义字面量花括号（`interface\{\}`）。
- 使用 `glob`（例如 "**/*.tsx"）或 `type`（例如 "js"、"py"、"rust"）过滤。
- `output_mode`："content"（匹配行）、"files_with_matches"（仅路径，默认）或 "count"。
- 对于跨行模式使用 `multiline: true`。
