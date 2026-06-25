<!--
name: '工具描述：Bash（沙盒模式 — tmpdir）'
description: 在沙盒模式下使用 $TMPDIR 创建临时文件
ccVersion: 2.1.154
-->
对于临时文件，请始终使用 `$TMPDIR` 环境变量。无论沙盒还是非沙盒命令，TMPDIR 都设置为同一个可写的沙盒目录。请勿直接使用 `/tmp` —— 请使用 `$TMPDIR` 代替。
