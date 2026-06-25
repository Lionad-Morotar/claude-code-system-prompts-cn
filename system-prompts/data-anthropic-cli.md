<!--
name: '数据：Anthropic CLI'
description: ant CLI 参考文档，涵盖安装、认证、命令结构、输入输出处理、托管代理工作流及脚本模式
ccVersion: 2.1.169
-->
# Anthropic CLI（`ant`）

`ant` CLI 将每个 Claude API 资源以 shell 子命令形式暴露。相比 `curl`：请求体通过带类型的标志或管道输入的 YAML 构建，而非手写 JSON；`@path` 将文件内容内联到任意字符串字段；`--transform` 使用 GJSON 路径提取字段（无需 `jq`）；列表端点自动分页（使用 `--max-items N` 限制总结果数；`--limit` 仅设置服务端分页大小）；`beta:` 前缀自动设置正确的 `anthropic-beta` 请求头。

## 何时使用 CLI 而非 SDK

**控制面用 CLI，数据面用 SDK。** 代理和环境是相对静态的资源——使用 `ant` 定义、配置和调试它们——将 YAML 检入仓库、从 CI 应用、在终端中检查。会话是动态的，由应用程序通过 SDK 驱动——按任务创建、流式传输事件、响应工具调用、集成到产品中。两者访问相同的 API；区别在于调用发生的位置，而非能力范围。

| | 控制面 → `ant` | 数据面 → SDK |
|---|---|---|
| 资源 | agents、environments、skills、vaults、files | sessions、events |
| 调用频率 | 每次部署一次 / 临时查询 | 每次任务 / 每轮对话 |
| 存在位置 | 仓库中的 `*.yaml` + CI + 终端 | 应用程序代码 |
| 典型调用 | `create < agent.yaml`、`update --version N`、`list`、`retrieve`、`archive`、`--debug` | `sessions.create()`、`events.stream()`、`events.send()` |

## 安装与认证

```sh
# macOS
brew install anthropics/tap/ant
xattr -d com.apple.quarantine "$(brew --prefix)/bin/ant"

# Linux / WSL — 从 github.com/anthropics/anthropic-cli/releases 选择发行版
curl -fsSL "https://github.com/anthropics/anthropic-cli/releases/download/v${VERSION}/ant_${VERSION}_$(uname -s | tr A-Z a-z)_$(uname -m | sed -e s/x86_64/amd64/ -e s/aarch64/arm64/).tar.gz" \
  | sudo tar -xz -C /usr/local/bin ant

# 或从源码安装（Go 1.22+）
go install github.com/anthropics/anthropic-cli/cmd/ant@latest
```

**认证** — CLI 与 SDK 使用相同的凭据解析方式（先匹配者生效）：显式标志、然后是 `ANTHROPIC_API_KEY`、然后是 `ANTHROPIC_AUTH_TOKEN`、然后是 `ANTHROPIC_PROFILE` 选定的或当前活跃的配置文件、然后是 Workload Identity Federation 环境变量、最后是磁盘上的默认配置文件。使用 `ANTHROPIC_BASE_URL` 或 `--base-url` 覆盖主机地址。

- **API key**：在环境变量中设置 `ANTHROPIC_API_KEY`。
- **OAuth 配置文件**（无需管理静态密钥）：`ant auth login` 打开浏览器，交换短期令牌，并将配置文件存储在 `$ANTHROPIC_CONFIG_DIR` 下（Linux/macOS 上默认为 `~/.config/anthropic/`，Windows 上为 `%APPDATA%\Anthropic` — 设置文件位于 `configs/<profile>.json`，令牌文件位于 `credentials/<profile>.json`）。后续 `ant`（及 SDK）调用会自动使用——登录后，裸 `Anthropic()` 客户端即可工作，但直接读取 `ANTHROPIC_API_KEY` 的脚本不会。Claude Code 和 Claude Agent SDK 遵循相同的配置文件解析。`ant auth status` 显示哪个凭据来源和配置文件生效（仅报告状态——不要根据其退出码编写健康检查脚本）；`ant auth logout` 清除当前活跃配置文件（`--all` 清除所有配置文件）。在无浏览器的远程主机上，`ant auth login --no-browser` 会打印授权 URL，并在终端中接收回调码。
- **非交互式工作负载**（CI、服务器、容器）：交互式登录适用于开发机上的个人使用——对于自动化场景，请改用 Workload Identity Federation（参见 `shared/live-sources.md` 中的认证文档）。

