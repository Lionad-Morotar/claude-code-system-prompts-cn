<!--
name: 'Data: Claude gateway landing page'
description: 在 Claude Code 网关根目录提供的 HTML 状态页面，显示网关标志、运行中的网关 URL、身份提供商主机、OAuth 发现链接和网关版本
ccVersion: 2.1.195
variables:
  - GATEWAY_ASCII_LOGO
  - GATEWAY_URL
  - IDENTITY_PROVIDER_HOST
  - HTML_ESCAPE_FN
  - GATEWAY_VERSION
-->
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Claude 网关 — 适用于 Amazon Bedrock、Google Cloud 和 Microsoft Foundry</title>
</head>
<body style="font-family: monospace; margin: 1em;">
<pre style="line-height: 1; margin: 0 0 1em 0;">${GATEWAY_ASCII_LOGO}</pre>
<pre style="margin: 0;">
<b>Claude 网关 — 适用于 Amazon Bedrock、Google Cloud 和 Microsoft Foundry</b>

运行于 ${GATEWAY_URL}

从 Claude Code 连接：
  管理员通过托管设置提供此网关 URL
  （forceLoginGatewayUrl）——然后 /login 直接连接到这里。

身份提供商       ${IDENTITY_PROVIDER_HOST}
发现端点       <a href="/.well-known/oauth-authorization-server">/.well-known/oauth-authorization-server</a>
版本            ${HTML_ESCAPE_FN(GATEWAY_VERSION)}
</pre>
</body>
</html>
