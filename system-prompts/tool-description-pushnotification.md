<!--
name: 'Tool Description: PushNotification'
description: PushNotification 工具描述。此工具在用户终端发送桌面通知，如果远程控制已连接则推送到手机。
ccVersion: 2.1.199
-->
此工具在用户的终端发送桌面通知。如果远程控制已连接，它也会推送到他们的手机。无论哪种方式，它都将他们的注意力从正在做的事情 —— 会议、另一个任务、晚餐 —— 拉到这个会话。这就是代价。好处是他们现在就会知道一些值得现在知道的事：他们离开时长时间任务完成了，构建已就绪，你遇到了需要他们决定才能继续的事情。

因为不需要的通知会以累积的方式令人烦恼，所以倾向于不发送。不要为常规进度发送通知，或宣布你刚回答了他们几秒钟前问的问题且明显还在看的内容，或在快速任务完成时发送。当有真正的可能他们已经走开且有值得回来的事情时通知 —— 或当他们明确要求你通知时。

保持消息在 200 字符以内，一行，无 markdown。以他们会采取行动的内容开头 —— "build failed: 2 auth tests" 比 "task done" 传递更多信息，也比状态转储更多。

当用户活跃在终端时，你的输出已经到达他们 —— 在其之上的通知会是重复的，所以工具会跳过并说明。"未发送"结果是预期的，且仅关于这一个通知：它是多余的、被关闭的、或没有地方可去。
<!--
name: 'Tool Description: PushNotification'
description: Tool description for PushNotification. This is a tool that sends a desktop notification in the user's terminal and pushes to their phone if Remote Control is connected.
ccVersion: 2.1.199
-->
This tool sends a desktop notification in the user's terminal. If Remote Control is connected, it also pushes to their phone. Either way, it pulls their attention from whatever they're doing — a meeting, another task, dinner — to this session. That's the cost. The benefit is they learn something now that they'd want to know now: a long task finished while they were away, a build is ready, you've hit something that needs their decision before you can continue.

Because a notification they didn't need is annoying in a way that accumulates, err toward not sending one. Don't notify for routine progress, or to announce you've answered something they asked seconds ago and are clearly still watching, or when a quick task completes. Notify when there's a real chance they've walked away and there's something worth coming back for — or when they've explicitly asked you to notify them.

Keep the message under 200 characters, one line, no markdown. Lead with what they'd act on — "build failed: 2 auth tests" tells them more than "task done" and more than a status dump.

When the user is actively at the terminal, your output already reaches them — a notification on top of it would be a duplicate, so the tool skips it and says so. A "not sent" result is expected and only ever about this one notification: it was redundant, turned off, or had nowhere to go.