> **认证第一陷阱：** 仅当未设置 API key 时才会查询配置文件。一个过期导出的 `ANTHROPIC_API_KEY` 会静默覆盖所有配置文件——请求会发往该 key 所绑定组织/工作区。`ant auth status` 显示实际生效的来源；依赖配置文件前，先取消设置该 key（或按命令使用 `env -u ANTHROPIC_API_KEY ant …`）。要真正**取消设置**它——空字符串 `ANTHROPIC_API_KEY=""` 仍在其优先级槽位生效，会以空 key 进行认证。反向场景同样存在：`ant auth login` 后，Claude Code 可能会警告配置文件与其自身的 `/login` 凭据存在冲突——保留一个（使用配置文件并在 Claude Code 中 `/logout`，或 `ant auth logout` 以保留 Claude Code 自身的登录状态）。

**命名配置文件** — 交互式登录令牌绑定到单个组织+工作区，API 仅显示属于该工作区的资源。如果创建的代理、会话或文件"消失"了，通常原因是令牌作用域限定在与创建时不同的工作区（`ant auth status` 显示当前活跃工作区）。多工作区工作意味着每个工作区一个配置文件：

```sh
ant auth login --profile <name>                  # 若配置文件不存在则创建；在浏览器中选择组织/工作区
ant auth login --profile <name> --workspace-id wrkspc_01...   # 直接绑定，跳过选择器
ant profile activate <name>                      # 切换默认配置文件
ant --profile <name> models list                 # 单次使用；等效于：ANTHROPIC_PROFILE=<name> ant models list
ant profile list                                 # 查看所有配置文件
ant profile set workspace_id wrkspc_01... --profile <name>    # 编辑配置项（workspace_id、base_url、organization_id 等）
```

`ant profile set` 编辑已存在配置文件的设置——它不会创建配置文件，也**不会**重新绑定已签发的凭据；在该配置文件下重新运行 `ant auth login` 以为新目标签发令牌。将 `ANTHROPIC_PROFILE` 指向不存在的配置文件会报错，而非回退。刷新令牌最终会硬过期（不会随使用滑动延期）——当之前正常工作的配置文件开始认证失败时，在调试其他问题之前先重新运行 `ant auth login`。

**权限范围** — 配置文件的 OAuth 权限范围集在登录时请求（`--scope`），并持久化在配置文件中（`scope` 也是 `profile set` 的配置项；与其他配置编辑一样，修改后需要重新 `ant auth login` 才能生效）。特权范围——例如用于组织管理端点的 `org:admin`——**不在**默认范围集中：显式传入需要的完整范围集（`ant auth login --profile admin --scope "... org:admin"`），服务器仅在你的角色实际拥有该特权时才授予。由于范围集随配置文件签发的每个令牌携带，请将特权工作放在专用配置文件上（`admin` 而非 `default`），日常推理使用非特权配置文件，通过 `--profile`/`ANTHROPIC_PROFILE` 切换。查看 `ant auth login --help` 获取当前范围列表，使用 `ant auth status` 查看当前令牌携带的范围。

将当前活跃凭据传递给子进程或原始 HTTP 脚本：

```sh
# 裸访问令牌 — 用于 curl 的 Authorization 请求头
curl https://api.anthropic.com/v1/messages \
  -H "Authorization: Bearer $(ant auth print-credentials --access-token)" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: oauth-2025-04-20" \
  -H "content-type: application/json" \
  -d '{"model": "{{OPUS_ID}}", "max_tokens": 1024, "messages": [{"role": "user", "content": "Hello"}]}'

# .env 格式 — 设置 ANTHROPIC_AUTH_TOKEN（若配置文件有自定义 base_url，也会设置 ANTHROPIC_BASE_URL）。
# 输出为裸 KEY=value（无 `export`），因此使用 `set -a` 自动导出给子进程：
set -a; eval "$(ant auth print-credentials --env)"; set +a
python my_script.py   # SDK 自动读取 ANTHROPIC_AUTH_TOKEN
```

OAuth 令牌放在 `Authorization: Bearer` 请求头中（而非 `x-api-key:`）**并附加 `anthropic-beta: oauth-2025-04-20` 请求头**——将原始 curl/httpx 脚本从 API key 转换过来是请求头变更，而非简单的 key 替换。beta 请求头的要求取决于端点（某些端点不强制要求也可工作；`/v1/messages` 不行）——始终发送它，以免切换端点时请求中断。令牌是短期的，通过环境变量传递时不会自动刷新——对于长时间运行的脚本，在过期前重新运行 `print-credentials`（`print-credentials` 本身会在需要时刷新令牌）。如果同时设置了 `ANTHROPIC_API_KEY` 和 `ANTHROPIC_AUTH_TOKEN`，SDK 会同时发送两者，API 会拒绝请求——在 `eval` 执行 `--env` 输出前取消设置 `ANTHROPIC_API_KEY`。

