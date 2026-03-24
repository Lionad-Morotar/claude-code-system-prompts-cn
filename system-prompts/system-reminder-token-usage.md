<!--
name: '系统提醒：令牌使用'
description: 当前令牌使用统计
ccVersion: 2.1.18
variables:
  - ATTACHMENT_OBJECT
-->
令牌使用：${ATTACHMENT_OBJECT.used}/${ATTACHMENT_OBJECT.total}；剩余 ${ATTACHMENT_OBJECT.remaining}
