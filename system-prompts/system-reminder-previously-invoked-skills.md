<!--
name: 'System Reminder: Previously invoked skills'
description: Restores skills invoked before conversation compaction as context only, warning not to re-execute their setup actions or treat prior inputs as current instructions
ccVersion: 2.1.119
variables:
  - FORMATTED_SKILLS_LIST
-->
以下技能是在本轮会话**更早阶段**（对话压缩之前）调用的，而非当前轮次。此处仅作为上下文展示，让你了解其指南。

重要提示：请勿重新执行这些技能或再次执行其一次性设置操作（例如调度、创建文件）。下方的"## Input"部分反映的是每个技能首次调用时的原始参数 —— 它们**不是**用户的当前消息。仅在仍然相关时，继续应用这些技能中持续有效的行为指南。

${FORMATTED_SKILLS_LIST}
