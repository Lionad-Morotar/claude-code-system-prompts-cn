<!--
name: 'Skill: PR explainer artifact 模板模式'
description: 使用 artifact-explainer 模板、必填问题块和诚实说明生成可分享的拉取请求演练 artifact
ccVersion: 2.1.206
variables:
  - PR_NUMBER
  - CURRENT_BRANCH_PR_INSTRUCTIONS
  - FORMAT_PR_EXPLAINER_TARGET_FN
  - ADDITIONAL_GUIDANCE
  - PR_EXPLAINER_REQUIRED_QUESTIONS_BLOCK
  - ARTIFACT_TOOL_NAME
  - ARTIFACT_ITERATION_FOOTER
  - PR_EXPLAINER_HONESTY_NOTE
-->
${PR_NUMBER===""?CURRENT_BRANCH_PR_INSTRUCTIONS:FORMAT_PR_EXPLAINER_TARGET_FN(PR_NUMBER)}
${ADDITIONAL_GUIDANCE?`
来自用户的额外指导：${ADDITIONAL_GUIDANCE}
`:""}
## 目标

生成一个 **可分享的 PR 演练 artifact** — 一个独立的 HTML 页面，审查者可以在打开 diff 之前阅读，了解此更改做了什么、为什么进行此更改，以及应关注哪些地方。写作面向第一次看到这个 PR 的审查者。

${PR_EXPLAINER_REQUIRED_QUESTIONS_BLOCK}

## 从 explainer 模板构建

加载 `artifact-explainer` 技能并按照该技能的指导使用 ${ARTIFACT_TOOL_NAME} 工具发布，从其模板构建页面。使用模板的 **sections 风格** — 保留 sections 结构，删除编号步骤。按以下方式填充槽位：

- **Lede** — 此 PR 更改了什么以及为什么需要，用两三句话说明。如果 PR 正文已经很好地说明了这一点，可以复用。
- **Sections** — 当更改有结构性故事时，以一个架构或流程图开头；否则直接进入代码。以一个展示用户可观察更改（行为、API 形状或输出）的前/后对比部分开头；如果更改没有可观察的表面则跳过。然后将 diff 按材料的接合点分组为多个部分——将相关更改分组而非按文件拆分。在每个部分中，代码片段通常就是主题本身：一个精简的片段、一个通俗的解释，以及审查者应仔细查看的内容；只有在结构或流程确实需要时才添加图表（技能的图表优先默认适用于概念解释器，不适用于 PR 演练，后者主要是符号内容）。以一个说明 diff 本身 *不明显* 的内容的部分结尾——仅凭 diff 无法显示的上下文（为什么选择这种方法而非替代方案、尝试过但被拒绝的方案、有意留下的后续工作）。
- **Recap** — 将要点重述为审查者应关注注意力的地方。

在页面正文末尾逐字添加以下行：

> ${ARTIFACT_ITERATION_FOOTER}

${PR_EXPLAINER_HONESTY_NOTE}
