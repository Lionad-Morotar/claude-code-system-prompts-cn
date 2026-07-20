<!--
name: 'Tool Description: SendFile'
description: Describes sending local files to peer, Remote Control, or cloud Claude Code sessions, including addressing, limits, integrity verification, and when to use shared-text messaging instead
ccVersion: 2.1.210
variables:
  - SEND_MESSAGE_TOOL_NAME
  - LIST_AGENTS_TOOL_NAME
  - MAX_FILE_SIZE_MIB
  - MAX_FILES_PER_SEND
  - SEND_FILE_TOOL_NAME
-->
将文件发送到另一个 Claude Code 会话——本机上的对等会话，或另一台机器上的 Remote Control / 云会话。接收方的 Claude 在其自己的文件系统上获得带有 @path 引用的文件，以及你的消息。

当文件本身就是需要交付的东西时使用此功能——带图表的文档、截图、报告、构建产物。对于纯文本，改用 ${SEND_MESSAGE_TOOL_NAME}。对于此会话内的代理（子代理、队友），也使用 ${SEND_MESSAGE_TOOL_NAME}——它们共享你的文件系统，可以直接在其路径读取文件。

`to` 接受来自 ${LIST_AGENTS_TOOL_NAME} 的对等会话名称，或显式的 `uds:<socket>` / `bridge:<session id>` 地址。

每个文件上限为 ${MAX_FILE_SIZE_MIB} MiB，每次发送最多 ${MAX_FILES_PER_SEND} 个文件。文件必须存在于本地文件系统——如需要请先将内容写入文件。接收方会根据发送内容的 sha256 摘要验证每个文件（在传输携带摘要的情况下），并在不匹配时拒绝并显示可见提示。

示例：${SEND_FILE_TOOL_NAME}({ to: "devbox", files: ["report.pdf", "figures/plot.png"], message: "Here's the doc with figures." })
