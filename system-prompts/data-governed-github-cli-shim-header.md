<!--
name: 'Data: Governed GitHub CLI shim header'
description: Header comments for the per-session governed GitHub CLI shim that routes github.com gh traffic through the agent proxy while preserving customer-token and GitHub Enterprise traffic
ccVersion: 2.1.202
-->
#!/bin/sh
# claude agent-proxy governed-git gh shim (auto-generated; per-session).
# 仅当调用不携带客户凭据时，才将 gh 到 github.com 的流量
# 通过会话中继路由。GHE 目标（GH_HOST、--hostname、
# -R/--repo/GH_REPO 指定非 github.com 主机，或当前目录
# checkout 中非 github.com 的 origin remote）以及
# 真实客户令牌调用直接在客户自己的出口执行，
# 因此客户凭据永远不会经过中继隧道，
# 且 gh 到 GHE 仍可正常工作。
# 真实客户令牌单独决定，优先检查（无成本）：
# gh 主动发送 GH_TOKEN/GITHUB_TOKEN，而 GHE 作用域的
# 企业对意味着 gh 可能以检查无法预见的方式
# 指向 GHE 主机
