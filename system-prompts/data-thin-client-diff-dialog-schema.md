<!--
name: 'Data: Thin-client diff dialog schema'
description: 瘦客户端 diff 对话框使用的工作区 git diff 载荷的内部数据描述
ccVersion: 2.1.198
-->
@internal 瘦客户端 /diff 对话框的工作区 git diff。当工作区不是 git 仓库或处于临时 git 状态（merge/rebase/cherry-pick）时，diff 为 null。skippedLarge 中的路径根本不携带 hunks 条目 — 成员身份本身就标记它们为过大。当所有更改都是未跟踪的（仅统计 — git diff 不为未跟踪文件生成 hunks）或每个文件都被保留时，完全空的 hunks 数组加上非空的 perFileStats 本身不是失败信号：这是正常的形状，也可能在 hunks 获取临时失败且仅有统计数据可用时出现。
