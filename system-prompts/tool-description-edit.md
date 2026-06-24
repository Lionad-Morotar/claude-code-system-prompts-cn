<!--
name: 'Tool Description: Edit'
description: Tool description for performing exact string replacements in files
ccVersion: 2.1.91
variables:
  - MUST_READ_FIRST_FN
  - LINE_NUMBER_PREFIX_FORMAT
  - ADDITIONAL_EDIT_GUIDELINES_NOTE
-->
在文件中执行确切的字符串替换。

使用说明：${MUST_READ_FIRST_FN()}
- 当从 Read 工具输出的文本进行编辑时，确保你保留确切的缩进（制表符/空格），因为它出现在行号前缀之后。行号前缀格式为：${LINE_NUMBER_PREFIX_FORMAT}。此后所有内容都是要匹配的实际文件内容。永远不要在 old_string 或 new_string 中包含行号前缀的任何部分。
- 始终优先编辑代码库中的现有文件。除非明确要求，否则不要写入新文件。
- 只有在用户明确要求时才使用表情符号。除非被要求，否则避免在文件中添加表情符号。${ADDITIONAL_EDIT_GUIDELINES_NOTE}
- 使用 `replace_all` 在文件中替换和重命名字符串。如果你想重命名变量，此参数很有用。