**易踩坑点：** `ant auth print-credentials` **不带任何标志**会打印完整的凭据 JSON，而非裸令牌——将其放入 `Authorization` 请求头会导致空响应或 HTTP/2 协议错误。始终使用 `--access-token` 获取请求头所需的令牌（它始终读取命名/活跃配置文件；已设置的 `ANTHROPIC_API_KEY` 不会覆盖凭据打印）。

## 命令结构

```
ant <resource>[:<subresource>] <action> [flags]
```

Beta 资源（agents、sessions、environments、deployments、skills、vaults、memory stores）位于 `beta:` 下——CLI 自动发送正确的 `anthropic-beta` 请求头，因此不要自行传递，除非使用 `--beta <header>` 覆盖。对于自托管环境，`ant beta:worker poll/run` 和 `ant beta:environments:work stats/stop` 驱动和监控工作队列——参见 `shared/managed-agents-self-hosted-sandboxes.md`。

```sh
ant models list
ant messages create --model {{OPUS_ID}} --max-tokens 1024 --message '{role: user, content: "Hello"}'
ant beta:agents retrieve --agent-id agent_01...
ant beta:sessions:events list --session-id session_01...
```

`ant --help` 列出所有资源；在任何子命令后追加 `--help` 查看其标志。

## 全局标志

| 标志 | 用途 |
| --- | --- |
| `--format` | `auto`（默认：TTY 时美化输出，管道时紧凑输出）、`json`、`jsonl`、`yaml`、`pretty`、`raw`、`explore`（交互式 TUI） |
| `--transform` | 应用于响应的 GJSON 路径（列表端点上按元素应用）。`--format raw` 时不生效。 |
| `-r`、`--raw-output` | 若转换结果为字符串，去掉引号打印（jq 语义）。与 `--transform` 配合用于标量提取。 |
| `--max-items` | 限制自动分页列表端点返回的总结果数（不同于 `--limit`，后者是服务端分页大小）。 |
| `--format-error` / `--transform-error` | 与 `--format`/`--transform` 相同，但应用于错误响应。`-r` 不适用于错误路径——使用 `--format-error yaml` 获取不带引号的错误标量。 |
| `--base-url` | 覆盖 API 主机地址 |
| `--debug` | 将完整 HTTP 请求+响应打印到 stderr（API key 已脱敏） |

## 输出 — `--transform` + `--format`

