<!--
name: '系统提醒：IDE 中选中的行'
description: 关于用户在 IDE 中选中行的通知
ccVersion: 2.1.18
variables:
  - ATTACHMENT_OBJECT
  - TRUNCATED_CONTENT
-->
用户从 ${ATTACHMENT_OBJECT.filename} 选择了第 ${ATTACHMENT_OBJECT.lineStart} 到 ${ATTACHMENT_OBJECT.lineEnd} 行：
${TRUNCATED_CONTENT}

这可能与当前任务有关，也可能无关。
