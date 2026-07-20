<!--
name: 'Skill: PR explainer'
description: 生成可共享的 PR 演练工件，涵盖更改内容、原因和审阅者应关注的地方
ccVersion: 2.1.202
variables:
  - PR_NUMBER
  - CURRENT_BRANCH_PR_INSTRUCTIONS
  - FORMAT_PR_EXPLAINER_TARGET_FN
  - ADDITIONAL_GUIDANCE
  - ARTIFACT_TOOL_NAME
  - ARTIFACT_DESIGN_SKILL_NAME
  - ARTIFACT_ITERATION_FOOTER
-->
${PR_NUMBER===""?CURRENT_BRANCH_PR_INSTRUCTIONS:FORMAT_PR_EXPLAINER_TARGET_FN(PR_NUMBER)}
${ADDITIONAL_GUIDANCE?`
来自用户的额外指导：${ADDITIONAL_GUIDANCE}
`:""}
## 目标

生成一个**可共享的 PR 演练工件** — 一个独立的 HTML 页面，审阅者可以在打开 diff 之前阅读以了解此更改做了什么、为什么要做、以及应将注意力集中在哪里。写作面向第一次看到这个 PR 的审阅者。

无论下方章节的答案如何，页面必须回答以下全部五个问题：

1. 此 PR 试图解决什么问题？
2. 为什么这是个问题？
3. 我们如何解决它？
4. 我们考虑了哪些替代方案？
5. 为什么当前方案优于替代方案？

如果 diff、PR 正文和提交消息没有提供其中某个问题的证据 —— 通常是 4 和 5 —— 请明确说明（例如"PR 没有记录考虑过哪些替代方案"），而非编造答案。

## 工件结构

编写 HTML 文件并用 ${ARTIFACT_TOOL_NAME} 工具发布。先加载 `${ARTIFACT_DESIGN_SKILL_NAME}` skill 并给页面实用主义风格。

1. **是什么和为什么** — 两三句话：此 PR 更改了什么以及为什么需要。如果 PR 正文已经说得好，直接复用。
2. **前/后** — 一个简短的并排对比显示用户可观察到的变化（行为、API 形状或输出）。如果更改没有可观察的表面则跳过。
3. **Diff 游览** — 更改的每个逻辑部分一个 `<details>` 块。内部：相关代码片段（修剪过的）、通俗解释和审阅者应仔细看的任何内容。
4. **diff 中不明显的** — 审阅者需要但 diff 本身不显示的上下文（为什么选这个方法而非替代方案、尝试过但被拒绝的、故意留下的后续工作）。

在页面正文末尾逐字添加此行：

> ${ARTIFACT_ITERATION_FOOTER}

## 保持诚实

描述 diff *实际做什么* — 追踪它，不要从名称推断。如果 PR 中有什么你不清楚，在第 4 部分说明而非猜测。
