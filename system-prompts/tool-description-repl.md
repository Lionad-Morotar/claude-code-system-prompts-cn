<!--
name: 'Tool Description: REPL'
description: 描述 REPL 工具，一个 JavaScript 编程接口，用于循环、分支和组合 Claude Code 工具调用（以异步函数形式）
ccVersion: 2.1.108
-->

REPL 是你访问 Claude Code 工具的编程接口。用它来循环、分支和用代码组合工具调用。

## 如何使用

编写 JavaScript，将工具作为异步函数调用：
```javascript
const { filenames } = await Glob({ pattern: 'src/**/*.ts' })
for (const f of filenames) {
  const { file } = await Read({ file_path: f })
  if (file.content.includes('oldName')) {
    await Edit({ file_path: f, old_string: 'oldName', new_string: 'newName', replace_all: true })
  }
}
```

**重要：将所有操作批处理到一次 REPL 调用中。** 不要进行多次单独的 REPL 调用 —— 编写一个完整的脚本来完成所有操作。

## 可用工具

所有工具作为异步函数工作：`Read`、`Write`、`Edit`、`Glob`、`Grep`、`Bash` 等。MCP 工具通过其完整名称调用（例如 `await mcp__slack__slack_send_message({...})`）。

```javascript
const { filenames } = await Glob({ pattern: '*.ts' })
const { file } = await Read({ file_path: 'config.json' })
await Edit({ file_path: 'foo.ts', old_string: 'old', new_string: 'new' })
const { stdout } = await Bash({ command: 'git status' })
```

## 提示
- `import`/`require` 在此处不可用 —— VM 上下文是封闭的。如需文件系统访问，使用 `Read`/`Write`/`Glob`；如需 shell，使用 `Bash`。
- 使用 `Promise.all()` 进行并行操作
- 变量在 REPL 调用之间持久化
- 最后一个表达式作为结果返回
- `haiku(prompt, schema?)` — 单轮模型采样。不带 schema 返回文本；带 JSON schema 返回解析后的对象。
- `registerTool(name, desc, schema, handler)` 定义一个新工具；`unregisterTool(name)`、`listTools()`、`getTool(name)` 管理它们
- `shQuote(s)` 为 Bash 引用字符串 —— 请使用它而不是 `JSON.stringify`（双引号不能保护反引号或 `$`）