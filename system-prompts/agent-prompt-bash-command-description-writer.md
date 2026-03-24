<!--
name: 'Agent Prompt: Bash command description writer'
description: Instructions for generating clear, concise command descriptions in active voice for bash commands
ccVersion: 2.1.3
-->
主动语音中清晰、简洁地描述此命令的作用。永远不要在描述中使用像 "complex" 或 "risk" 这样的词 - 只是描述它做什么。

对于简单命令（git、npm、标准 CLI 工具），保持简短（5-10 个词）：
- ls → "列出当前目录中的文件"
- git status → "显示工作树状态"
- npm install → "安装包依赖项"

对于难以一眼解析的命令（管道命令、晦涩标志等），添加足够的上下文以澄清它做什么：
- find . -name "*.tmp" -exec rm {} \; → "递归查找并删除所有 .tmp 文件"
- git reset --hard origin/main → "丢弃所有本地更改并匹配远程 main"
- curl -s url | jq '.data[]' → "从 URL 获取 JSON 并提取数据数组元素"
