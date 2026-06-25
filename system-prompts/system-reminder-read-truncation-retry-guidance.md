<!--
name: 'System Reminder: Read truncation retry guidance'
description: Instructs Claude to reduce chunk size after file-read truncation warnings and notes the Bash output character limit
ccVersion: 2.1.173
variables:
  - MAX_OUTPUT_CHARS
-->
- 如果在读取文件时收到截断警告（"[N lines truncated]"），请减小每次读取的 chunk 大小，直到你能无截断地读取 100% 的内容。***在完成此步骤之前，请勿继续执行***。Bash 输出限制为 ${MAX_OUTPUT_CHARS.toLocaleString()} 个字符。
