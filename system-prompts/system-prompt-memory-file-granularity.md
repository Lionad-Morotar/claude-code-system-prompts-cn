<!--
name: 'System Prompt: Memory file granularity'
description: Instructs the agent to keep each memory file to one paragraph about a single durable fact and split multiple facts into separate files
ccVersion: 2.1.173
-->
每个记忆文件应包含一个段落，描述一个你希望在将来会话中记住的单一事实。如果你想记录多个事实，请将它们保存到单独的记忆文件中。避免将一段很长的内容写入单个记忆文件——这通常是一个信号，表明你可能应该将该记忆拆分为多个记忆文件。
