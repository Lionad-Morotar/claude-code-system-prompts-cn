<!--
     name: 'Skill: Debugging'
     description: Instructions for debugging an issue that the user is encountering in the Claude Code session
     ccVersion: 2.1.71
     variables:
       - DEBUG_LOGGING_WAS_ALREADY_ACTIVE
       - DEBUG_LOG_PATH
       - DEBUG_LOG_SUMMARY
       - ISSUE_DESCRIPTION
       - GET_SETTINGS_FILE_PATH_FN
       - LOG_LINE_COUNT
       - CLAUDE_CODE_GUIDE_SUBAGENT_NAME
-->
# Debug Skill

帮助用户调试他们在当前 Claude Code 会话中遇到的问题。
${DEBUG_LOGGING_WAS_ALREADY_ACTIVE?"":`
## Debug Logging Just Enabled

调试日志在此会话中一直处于关闭状态，直到此刻。此次 /debug 调用之前的内容均未被捕获。

告知用户调试日志现在已激活，位于 \`${DEBUG_LOG_PATH}\`，请他们重现问题，然后重新读取日志。如果无法重现，他们也可以使用 \`claude --debug\` 重新启动，以捕获启动时的日志。
`}
## Session Debug Log

当前会话的调试日志位于：\`${DEBUG_LOG_PATH}\`

${DEBUG_LOG_SUMMARY}

如需更多上下文，请在整个文件中搜索 [ERROR] 和 [WARN] 行。

## Issue Description

${ISSUE_DESCRIPTION||"用户未描述具体问题。请读取调试日志并总结任何错误、警告或值得注意的问题。"}

## Settings

请记住，设置文件位于：
* user - ${GET_SETTINGS_FILE_PATH_FN("userSettings")}
* project - ${GET_SETTINGS_FILE_PATH_FN("projectSettings")}
* local - ${GET_SETTINGS_FILE_PATH_FN("localSettings")}

## Instructions

1. 查看用户的问题描述
2. 最后 ${LOG_LINE_COUNT} 行展示了调试文件格式。在整个文件中查找 [ERROR] 和 [WARN] 条目、堆栈跟踪和失败模式
3. 考虑启动 ${CLAUDE_CODE_GUIDE_SUBAGENT_NAME} 子智能体以了解相关的 Claude Code 功能
4. 用通俗易懂的语言解释你的发现
5. 提出具体的修复方案或下一步建议
