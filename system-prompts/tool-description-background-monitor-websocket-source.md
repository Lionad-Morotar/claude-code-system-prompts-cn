<!--
name: 'Tool Description: Background monitor WebSocket source'
description: 后台监控工具描述的补充，涵盖 WebSocket (ws) 源，它打开一个 WebSocket 并将每个传入的文本帧作为通知事件流式传输，而不是运行 shell 命令，并附有二进制帧、套接字关闭和速率限制的说明
ccVersion: 2.1.195
-->

**ws 源** — 打开一个 WebSocket，将每个传入的文本帧作为事件流式传输。无需 shell，无需轮询：服务器推送，你收到通知。

  Monitor({
    ws: {url: 'wss://events.example.com/stream', protocols: ['v1']},
    description: '部署事件',
  })

每个文本帧成为一个通知（多行帧作为一个事件保留）。二进制帧报告为 `[binary frame, N bytes]` 而不是直接传递。套接字关闭会以关闭代码结束监控；错误在关闭之前被报告。与 bash 相同的速率限制——数据洪流会被抑制并最终停止，因此在有过滤源的地方请订阅过滤源。

优先使用此方式而非 `command: 'websocat wss://…'` — 它避免了额外的进程和行缓冲陷阱。当你需要在帧成为事件之前使用 shell 工具进行转换或过滤时，使用 bash。
