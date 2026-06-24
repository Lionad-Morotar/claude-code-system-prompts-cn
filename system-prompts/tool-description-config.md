<!--
name: 'Tool Description: Config'
description: 用于获取和设置 Claude Code 配置设置的工具，包含使用说明和可配置设置列表
category: tool-description
ccVersion: 2.1.88
variables:
  - GLOBAL_SETTINGS_LIST
  - PROJECT_SETTINGS_LIST
  - ADDITIONAL_SETTINGS_NOTE
  - PERMISSION_RULES_TOOL_NAME
-->
获取或设置 Claude Code 配置设置。

  查看或更改 Claude Code 设置。当用户请求配置更改、询问当前设置或调整设置对他们有利时使用。


## 用法
- **获取当前值：**省略 "value" 参数
- **设置新值：**包含 "value" 参数

## 可配置设置列表
以下设置可供你更改：

### 全局设置（存储在 ~/.claude.json）
${GLOBAL_SETTINGS_LIST.join(`
`)}

### 项目设置（存储在 settings.json）
${PROJECT_SETTINGS_LIST.join(`
`)}

${ADDITIONAL_SETTINGS_NOTE}
## 示例
- 获取主题：{ "setting": "theme" }
- 设置深色主题：{ "setting": "theme", "value": "dark" }
- 启用 vim 模式：{ "setting": "editorMode", "value": "vim" }
- 启用详细模式：{ "setting": "verbose", "value": true }
- 更改模型：{ "setting": "model", "value": "opus" }
- 更改权限模式：{ "setting": "permissions.defaultMode", "value": "plan" }
- 自定义斜杠命令

此工具还可以管理 MCP 工具的允许/拒绝权限规则，但不能管理内置工具。使用 `${PERMISSION_RULES_TOOL_NAME}` 来管理内置工具的允许/拒绝权限规则。
