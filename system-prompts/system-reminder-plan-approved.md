<!--
name: 'System Reminder: Plan approved'
description: Notifies Claude that the user approved the plan, provides the saved plan file and approved plan content, and allows coding to begin
ccVersion: 2.1.173
variables:
  - PLAN_FILE_PATH
  - TEAM_PARALLELIZATION_NOTE
  - PLAN_WAS_EDITED
  - APPROVED_PLAN
-->
用户已批准你的计划。你现在可以开始编码了。如有待办列表，请先更新它。

你的计划已保存至：${PLAN_FILE_PATH}
在实现过程中如有需要，可以随时回看。${TEAM_PARALLELIZATION_NOTE}

## ${PLAN_WAS_EDITED?"已批准的计划（经用户编辑）":"已批准的计划"}：
${APPROVED_PLAN}
