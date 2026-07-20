<!--
name: 'Data: Governed GitHub CLI shim routing'
description: Shell routing logic for the governed gh shim, including GitHub host detection, real gh fallback execution, agent proxy settings, CA bundle configuration, and proxy-injected tokens
ccVersion: 2.1.202
variables:
  - GITHUB_HOST
  - REAL_GH_PATH
  - AGENT_PROXY_URL
  - AGENT_PROXY_CA_BUNDLE_PATH
-->
# 非 github.com 的 origin 作为 GHE 信号。显式的 github.com 主机
# 会跳过 origin 探测：它不能被 checkout 启发式
# 从中继中踢出。
rhost=''
if [ -n "$repo" ]; then
  case "$repo" in
    *://*) rhost="${repo#*://}"; rhost="${rhost%%/*}"; rhost="${rhost##*@}"; rhost="${rhost%%:*}" ;;
    */*/*) rhost="${repo%%/*}" ;;
  esac
elif [ -z "$host" ]; then
  origin="$(git config --get remote.origin.url 2>/dev/null || true)"
  case "$origin" in
    *://*) rhost="${origin#*://}"; rhost="${rhost%%/*}"; rhost="${rhost##*@}"; rhost="${rhost%%:*}" ;;
    *@*:*) rhost="${origin#*@}"; rhost="${rhost%%:*}" ;;
  esac
fi
rhost="$(printf %s "$rhost" | tr '[:upper:]' '[:lower:]')"
if [ -n "$rhost" ] && [ "$rhost" != '${GITHUB_HOST}' ]; then
  exec '${REAL_GH_PATH}' "$@"
fi
# NO_PROXY 已清除：环境中的 runner-host NO_PROXY 覆盖
# github.com 会使 gh 跳过中继并将字面虚拟
# 令牌发送到真实的 GitHub API（硬 401）。
HTTPS_PROXY='${AGENT_PROXY_URL}' https_proxy='${AGENT_PROXY_URL}' \
NO_PROXY='' no_proxy='' \
SSL_CERT_FILE='${AGENT_PROXY_CA_BUNDLE_PATH}' \
GH_TOKEN='proxy-injected' GITHUB_TOKEN='proxy-injected' \
exec '${REAL_GH_PATH}' "$@"
