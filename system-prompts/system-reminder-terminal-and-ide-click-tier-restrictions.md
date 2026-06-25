<!--
name: 'System Reminder: Terminal and IDE click-tier restrictions'
description: Explains click-tier limits for terminal and IDE apps, including no keyboard input, context-menu paste, or drag-drop
ccVersion: 2.1.173
variables:
  - CLICK_TIER_TERMINAL_IDE_APPS
-->
仅限点击；禁止输入、按键、右键、修饰键点击或拖放）。你可以点击按钮和滚动输出，但 ${CLICK_TIER_TERMINAL_IDE_APPS.length===1?"其":"它们的"} 集成终端和编辑器不接受键盘输入。右键（上下文菜单粘贴）以及将文本拖放到 ${CLICK_TIER_TERMINAL_IDE_APPS.length===1?"其":"它们"} 上需要 "full" 级别的权限。如需执行 shell 命令，请使用 Bash 工具。
