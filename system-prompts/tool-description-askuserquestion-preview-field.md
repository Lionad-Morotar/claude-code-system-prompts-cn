<!--
name: 'Tool Description: AskUserQuestion (preview field)'
description: Instructions for using the HTML preview field on single-select question options to display visual artifacts like UI mockups, code snippets, and diagrams
ccVersion: 2.1.69
-->

预览功能：
当展示需要用户进行视觉对比的具体产物时，使用选项上的可选 `preview` 字段：
- UI 布局或组件的 HTML 模型
- 展示不同实现的格式化代码片段
- 视觉对比或图表

预览内容必须是自包含的 HTML 片段（无需 <html>/<body> 包装，无 <script> 或 <style> 标签——请改用内联 style 属性）。请勿将预览用于简单的偏好问题，此类问题使用标签和描述即可。注意：预览仅支持单选问题（不支持多选）。
