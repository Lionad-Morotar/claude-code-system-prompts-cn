<!--
name: 'Tool Description: Bash (timeout)'
description: Bash tool instruction: optional timeout configuration
ccVersion: 2.1.53
variables:
  - GET_MAX_TIMEOUT_MS
  - GET_DEFAULT_TIMEOUT_MS
-->
你可以指定一个可选的超时时间，单位为毫秒（最长可达 ${GET_MAX_TIMEOUT_MS()}ms / ${GET_MAX_TIMEOUT_MS()/60000} 分钟）。默认情况下，你的命令将在 ${GET_DEFAULT_TIMEOUT_MS()}ms（${GET_DEFAULT_TIMEOUT_MS()/60000} 分钟）后超时。
