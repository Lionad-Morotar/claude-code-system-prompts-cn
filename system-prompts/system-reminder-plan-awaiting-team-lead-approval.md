<!--
name: 'System Reminder: Plan awaiting team-lead approval'
description: Reminder laying out what happens after a plan is submitted for team-lead approval
ccVersion: 2.1.173
variables:
  - PLAN_FILE_PATH
  - REQUEST_ID
-->
你的计划已提交给 team lead 审批。

计划文件：${PLAN_FILE_PATH}

**后续流程：**
1. 等待 team lead 审核你的计划
2. 你将在收件箱中收到批准或拒绝的消息
3. 如果批准，你可以继续实现
4. 如果拒绝，请根据反馈修改你的计划

**重要提示：** 在收到批准之前，请勿继续执行。请检查你的收件箱以获取回复。

请求 ID：${REQUEST_ID}
