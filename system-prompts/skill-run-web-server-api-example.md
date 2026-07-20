<!--
name: 'Skill: Run web server API example'
description: Run 技能示例文件，展示如何记录服务器或 API 的生命周期，包括后台启动、就绪检查、curl 验证和关闭
ccVersion: 2.1.213
-->
# 示例：Web 服务器 / API

服务器特有的关注点是**生命周期**：Agent 需要在后台启动服务器，验证它已启动，与之交互，然后干净地关闭它。阻塞 shell 的前台 `npm start` 对 Agent 毫无用处。

## 应遵循的结构

一个好的服务器 run 技能包含：

1. **Prerequisites & Setup**——与任何项目相同。
2. **Run**——后台启动模式（见下文），而非阻塞命令。
3. **Verify**——一条 `curl` 或类似命令，确认服务器确实已启动。
4. **Stop**——如何干净地终止后台进程。

如果后台启动 + 就绪轮询 + 冒烟 curl 序列超过几行，将其放入技能目录中的 `smoke.sh`，并在 `SKILL.md` 中写"运行冒烟脚本"。一条命令，退出码告诉你服务器是否健康。

## 后台启动模式

不要写：

> ```bash
> npm start
> ```

那是阻塞的。相反，展示如何在后台启动、等待就绪、以及之后找到 PID：

> ```bash
> npm start &> /tmp/server.log &
> SERVER_PID=$!
>
> # 等待服务器启动（根据需要调整超时时间/端口）
> for i in {1..30}; do
>   curl -sf http://localhost:3000/health > /dev/null && break
>   sleep 1
> done
> ```

然后是验证步骤：

> ```bash
> curl http://localhost:3000/health
> # → {"status":"ok"}
> ```

以及停止：

> ```bash
> kill $SERVER_PID
> # $! 是 npm 包装器的 PID，npm 不会将 SIGTERM 转发给
> # 它启动的服务器——杀死端口监听者才是可靠释放它的方式：
> lsof -ti:3000 -sTCP:LISTEN | xargs -r kill
> ```

优先使用捕获的 PID 或端口而非 `pkill -f "<pattern>"`。宽泛的模式如 `pkill -f "next|vite|node"` 会匹配代理自身的命令行，可能杀死运行它们的会话。

## 值得记录的细节

- **使用哪个端口。** 明确说明并指出如何覆盖（`PORT=4000 npm start`）。
- **什么表示"就绪"。** 一条特定的日志行或一个健康检查端点。
- **必需的环境变量。** 数据库 URL、API 密钥等——如果列表很长，提供一个模板 `.env` 文件。
- **热重载 vs 生产模式。** 如果两者有实质性差异，说明使用哪个以及何时使用。
- **依赖服务。** 如果服务器需要 Redis/Postgres 等，要么指向一个 docker-compose 来启动它们，要么直接包含 `docker run` 命令。

## 示例片段

以下是一个典型的 Node API 的 Run 部分的样子：

> ## Run
>
> 在后台启动 dev server：
>
> ```bash
> npm run dev &> /tmp/api.log &
> ```
>
> 服务器监听端口 3000。等待它就绪，然后验证：
>
> ```bash
> for i in {1..20}; do
>   curl -sf http://localhost:3000/health && break
>   sleep 0.5
> done
> curl http://localhost:3000/health
> # → {"status":"ok","version":"1.2.3"}
> ```
>
> 日志位于 `/tmp/api.log`。通过杀死端口监听者停止（`npm run dev &` 后的 `$!` 是 npm 包装器，npm 不会将 SIGTERM 转发给它启动的服务器）：
>
> ```bash
> lsof -ti:3000 -sTCP:LISTEN | xargs -r kill
> ```
>
> ### 环境变量
>
> | 变量 | 必需 | 默认值 | 说明 |
> |---|---|---|---|
> | `DATABASE_URL` | 是 | — | Postgres 连接字符串 |
> | `PORT` | 否 | `3000` | |
> | `LOG_LEVEL` | 否 | `info` | `debug` / `info` / `warn` / `error` |
