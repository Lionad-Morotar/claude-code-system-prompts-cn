<!--
name: 'System Prompt: Hooks Configuration'
description: System prompt for hooks configuration.  Used for above Claude Code config skill.
ccVersion: 2.1.9
-->
## 钩子配置

钩子在 Claude Code 生命周期的特定点运行命令。

### 钩子结构
```json
{
  "hooks": {
    "EVENT_NAME": [
      {
        "matcher": "ToolName|OtherTool",
        "hooks": [
          {
            "type": "command",
            "command": "your-command-here",
            "timeout": 60,
            "statusMessage": "Running..."
          }
        ]
      }
    ]
  }
}
```

### 钩子事件

| 事件 | 匹配器 | 目的 |
|-------|---------|---------|
| PermissionRequest | 工具名称 | 在权限提示之前运行 |
| PreToolUse | 工具名称 | 在工具之前运行，可以阻止 |
| PostToolUse | 工具名称 | 在成功工具之后运行 |
| PostToolUseFailure | 工具名称 | 在工具失败后运行 |
| Notification | 通知类型 | 在通知上运行 |
| Stop | - | 当 Claude 停止时运行（包括清除、恢复、压缩） |
| PreCompact | "manual"/"auto" | 在压缩之前 |
| UserPromptSubmit | - | 当用户提交时 |
| SessionStart | - | 当会话开始时 |

**常见工具匹配器：** `Bash`、`Write`、`Edit`、`Read`、`Glob`、`Grep`

### 钩子类型

**1. 命令钩子** - 运行 shell 命令：
```json
{ "type": "command", "command": "prettier --write $FILE", "timeout": 30 }
```

**2. 提示钩子** - 使用 LLM 评估条件：
```json
{ "type": "prompt", "prompt": "这安全吗？ $ARGUMENTS" }
```
仅可用于工具事件：PreToolUse、PostToolUse、PermissionRequest。

**3. 代理钩子** - 使用工具运行代理：
```json
{ "type": "agent", "prompt": "验证测试通过： $ARGUMENTS" }
```
仅可用于工具事件：PreToolUse、PostToolUse、PermissionRequest。

### 钩子输入（stdin JSON）
```json
{
  "session_id": "abc123",
  "tool_name": "Write",
  "tool_input": { "file_path": "/path/to/file.txt", "content": "..." },
  "tool_response": { "success": true }  // 仅 PostToolUse
}
```

### 钩子 JSON 输出

钩子可以返回 JSON 来控制行为：

```json
{
  "systemMessage": "在 UI 中向用户显示的警告",
  "continue": false,
  "stopReason": "当阻止时显示的消息",
  "additionalContext": "注入回模型上下文的上下文",
  "decision": "approve" | "block"
}
```

**字段：**
- `systemMessage` - 向用户显示消息（所有钩子）
- `continue` - 设置为 `false` 以阻止/停止（默认：true）
- `stopReason` - 当 `continue` 为 false 时显示的消息
- `additionalContext` - 注入到模型上下文中的文本（事件特定）
- `decision` - PreToolUse 钩子的 "approve" 或 "block"

### 常见模式

**在写入后自动格式化：**
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "jq -r '.tool_response.filePath // .tool_input.file_path' | xargs prettier --write 2>/dev/null || true"
      }]
    }]
  }
}
```

**记录所有 bash 命令：**
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "jq -r '.tool_input.command' >> ~/.claude/bash-log.txt"
      }]
    }]
  }
}
```

**向用户显示消息的停止钩子：**

命令必须输出带有 `systemMessage` 字段的 JSON：
```bash
# 输出以下内容的示例命令：{"systemMessage": "Session complete!"}
echo '{"systemMessage": "Session complete!"}'
```

**代码更改后运行测试：**
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "jq -r '.tool_input.file_path // .tool_response.filePath' | grep -E '\\\\.(ts|js)$' && npm test || true"
      }]
    }]
  }
}
```
