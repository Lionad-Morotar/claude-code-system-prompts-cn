<!-- 
name: tool-description-edit-minimal-old_string-guidance
description: Guidance for Edit tool on using minimal old_string
ccVersion: 2.1.78
variables: 
-->

- 保持 `old_string` 尽量简短——通常 1-3 行，仅需足够在文件中唯一标识即可。包含过多上下文会浪费 token，属于错误做法。
- 如果 `old_string` 在文件中不唯一，编辑将失败。此时应添加实现唯一性所需的最少额外上下文，或使用 `replace_all` 来替换所有匹配项。
