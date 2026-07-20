<!--
name: 'Tool Description: Background monitor (streaming events)'
description: Describes the background monitor tool that streams stdout events from long-running scripts as chat notifications, with guidelines on script quality, output volume, and selective filtering
ccVersion: 2.1.208
variables:
  - BACKGROUND_TASKS_DISABLED
-->
启动一个后台监控，从长时间运行的脚本中流式传输事件。每行 stdout 是一个事件 — 你继续工作，通知到达聊天中。事件按自己的时间表到达，不是来自用户的回复，即使在你等待用户回答问题时到达也是如此。

按你需要的通知数量选择：
${'- **一次**（"告诉我服务器何时就绪 / 构建何时完成"）→ '+(BACKGROUND_TASKS_DISABLED?'**在前台使用 Bash 运行命令**，条件为真时退出，例如 `until grep -q "Ready in" dev.log; do sleep 0.5; done`。':'**使用 Bash 的 `run_in_background`** 和一个条件为真时退出的命令，例如 `until grep -q "Ready in" dev.log; do sleep 0.5; done`。退出时你会收到一条完成通知。')}
- **每次出现，无限次**（"每次出现 ERROR 行时告诉我"）→ 使用无界命令监控（`tail -f`、`inotifywait -m`、`while true`）。
- **每次出现，直到已知结束**（"输出每个 CI 步骤结果，运行完成时停止"）→ 使用发出行然后退出的命令监控。

你的脚本的 stdout 是事件流。每行成为一条通知。退出结束监控。

  # 每个匹配的日志行是一个事件
  tail -f /var/log/app.log | grep --line-buffered "ERROR"

  # 每个文件变更是一个事件
  inotifywait -m --format '%e %f' /watched/dir

  # 轮询 GitHub 获取新 PR 评论，每个新评论输出一行
  last=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  while true; do
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    gh api "repos/owner/repo/issues/123/comments?since=$last" --jq '.[] | "\(.user.login): \(.body)"'
    last=$now; sleep 30
  done

  # 在事件到达时发出的 Node 脚本（例如 WebSocket 监听器）
  node watch-for-events.js

  # 有自然结束的每次出现：每个 CI 检查到达时发出，运行完成时退出
  prev=""
  while true; do
    s=$(gh pr checks 123 --json name,bucket)
    cur=$(jq -r '.[] | select(.bucket!="pending") | "\(.name): \(.bucket)"' <<<"$s" | sort)
    comm -13 <(echo "$prev") <(echo "$cur")
    prev=$cur
    jq -e 'all(.bucket!="pending")' <<<"$s" >/dev/null && break
    sleep 30
  done

**不要为单次通知使用无界命令。** `tail -f`、`inotifywait -m` 和 `while true` 不会自行退出，因此监控会保持激活直到超时，即使事件已触发。对于"告诉我 X 何时就绪"，${BACKGROUND_TASKS_DISABLED?"改用前台 Bash `until` 循环":"改用 Bash `run_in_background` 加 `until` 循环（一条通知，几秒内结束）"}。注意 `tail -f log | grep -m 1 ...` 并*不能*修复此问题：如果匹配后日志变静默，`tail` 不会收到 SIGPIPE，管道无论如何都会挂起。

**脚本质量：**
- 每个管道阶段必须逐行刷新，否则匹配会留在缓冲区中不可见：`grep` 需要 `--line-buffered`，`awk` 需要 `fflush()`。`head` 根本无法刷新 — `| head -N` 在 N 个匹配累积前不会输出任何内容，然后结束流。
- 在轮询循环中，处理瞬态失败（`curl ... || true`）— 一次失败请求不应终止监控。
- 轮询间隔：远程 API 30 秒+（速率限制），本地检查 0.5-1 秒。
- 编写具体的 `description` — 它出现在每条通知中（"deploy.log 中的错误"而非"监视日志"）。
- 仅 stdout 是事件流。Stderr 进入输出文件（可通过 Read 读取）但不触发通知 — 对于你直接运行的命令（例如 `python train.py 2>&1 | grep --line-buffered ...`），使用 `2>&1` 合并 stderr 使其失败到达你的过滤器。（对现有日志的 `tail -f` 无效 — 该文件仅包含其写入者重定向的内容。）

**覆盖 — 沉默不是成功。** 监视作业或进程的结果时，你的过滤器必须匹配每个终止状态，而不仅是成功路径。仅 grep 成功标记的监控在崩溃循环、挂起进程或意外退出时保持沉默 — 而沉默看起来与"仍在运行"完全相同。激活前问自己：*如果这个进程现在崩溃了，我的过滤器会发出任何东西吗？* 如果不会，扩大它。

  # 错误 — 崩溃、挂起或任何非成功退出时沉默
  tail -f run.log | grep --line-buffered "elapsed_steps="

  # 正确 — 一个交替覆盖进度 + 你会采取行动的失败特征
  tail -f run.log | grep -E --line-buffered "elapsed_steps=|Traceback|Error|FAILED|assert|Killed|OOM"

对于检查作业状态的轮询循环，在每个终止状态（`succeeded|failed|cancelled|timeout`）时发出，而不仅是成功。如果你无法自信地枚举失败特征， broaden grep 交替而非缩小 — 一些额外噪音好过错过崩溃循环。

**输出量**：每行 stdout 是一条对话消息，因此过滤器应有选择性 — 但选择性意味着"你会采取行动的行"，而非"仅好消息"。绝不管道传输原始日志；过滤到你关心的成功和失败信号。产生过多事件的监控会自动停止；如果发生这种情况，使用更严格的过滤器重启。

200ms 内的 stdout 行会批量为一条通知，因此来自单个事件的多行输出自然分组。

