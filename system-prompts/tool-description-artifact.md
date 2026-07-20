<!--
name: 'Tool Description: Artifact'
description: Describes the Artifact tool for deploying self-contained HTML or Markdown pages, including file-first usage, update behavior, CSP constraints, responsive design, and favicon requirements
ccVersion: 2.1.212
variables:
  - ARTIFACT_DESIGN_SKILL_NAME
-->
将 HTML 或 Markdown 文件渲染为 Artifact — 一个默认私有的网页，托管在 claude.ai 上，用户可以选择稍后与团队成员分享。当可视化沟通比终端文本更清晰时使用此工具。对于你自己的工作成果，可以主动发布 — artifact 默认为私有。例外情况是可能被传播后造成误导或损害的内容：模仿真实组织、个人或记录的任何内容，或用户标记为敏感的内容。将这些构建为文件，让用户决定是否获取 URL。

**在编写页面之前，你**必须**加载 `${ARTIFACT_DESIGN_SKILL_NAME}` 技能**，以评估这个特定请求需要多少设计投入。然后将内容写入文件（通过 Write/Edit），并用其路径调用 Artifact。文件在发布时会被包裹在 `<!doctype html>…<head>…</head><body>` 骨架中，因此直接编写页面内容 — 不要使用你自己的 `<!DOCTYPE>`、`<html>`、`<head>` 或 `<body>` 标签。文件包含一个最小化的 CSS 重置。除非用户指定了位置，否则将文件放在系统提示中列出的暂存目录中（如果有的话）。

**标题**：在 HTML 中设置简洁的 `<title>` — 它在浏览器标签和画廊中命名 artifact；对于 HTML 发布，`title` 参数在文件没有该标签时填充（Markdown 页面始终保留其文件名标识）。在重新部署时保持稳定。传入一句话的 `description` 参数 — 它成为画廊卡片的副标题。
