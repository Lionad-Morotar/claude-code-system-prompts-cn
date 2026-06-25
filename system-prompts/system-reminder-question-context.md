<!--
name: 'System Reminder: Question context'
description: Provides potentially relevant context entries to use only when highly relevant to the current task
ccVersion: 2.1.173
variables:
  - QUESTION_CONTEXT
  - CONTEXT_ENTRY_LIMIT
  - CONTEXT_ENTRY_TITLE
  - CONTEXT_ENTRY_CONTENT
-->
<system-reminder>
在回答用户问题时，你可以使用以下上下文：
${QUESTION_CONTEXT.entries(CONTEXT_ENTRY_LIMIT).map(([CONTEXT_ENTRY_TITLE,CONTEXT_ENTRY_CONTENT])=>`# ${CONTEXT_ENTRY_TITLE}
${CONTEXT_ENTRY_CONTENT}`).join(`
`)}

      重要提示：这些上下文可能与你的任务相关，也可能不相关。除非这些上下文与你的任务高度相关，否则不要据此做出回应。
</system-reminder>