脚本在与 Bash 相同的 shell 环境中运行。退出结束监控（报告退出码）。超时 → 终止。设置 `persistent: true` 用于会话长度的监视（PR 监控、日志尾部）— 监控运行直到你调用 TaskStop 或会话结束。使用 TaskStop 提前取消。
<!--
name: 'Tool Description: Background monitor (streaming events)'
description: Describes the background monitor tool that streams stdout events from long-running scripts as chat notifications, with guidelines on script quality, output volume, and selective filtering
ccVersion: 2.1.208
variables:
  - BACKGROUND_TASKS_DISABLED
-->
Start a background monitor that streams events from a long-running script. Each stdout line is an event — you keep working and notifications arrive in the chat. Events arrive on their own schedule and are not replies from the user, even if one lands while you're waiting for the user to answer a question.

Pick by how many notifications you need:
${'- **One** ("tell me when the server is ready / the build finishes") → '+(BACKGROUND_TASKS_DISABLED?'run the command in the **foreground with Bash**, exiting when the condition is true, e.g. `until grep -q "Ready in" dev.log; do sleep 0.5; done`.':'use **Bash with `run_in_background`** and a command that exits when the condition is true, e.g. `until grep -q "Ready in" dev.log; do sleep 0.5; done`. You get a single completion notification when it exits.')}
- **One per occurrence, indefinitely** ("tell me every time an ERROR line appears") → Monitor with an unbounded command (`tail -f`, `inotifywait -m`, `while true`).
- **One per occurrence, until a known end** ("emit each CI step result, stop when the run completes") → Monitor with a command that emits lines and then exits.

Your script's stdout is the event stream. Each line becomes a notification. Exit ends the watch.

  # Each matching log line is an event
  tail -f /var/log/app.log | grep --line-buffered "ERROR"

  # Each file change is an event
  inotifywait -m --format '%e %f' /watched/dir

  # Poll GitHub for new PR comments and emit one line per new comment
  last=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  while true; do
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    gh api "repos/owner/repo/issues/123/comments?since=$last" --jq '.[] | "\(.user.login): \(.body)"'
    last=$now; sleep 30
  done

  # Node script that emits events as they arrive (e.g. WebSocket listener)
  node watch-for-events.js

  # Per-occurrence with a natural end: emit each CI check as it lands, exit when the run completes
  prev=""
  while true; do
    s=$(gh pr checks 123 --json name,bucket)
    cur=$(jq -r '.[] | select(.bucket!="pending") | "\(.name): \(.bucket)"' <<<"$s" | sort)
    comm -13 <(echo "$prev") <(echo "$cur")
    prev=$cur
    jq -e 'all(.bucket!="pending")' <<<"$s" >/dev/null && break
    sleep 30
  done

**Don't use an unbounded command for a single notification.** `tail -f`, `inotifywait -m`, and `while true` never exit on their own, so the monitor stays armed until timeout even after the event has fired. For "tell me when X is ready," ${BACKGROUND_TASKS_DISABLED?"use a foreground Bash `until` loop instead":"use Bash `run_in_background` with an `until` loop instead (one notification, ends in seconds)"}. Note that `tail -f log | grep -m 1 ...` does *not* fix this: if the log goes quiet after the match, `tail` never receives SIGPIPE and the pipeline hangs anyway.

**Script quality:**
- Every pipe stage must flush per line or matches sit in its buffer unseen: `grep` needs `--line-buffered`, `awk` needs `fflush()`. `head` cannot flush at all — `| head -N` delivers nothing until N matches accumulate, then ends the stream.
- In poll loops, handle transient failures (`curl ... || true`) — one failed request shouldn't kill the monitor.
- Poll intervals: 30s+ for remote APIs (rate limits), 0.5-1s for local checks.
- Write a specific `description` — it appears in every notification ("errors in deploy.log" not "watching logs").
- Only stdout is the event stream. Stderr goes to the output file (readable via Read) but does not trigger notifications — for a command you run directly (e.g. `python train.py 2>&1 | grep --line-buffered ...`), merge stderr with `2>&1` so its failures reach your filter. (No effect on `tail -f` of an existing log — that file only contains what its writer redirected.)

**Coverage — silence is not success.** When watching a job or process for an outcome, your filter must match every terminal state, not just the happy path. A monitor that greps only for the success marker stays silent through a crashloop, a hung process, or an unexpected exit — and silence looks identical to "still running." Before arming, ask: *if this process crashed right now, would my filter emit anything?* If not, widen it.

  # Wrong — silent on crash, hang, or any non-success exit
  tail -f run.log | grep --line-buffered "elapsed_steps="

  # Right — one alternation covering progress + the failure signatures you'd act on
  tail -f run.log | grep -E --line-buffered "elapsed_steps=|Traceback|Error|FAILED|assert|Killed|OOM"

For poll loops checking job state, emit on every terminal status (`succeeded|failed|cancelled|timeout`), not just success. If you cannot confidently enumerate the failure signatures, broaden the grep alternation rather than narrow it — some extra noise is better than missing a crashloop.

**Output volume**: Every stdout line is a conversation message, so the filter should be selective — but selective means "the lines you'd act on," not "only good news." Never pipe raw logs; filter to exactly the success and failure signals you care about. Monitors that produce too many events are automatically stopped; restart with a tighter filter if this happens.

Stdout lines within 200ms are batched into a single notification, so multiline output from a single event groups naturally.

The script runs in the same shell environment as Bash. Exit ends the watch (exit code is reported). Timeout → killed. Set `persistent: true` for session-length watches (PR monitoring, log tails) — the monitor runs until you call TaskStop or the session ends. Use TaskStop to cancel early.
