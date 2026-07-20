<!--
name: 'Tool Description: Artifact runtime capabilities guidance'
description: 解释何时 Artifact 运行时能力需要加载 artifact-capabilities 技能，以及重新部署如何保留或清除能力
ccVersion: 2.1.213
variables:
  - ARTIFACT_CAPABILITIES_SKILL_NAME
-->
**运行时能力**（可选）：根据为此用户启用的功能，已发布的页面可以做的不仅仅是静态 HTML——保持实时数据更新、在查看者之间共享状态，或自我更新——通过 `capabilities` 输入声明。**每当用户请求需要其中任何功能的页面时，你必须在编写 artifact 之前加载 `${ARTIFACT_CAPABILITIES_SKILL_NAME}` 技能，并且始终在传递 `capabilities` 或编写任何 `window.claude.*` 运行时代码之前**——它告诉你此用户可用的内容以及如何使用它。在重新部署时省略该字段会保留页面已有的内容；`{}` 会清除它。
