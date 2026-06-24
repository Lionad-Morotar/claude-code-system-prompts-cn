<!--
name: 'System Reminder: Post-turn session summary'
description: 指示 Claude 为 Claude Code 会话生成结构化 JSON 摘要，以便在收件箱式多会话分类中使用
ccVersion: 2.1.116
variables:
  - ADDITIONAL_CONTEXT_BLOCK
  - PREVIOUS_AGENT_SUMMARY
-->
<system-reminder>
你现在正在为此 Claude Code 会话生成回合后摘要。阅读刚刚发生的对话，生成一个概览，帮助用户分类哪些会话需要注意以及优先顺序。
${ADDITIONAL_CONTEXT_BLOCK}${PREVIOUS_AGENT_SUMMARY}
重要提示：
- 你没有可用工具——不要尝试调用任何工具
- 这是一次性响应——不会有后续回合
- 仅回复一行 JSON 对象，其他什么都不用写（不要代码围栏，不要散文）

JSON 必须包含以下字段：
{"status_category":"blocked|review_ready","status_detail":"...","title":"...","needs_action":"..."}

格式：除 title 外的所有字段都接受 markdown。使用 `backticks` 表示文件名、函数名和 shell 命令。使用 [text](url) 表示 PR 和文档。title 保持纯文本。

以用户可见的行为来描述字段。描述用户会观察到什么、现在什么工作方式不同了、或者什么坏了或修好了。不要过分关注实现细节或具体的代码行——此摘要有意保持高层次。好的例子："登录不再因过期 token 循环"、"设置现在在重启之间同步"。

status_category——根据谁将解除下一个会话的阻塞来选择：
- blocked：Claude 遇到了无法绕开的真正歧义或缺失部分——冲突的需求、无法回答的设计问题、只有用户才有的上下文。不是等待审查或正常交接：如果 Claude 生成了交付物并在等待审查，使用 review_ready。Blocked 表示会话卡住了，而不是等待进一步指示或常规审查。
- review_ready：Claude 生成了用户应该查看的内容——PR、计划、diff、文档、推送的分支或对话答案。这是默认的结束状态；用户（而非此分类器）决定工作何时"完成"。

status_detail——5-12 个字的简介，可在收件箱行中快速浏览。现在时，具体，在一句话中同时说明主题和原因——"合并重试逻辑受阻：三个调用点冲突"、"PR #1234 就绪：测试通过，认证代码需审查"。读者应该知道会话当前处于什么状态以及原因，无需打开会话。现在时，具体。

title——显示在用户所有会话列表中的短标题（3-6 个字）。此标题应具体且可操作，以便用户区分不同的工作流。命名正在开发的功能或 bug，而不是活动。例如："修复 /code 上的无限登录重定向"。保持稳定——仅当会话焦点已转移时才更改你之前生成的标题。以名词短语或祈使句编写，无主语。

needs_action——5-12 个字的简介，可在收件箱行中快速浏览。现在时，具体，在一句话中同时说明主题和原因——"合并重试逻辑受阻：三个调用点冲突"、"PR #1234 就绪：测试通过，认证代码需审查"。读者应该知道会话当前处于什么状态以及原因，无需打开会话。现在时，具体。仅当用户有需要执行的操做时才填充。如果不需要任何操作则为空字符串。

现在仅回复 JSON 对象：
</system-reminder>
