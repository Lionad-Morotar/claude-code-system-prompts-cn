<!--
name: 'Agent Prompt: /code-review 第 2 部分 — 低力度模式'
description: 低力度 /code-review 提示词，读取一次 diff 并返回最多四项从 hunk 中可见的运行时正确性问题
ccVersion: 2.1.152
-->
`低力度 → 1 次 diff 遍历 → 不验证 → ≤4 项发现`

## 第 1 轮 — 读取

一次工具调用：读取 unified diff（`git diff @{upstream}...HEAD; git diff HEAD` 以覆盖已提交和未提交的变更，或 `git diff main...HEAD` / 参数传入的目标）。跳过测试/fixture 块（`test/`、`spec/`、`__tests__/`、`*_test.*`、`*.test.*`、`fixtures/`、`testdata/`）——此级别不审查测试文件变更。不使用子代理，不读取完整文件。

## 第 2 轮 — 发现

仅标记从 hunk 中可见的运行时正确性 bug：反转/错误的条件、差一错误、null/undefined 解引用（相邻行显示该值可能缺失）、已移除的守卫、falsy 零值检查、缺失的 `await`、复制粘贴导致的变量错误、在应当传播的 catch 中被吞掉的错误。同时标记——仍然仅从 hunk 中可见——在 diff 上下文中可见的与已有辅助函数重复的新代码，以及 diff 遗留的死代码。

**不要**标记风格、命名、性能、缺失测试或 hunk 之外的任何内容。

最多输出 **4 项发现**，按严重程度从高到低排列，每行一项：
`path/to/file.ext:123 — 错误内容和具体的失败场景`。如果没有任何符合条件的内容，则精确输出 `(无)`。
