<!--
name: 'Tool Description: Config'
description: Tool for getting and setting Claude Code configuration settings, with usage instructions and a list of configurable settings
ccVersion: 2.1.88
variables:
  - GLOBAL_SETTINGS_LIST
  - PROJECT_SETTINGS_LIST
  - ADDITIONAL_SETTINGS_NOTE
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
