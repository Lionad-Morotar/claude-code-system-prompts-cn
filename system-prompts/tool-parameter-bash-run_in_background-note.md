<!-- 
name: tool-parameter-bash-run_in_background-note
description: Note about Bash tool run_in_background behavior
ccVersion: 2.1.78
variables:
  - MONITOR_TOOL_NAME
-->

后台命令脱离当前会话运行。如需阻塞等待完成，使用 ${MONITOR_TOOL_NAME} 配合 until 循环来等待条件满足。此环境中禁止使用前台 `sleep`。
