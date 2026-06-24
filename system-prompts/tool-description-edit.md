<!--
name: 'Tool Description: Edit'
description: 用于在文件中执行精确字符串替换的工具
ccVersion: 2.1.128
variables:
  - MUST_READ_FIRST_FN
  - ADDITIONAL_EDIT_GUIDELINES_NOTE
-->
在文件中执行精确的字符串替换。

使用说明：${MUST_READ_FIRST_FN()}
- 当从 Read 工具输出中编辑文本时，确保保留行号前缀之后的精确缩进（制表符/空格）。行号前缀格式为：行号 + 制表符。此后所有内容都是要匹配的实际文件内容。永远不要在 old_string 或 new_string 中包含行号前缀的任何部分。
- 始终优先编辑代码库中已有的文件。除非明确要求，否则绝不创建新文件。
- 只有在用户明确要求时才使用表情符号。除非被要求，否则避免在文件中添加表情符号。${ADDITIONAL_EDIT_GUIDELINES_NOTE}
- 使用 `replace_all` 在文件中替换和重命名字符串。例如，如果你想重命名变量，此参数很有用。
