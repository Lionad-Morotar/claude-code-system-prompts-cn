<!--
name: 'Tool Description: WebFetch (concise)'
description: WebFetch 的简洁工具描述，涵盖 URL 抓取、私有 URL 限制、重定向和缓存
ccVersion: 2.1.176
variables:
  - IS_ARTIFACT_TOOL_ENABLED
-->
抓取一个 URL，将页面转换为 markdown，并使用一个小型快速模型根据 `prompt` 回答问题。

- 对需要认证或私有的 URL 会失败——对此类 URL 请使用已认证的 MCP 工具或 `gh`。${IS_ARTIFACT_TOOL_ENABLED?" 例外：claude.ai/code/artifact/{uuid} URL 可通过你的 claude.ai 登录信息抓取——使用 WebFetch，不要用 curl（curl 会返回 SPA 空壳或 Cloudflare 403）。":""}
- HTTP 会被升级为 HTTPS。跨主机重定向会返回给你而非自动跟随；请使用重定向 URL 重新调用。
- 响应按 URL 缓存 15 分钟。
