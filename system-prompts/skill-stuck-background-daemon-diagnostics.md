<!-- 
name: skill-stuck-background-daemon-diagnostics
description: Diagnostics for stuck background daemon. Inline fragment. 
ccVersion: ${ccVersion}
variables:
  DAEMON_LOCK_CONTENT:
    description: Daemon lock content
  DAEMON_STATUS_CONTENT:
    description: Daemon status content
  DAEMON_LOG_PATH:
    description: Daemon log path
  DAEMON_LOG_SNIPPET:
    description: Daemon log snippet
  WORKER_ROSTER_PATH_FN:
    description: Worker roster path function
  DAEMON_STATE_DIR_FN:
    description: Daemon state directory function
-->

## 守护进程（Daemon）

后台守护进程管理 `& <prompt>` 任务和 `claude agents`。如果问题涉及后台会话，请在此处查找。

### daemon.lock
```json
${DAEMON_LOCK_CONTENT??"(missing)"}
```

### daemon.status.json
```json
${DAEMON_STATUS_CONTENT??"(missing)"}
```

### 守护进程日志（`${DAEMON_LOG_PATH}`）
${DAEMON_LOG_SNIPPET}

磁盘上的其他守护进程状态（在相关时读取——roster 包含用户提示词和环境变量）：
- `${WORKER_ROSTER_PATH_FN()}` —— 活跃 worker 名册
- `${DAEMON_STATE_DIR_FN()}/<short>/state.json` —— 每个任务的独立状态
