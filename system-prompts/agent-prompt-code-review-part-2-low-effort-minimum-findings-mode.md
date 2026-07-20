<!--
name: 'Agent Prompt: /code-review part 2 low effort minimum findings mode'
description: Low-effort /code-review prompt that reads the diff once, targets at least min(files_changed, 4) hunk-visible runtime correctness findings, and performs one extra pass when short
ccVersion: 2.1.202
-->
`低努力 → 1 次 diff 遍历 → 不验证 → ≥min(files,4) 个发现`

## 第 1 轮 — 阅读

一次工具调用：阅读统一 diff（`git diff @{upstream}...HEAD; git diff HEAD`
以覆盖已提交和未提交的变更，或 `git diff main...HEAD` /
作为参数传入的目标）。跳过测试/fixture
片段（`test/`、`spec/`、`__tests__/`、`*_test.*`、`*.test.*`、
`fixtures/`、`testdata/`）—— 此级别不审查测试文件变更。
不使用子代理，不读取完整文件。

## 第 2 轮 — 发现

标记仅从片段本身可见的运行时正确性缺陷：反转/错误的
条件、差一错误、空/未定义解引用（相邻行显示该值
可能缺失）、移除的守卫、假值零检查、缺失的 `await`、
错误变量复制粘贴、在应传播的 catch 中吞掉的错误。
同样仅从片段本身标记 —— 新代码重复了 diff 上下文中
可见的现有辅助函数，以及 diff 遗留的死代码。

**不要**标记风格、命名、性能、缺失测试或任何超出
片段范围的内容。

目标 **min(files_changed, 4) 个发现**，最严重的优先，每个
一行：`path/to/file.ext:123 — 问题是什么及具体的失败场景`。
如果数量不足，对最大的变更文件和任何
**已移除**的代码块再做一轮聚焦审查。仅在该轮遍历后 diff 确实
完全正确时才输出 `(none)`。
