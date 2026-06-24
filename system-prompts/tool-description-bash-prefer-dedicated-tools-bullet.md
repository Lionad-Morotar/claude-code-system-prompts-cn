<!--
name: 'Tool Description: Bash (prefer dedicated tools bullet)'
description: 提醒优先使用专用工具而非 Bash 进行 find、grep、cat 等操作的要点式警告
ccVersion: 2.1.133
variables:
  - READ_ONLY_SEARCHING_BASH_COMMANDS
-->
- 重要提示：除非明确指示或你已验证专用工具无法完成任务，否则避免使用此工具运行 ${READ_ONLY_SEARCHING_BASH_COMMANDS} 命令。相反，使用适当的专用工具，因为这将为用户提供更好的体验。
