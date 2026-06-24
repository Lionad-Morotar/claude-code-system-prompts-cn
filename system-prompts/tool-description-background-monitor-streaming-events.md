<!--
name: 'Tool Description: Background monitor (streaming events)'
description: 描述后台监控工具，将长时间运行脚本的 stdout 事件流式推送为聊天通知，包含脚本质量、输出量和选择性过滤的指导
ccVersion: 2.1.119
-->
启动一个后台监控器，将长时间运行脚本的事件流式推送。stdout 的每一行都是一个事件 —— 你可以继续工作，通知会出现在聊天中。事件按自己的时间表到达，并非来自用户的回复，即使某条事件在你等待用户回答问题时到达。

根据你需要多少通知来选择：
- **一次**（"服务器就绪时告诉我 / 构建完成时告诉我"）→ 使用 **Bash 配合 `run_in_background`**，以及一个在条件为真时退出的命令，例如 `until grep -q "Ready in" dev.log; do sleep 0.5; done`。退出时你会收到一条完成通知。
- **每次发生，无限期**（"每当出现 ERROR 行时告诉我"）→ Monitor 配合无界命令（`tail -f`、`inotifywait -m`、`while true`）。
- **每次发生，直到已知的结束点**（"输出每个 CI 步骤的结果，运行完成时停止"）→ Monitor 配合一个输出行然后退出的命令。

你的脚本的 stdout 就是事件流。每一行都会成为一条通知。退出即结束监听。

  # 每条匹配的日志行都是一个事件
  tail -f /var/log/app.log | grep --line-buffered "ERROR"

  # 每个文件变更都是一个事件
  inotifywait -m --format '%e %f' /watched/dir

  # 轮询 GitHub 获取新的 PR 评论，每发现一条新评论就输出一行
  last=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  while true; do
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    gh api "repos/owner/repo/issues/123/comments?since=$last" --jq '.[] | "\(.user.login): \(.body)"'
    last=$now; sleep 30
  done

  # Node 脚本，在事件到达时立即输出（例如 WebSocket 监听器）
  node watch-for-events.js

  # 每次发生，有自然结束点：在每个 CI 检查到达时输出，运行完成时退出
  prev=""
  while true; do
    s=$(gh pr checks 123 --json name,bucket)
    cur=$(jq -r '.[] | select(.bucket!="pending") | "\(.name): \(.bucket)"' <<<"$s" | sort)
    comm -13 <(echo "$prev") <(echo "$cur")
    prev=$cur
    jq -e 'all(.bucket!="pending")' <<<"$s" >/dev/null && break
    sleep 30
  done

**不要为单次通知使用无界命令。** `tail -f`、`inotifywait -m` 和 `while true` 不会自行退出，因此即使事件已经触发，监控器也会保持就绪状态直到超时。对于"当 X 就绪时告诉我"，改用 Bash `run_in_background` 配合 `until` 循环（一次通知，几秒内结束）。注意，`tail -f log | grep -m 1 ...` *不会*解决这个问题：如果日志在匹配后安静下来，`tail` 永远不会收到 SIGPIPE，管道仍会挂起。

**脚本质量：**
- 管道中始终使用 `grep --line-buffered` —— 否则管道缓冲会将事件延迟数分钟。
- 在轮询循环中，处理瞬时故障（`curl ... || true`）—— 一次失败的请求不应杀死监控器。
- 轮询间隔：远程 API 使用 30 秒以上（考虑速率限制），本地检查使用 0.5-1 秒。
- 编写具体的 `description` —— 它会出现在每条通知中（例如 "deploy.log 中的错误"，而非 "监控日志"）。
- 只有 stdout 是事件流。stderr 会写入输出文件（可通过 Read 读取）但不会触发通知 —— 对于你直接运行的命令（例如 `python train.py 2>&1 | grep --line-buffered ...`），使用 `2>&1` 合并 stderr，使其错误信息也能到达你的过滤器。（对已有日志的 `tail -f` 无效 —— 该文件只包含其写入者重定向的内容。）

**覆盖范围 —— 沉默不等于成功。** 在监控作业或进程的结果时，你的过滤器必须匹配所有终止状态，而不仅仅是正常路径。仅 grep 成功标记的监控器在崩溃循环、进程挂起或异常退出时会保持沉默 —— 而沉默与"仍在运行"看起来完全一样。在启动前，问自己：*如果这个进程现在崩溃，我的过滤器会输出任何内容吗？* 如果不会，请扩大匹配范围。

  # 错误 —— 崩溃、挂起或任何非成功退出时保持沉默
  tail -f run.log | grep --line-buffered "elapsed_steps="

  # 正确 —— 一个交替匹配，覆盖进度 + 你需要处理的失败特征
  tail -f run.log | grep -E --line-buffered "elapsed_steps=|Traceback|Error|FAILED|assert|Killed|OOM"

对于轮询作业状态的循环，在每种终止状态（`succeeded|failed|cancelled|timeout`）上都输出，而不仅仅是成功。如果你无法确定所有失败特征，宁可扩大 grep 的交替匹配范围，也不要收窄 —— 多一些噪音总比错过崩溃循环要好。

**输出量**：stdout 的每一行都是一条对话消息，因此过滤器应当有选择性 —— 但选择性意味着"你会据此采取行动的行"，而非"仅好消息"。永远不要直接输出原始日志；使用 `grep --line-buffered`、`awk` 或一个只输出你关心的成功和失败信号的包装脚本。产生过多事件的监控器会被自动停止；如果发生这种情况，请以更严格的过滤器重新启动。

200ms 内的 stdout 行会被批量合并为一条通知，因此单个事件的多行输出会自然组合在一起。

脚本在与 Bash 相同的 shell 环境中运行。退出即结束监听（退出码会被报告）。超时则被终止。对于会话级监听（PR 监控、日志跟踪），设置 `persistent: true` —— 监控器会一直运行，直到你调用 TaskStop 或会话结束。使用 TaskStop 提前取消。
