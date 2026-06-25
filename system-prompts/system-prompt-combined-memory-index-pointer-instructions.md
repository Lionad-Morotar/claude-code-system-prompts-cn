<!-- 
name: system-prompt-combined-memory-index-pointer-instructions
description: Combined memory index pointer instructions. Inline fragment. 
ccVersion: ${ccVersion}
variables:
  INDEX_FILE:
    description: Index file path
-->

**第 2 步** —— 在私有目录的 `${INDEX_FILE}` 中为该文件添加一条指针。单个 `${INDEX_FILE}` 同时索引私有记忆和团队记忆——私有记忆使用 `file.md` 这样的路径，团队记忆使用 `team/file.md` 这样的路径。每个条目应为一行，约 150 个字符以内：`- [标题](file.md) —— 一行摘要`。该文件没有 frontmatter。永远不要将记忆内容直接写入 `${INDEX_FILE}`。
