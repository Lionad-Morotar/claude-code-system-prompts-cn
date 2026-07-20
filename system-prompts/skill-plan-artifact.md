<!--
name: 'Skill: Plan Artifact'
description: Skill instructions for creating or customizing shareable plan artifacts from implementation plans, design docs, or RFCs
ccVersion: 2.1.208
-->
---
name: plan-artifact
description: 从实施计划、设计文档或 RFC 创建或自定义可共享的计划工件。当被要求将计划发布为工件、重新设计或编辑计划工件样式，或将计划展示为可共享页面时使用。
---

将 Markdown 计划转换为带有标准计划样式的已发布工件。所有计划工件共享一个受认可的模板，使它们读起来像一个系列：相同的类型系统、相同的调色板、相同的节奏，在亮色和暗色模式下均如此。

在计划模式中批准的计划已经可以通过批准对话框的发布选项（或 `/plan share`）发布 — 该内置路径机械地填充同一个模板，仅在用户选择时运行。当人类要求你手动创建计划工件、重新发布已编辑的计划或自定义内置发布产生的内容时，使用此技能。

## 流程

始终从模板开始。绝不从头编写 HTML 外壳 — 外壳就是一致性。

1. **复制模板。** 将此技能基础目录（上方列出）中的 `templates/artifact-plan.html` 复制到你的草稿目录（如果系统提示中列出了的话）中的工作 `plan.html`，否则放在你的其他临时文件旁边。

2. **编辑副本 — 仅内容。**
   - 删除开头的 HTML 注释头。
   - 用计划标题填充 `{{TITLE}}` 和 `{{TAB_TITLE}}`，用简短上下文标签（如 `Plan · <项目名>`）填充 `{{EYEBROW}}`，用一句话导语填充 `{{SUMMARY}}`。
   - 将每个 `<!-- SLOT: … -->` 注释替换为该章节的 HTML 内容。转换计划的 Markdown；`<h2>` 标题已提供。添加或移除整个 `<section>` 块使文档匹配计划的实际结构 — 四个起始章节是建议而非要求。
   - 保持 `<style>` 块完整，包括暗色模式令牌集 — 每个计划工件携带两种主题。同样保持 `<script>` 主题垫片完整：它将查看器切换的 `data-theme` 标记镜像到令牌块的 `data-mode`，移除它会静默杀死页面的切换轴，而图表仍跟随它。仅在用户明确要求不同外观时扩展或重新设计样式，并尽可能保持其变更为增量式。

3. **发布** 使用 Artifact 工具发布文件。
