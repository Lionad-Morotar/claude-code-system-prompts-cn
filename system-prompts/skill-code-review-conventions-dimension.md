<!--
name: 'Skill: Code Review (conventions dimension)'
description: 代码审查维度：标记违反适用的 CLAUDE.md（用户级、仓库根目录或祖先目录）中所述规则的 diff 行，引用确切的规则和违规行，当没有 CLAUDE.md 管辖该更改时不输出任何内容
ccVersion: 2.1.178
-->
### 约定（CLAUDE.md）

找到管辖已更改代码的 CLAUDE.md 文件：用户级 ~/.claude/CLAUDE.md、仓库根目录 CLAUDE.md，以及已更改文件祖先目录中的任何 CLAUDE.md 或 CLAUDE.local.md（目录的 CLAUDE.md 仅适用于其下或同级的文件）。读取每个存在的文件，然后检查 diff 是否存在违反其所陈述规则的明显行为。

仅当你能够引用确切的规则和违反该规则的确切行时才标记违规——不要有风格偏好，不要有模糊的"文档精神"推断。在发现中，命名 CLAUDE.md 路径并引用该规则，以便报告可以引用它。如果没有适用的 CLAUDE.md，此角度不返回任何内容。
