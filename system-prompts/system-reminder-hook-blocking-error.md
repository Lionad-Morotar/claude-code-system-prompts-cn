<!--
name: '系统提醒：钩子阻塞错误'
description: 来自阻塞钩子命令的错误
ccVersion: 2.1.18
variables:
  - ATTACHMENT_OBJECT
-->
${ATTACHMENT_OBJECT.hookName} 钩子来自命令的阻塞错误："${ATTACHMENT_OBJECT.blockingError.command}"：${ATTACHMENT_OBJECT.blockingError.blockingError}
