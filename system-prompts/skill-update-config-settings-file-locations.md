<!-- 
name: skill-update-config-settings-file-locations
description: Settings file locations for the update-config skill. Inline fragment. 
ccVersion: ${ccVersion}
variables: {}
-->

## 设置文件位置（Settings File Locations）

根据作用域选择合适的文件：

| 文件 | 作用域 | Git | 用途 |
|------|--------|-----|------|
| `~/.claude/settings.json` | 全局 | N/A | 所有项目的个人偏好 |
| `.claude/settings.json` | 项目 | 提交 | 团队级钩子、权限、插件 |
| `.claude/settings.local.json` | 项目 | Gitignore | 此项目的个人覆盖 |

设置按以下顺序加载：用户 → 项目 → 本地（后者覆盖前者）。

## 设置模式参考（Settings Schema Reference）

### 权限（Permissions）
```json
{
  "permissions": {
    "allow": ["Bash(npm *)", "Edit(.claude)", "Read"],
    "deny": ["Bash(rm -rf *)"],
    "ask": ["Write(/etc/*)"],
    "defaultMode": "default" | "plan" | "acceptEdits" | "dontAsk",
    "additionalDirectories": ["/extra/dir"]
  }
}
```

**权限规则语法：**
- 精确匹配：`"Bash(npm run test)"`
- 前缀通配符：`"Bash(git *)"` —— 匹配 `git`、`git status`、`git commit` 等
- 仅工具名：`"Read"` —— 允许所有 Read 操作

### 环境变量（Environment Variables）
```json
{
  "env": {
    "DEBUG": "true",
    "MY_API_KEY": "value"
  }
}
```

### 模型与代理（Model & Agent）
```json
{
  "model": "sonnet",  // 或 "fable"、"opus"、"haiku"、完整模型 ID
  "agent": "agent-name",
  "alwaysThinkingEnabled": true
}
```

### 归属标记（Attribution — 提交与 PR）
```json
{
  "attribution": {
    "commit": "自定义提交尾注文本",
    "pr": "自定义 PR 描述文本"
  }
}
```
将 `commit` 或 `pr` 设为空字符串 `""` 可隐藏相应的归属标记。

### MCP 服务器管理（MCP Server Management）
```json
{
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": ["server1", "server2"],
  "disabledMcpjsonServers": ["blocked-server"]
}
```

### 插件（Plugins）
```json
{
  "enabledPlugins": {
    "formatter@anthropic-tools": true
  }
}
```
插件语法：`plugin-name@source`，其中 source 为 `claude-code-marketplace`、`claude-plugins-official` 或 `builtin`。

### 其他设置（Other Settings）
- `language`：首选回复语言（例如 `"japanese"`）
- `cleanupPeriodDays`：自动清理前保留转录记录的天数（默认：30；最小值为 1）
- `respectGitignore`：是否遵循 .gitignore（默认：true）
- `spinnerTipsEnabled`：在加载动画中显示提示
- `spinnerVerbs`：自定义加载动画动词（`{ "mode": "append" | "replace", "verbs": [...] }`）
- `spinnerTipsOverride`：覆盖加载动画提示（`{ "excludeDefault": true, "tips": ["自定义提示"] }`）
- `syntaxHighlightingDisabled`：禁用差异高亮
