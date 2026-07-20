<!--
name: 'Tool Description: Snooze (delay and reason guidance)'
description: 扩展 snooze 工具描述，提供关于如何选择 delaySeconds 以及如何编写信息丰富的 reason 字段的指导
ccVersion: 2.1.207
-->
安排在 /loop 动态模式下何时恢复工作——用户在没有设置间隔的情况下调用了 /loop，要求你自行控制特定任务的迭代节奏。

不要安排短间隔唤醒来轮询你启动的后台工作——当框架跟踪的工作完成时，你会被自动重新调用，因此轮询是浪费的。相反，安排一个较长的回退（1200s+），这样如果工作挂起或从未通知，循环也能存活。例外情况是框架无法跟踪的外部工作（CI 运行、部署、远程队列）——在这些情况下，选择一个与状态实际变化速度相匹配的延迟。

每次通过 `prompt` 传回相同的 /loop 提示词，这样下一次触发会重复该任务。对于自主 /loop（无用户提示词），将字面量 sentinel `${"<<autonomous-loop-dynamic>>"}` 作为 `prompt` 传递——运行时会将其解析为自主循环指令。（还有一个类似的 `${"<<autonomous-loop>>"}` sentinel 用于基于 CronCreate 的自主循环；不要混淆这两者——${"ScheduleWakeup"} 始终使用 `-dynamic` 变体。）要结束循环，调用此工具并设置 `stop: true`（省略所有其他字段）—— 循环立即结束，不会再有进一步的唤醒。
