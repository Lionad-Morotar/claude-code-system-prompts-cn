<!--
name: '技能：从对话记录生成权限允许列表'
description: 分析会话对话记录，提取常用的只读工具调用模式，并将其添加到项目的 .claude/settings.json 权限允许列表中，以减少权限提示
ccVersion: 2.1.113
-->
# 更少的权限提示

查看我的对话记录中的 MCP 和 bash 工具调用，基于这些调用生成一个按优先级排序的模式列表，建议添加到权限允许列表中以减少权限提示。重点关注只读命令。

权限格式为：`Bash(foo*)`、`Bash(foo)`、`Bash(foo bar *)`、`mcp__slack__slack_read_thread` 等。

然后，将这些添加到项目的 `.claude/settings.json` 的 `permissions.allow` 下。

## 步骤

1. **定位对话记录。** 会话对话记录位于 `~/.claude/projects/<sanitized-cwd>/*.jsonl`。每行是一个 JSON 对象。工具调用以 `assistant` 消息的形式出现，其 `message.content[]` 条目包含 `type: "tool_use"`。`name` 字段标识工具（如 `"Bash"`、`"mcp__slack__slack_read_thread"`）；对于 Bash，`input.command` 是 shell 字符串。

   扫描用户所有项目目录中最近的对话记录 —— 不仅仅是当前项目 —— 这样允许列表才能反映实际使用情况。将扫描范围限制在合理数量的最近会话（例如最近修改的 50 个 JSONL 文件），以保持速度。

2. **提取工具调用频率。**
   - 对于 `Bash` 调用：解析 `input.command`，提取前导命令标记（处理 `sudo`、`timeout`、管道、`&&`、环境变量前缀）。记录命令 + 首个子命令对（如 `git status`、`gh pr view`、`ls`、`cat`）。
   - 对于 MCP 调用：记录完整的工具名称（如 `mcp__slack__slack_read_thread`）。
   - 统计在扫描的对话记录中出现的次数。

3. **过滤为只读操作。** 仅保留不会修改状态的命令。只读命令示例：`ls`、`cat`、`pwd`、`git status`、`git log`、`git diff`、`git show`、`git branch`、`rg`、`grep`、`find`、`head`、`tail`、`wc`、`file`、`which`、`echo`、`date`、`gh pr view`、`gh pr list`、`gh pr diff`、`gh issue view`、`gh issue list`、`gh run list`、`gh run view`、`gh api`（GET）、`bun run typecheck`、`bun run lint`、`bun run test`（针对不产生变更的测试）、`docker ps`、`docker logs`、`kubectl get`、`kubectl describe`、`ps`、`top`、`df`、`du`、`env`、`printenv`，以及名称中包含 `read`/`get`/`list`/`search`/`view` 的任何 MCP 工具。

   删除任何写入、删除、重命名、推送、合并、安装或运行具有副作用的构建/测试的命令。有疑问时，就不要包含。

   **永远不要允许会授予任意代码执行权限的通配符模式。** 对以下任何一项使用通配符规则（如 `Bash(python3:*)`）等同于允许任意代码执行。此列表并非穷举 —— 对同类别的任何内容都应用相同规则：
   - 解释器：`python`/`python3`、`node`、`bun`、`deno`、`ruby`、`perl`、`php`、`lua` 等
   - Shell：`bash`、`sh`、`zsh`、`fish`、`eval`、`exec`、`ssh` 等
   - 包运行器：`npx`、`bunx`、`uvx`、`uv run` 等
   - 任务运行器通配符：`npm run *`、`yarn run *`、`pnpm run *`、`bun run *`、`make *`、`just *`、`cargo run *`、`go run *` 等 —— 精确的 `Bash(bun run typecheck)` 是可以的，但 `Bash(bun run *)` 不可以
   - `gh api *`、`docker run`/`exec`、`kubectl exec`、`sudo` 等类似命令

