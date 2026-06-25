<!--
name: 'Data: Anthropic CLI'
description: ant CLI 的参考文档，涵盖安装、认证、命令结构、输入输出控制、托管智能体工作流和脚本化使用模式
ccVersion: 2.1.154
-->
# Anthropic CLI (`ant`)

`ant` CLI 将每个 Claude API 资源作为 shell 子命令暴露出来。与 `curl` 相比：请求体通过带类型的标志或管道传入的 YAML 构建，而非手写 JSON；`@path` 将文件内容内联到任意字符串字段中；`--transform` 用 GJSON 路径提取字段（无需 `jq`）；列表端点自动分页（用 `--max-items N` 限制总结果数；`--limit` 仅设置服务端每页大小）；`beta:` 前缀自动设置正确的 `anthropic-beta` 头。

## 何时使用 CLI vs SDK

**CLI 用于控制平面，SDK 用于数据平面。** 智能体（agents）和环境（environments）是相对静态的资源，你用 `ant` 来定义、配置和调试——将 YAML 提交到仓库、从 CI 部署、在终端中检查。会话（sessions）是动态的，由你的应用程序通过 SDK 驱动——按任务创建、流式传输事件、响应工具调用、集成到你的产品中。两者访问相同的 API；区别在于调用发生在哪里，而非能做什么。

| | 控制平面 → `ant` | 数据平面 → SDK |
|---|---|---|
| 资源 | agents, environments, skills, vaults, files | sessions, events |
| 调用频率 | 每次部署一次 / 临时操作 | 每个任务 / 每轮对话 |
| 存在位置 | 仓库中的 `*.yaml` + CI + 终端 | 应用代码 |
| 典型调用 | `create < agent.yaml`, `update --version N`, `list`, `retrieve`, `archive`, `--debug` | `sessions.create()`, `events.stream()`, `events.send()` |

## 安装与认证

```sh
# macOS
brew install anthropics/tap/ant
xattr -d com.apple.quarantine "$(brew --prefix)/bin/ant"

# Linux / WSL — 从 github.com/anthropics/anthropic-cli/releases 选择版本
curl -fsSL "https://github.com/anthropics/anthropic-cli/releases/download/v${VERSION}/ant_${VERSION}_$(uname -s | tr A-Z a-z)_$(uname -m | sed -e s/x86_64/amd64/ -e s/aarch64/arm64/).tar.gz" \
  | sudo tar -xz -C /usr/local/bin ant

# 或从源码安装（Go 1.22+）
go install github.com/anthropics/anthropic-cli/cmd/ant@latest
```

**认证** —— CLI 解析凭据的方式与 SDK 相同（先匹配的优先）：显式标志，然后是 `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` 环境变量，然后是 `ANTHROPIC_PROFILE`，最后是 `ant auth login` 中的活动 profile。用 `ANTHROPIC_BASE_URL` 或 `--base-url` 覆盖主机地址。

- **API key**：在环境中设置 `ANTHROPIC_API_KEY`。
- **OAuth profile**（无需管理静态密钥）：`ant auth login` 打开浏览器，交换短期令牌，并将 profile 存储在 `~/.config/anthropic/` 下。后续 `ant`（和 SDK）调用会自动识别。`ant auth status` 显示活动 profile；`ant auth logout` 清除它。

将活动凭据传递给子进程或原始 HTTP 脚本：

```sh
# 裸访问令牌 —— 用于 curl 的 Authorization 头
curl https://api.anthropic.com/v1/messages \
  -H "Authorization: Bearer $(ant auth print-credentials --access-token)" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model": "{{OPUS_ID}}", "max_tokens": 1024, "messages": [{"role": "user", "content": "Hello"}]}'

# .env 格式 —— 设置 ANTHROPIC_AUTH_TOKEN（如果 profile 中有的话，也会设置 ANTHROPIC_BASE_URL）。
# 输出是裸的 KEY=value（没有 `export`），因此使用 `set -a` 自动为子进程导出：
set -a; eval "$(ant auth print-credentials --env)"; set +a
python my_script.py   # SDK 会识别 ANTHROPIC_AUTH_TOKEN
```

OAuth 令牌放在 `Authorization: Bearer` 上（不是 `x-api-key:`）。令牌是短期的，通过环境变量传递时不会自动刷新，因此对于长时间运行的脚本，请在过期前重新运行 `print-credentials`。如果同时设置了 `ANTHROPIC_API_KEY` 和 `ANTHROPIC_AUTH_TOKEN`，SDK 会发送两个头，API 会拒绝请求——在 `eval` 执行 `--env` 输出之前，先 unset `ANTHROPIC_API_KEY`。

## 命令结构

```
ant <resource>[:<subresource>] <action> [flags]
```

Beta 资源（agents, sessions, environments, deployments, skills, vaults, memory stores）位于 `beta:` 下——CLI 自动发送正确的 `anthropic-beta` 头，因此除非用 `--beta <header>` 覆盖，否则不要自行传递。对于自托管环境，`ant beta:worker poll/run` 和 `ant beta:environments:work stats/stop` 用于驱动和监控工作队列——参见 `shared/managed-agents-self-hosted-sandboxes.md`。

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
| `--format` | `auto`（默认：TTY 时 pretty，管道时 compact）、`json`、`jsonl`、`yaml`、`pretty`、`raw`、`explore`（交互式 TUI） |
| `--transform` | 对响应应用的 GJSON 路径（列表端点上按每项应用）。`--format raw` 时不应用。 |
| `-r`, `--raw-output` | 如果转换结果是字符串，则不带引号打印（jq 语义）。配合 `--transform` 用于标量值捕获。 |
| `--max-items` | 限制自动分页列表端点返回的总结果数（区别于 `--limit`，后者是服务端每页大小）。 |
| `--format-error` / `--transform-error` | 与 `--format`/`--transform` 相同，应用于错误响应。`-r` 不适用于错误路径——使用 `--format-error yaml` 获取不带引号的错误标量值。 |
| `--base-url` | 覆盖 API 主机地址 |
| `--debug` | 将完整的 HTTP 请求 + 响应打印到 stderr（API key 已脱敏） |

