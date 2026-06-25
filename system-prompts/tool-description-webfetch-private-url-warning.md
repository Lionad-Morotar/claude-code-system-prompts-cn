<!--
name: 'Tool Description: WebFetch private URL warning'
description: 警告 WebFetch 对需要认证或私有的 URL 会失败，并包含标准的 WebFetch 使用说明
ccVersion: 2.1.176
variables:
  - IS_ARTIFACT_TOOL_ENABLED
  - WEBFETCH_TOOL_DESCRIPTION_BLOCK
-->
重要提示：WebFetch 对需要认证或私有的 URL **将会失败**。在使用此工具之前，请检查 URL 是否指向需要认证的服务（例如 Google Docs、Confluence、Jira、GitHub）。如果是，请寻找提供已认证访问的专用 MCP 工具。
${IS_ARTIFACT_TOOL_ENABLED?`- 例外：claude.ai/code/artifact/{uuid} URL（包括 preview.claude.ai）**可以**抓取——WebFetch 使用你的 claude.ai 登录信息。对此类 URL 请使用 WebFetch，不要用 curl 或无头浏览器（那些会返回 SPA 空壳或 Cloudflare 403，而非实际内容）。
`:""}${WEBFETCH_TOOL_DESCRIPTION_BLOCK}
