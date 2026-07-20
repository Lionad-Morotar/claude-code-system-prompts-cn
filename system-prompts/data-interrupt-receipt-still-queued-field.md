<!--
name: 'Data: Interrupt receipt still queued field'
description: Schema description for the still_queued UUID list returned by interrupt control responses
ccVersion: 2.1.205
-->
在此中断后仍然存活的异步用户消息的 UUID：仍在队列中的命令，加上任何已经出队用于即将到来的回合但尚未被中止触及的批次。这些消息 WILL 会运行，除非先被取消。取消粒度：仍在队列中的 UUID 可通过 cancel_async_message 单独取消；一旦批次出队并合并为一个回合，取消一个非代表成员 UUID 是空操作（其内容仍然运行），而取消批次代表 UUID 会丢弃整个合并批次 — 在这两种情况下，取消响应都报告 cancelled:false，因为消息已不在队列中。覆盖范围注意事项：只有带 UUID 标记的消息会出现（没有 UUID 就入队的消息仍然运行但永远不会被列出，所以 [] 并不意味着"什么都不运行"）；只列出主线程消息（发往子代理的消息不在范围内）；并且列表可能包含内部入队的 UUID（客户端从未发送过的 — 定时任务触发器、自动恢复续接）— 忽略未知的 UUID 而不是将其视为错误。顺序：在干净的中断时，此回执在被中断的回合结果之前写入；在中断处理期间崩溃的回合会通过直接写入路径发出其错误结果，该路径可能先于回执。快照与中止处理同步获取 — 在被中断的结果之后探测队列总是会输给排空循环，后者会立即启动下一个排队的回合。
