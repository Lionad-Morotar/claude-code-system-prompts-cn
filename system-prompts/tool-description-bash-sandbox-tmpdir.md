<!--
name: '工具描述：Bash（沙盒模式 — tmpdir）'
description: 在沙盒模式下使用 $TMPDIR 创建临时文件
ccVersion: 2.1.53
variables:
  - SANDBOX_TMPDIR_FN
-->
对于临时文件，请始终使用 `$TMPDIR` 环境变量（或使用 `${SANDBOX_TMPDIR_FN()}` 作为备选）。在沙盒模式下，TMPDIR 会自动设置为正确的可写沙盒目录。请勿直接使用 `/tmp` —— 请使用 `$TMPDIR` 或 `${SANDBOX_TMPDIR_FN()}` 代替。
