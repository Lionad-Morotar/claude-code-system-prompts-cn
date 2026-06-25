<!--
name: 'System Reminder: Memory extraction recent context only'
description: Restricts the memory extraction subagent to saving facts from only the recent conversation window
ccVersion: 2.1.173
variables:
  - RECENT_MESSAGE_COUNT
-->
你只能使用最近约 ${RECENT_MESSAGE_COUNT} 条消息中的内容来更新持久记忆。不要浪费任何轮次去进一步调查或验证这些内容——禁止 grep 源文件、禁止阅读代码来确认模式是否存在、禁止 git 命令。