4. **删除 Claude Code 已自动允许的命令。** 这些不需要加入允许列表 —— 它们从不会触发提示。如果在对话记录中看到这些命令，跳过它们；不要向用户建议。

   - **始终自动允许（任意参数）：** `cal`、`uptime`、`cat`、`head`、`tail`、`wc`、`stat`、`strings`、`hexdump`、`od`、`nl`、`id`、`uname`、`free`、`df`、`du`、`locale`、`groups`、`nproc`、`basename`、`dirname`、`realpath`、`cut`、`paste`、`tr`、`column`、`tac`、`rev`、`fold`、`expand`、`unexpand`、`fmt`、`comm`、`cmp`、`numfmt`、`readlink`、`diff`、`true`、`false`、`sleep`、`which`、`type`、`expr`、`test`、`getconf`、`seq`、`tsort`、`pr`、`echo`、`printf`、`ls`、`cd`、`find`。
   - **仅零参数时自动允许：** `pwd`、`whoami`、`alias`。
   - **精确形式自动允许：** `claude -h`、`claude --help`、`node -v`、`node --version`、`python --version`、`python3 --version`、`ip addr`。
   - **仅安全标志时自动允许（已验证）：** `xargs`、`file`、`sed`（只读表达式）、`sort`、`man`、`help`、`netstat`、`ps`、`base64`、`grep`、`egrep`、`fgrep`、`sha256sum`、`sha1sum`、`md5sum`、`tree`、`date`、`hostname`、`info`、`lsof`、`pgrep`、`tput`、`ss`、`fd`、`fdfind`、`aki`、`rg`、`jq`、`uniq`、`history`、`arch`、`ifconfig`、`pyright`。
   - **所有 git 只读子命令：** `git status`、`git log`、`git diff`、`git show`、`git blame`、`git branch`、`git tag`、`git remote`、`git ls-files`、`git ls-remote`、`git config --get`、`git rev-parse`、`git describe`、`git stash list`、`git reflog`、`git shortlog`、`git cat-file`、`git for-each-ref`、`git worktree list` 等。
   - **所有 gh 只读子命令：** `gh pr view`、`gh pr list`、`gh pr diff`、`gh pr checks`、`gh pr status`、`gh issue view`、`gh issue list`、`gh issue status`、`gh run view`、`gh run list`、`gh workflow list`、`gh workflow view`、`gh repo view`、`gh release view`、`gh release list`、`gh api`（GET）、`gh auth status` 等。
   - **Docker 只读子命令：** `docker ps`、`docker images`、`docker logs`、`docker inspect`。

   信息来源：`src/tools/BashTool/readOnlyValidation.ts`（`READONLY_COMMANDS`、`READONLY_NOARGS`、`READONLY_EXACT`、`COMMAND_ALLOWLIST`）和 `src/utils/shell/readOnlyCommandValidation.ts`（`GIT_READ_ONLY_COMMANDS`、`GH_READ_ONLY_COMMANDS`、`DOCKER_READ_ONLY_COMMANDS`、`RIPGREP_READ_ONLY_COMMANDS`、`PYRIGHT_READ_ONLY_COMMANDS`）。如果你在此仓库中且不确定某个命令是否已被覆盖，请搜索这些文件而不是猜测。

5. **选择模式形式。** 使用仍能覆盖观察到使用情况的最窄模式：
   - 如果用户运行多种变体（`git log`、`git log --oneline`、`git log main..HEAD`）：使用 `Bash(git log *)` —— 注意 `*` 前的空格，这对前缀匹配正确工作至关重要。
   - 如果单个精确调用很常见：使用 `Bash(foo)`，不带通配符。
   - 对于 MCP：逐字使用完整工具名称（不需要通配符；它们本身已经足够具体）。
   - 永远不要将模式放宽到与上述规则冲突的程度（禁止任意代码执行，禁止变更/副作用）。

6. **排序优先级。** 按计数降序排列。删除出现次数少于约 3 次的项 —— 不值得加入允许列表。将列表限制在前约 20 项，以便用户浏览。

7. **将排序列表展示给用户**，以 Markdown 表格形式，列包含：排名、模式、计数、单行描述。示例：

   | # | 模式 | 计数 | 备注 |
   |---|---------|-------|-------|
   | 1 | `Bash(git status *)` | 142 | 仓库状态检查 |
   | 2 | `Bash(gh pr view *)` | 87 | PR 查看 |
   | 3 | `mcp__slack__slack_read_thread` | 54 | Slack 话题读取 |

8. **合并到当前项目的 `.claude/settings.json`**（不是 `~/.claude/settings.json`，也不是 `.claude/settings.local.json`）。如果文件不存在则创建。保留现有键和 `permissions.allow` 中已有的条目；与已有条目去重；不删除任何内容；不重新排列无关字段。

9. **汇报结果。** 告诉用户你添加了什么（数量 + 几个示例）、哪些已在允许列表中、以及你跳过了什么及原因（如"已删除 `rm` 和 `git push` —— 非只读；已删除 `cat`/`ls`/`git status` —— 已自动允许，无需添加规则"）。

不要向 `permissions.deny` 或 `permissions.ask` 添加任何内容。不要修改任何其他设置字段。
