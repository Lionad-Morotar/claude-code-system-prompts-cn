<!--
name: 'Data: Managed Agents scheduled deployments'
description: 托管智能体定时部署的参考文档，包括 cron 调度创建、部署运行、生命周期操作、失败行为和手动运行
ccVersion: 2.1.172
-->
# 托管智能体 — 定时部署

**定时部署**按重复的 cron 调度运行一个智能体——每次触发自动创建一个会话。用于可预测节奏的工作：夜间分类、每周合规扫描、每小时监控。

需要 `managed-agents-2026-04-01` beta 标头（SDK 会自动为 `client.beta.deployments.*` / `client.beta.deployment_runs.*` 调用设置它）。

## 创建部署

部署捆绑了会话所需的一切（智能体、环境、可选的文件/GitHub/记忆存储/保险库）以及 `schedule` 和启动每次运行的 `initial_events`：

- `agent` 和 `environment_id` 是必需的——与 `sessions.create` 的形状相同（参见 `shared/managed-agents-core.md`）。
- `initial_events` 必须包含起始的 `user.message`。
- `schedule` 接受 cron `expression` 和 IANA `timezone`。最大粒度为分钟级别。

```bash
curl -X POST https://api.anthropic.com/v1/organizations/.../beta/deployments \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -d '{
    "agent": "agent_abc123",
    "environment_id": "env_xyz789",
    "schedule": {
      "expression": "0 9 * * 1-5",
      "timezone": "America/Denver"
    },
    "initial_events": [
      {"role": "user", "content": "Run the daily compliance scan and report findings."}
    ],
    "files": [{"path": "/config/rules.yaml"}]
  }'
```

Python SDK：
```python
deployment = client.beta.deployments.create(
    agent="agent_abc123",
    environment_id="env_xyz789",
    schedule={"expression": "0 9 * * 1-5", "timezone": "America/Denver"},
    initial_events=[{"role": "user", "content": "Run daily compliance scan."}],
)
```

## 部署操作

列出、获取、暂停、恢复和删除部署。暂停会暂停调度——正在运行的会话不受影响。恢复会从下一个计划触发时间重新开始调度。

```python
client.beta.deployments.list()
client.beta.deployments.get("deploy_abc123")
client.beta.deployments.pause("deploy_abc123")
client.beta.deployments.resume("deploy_abc123")
client.beta.deployments.delete("deploy_abc123")
```

## 部署运行

每次触发创建一个部署运行。每个运行是一个会话——你可以通过 `client.beta.deployment_runs` 列出、获取和手动创建它们：

```python
# 列出部署的运行
runs = client.beta.deployment_runs.list("deploy_abc123")

# 手动触发（立即创建一个运行，无论调度如何）
run = client.beta.deployment_runs.create("deploy_abc123",
    reason="manual trigger for validation")

# 获取特定运行
run = client.beta.deployment_runs.get("deploy_abc123", "run_def456")
```

### 运行生命周期

```
scheduled → running → succeeded
                   → failed
                   → paused (manual intervention)
```

- 如果部署被暂停，计划触发会被跳过。
- 如果运行失败，默认行为是重试最多 3 次，间隔 5 分钟。超过重试限制后，该触发被丢弃。
- 运行日志通过 `client.beta.sessions.events("sess_...")` 使用会话的事件流 API 获取。
