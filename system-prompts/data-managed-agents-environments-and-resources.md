<!--
name: 'Data: Managed Agents environments and resources'
description: Reference documentation covering Managed Agents environments, file resources, GitHub repository mounting, and the Files API with SDK examples
ccVersion: 2.1.105
-->
# Managed Agents — Environments 与 Resources

## Environments

创建 session 需要 `environment_id`。Environments 是**可复用的配置模板**，用于在 Anthropic 基础设施中启动容器——你可以为不同用例创建不同的 environment（例如数据可视化 vs Web 开发，配置不同的软件包集合）。Anthropic 负责处理扩容、容器生命周期和工作编排。

**Environment 名称必须唯一。** 使用已存在的名称创建 environment 会返回 409。

### Networking

| 网络策略                          | 描述                                                           |
| ------------------------------- | ------------------------------------------------------------- |
| `unrestricted`                  | 完全出站（法律规定的黑名单除外）                                     |
| `package_managers_and_custom`   | 包管理器 + 自定义 `allowed_hosts`                                |

```json
{
  "networking": {
    "type": "package_managers_and_custom",
    "allowed_hosts": ["api.example.com"]
  }
}
```

**MCP 注意事项：** 如果使用受限网络，请确保 `allowed_hosts` 包含你的 MCP 服务器域名。否则容器无法访问它们，工具会静默失败。

### 创建 environment

SDK 会自动添加 `managed-agents-2026-04-01`。TypeScript：

```ts
const env = await client.beta.environments.create({
  name: "my_env",
  config: {
    type: "cloud",
    networking: { type: "unrestricted" },
  },
});
```

### Environment CRUD

| 操作        | 方法   | 路径                                       | 备注 |
| ---------------- | -------- | ------------------------------------------ | ----- |
| Create           | `POST`   | `/v1/environments`                         | |
| List             | `GET`    | `/v1/environments`                         | 分页（`limit`、`after_id`、`before_id`） |
| Get              | `GET`    | `/v1/environments/{id}`                    | |
| Update           | `POST`   | `/v1/environments/{id}`                    | 更改仅对**新**容器生效；已有 session 保留其原始配置 |
| Delete           | `DELETE` | `/v1/environments/{id}`                    | 返回 204。 |
| Archive          | `POST`   | `/v1/environments/{id}/archive`            | 使其**只读**；已有 session 继续运行，新 session 无法引用它。不可 unarchive——终态。 |

---

## Resources

将文件和 GitHub 仓库附加到 session。**Session 创建会阻塞直到所有资源挂载完成**——容器在所有文件和仓库就位之前不会进入 `running` 状态。每个 session 最多 **999 个 file 资源**。支持每个 session 挂载多个 GitHub 仓库。

### 文件上传（输入——宿主机 → agent）

先通过 Files API 上传文件，然后通过 `file_id` + `mount_path` 引用：

```ts
// 1. 上传
const file = await client.beta.files.upload({
  file: fs.createReadStream("data.csv"),
  purpose: "agent",
});

// 2. 作为 session resource 附加
const session = await client.beta.sessions.create({
  agent: agent.id,
  environment_id: envId,
  resources: [
    { type: "file", file_id: file.id, mount_path: "/workspace/data.csv" }
  ],
});
```

**`mount_path` 是必填的**，且必须是绝对路径。父目录会自动创建。Agent 工作目录默认为 `/workspace`。文件以只读方式挂载——agent 将修改后的版本写入新路径。

### Session 输出（输出——agent → 宿主机）

Agent 可以在 session 期间将文件写入 `/mnt/session/outputs/`。这些文件会被 Files API 自动捕获，之后可以列出和下载：

```ts
// turn 完成后，列出限定此 session 的输出文件：
for await (const f of client.beta.files.list({
  scope_id: session.id,
  betas: ["managed-agents-2026-04-01"],
})) {
  console.log(f.filename, f.size_bytes);
  const resp = await client.beta.files.download(f.id);
  const text = await resp.text();
}
```

**要求：**
- 必须为 agent 启用 `write` 工具（或 `bash`）才能创建输出文件。
- 限定 session 的 `files.list` / `files.download` 捕获写入 `/mnt/session/outputs/` 的输出。
- 过滤参数是 **`scope_id`**（REST 查询参数 `?scope_id=<session_id>`）。SDK 的 files 资源只自动添加 `files-api-2025-04-14` 请求头，因此需要显式传入 `betas: ["managed-agents-2026-04-01"]`（或在裸 HTTP 中同时传入两个请求头）——否则 API 可能会拒绝 `scope_id` 作为未知字段。需要 `@anthropic-ai/sdk` ≥ 0.88.0 / `anthropic`（Python）≥ 0.92.0——更旧版本不会为 `scope_id` 提供类型定义。`ant` CLI **尚未**暴露此标志；请使用 SDK 或 curl。
- 原样传入 `sessions.create()` 返回的 session ID（如 `sesn_011CZx...`）——API 会验证前缀。
- `session.status_idle` 与输出文件出现在 `files.list` 之间存在短暂索引延迟（约 1-3 秒）。如果为空可重试一到两次。

> **当 `scope_id` 过滤不可用时的回退方案**（旧版 SDK，或接口返回错误）：发送一条后续 `user.message`，要求 agent 读取 `/mnt/session/outputs/` 下的每个文件并返回内容。Agent 会将文件内容以 `agent.message` 文本形式流式传回。此方案仅适用于文本文件，且消耗输出 token——用于应急解围，不作为主要路径。

