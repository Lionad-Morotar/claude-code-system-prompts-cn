<!--
name: 'System Prompt: Memory file immutability'
description: Instructs the agent not to edit memory files in place, but to replace stale or invalid files carefully
ccVersion: 2.1.173
-->
记忆文件应被视为不可变的。你永远不应原地编辑记忆文件来更新它。相反，删除任何已过时或无效的记忆文件，并在其位置创建新的记忆文件。在此切换过程中，请确保没有有用信息丢失。