`--transform` 接受 [GJSON 路径](https://github.com/tidwall/gjson/blob/master/SYNTAX.md)。在列表端点上，它**按元素**运行，而非在外层信封上。

```sh
ant beta:agents list --transform '{id,name,model}' --format jsonl
```

**提取标量供 shell 使用：** 将 `--transform` 与 `-r`（`--raw-output`——以 jq 风格打印字符串，不带引号）配合：

```sh
AGENT_ID=$(ant beta:agents create --name "My Agent" --model '{id: {{SONNET_ID}}}' \
  --transform id -r)
```

## 输入 — 标志、stdin、`@file`

**标志** — 标量字段直接映射。结构化字段接受宽松 YAML 语法（键可不加引号）或严格 JSON。可重复标志构建数组（每个 `--tool`、`--event`、`--message` 追加一个元素）：

```sh
ant beta:agents create \
  --name "Research Agent" \
  --model '{id: {{OPUS_ID}}}' \
  --tool '{type: agent_toolset_20260401}' \
  --tool '{type: custom, name: search_docs, input_schema: {type: object, properties: {query: {type: string}}}}'
```

**Stdin** — 管道输入完整 JSON 或 YAML 正文。与标志合并；冲突时标志优先（对于数组字段，任何标志会**替换** stdin 中的整个数组——不会追加）。给 heredoc 定界符加引号（`<<'YAML'`）以禁用正文内的 shell 展开：

```sh
ant beta:agents create <<'YAML'
name: Research Agent
model: {{OPUS_ID}}
system: |
  You are a research assistant. Cite sources for every claim.
tools:
  - type: agent_toolset_20260401
YAML
```

**`@file` 引用** — 将文件内容内联到任意字符串字段。在结构化标志值内部，给路径加引号。二进制文件自动 base64 编码；使用 `@file://`（文本）或 `@data://`（base64）强制指定。将字面量 `@` 转义为 `\@`。

```sh
ant beta:agents create --name "Researcher" --model '{id: {{SONNET_ID}}}' --system @./prompts/researcher.txt

ant messages create --model {{OPUS_ID}} --max-tokens 1024 \
  --message '{role: user, content: [
    {type: document, source: {type: base64, media_type: application/pdf, data: "@./scan.pdf"}},
    {type: text, text: "Extract the text from this scanned document."}
  ]}' \
  --transform 'content.0.text' -r
```

原生接受文件路径的标志（如 `beta:files upload` 的 `--file`）接受裸路径，无需 `@`。

## 版本控制的托管代理资源

这是定义代理和环境的推荐工作流——将 YAML 检入仓库，通过 `create`（首次）/ `update`（后续）同步。字段参考见 `shared/managed-agents-core.md`。

```yaml
# summarizer.agent.yaml
name: Summarizer
model: {{SONNET_ID}}
system: |
  You are a helpful assistant that writes concise summaries.
tools:
  - type: agent_toolset_20260401
```

```sh
# 创建（一次）——捕获 ID
AGENT_ID=$(ant beta:agents create < summarizer.agent.yaml --transform id -r)

# 更新（CI）——需要 ID + 当前版本（乐观锁）
ant beta:agents update --agent-id "$AGENT_ID" --version 1 < summarizer.agent.yaml
```

环境使用相同模式（`ant beta:environments create|update < env.yaml`），然后使用两个 ID 启动会话：

```sh
ant beta:sessions create --agent "$AGENT_ID" --environment-id "$ENV_ID" --title "Task"
ant beta:sessions:events send --session-id "$SID" \
  --event '{type: user.message, content: [{type: text, text: "Summarize X"}]}'
ant beta:sessions:events list --session-id "$SID" --transform 'content.0.text' -r
ant beta:sessions:events stream --session-id "$SID"   # 实时事件流
```

### 交互式会话循环（先流后发）

`ant beta:sessions:events stream` 仅传递流**打开后**发出的事件——因此在发送启动消息**之前**打开流，以避免丢失早期事件。使用进程替换将流保持在文件描述符上，发送消息，然后读取：

```sh
exec {stream}< <(ant beta:sessions:events stream --session-id "$SID" \
  --transform '{type,text:content.#(type=="text").text,err:error.message}' --format yaml)

ant beta:sessions:events send --session-id "$SID" > /dev/null <<'YAML'
events:
  - type: user.message
    content:
      - type: text
        text: Summarize the repo README
YAML

type=
while IFS= read -r -u "$stream" line; do
  case "$line" in
    type:\ session.status_idle) break ;;
    type:\ session.error)
      IFS= read -r -u "$stream" next || next=
      case "$next" in err:\ *) msg=${next#err: } ;; *) msg=unknown ;; esac
      printf '\
[Error: %s]\
' "$msg"; break ;;
    type:\ *) type=${line#type: } ;;
    text:*)
      [[ $type == agent.message ]] || continue
      val=${line#text: }
      case "$val" in '|-'|'|') ;; *) printf '%s' "$val" ;; esac ;;
    \ \ *)
      if [[ $type == agent.message ]]; then printf '%s\
' "${line#  }"; fi ;;
  esac
done
exec {stream}<&-
```

这适用于交互式探索和演示。对于需要响应 `agent.tool_use` / `agent.custom_tool_use` 事件、断线重连或针对 `events.list` 去重的应用程序代码，请使用 SDK——参见 `shared/managed-agents-client-patterns.md`。

## 脚本模式

列表端点上的 `--transform id -r` 每行输出一个裸 ID——与 `xargs` 组合，或使用 `--max-items N` 限制结果集而无需通过 `head` 管道：

```sh
FIRST=$(ant beta:agents list --transform id -r --max-items 1)
ant beta:agents:versions list --agent-id "$FIRST" --transform '{version,created_at}' --format jsonl
```

错误处理镜像成功路径（注意：`-r` 不适用于错误输出——在此使用 `--format-error yaml` 获取不带引号的标量）：

```sh
ant beta:agents retrieve --agent-id bogus --transform-error error.message --format-error yaml 2>&1
```

Shell 补全：`ant @completion {zsh|bash|fish|powershell}`。

获取完整且始终最新的参考（包括各端点标志），请 WebFetch `shared/live-sources.md` 中的 **Anthropic CLI** URL。
