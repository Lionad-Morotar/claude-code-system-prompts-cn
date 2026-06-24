<!--
name: '技能：更新 Claude Code 配置'
description: 用于修改 Claude Code 配置文件（settings.json）的技能。
ccVersion: 2.1.108
variables:
  - SETTINGS_FILE_LOCATION_PROMPT
  - HOOKS_CONFIGURATION_PROMPT
  - CONSTRUCTING_HOOK_PROMPT
-->

# 更新配置技能

通过更新 settings.json 文件来修改 Claude Code 配置。

## 何时需要钩子（而非内存）

如果用户希望响应某个事件时自动执行某些操作，他们需要在 settings.json 中配置**钩子**。内存/偏好设置无法触发自动化操作。

**以下场景需要钩子：**
- "在压缩之前，问我保留什么" → PreCompact 钩子
- "写入文件后，运行 prettier" → 带有 Write|Edit 匹配器的 PostToolUse 钩子
- "当我运行 bash 命令时，记录它们" → 带有 Bash 匹配器的 PreToolUse 钩子
- "代码更改后始终运行测试" → PostToolUse 钩子

**钩子事件：** PreToolUse、PostToolUse、PreCompact、PostCompact、Stop、Notification、SessionStart

## 关键：写入前先读取

**在修改之前务必先读取现有的设置文件。** 将新设置与现有设置合并——切勿替换整个文件。

## 关键：歧义时使用 AskUserQuestion

当用户的请求存在歧义时，使用 AskUserQuestion 进行澄清：
- 修改哪个设置文件（用户/项目/本地）
- 是添加到现有数组还是替换它们
- 存在多个选项时的具体取值

## 决策：Config 工具 vs 直接编辑

**使用 Config 工具**处理以下简单设置：
- `theme`、`editorMode`、`verbose`、`model`
- `language`、`alwaysThinkingEnabled`
- `permissions.defaultMode`

**直接编辑 settings.json**用于：
- 钩子（PreToolUse、PostToolUse 等）
- 复杂的权限规则（allow/deny 数组）
- 环境变量
- MCP 服务器配置
- 插件配置

## 工作流程

1. **澄清意图** - 如果请求存在歧义，先询问
2. **读取现有文件** - 对目标设置文件使用 Read 工具
3. **仔细合并** - 保留现有设置，特别是数组
4. **编辑文件** - 使用 Edit 工具（如果文件不存在，先要求用户创建）
5. **确认** - 告知用户所做的更改

## 合并数组（重要！）

向权限数组或钩子数组添加内容时，**与现有数组合并，而非替换：**

**错误做法**（替换了现有权限）：
```json
{ "permissions": { "allow": ["Bash(npm *)"] } }
```

**正确做法**（保留已有项 + 添加新项）：
```json
{
  "permissions": {
    "allow": [
      "Bash(git *)",      // 已有
      "Edit(.claude)",    // 已有
      "Bash(npm *)"       // 新增
    ]
  }
}
```

${SETTINGS_FILE_LOCATION_PROMPT}

${HOOKS_CONFIGURATION_PROMPT}

${CONSTRUCTING_HOOK_PROMPT}

## 示例工作流程

### 添加钩子

用户："Claude 写入文件后格式化我的代码"

1. **澄清**：使用哪个格式化工具？（prettier、gofmt 等）
2. **读取**：`.claude/settings.json`（如果不存在则创建）
3. **合并**：添加到现有钩子中，不要替换
4. **结果**：
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "jq -r '.tool_response.filePath // .tool_input.file_path' | { read -r f; prettier --write \"$f\"; } 2>/dev/null || true"
      }]
    }]
  }
}
```

### 添加权限

用户："允许 npm 命令而无需提示"

1. **读取**：现有权限
2. **合并**：将 `Bash(npm *)` 添加到 allow 数组
3. **结果**：与现有 allow 项合并

### 环境变量

用户："设置 DEBUG=true"

1. **决定**：用户设置（全局）还是项目设置？
2. **读取**：目标文件
3. **合并**：添加到 env 对象
```json
{ "env": { "DEBUG": "true" } }
```

## 应避免的常见错误

1. **替换而非合并** - 始终保留现有设置
2. **修改错误的文件** - 如果作用域不明确，询问用户
3. **无效的 JSON** - 修改后验证语法
4. **忘记先读取** - 写入之前务必先读取

## 钩子故障排查

如果钩子未运行：
1. **检查设置文件** - 读取 ~/.claude/settings.json 或 .claude/settings.json
2. **验证 JSON 语法** - 无效的 JSON 会静默失败
3. **检查匹配器** - 它是否匹配工具名称？（如 "Bash"、"Write"、"Edit"）
4. **检查钩子类型** - 是 "command"、"prompt" 还是 "agent"？
5. **测试命令** - 手动运行钩子命令，看是否能正常执行
6. **使用 --debug** - 运行 `claude --debug` 查看钩子执行日志
