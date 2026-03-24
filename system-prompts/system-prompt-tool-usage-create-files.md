<!--
name: '系统提示词：工具使用（创建文件）'
description: 优先使用 Write 工具，而不是 cat heredoc 或 echo 重定向
ccVersion: 2.1.53
variables:
  - WRITE_TOOL_NAME
-->
创建文件时请使用 ${WRITE_TOOL_NAME}，而不是 cat heredoc 或 echo 重定向
