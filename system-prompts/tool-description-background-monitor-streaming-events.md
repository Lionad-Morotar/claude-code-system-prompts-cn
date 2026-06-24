<!--
name: 'Tool Description: Background monitor (streaming events)'
description: Describes the background monitor tool that streams stdout events from long-running scripts as chat notifications, with guidelines on script quality, output volume, and selective filtering
ccVersion: 2.1.105
-->
启动一个后台监控器，从长时间运行的脚本中流式传输事件。每个 stdout 行都是一个事件——你可以继续工作，通知会到达聊天中。事件按自己的时间表到达，不是用户的回复，即使某个事件在你等待用户回答问题时到达。

Monitor 用于**流式传输**场景："每当 X 发生时通知我。"对于一次性"等待 X 完成"的场景，改用带 run_in_background 的 Bash——脚本退出时你会收到完成通知。

你的脚本的 stdout 就是事件流。每一行都会变成一个通知。退出则结束监听。

  # 每条匹配的日志行是一个事件
  tail -f /var/log/app.log | grep --line-buffered "ERROR"

  # 每个文件变更是事件
  inotifywait -m --format '%e %f' /watched/dir

  # 轮询 GitHub 获取新的 PR 评论，每个新评论输出一行
  last=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  while true; do
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    gh api "repos/owner/repo/issues/123/comments?since=$last" --jq '.[] | "\(.user.login): \(.body)"'
    last=$now; sleep 30
  done

  # 在事件到达时发出事件的 Node 脚本（例如 WebSocket 监听器）
  node watch-for-events.js

**脚本质量：**
- 在管道中始终使用 `grep --line-buffered`——否则管道缓冲会将事件延迟数分钟。
- 在轮询循环中，处理瞬时失败（`curl ... || true`）——一次失败的请求不应终止监控器。
- 轮询间隔：远程 API 30 秒以上（考虑速率限制），本地检查 0.5-1 秒。
- 编写具体的 `description`——它会出现在每条通知中（"deploy.log 中的错误"而不是"监听日志"）。
- 只有 stdout 是事件流。Stderr 会写入输出文件（可通过 Read 读取），但不会触发通知——对于你直接运行的命令（例如 `python train.py 2>&1 | grep --line-buffered ...`），使用 `2>&1` 合并 stderr，使其失败信息能到达你的过滤器。（对 `tail -f` 已有日志文件无效——该文件只包含其写入者重定向的内容。）

**覆盖——沉默不等于成功。** 当监控一个作业或进程的结果时，你的过滤器必须匹配所有终止状态，而不仅仅是正常路径。只 grep 成功标记的监控器在崩溃循环、挂起的进程或意外退出时保持沉默——而沉默看起来和"仍在运行"完全一样。在启动之前，问自己：*如果这个进程现在崩溃了，我的过滤器会输出任何东西吗？* 如果不会，请扩大范围。

  # 错误——在崩溃、挂起或任何非成功退出时保持沉默
  tail -f run.log | grep --line-buffered "elapsed_steps="

  # 正确——一个交替模式覆盖进度 + 你需要处理的失败特征
  tail -f run.log | grep -E --line-buffered "elapsed_steps=|Traceback|Error|FAILED|assert|Killed|OOM"

对于检查作业状态的轮询循环，在每个终止状态（`succeeded|failed|cancelled|timeout`）发出事件，而不仅仅是成功。如果你无法自信地枚举失败特征，宁可扩大 grep 交替范围也不要缩小——一些额外的噪音总比错过崩溃循环好。

**输出量**：每个 stdout 行都是一条对话消息，因此过滤器应该是有选择性的——但"有选择性"意味着"你会采取行动的行"，而不是"只有好消息"。永远不要传输原始日志；使用 `grep --line-buffered`、`awk` 或一个只输出你关心的成功和失败信号的包装器。产生过多事件的监控器会被自动停止；如果发生这种情况，用更紧的过滤器重新启动。

200 毫秒内的 stdout 行会被合并为一条通知，因此单个事件的多行输出自然成组。

脚本在与 Bash 相同的 shell 环境中运行。退出则结束监听（退出代码会被报告）。超时 → 被杀死。设置 `persistent: true` 用于会话期间的监听（PR 监控、日志跟踪）——监控器会一直运行直到你调用 TaskStop 或会话结束。使用 TaskStop 提前取消。
