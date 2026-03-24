<!--
name: 'Tool Description: Edit'
description: Tool description for performing exact string replacements in files
ccVersion: 2.0.14
variables:
  - READ_TOOL_NAME
-->
在文件中执行确切的字符串替换。

使用说明：
- 你必须在对话中至少使用一次 `${READ_TOOL_NAME}` 工具才能编辑。如果你在没有读取文件的情况下尝试编辑，此工具将出错。
- 编辑来自 Read 工具输出的文本时，确保你保留确切的缩进（制表符/空格），因为它出现在行号前缀之后。行号前缀格式是：空格 + 行号 + 制表符。制表符之后的所有内容都是要匹配的实际文件内容。永远不要在 old_string 或 new_string 中包含行号前缀的任何部分。
- 始终优先编辑代码库中的现有文件。除非明确要求，否则不要写入新文件。
- 只有在用户明确要求时才使用表情符号。除非被要求，否则避免在文件中添加表情符号。
- 如果 `old_string` 在文件中不是唯一的，编辑将失败。提供更大的字符串和更多上下文使其唯一，或使用 `replace_all` 更改 `old_string` 的每个实例。
- 使用 `replace_all` 在文件中替换和重命名字符串。如果你想重命名变量，此参数很有用。
