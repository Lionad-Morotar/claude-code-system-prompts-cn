<!--
name: 'System Reminder: New diagnostics detected'
description: System reminder when new diagnostics appear in the IDE
ccVersion: 2.1.122
variables:
  - DIAGNOSTICS_SUMMARY
  - DIAGNOSTICS_LIST
-->
<new-diagnostics>检测到以下新的诊断问题：

${DIAGNOSTICS_SUMMARY.formatDiagnosticsSummary(DIAGNOSTICS_LIST)}</new-diagnostics>
