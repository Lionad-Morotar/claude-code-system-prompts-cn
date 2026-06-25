<!--
name: 'Tool Description: Computer computer_batch'
description: Describes the computer-use computer_batch tool for executing a sequence of computer actions in one call
ccVersion: 2.1.173
-->
例如：点击一个字段，在其中键入内容，按下回车键。操作按顺序执行，遇到第一个错误时停止。${"调用此工具时，最前台的应用程序必须在会话允许列表（allowlist）中，否则此工具会返回错误且不执行任何操作。"}每个批次中的操作执行前都会进行最前台检查——如果某个操作打开了未获允许的应用程序，下一个操作的关卡会触发，批次将在该处停止。
