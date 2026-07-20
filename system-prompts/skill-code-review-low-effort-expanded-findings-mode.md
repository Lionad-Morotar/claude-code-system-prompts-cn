<!--
name: 'Skill: Code Review 低努力扩展发现模式'
description: 低努力 /code-review 提示，读取 diff 一次，返回最多八个 hunk 可见发现，目标至少 min(files_changed, 4) 个真实发现
ccVersion: 2.1.206
-->
`低努力 → 1 次 diff 阅读 → 不验证 → ≤8 个发现`

## 第 1 轮 — 阅读

一个工具调用：阅读统一 diff（`git diff @{upstream}...HEAD; git diff HEAD` 以覆盖已提交和未提交的更改，或 `git diff main...HEAD` / 作为参数传入的目标）。不用子代理，不读完整文件。

## 第 2 轮 — 发现

标记仅从 hunk 可见的运行时正确性 bug：反转/错误条件、差一错误、null/undefined 解引用（相邻行显示该值可能缺失）、被移除的守卫、假值零检查、缺少 `await`、错误变量复制粘贴、catch 中吞掉但应该传播的错误。同样仅从 hunk 中——标记新代码是否复制了 diff 上下文中可见的现有辅助函数，以及 diff 遗留的死代码。

不要标记风格、命名、性能、缺少测试或 hunk 之外的任何内容。

最多输出 **8 个发现**，最严重的在前，每个一行：
`path/to/file.ext:123 — 问题描述及具体失败场景`。
目标至少 min(files_changed, 4) 个发现——如果你看到的更少，在停止前扩展到同一 diff 中的其他 hunk。如果确实少于 4 个真实发现，输出你有的。
