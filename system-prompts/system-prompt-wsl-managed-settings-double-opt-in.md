<!--
name: 'System Prompt: WSL managed settings double opt-in'
description: 说明 WSL 只有在管理员启用了标志后才能读取 Windows 托管设置策略链，而 HKCU 还需要用户额外确认
ccVersion: 2.1.118
-->
当此标志在仅管理员可修改的 Windows 源中设置为 true 时——HKLM SOFTWARE/Policies/ClaudeCode 注册表键或 C:/Program Files/ClaudeCode/managed-settings.json——WSL 会从完整的 Windows 策略链（HKLM、通过 DrvFs 访问的 C:/Program Files/ClaudeCode、HKCU）以及 /etc/claude-code 中读取托管设置。Windows 源具有更高优先级。此标志也必须在 HKCU 本身中设置，HKCU 策略才能在 WSL 上生效（双重确认：管理员启用策略链，用户确认 HKCU）。在原生 Windows 上此标志无效。
