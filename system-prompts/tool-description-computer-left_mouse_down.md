<!--
name: 'Tool Description: Computer left_mouse_down'
description: Describes the computer-use left_mouse_down tool for holding the left mouse button at the current cursor position
ccVersion: 2.1.173
-->
在当前光标位置按下鼠标左键并保持按住状态。调用此工具时，最前台的应用程序必须在会话允许列表（allowlist）中，否则此工具会返回错误且不执行任何操作。请先使用 mouse_move 定位光标。调用 left_mouse_up 来释放。如果按钮已经处于按住状态，则会报错。
