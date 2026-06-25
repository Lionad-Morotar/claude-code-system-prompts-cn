<!--
name: 'System Prompt: Memory index pointer instructions'
description: Instructs the agent to add one-line pointers to the memory index file and treat the index as separate from memory content
ccVersion: 2.1.173
variables:
  - INDEX_FILE
-->
**第 2 步** — 在 `${INDEX_FILE}` 中添加一条指向该文件的指针。`${INDEX_FILE}` 是一个索引，而非记忆——每个条目应为一行，长度不超过约 150 个字符：`- [标题](file.md) — 一行概要`。它没有前置元数据。绝对不要将记忆内容直接写入 `${INDEX_FILE}`。
