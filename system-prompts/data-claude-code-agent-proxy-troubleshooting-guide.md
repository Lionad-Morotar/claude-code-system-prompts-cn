<!--
name: 'Data: Claude Code 代理故障排查指南'
description: Claude Code 策略执行 HTTPS 代理的故障排查指南，涵盖 TLS 信任配置、状态检查、git、docker 及不支持的流量类型
ccVersion: 2.1.186
variables:
  - AGENT_PROXY_URL
  - AGENT_PROXY_CA_BUNDLE_PATH
  - AGENT_PROXY_STATE_DIR
  - AGENT_PROXY_PORT
-->
# Claude Code 代理

此会话的对外 HTTPS 请求经由本地代理 ${AGENT_PROXY_URL}
（通过 HTTPS_PROXY 设置），该代理通过隧道连接到策略执行的出口代理。TLS
在此处被重新终结，因此每个工具都必须信任位于
${AGENT_PROXY_CA_BUNDLE_PATH} 的 CA 证书包。标准的 CA 环境变量、系统信任
存储（在可能的情况下）、JVM 信任库、Bazel 系统 bazelrc、
浏览器 NSS 存储以及 gsutil 的 boto 配置均已预先设置。

## 快速诊断

1. 运行：curl -sS ${AGENT_PROXY_URL}/__agentproxy/status
   它会报告代理状态、哪些信任和 git 适配功能已激活
   （javaTrustStorePath、toolTrustFailureCodes、gitSshRewrite、
   gitConfigConflicts），以及最近的代理侧失败记录。
2. 找到下方对应的故障类别并应用匹配的修复方案；gitConfigConflicts
   代码对应 git 部分，toolTrustFailureCodes 对应 JVM 部分。
3. 绝不要禁用 TLS 验证，绝不要取消 HTTPS_PROXY 设置，并且不要重试
   组织策略拒绝的请求（403/407）——应当直接报告它们。

## 故障类别及修复方案

### "certificate verify failed" / "self-signed certificate in chain" / PKIX 错误

发生错误的工具未读取预先设置的 CA 配置。按顺序处理：

- 如果该工具有 CA 命令行标志或环境变量，将其指向 ${AGENT_PROXY_CA_BUNDLE_PATH}
  （例如：--cacert、SSL_CERT_FILE、NODE_EXTRA_CA_CERTS、REQUESTS_CA_BUNDLE、
  AWS_CA_BUNDLE、DENO_CERT、CARGO_HTTP_CAINFO、PIP_CERT、GIT_SSL_CAINFO、
  BUNDLE_SSL_CA_CERT、HEX_CACERTS_PATH、NIX_SSL_CERT_FILE）。
- 工具配置文件会覆盖环境变量。如果以下任一配置设定了自己的
  CA 或禁用了验证，将其改为指向此证书包：
  pip.conf 的 "cert"、npm 的 "cafile"（npm config get cafile）、~/.curlrc 的 "cacert"、
  .wgetrc 的 "ca_certificate"、conda 的 "ssl_verify"、git 的 "http.sslCAInfo"、
  gradle.properties / MAVEN_OPTS 的 "-Djavax.net.ssl.trustStore"。
- JVM 工具（Maven、Gradle、原生 Java）：当 JDK 存在时，会在
  ${AGENT_PROXY_STATE_DIR}/java-truststore.p12 构建一个信任库（密码为 "changeit"），
  并通过 JAVA_TOOL_OPTIONS 注入——在将构建指向它之前，请先在状态输出中确认
  javaTrustStorePath 已设置（toolTrustFailureCodes 解释了其缺失的原因）。
  如果镜像或构建过程设置了自己的 trustStore，则以它为准——将代理 CA 导入其中：
  keytool -importcert -noprompt -alias ccr-agent-proxy -file ${AGENT_PROXY_STATE_DIR}/agent-proxy-ca.crt -keystore <their store>
  或者将构建指向已准备好的信任库。Bazel 读取 /etc/bazel.bazelrc 中的托管块，
  而非 JAVA_TOOL_OPTIONS。

### 代理返回 "405 Method Not Allowed"

该工具发送了纯 HTTP（非 CONNECT）请求：通常是低于 1.16.1 的 axios 版本
（请升级），或者该工具配置了 HTTP_PROXY（为该工具取消 HTTP_PROXY——
仅支持 HTTPS_PROXY）。

### 代理返回 403 / 407

目标主机未被你组织的此会话出口策略允许。不要重试或绕过——直接报告被阻止的主机。
注意：curl 在 CONNECT 失败时会隐藏响应体；状态端点会记录原因。

### 工具完全忽略代理（超时且无代理错误）

某些客户端不读取 HTTPS_PROXY：Node 的内置 fetch（在 Node >= 22.21 上运行该命令时
使用 NODE_USE_ENV_PROXY=1）、aiohttp（传入 trust_env=True）、
Ruby bundler（仅读取 HTTP_PROXY，而此代理不提供 HTTP 代理服务）、
手写的 Go 拨号器。优先使用工具自身的代理选项（如果存在）。

### git

SSH 格式的 GitHub 远端（git@github.com:...）会自动重写为 HTTPS，
除非此会话有自己的 SSH 配置或提供了自己的
GIT_CONFIG_*（参见状态输出中的 gitSshRewrite）。如果 gitconfig 设置了
http.proxy / http.<url>.proxy（即使为空）、自己的 http.sslCAInfo，或
https-to-ssh 的 insteadOf，会导致 git 绕过代理或验证失败——
状态输出的 gitConfigConflicts 代码会指出检测到了上述哪种情况；
如果 git 超时，请为此会话调整这些配置项。

### docker build / docker run

容器内的进程无法访问 127.0.0.1:${AGENT_PROXY_PORT}，也不信任
此 CA。变通方案：使用 --network host 运行构建，将 ${AGENT_PROXY_CA_BUNDLE_PATH}
复制到构建上下文中并在早期层中安装，并显式将代理/CA
设置传递给构建过程。

### 不支持通过代理的流量（请报告，不要绕过）

gRPC / 仅 HTTP/2 的 API、WebSocket 升级、客户端 mTLS、证书固定
客户端（如 Snowflake、ngrok）、非 443 的 HTTPS 端口、原始 TCP 数据库。

如果某个工具无论如何都无法通过代理工作，请向你的
管理员或 Anthropic 支持报告，以便修复策略或工具配置。