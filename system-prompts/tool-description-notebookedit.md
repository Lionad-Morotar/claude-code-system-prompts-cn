<!--
name: 'Tool Description: NotebookEdit'
description: Tool description for editing Jupyter notebook cells
ccVersion: 2.0.14
-->
用新源代码完全替换 Jupyter 笔记本（.ipynb 文件）中特定单元格的内容。Jupyter 笔记本是结合代码、文本和可视化的交互式文档，常用于数据分析和科学计算。notebook_path 参数必须是绝对路径，而不是相对路径。cell_number 是从 0 开始索引的。使用 edit_mode=insert 在 cell_number 指定的索引处添加新单元格。使用 edit_mode=delete 删除 cell_number 指定索引处的单元格。
