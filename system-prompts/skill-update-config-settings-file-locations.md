<!--
name: 'Skill: Update config settings file locations'
description: Where Claude Code stores settings.json across scopes
ccVersion: 2.1.210
-->
## 设置文件位置

根据作用域选择适当的文件：

| 文件 | 作用域 | Git | 用途 |
|------|--------|-----|------|
| `~/.claude/settings.json` | 全局 | 不适用 | 所有项目的个人偏好 |
| `.claude/settings.json` | 项目 | 提交 | 团队范围的钩子、权限、插件 |
| `.claude/settings.local.json` | 项目 | 忽略 | 此项目的个人覆盖 |

设置按顺序加载：用户 → 项目 → 本地（后面的覆盖前面的）。

## 设置架构参考

### 权限
```json
{
  "permissions": {
    "allow": ["Bash(npm *)", "Edit(.claude)", "Read"],
    "deny": ["Bash(rm -rf *)"],
    "ask": ["Edit(//etc/*)"],
    "defaultMode": "default" | "plan" | "acceptEdits" | "dontAsk",
    "additionalDirectories": ["/extra/dir"]
  }
}
```

**权限规则语法：**
- 精确匹配：`"Bash(npm run test)"`
- 前缀通配符：`"Bash(git *)"` - 匹配 `git`、`git status`、`git commit` 等。
- 仅工具：`"Read"` - 允许所有 Read 操作

### 环境变量
```json
{
  "env": {
    "DEBUG": "true",
    "MY_API_KEY": "value"
  }
}
```

### 模型与代理
```json
{
  "model": "sonnet",  // 或 "fable"、"opus"、"haiku"，完整模型 ID
  "agent": "agent-name",
  "alwaysThinkingEnabled": true
}
```

### 归属（提交和 PR）
```json
{
  "attribution": {
    "commit": "自定义提交尾随文本",
    "pr": "自定义 PR 描述文本"
  }
}
```
将 `commit` 或 `pr` 设置为空字符串 `""` 以隐藏该归属。

### MCP 服务器管理
```json
{
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": ["server1", "server2"],
  "disabledMcpjsonServers": ["blocked-server"]
}
```

### 插件
```json
{
  "enabledPlugins": {
    "formatter@anthropic-tools": true
  }
}
```
插件语法：`plugin-name@source`，其中 source 为 `claude-code-marketplace`、`claude-plugins-official` 或 `builtin`。

### 其他设置
- `language`：首选响应语言（例如 "japanese"）
- `cleanupPeriodDays`：自动清理前保留转录的天数（默认：30；最小 1）
- `respectGitignore`：是否遵守 .gitignore（默认：true）
- `spinnerTipsEnabled`：在加载动画中显示提示
- `spinnerVerbs`：自定义加载动画动词（`{ "mode": "append" | "replace", "verbs": [...] }`）
- `spinnerTipsOverride`：覆盖加载动画提示（`{ "excludeDefault": true, "tips": ["自定义提示"] }`）
- `syntaxHighlightingDisabled`：禁用 diff 高亮
<!--
name: 'Skill: Update config settings file locations'
description: Where Claude Code stores settings.json across scopes
ccVersion: 2.1.210
-->
## Settings File Locations

Choose the appropriate file based on scope:

| File | Scope | Git | Use For |
|------|-------|-----|---------|
| `~/.claude/settings.json` | Global | N/A | Personal preferences for all projects |
| `.claude/settings.json` | Project | Commit | Team-wide hooks, permissions, plugins |
| `.claude/settings.local.json` | Project | Gitignore | Personal overrides for this project |

Settings load in order: user → project → local (later overrides earlier).

## Settings Schema Reference

### Permissions
```json
{
  "permissions": {
    "allow": ["Bash(npm *)", "Edit(.claude)", "Read"],
    "deny": ["Bash(rm -rf *)"],
    "ask": ["Edit(//etc/*)"],
    "defaultMode": "default" | "plan" | "acceptEdits" | "dontAsk",
    "additionalDirectories": ["/extra/dir"]
  }
}
```

**Permission Rule Syntax:**
- Exact match: `"Bash(npm run test)"`
- Prefix wildcard: `"Bash(git *)"` - matches `git`, `git status`, `git commit`, etc.
- Tool only: `"Read"` - allows all Read operations

### Environment Variables
```json
{
  "env": {
    "DEBUG": "true",
    "MY_API_KEY": "value"
  }
}
```

### Model & Agent
```json
{
  "model": "sonnet",  // or "fable", "opus", "haiku", full model ID
  "agent": "agent-name",
  "alwaysThinkingEnabled": true
}
```

### Attribution (Commits & PRs)
```json
{
  "attribution": {
    "commit": "Custom commit trailer text",
    "pr": "Custom PR description text"
  }
}
```
Set `commit` or `pr` to empty string `""` to hide that attribution.

### MCP Server Management
```json
{
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": ["server1", "server2"],
  "disabledMcpjsonServers": ["blocked-server"]
}
```

### Plugins
```json
{
  "enabledPlugins": {
    "formatter@anthropic-tools": true
  }
}
```
Plugin syntax: `plugin-name@source` where source is `claude-code-marketplace`, `claude-plugins-official`, or `builtin`.

### Other Settings
- `language`: Preferred response language (e.g., "japanese")
- `cleanupPeriodDays`: Days to keep transcripts before automatic cleanup (default: 30; minimum 1)
- `respectGitignore`: Whether to respect .gitignore (default: true)
- `spinnerTipsEnabled`: Show tips in spinner
- `spinnerVerbs`: Customize spinner verbs (`{ "mode": "append" | "replace", "verbs": [...] }`)
- `spinnerTipsOverride`: Override spinner tips (`{ "excludeDefault": true, "tips": ["Custom tip"] }`)
- `syntaxHighlightingDisabled`: Disable diff highlighting
