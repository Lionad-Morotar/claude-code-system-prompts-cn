<!--
name: 'System Reminder: Session memory'
description: Past session summaries that may be relevant
ccVersion: 2.1.18
variables:
  - FORMATTED_MEMORIES
-->
<session-memory>
这些会话摘要来自过去的会话，可能与当前任务无关，并且可能具有过时的信息。不要假设当前任务与这些摘要相关，直到用户的消息表明如此或引用类似任务。仅显示每个记忆的预览 - 当会话相关时，使用带有提供路径的 Read 工具访问完整的会话记忆。

${FORMATTED_MEMORIES}
</session-memory>
