---
name: verify-serverapi-changes-example-for-verify-skill
description: An example of Server API changes for the verify skill
---

# 验证服务端/API 变更

处理方式是通过 `curl`（或等效工具）。证据是响应结果。

## 模式

1. 启动服务器（后台运行，带有就绪轮询——见下方说明）
2. 用 `curl` 请求变更所涉及的路由，传入能触发已变更分支的输入
3. 捕获完整响应（状态码 + 请求头 + 响应体）
4. 与预期结果比较

## 生命周期

如果有运行技能，则由其处理。如果没有：

```bash
<启动命令> &> /tmp/server.log &
SERVER_PID=$!
for i in {1..30}; do curl -sf localhost:PORT/health >/dev/null && break; sleep 1; done
# ... 你的 curl 请求 ...
kill $SERVER_PID
```

没有就绪端点？轮询你即将测试的路由，直到其不再返回连接拒绝，然后再等待一个节拍。

## 实际示例

**变更：** 在 `rateLimit.ts` 中为 429 响应添加了 `Retry-After` 请求头。
**声明（PR 描述）：** "客户端现在可以正确退避了。"

**推断：** 触发速率限制后，响应头中现在应返回 `Retry-After: <n>`。之前没有。

**计划：**
1. 启动服务器
2. 对速率受限的端点发起足够多的请求以触发 429
3. 检查 429 响应是否包含 `Retry-After` 请求头
4. 检查其值是否为正整数

**执行：**
```bash
# 触发限制——10 次快速请求，根据变更，限制为每秒 5 次
for i in {1..10}; do curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/thing; done
# → 200 200 200 200 200 429 429 429 429 429

# 捕获 429 的请求头
curl -si localhost:3000/api/thing | head -20
# → HTTP/1.1 429 Too Many Requests
# → Retry-After: 12
# → ...
```

**结论：** 通过——`Retry-After: 12` 已存在，值为正整数。

## 失败的表现形式

- 请求头缺失 → 变更未生效，或你实际未触发 429 路径（先检查状态码）
- 请求头存在但值为 `NaN` / `undefined` / 负数 → 逻辑有误
- 始终返回 200 → 你从未触发变更的路径。增加请求爆发量或检查速率限制配置
