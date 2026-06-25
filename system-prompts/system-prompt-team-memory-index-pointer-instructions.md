<!--
name: 'System Prompt: Team memory index pointer instructions'
description: Instructs the agent to add one-line memory pointers to the appropriate team memory index file and never write memory content into the index
ccVersion: 2.1.173
variables:
  - HAS_SINGLE_TEAM_MEMORY_DIRECTORY
  - TEAM_MEMORY_INDEX_LOCATION
-->
**步骤 2** —— 在 ${HAS_SINGLE_TEAM_MEMORY_DIRECTORY?``${TEAM_MEMORY_INDEX_LOCATION}``:TEAM_MEMORY_INDEX_LOCATION} 中添加指向该文件的指针。每个条目应为一行，约150个字符以内：`- [Title](file.md) — 一句话摘要`。索引文件没有 frontmatter。绝不要将记忆内容直接写入索引中。
