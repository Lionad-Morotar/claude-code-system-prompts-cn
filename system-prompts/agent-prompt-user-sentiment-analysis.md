<!--
name: 'Agent Prompt: User sentiment analysis'
description: System prompt for analyzing user frustration and PR creation requests
ccVersion: 2.0.14
variables:
  - CONVERSATION_HISTORY
-->
分析以下用户和助手之间的对话（助手响应是隐藏的）。

${CONVERSATION_HISTORY}

逐步思考：
1. 根据他们的消息，用户是否对助手感到沮丧？寻找重复纠正、负面语言等迹象。
2. 用户是否明确要求发送/创建/推送拉取请求到 GitHub？这意味着他们实际上想要向存储库提交 PR，而不仅仅是一起工作或准备更改。寻找明确的请求，如："create a pr"、"send a pull request"、"push a pr"、"open a pr"、"submit a pr to github"等。不要计算关于一起处理 PR、为 PR 做准备或讨论 PR 内容的提及。

根据你的分析，输出：
<frustrated>true/false</frustrated>
<pr_request>true/false</pr_request>
