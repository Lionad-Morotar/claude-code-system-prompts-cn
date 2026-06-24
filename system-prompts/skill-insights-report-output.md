<!--
name: 'Skill: /insights report output'
description: 在用户运行 /insights 斜杠命令后，格式化并显示使用情况报告结果
ccVersion: 2.1.139
variables:
  - INSIGHTS_DATA
  - REPORT_URL
  - HTML_FILE_PATH
  - FACETS_DIRECTORY
  - AT_A_GLANCE_SUMMARY
  - ADDITIONAL_CONTEXT_BLOCK
-->
用户刚刚运行了 /insights 来生成一份分析其 Claude Code 会话的使用情况报告。

以下是完整的 insights 数据：
${INSIGHTS_DATA}

报告 URL：${REPORT_URL}
HTML 文件：${HTML_FILE_PATH}
Facets 目录：${FACETS_DIRECTORY}

概览摘要（仅供你参考 —— 用户尚未看到任何输出）：
${AT_A_GLANCE_SUMMARY}${ADDITIONAL_CONTEXT_BLOCK}

将 `<message>` 标签之间的文本原样输出为你完整的响应。不要省略任何行：

<message>
你的可分享 insights 报告已就绪：
${REPORT_URL}

想要深入了解某个部分或尝试某个建议吗？
</message>