## 输出 — `--transform` + `--format`

`--transform` 接受 [GJSON 路径](https://github.com/tidwall/gjson/blob/master/SYNTAX.md)。在列表端点上，它按**每项**运行，而非在信封上。

```sh
ant beta:agents list --transform '{id,name,model}' --format jsonl
```

**提取标量值用于 shell：** 配合 `--transform` 与 `-r`（`--raw-output`——不带引号打印字符串，jq 风格）：

```sh
AGENT_ID=$(ant beta:agents create --name "My Agent" --model '{id: {{SONNET_ID}}}' \
  --transform id -r)
```

## 输入 — 标志、stdin、`@file`

**标志**——标量字段直接映射。结构化字段接受宽松 YAML 语法（不带引号的键）或严格 JSON。可重复标志构建数组（每个 `--tool`、`--event`、`--message` 追加一个元素）：

```sh
ant beta:agents create \
  --name "Research Agent" \
  --model '{id: {{OPUS_ID}}}' \
  --tool '{type: agent_toolset_20260401}' \
  --tool '{type: custom, name: search_docs, input_schema: {type: object, properties: {query: {type: string}}}}'
```

**Stdin**——管道传入完整的 JSON 或 YAML 请求体。与标志合并；冲突时标志优先（对于数组字段，任何标志会**完全替换** stdin 中的数组——不会追加）。引用 heredoc 分隔符（`<<'YAML'`）以禁用请求体内的 shell 展开：

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

**`@file` 引用**——将文件内容内联到任意字符串值字段中。在结构化标志值内部，用引号包裹路径。二进制文件自动 base64 编码；用 `@file://`（文本）或 `@data://`（base64）强制指定。用 `\@` 转义字面量开头的 `@`。

```sh
ant beta:agents create --name "Researcher" --model '{id: {{SONNET_ID}}}' --system @./prompts/researcher.txt

ant messages create --model {{OPUS_ID}} --max-tokens 1024 \
  --message '{role: user, content: [
    {type: document, source: {type: base64, media_type: application/pdf, data: "@./scan.pdf"}},
    {type: text, text: "Extract the text from this scanned document."}
  ]}' \
  --transform 'content.0.text' -r
```

原生接受文件路径的标志（例如 `beta:files upload` 上的 `--file`）直接使用裸路径，无需 `@`。

## 版本控制的托管智能体资源

这是定义智能体和环境的推荐工作流——将 YAML 提交到仓库，通过 `create`（首次）/ `update`（后续）同步。字段参考见 `shared/managed-agents-core.md`。

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
# 创建（一次性）—— 捕获 ID
AGENT_ID=$(ant beta:agents create < summarizer.agent.yaml --transform id -r)

# 更新（CI）—— 需要 ID + 当前版本（乐观锁）
ant beta:agents update --agent-id "$AGENT_ID" --version 1 < summarizer.agent.yaml
```

环境使用相同模式（`ant beta:environments create|update < env.yaml`），然后同时使用两个 ID 启动会话：

```sh
ant beta:sessions create --agent "$AGENT_ID" --environment-id "$ENV_ID" --title "Task"
ant beta:sessions:events send --session-id "$SID" \
  --event '{type: user.message, content: [{type: text, text: "Summarize X"}]}'
ant beta:sessions:events list --session-id "$SID" --transform 'content.0.text' -r
ant beta:sessions:events stream --session-id "$SID"   # 实时事件流
```

### 交互式会话循环（stream-before-send）

`ant beta:sessions:events stream` 仅投递流打开**之后**发出的事件——因此在发送启动消息**之前**打开流，以免错过早期事件。使用进程替换将流保持在一个文件描述符上，发送消息，然后读取：

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

这适用于交互式探索和演示。对于需要响应 `agent.tool_use` / `agent.custom_tool_use` 事件、断开重连或对 `events.list` 去重的应用代码，请使用 SDK——参见 `shared/managed-agents-client-patterns.md`。

## 脚本化使用模式

列表端点上 `--transform id -r` 每行输出一个裸 ID——可与 `xargs` 组合，或使用 `--max-items N` 限制结果集而无需通过 `head` 管道：

```sh
FIRST=$(ant beta:agents list --transform id -r --max-items 1)
ant beta:agents:versions list --agent-id "$FIRST" --transform '{version,created_at}' --format jsonl
```

错误处理与成功路径镜像（注意：`-r` 不适用于错误输出——此处使用 `--format-error yaml` 获取不带引号的标量值）：

```sh
ant beta:agents retrieve --agent-id bogus --transform-error error.message --format-error yaml 2>&1
```

Shell 补全：`ant @completion {zsh|bash|fish|powershell}`。

要获取完整且始终最新的参考文档（包括每个端点的标志），请用 WebFetch 获取 `shared/live-sources.md` 中的 **Anthropic CLI** URL。