这为你提供了双向文件桥接：上传参考数据进入，下载 agent 产物出来。

### GitHub Repositories

在初始化阶段将 GitHub 仓库克隆到 session 容器中，在 agent 开始执行之前完成。Agent 可以通过 `bash`（`git`）进行读取、编辑、提交和推送。每个 session 支持多个仓库——为每个仓库添加一个 `resources` 条目。仓库会被缓存，因此后续使用相同仓库的 session 启动更快。

仓库在 session 的整个生命周期内保持附加状态——要更改挂载的仓库，需创建新 session。你**可以**在运行中的 session 上通过 `client.beta.sessions.resources.update(resource_id, {session_id, authorization_token})` 轮换仓库的 `authorization_token`；resource 的 `id` 在 session 创建时及 `resources.list()` 中返回。

**字段：**

| 字段 | 必填 | 备注 |
|---|---|---|
| `type` | ✅ | `"github_repository"` |
| `url` | ✅ | GitHub 仓库 URL |
| `authorization_token` | ✅ | 具有仓库访问权限的 GitHub Personal Access Token。**绝不会在 API 响应中回显。** |
| `mount_path` | ❌ | 仓库克隆到的路径。默认为 `/workspace/<repo-name>`。 |
| `checkout` | ❌ | `{type: "branch", name: "..."}` 或 `{type: "commit", sha: "..."}`。默认为仓库的默认分支。 |

**Token 权限级别**（细粒度 PAT）：
- `Contents: Read`——仅克隆
- `Contents: Read and write`——推送更改和创建 pull request

**认证工作原理：** `authorization_token` 绝不会被放入容器内部。针对附加仓库的 `git pull` / `git push` 和 GitHub REST 调用会通过 Anthropic 侧的 git 代理路由，该代理在请求离开沙箱后注入 token。容器中运行的代码——包括 agent 编写的任何代码——无法读取或窃取它。

> ‼️ **要生成 pull request**，你还需要 GitHub **MCP server** 访问权限——`github_repository` 资源仅提供文件系统 + git 访问权限。参见 `shared/managed-agents-tools.md` → MCP Servers。PR 工作流为：在挂载的仓库中编辑文件 → 通过 `bash` 推送分支（通过 git 代理使用 `authorization_token` 认证） → 通过 MCP 的 `create_pull_request` 工具创建 PR（通过 vault 认证）。

**TypeScript：**

```ts
// 1. 创建 agent——声明 GitHub MCP（此处不涉及认证）
const agent = await client.beta.agents.create(
  {
    name: 'GitHub Agent',
    model: '{{OPUS_ID}}',
    mcp_servers: [
      { type: 'url', name: 'github', url: 'https://api.githubcopilot.com/mcp/' },
    ],
    tools: [
      { type: 'agent_toolset_20260401', default_config: { enabled: true } },
      { type: 'mcp_toolset', mcp_server_name: 'github' },
    ],
  },
);

// 2. 启动 session——附加 vault 进行 MCP 认证 + 挂载仓库
const session = await client.beta.sessions.create({
  agent: agent.id,
  environment_id: envId,
  vault_ids: [vaultId],  // vault 包含 GitHub MCP OAuth credential
  resources: [
    {
      type: 'github_repository',
      url: 'https://github.com/owner/repo',
      authorization_token: process.env.GITHUB_TOKEN,  // 仓库克隆 token（≠ MCP 认证）
      checkout: { type: 'branch', name: 'main' },
    },
  ],
});
```

**Python：**

```python
import os

agent = client.beta.agents.create(
    name="GitHub Agent",
    model="{{OPUS_ID}}",
    mcp_servers=[{
        "type": "url",
        "name": "github",
        "url": "https://api.githubcopilot.com/mcp/",
    }],
    tools=[
        {"type": "agent_toolset_20260401", "default_config": {"enabled": True}},
        {"type": "mcp_toolset", "mcp_server_name": "github"},
    ],
)

session = client.beta.sessions.create(
    agent=agent.id,
    environment_id=env_id,
    vault_ids=[vault_id],  # vault 包含 GitHub MCP OAuth credential
    resources=[{
        "type": "github_repository",
        "url": "https://github.com/owner/repo",
        "authorization_token": os.environ["GITHUB_TOKEN"],  # 仓库克隆 token（≠ MCP 认证）
        "checkout": {"type": "branch", "name": "main"},
    }],
)
```

---

## Files API

上传和管理用作 session resource 的文件，以及下载 agent 写入 `/mnt/session/outputs/` 的文件。

| 操作        | 方法   | 路径                                  | SDK |
| ---------------- | -------- | ------------------------------------- | --- |
| Upload           | `POST`   | `/v1/files`                           | `client.beta.files.upload({ file })` |
| List             | `GET`    | `/v1/files?scope_id=...`              | `client.beta.files.list({ scope_id, betas: ["managed-agents-2026-04-01"] })` |
| Get Metadata     | `GET`    | `/v1/files/{id}`                      | `client.beta.files.retrieveMetadata(id)` |
| Download         | `GET`    | `/v1/files/{id}/content`              | `client.beta.files.download(id)` → `Response` |
| Delete           | `DELETE` | `/v1/files/{id}`                      | `client.beta.files.delete(id)` |

List 上的 `scope_id` 过滤器将结果限定为该 session 写入 `/mnt/session/outputs/` 的文件。不加过滤器则获取上传到你账户的所有文件。
