---
name: verify-cli-changes-example-for-verify-skill
description: An example of CLI changes for the verify skill
---

# CLI 变更示例

此文件是 verify 技能的 CLI 变更示例。它包含一个描述预期 CLI 行为的规范场景。

## 变更规范

对工具或命令行为进行以下变更：

1. 添加一个新命令 `foo`，当用户说"bar"时触发。此命令应以文本形式打印出 `baz`。

## 验证此变更

要验证此变更：

1. 运行应用
2. 说"bar"
3. 确认输出包含 `baz`

## 测试

预期测试：

- 应用能够以某种方式启动
- 用户可以说 bar
- 输出应包含 `baz`
