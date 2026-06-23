<!--
name: 'Tool Description: request_teach_access (part of teach mode)'
description: 描述一个工具，用于请求权限以使用全屏工具提示覆盖层逐步引导用户完成任务，而非直接访问
ccVersion: 2.1.84
-->
请求权限以使用屏幕上的工具提示逐步引导用户完成任务。当用户想要学习如何做某事（如"教我"、"带我走一遍"、"给我演示"、"帮我学习"）时，使用此工具 INSTEAD OF request_access。批准后，主 Claude 窗口隐藏，出现全屏工具提示覆盖层。然后你重复调用 teach_step；每次调用显示一个工具提示并等待用户点击"下一步"。与应用允许列表相同的语义，但没有剪贴板/系统键标志。教学模式在你的回合结束时自动结束。
