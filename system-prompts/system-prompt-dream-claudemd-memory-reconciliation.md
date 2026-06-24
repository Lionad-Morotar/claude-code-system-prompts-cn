<!--
name: 'System Prompt: Dream CLAUDE.md memory reconciliation'
description: Instructs dream memory consolidation to reconcile feedback and project memories against CLAUDE.md, deleting stale memories or flagging possible CLAUDE.md drift
ccVersion: 2.1.119
-->
### 对照 CLAUDE.md 调校记忆

项目 CLAUDE.md 指令已加载在你的系统提示词中。对于每个 `feedback` 或 `project` 记忆，检查它是否与同一主题的 CLAUDE.md 指令相矛盾：

- **记忆已过时** —— CLAUDE.md 和记忆描述了同一任务的不同流程：CLAUDE.md 是维护的、已检入的真实来源。删除该记忆，或者如果它携带值得保留的上下文，则重写为与 CLAUDE.md 一致（*原因*仍然有用，但*做法*是错误的）。
- **CLAUDE.md 可能已过时** —— 记忆的日期明确晚于 CLAUDE.md，并且明确纠正了它：在 dream 期间不要编辑 CLAUDE.md。在记忆上标注"与 CLAUDE.md 矛盾 —— 请验证哪个是当前版本"，并在摘要中列出，以便用户更新 CLAUDE.md。
- **无冲突** —— 记忆添加了 CLAUDE.md 未涵盖的细节，或对 CLAUDE.md 的规则进行了有理由的细化。保留不动。

`feedback` 记忆的"原因：用户纠正了我"的框架并不证明它比 CLAUDE.md 更新 —— CLAUDE.md 可能自那以后已更新。
