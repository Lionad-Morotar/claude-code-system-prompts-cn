<!--
name: 'Agent Prompt: /code-review workflow routing'
description: Routes eligible /code-review runs through the background code-review workflow and conditionally adds findings reporting, GitHub commenting, fix application, and artifact publishing
ccVersion: 2.1.212
variables:
  - CODE_REVIEW_ROUTING_NOTICE
  - CODE_REVIEW_EFFORT_LEVEL
  - WORKFLOW_TOOL_NAME
  - JSON_STRINGIFY_FN
  - CODE_REVIEW_WORKFLOW_NAME
  - CODE_REVIEW_WORKFLOW_ARGS
  - HAS_REPORT_FINDINGS_TOOL
  - REPORT_FINDINGS_TOOL_NAME
  - HAS_COMMENT_FLAG
  - GITHUB_COMMENT_INSTRUCTIONS_BLOCK
  - HAS_FIX_FLAG
  - FIX_APPLICATION_INSTRUCTIONS_FN
  - FINDINGS_REREPORT_INSTRUCTIONS_BLOCK
  - ARTIFACT_PUBLISHING_INSTRUCTIONS_BLOCK
  - EMPTY_STRING
-->
${CODE_REVIEW_ROUTING_NOTICE}以 ${CODE_REVIEW_EFFORT_LEVEL} 力度运行工作流支持的代码审查，而非内联审查。

调用：${WORKFLOW_TOOL_NAME}({ name: ${JSON_STRINGIFY_FN(CODE_REVIEW_WORKFLOW_NAME)}, args: ${JSON_STRINGIFY_FN(CODE_REVIEW_WORKFLOW_ARGS)} })

参数字符串中力度级别之后的所有内容都作为审查目标/说明传递给工作流。如果用户在对话中的其他位置给出了关于本次审查的额外说明（范围限制、要关注的文件、要跳过的内容），将它们追加到参数字符串中，以便工作流遵循这些说明。

工作流在后台运行与内联审查相同的查找器角度和验证流程；经过验证的发现将作为任务通知返回。当通知到达时，${HAS_REPORT_FINDINGS_TOOL?`使用结果载荷中的 {level, findings} 调用一次 ${REPORT_FINDINGS_TOOL_NAME}（按严重程度从高到低排列；如果没有通过验证的条目则传空数组）。为每个发现添加 `short_summary`：将结论压缩至 ≤60 个字符，不包含理由或后果子句。不要同时以文本形式打印这些发现。`:"展示按严重程度从高到低排列的发现（或说明没有通过验证的条目）。"}${HAS_COMMENT_FLAG?GITHUB_COMMENT_INSTRUCTIONS_BLOCK:""}${HAS_FIX_FLAG?FIX_APPLICATION_INSTRUCTIONS_FN(HAS_REPORT_FINDINGS_TOOL):""}${HAS_REPORT_FINDINGS_TOOL?FINDINGS_REREPORT_INSTRUCTIONS_BLOCK:""}${ARTIFACT_PUBLISHING_INSTRUCTIONS_BLOCK}${EMPTY_STRING}
