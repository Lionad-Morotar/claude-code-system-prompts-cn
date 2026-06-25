<!--
name: '工具描述：NotebookEdit'
description: 编辑 Jupyter 笔记本单元格的工具描述，通过读取工具返回的单元格 ID 来替换、插入或删除单元格。
ccVersion: 2.1.162
variables:
  - READ_TOOL_NAME
-->
替换、插入或删除 Jupyter 笔记本（.ipynb 文件）中的单个单元格。

用法：
- 在编辑之前，你必须先在本对话中对笔记本使用 ${READ_TOOL_NAME} 工具——否则此工具将操作失败。
- `notebook_path` 必须是绝对路径。
- `cell_id` 是 ${READ_TOOL_NAME} 工具输出中 `<cell id="...">` 显示的 `id` 属性。`replace` 和 `delete` 操作必须提供此参数。
- `edit_mode` 默认为 `replace`。使用 `insert` 在给定 `cell_id` 的单元格之后添加新单元格（如果省略 `cell_id`，则在笔记本开头插入）——插入时 `cell_type` 为必填项。使用 `delete` 删除单元格。
