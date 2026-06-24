<!--
name: 'Tool Description: RemoteTrigger prompt'
description: 调用 claude.ai RemoteTrigger API 的工具提示词，用于列出、获取、创建、更新或运行定时远程代理例程
ccVersion: 2.1.128
-->
调用 claude.ai 的 remote-trigger API。使用此工具而非 curl —— OAuth 令牌在进程内自动添加，绝不暴露。

操作：
- list: GET /v1/code/triggers
- get: GET /v1/code/triggers/{trigger_id}
- create: POST /v1/code/triggers（需要 body）
- update: POST /v1/code/triggers/{trigger_id}（需要 body，部分更新）
- run: POST /v1/code/triggers/{trigger_id}/run（body 可选）

响应是来自 API 的原始 JSON。对于 create/update，会追加一行摘要，包含服务器解析的运行时间和例程的 claude.ai URL —— 将这两者都转达给用户，以便他们确认时间正确并知道结果将出现在哪里。