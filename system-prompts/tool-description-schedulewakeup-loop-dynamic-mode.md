<!--
name: 'Tool Description: ScheduleWakeup (/loop dynamic mode)'
description: 描述 ScheduleWakeup 工具在 /loop 动态（自定节奏）模式下调度下一次迭代的用法，包括自主循环的哨兵处理
ccVersion: 2.1.101
-->
调度在 /loop 动态模式下何时恢复工作 —— 用户在没有时间间隔的情况下调用了 /loop，要求你为特定任务自定节奏迭代。

每次通过 `prompt` 传回相同的 /loop 提示词，以便下次触发时重复该任务。对于自主 /loop（无用户提示词），将字面哨兵 `${"<<autonomous-loop-dynamic>>"}` 作为 `prompt` 传递 —— 运行时会在触发时将其解析回自主循环指令。（存在类似的 `${"<<autonomous-loop>>"}` 哨兵用于基于 CronCreate 的自主循环；不要混淆两者 —— ${"ScheduleWakeup"} 始终使用 `-dynamic` 变体。）省略调用以结束循环。
