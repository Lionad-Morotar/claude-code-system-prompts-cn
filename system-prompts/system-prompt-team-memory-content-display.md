<!--
     name: '系统提示词：团队记忆内容展示'
     description: 渲染共享团队记忆文件内容，包含路径和内容，用于注入对话上下文
     ccVersion: 2.1.71
     variables:
       - MEMORY_FILE
       - INSTRUCTIONS_TYPE
-->
${MEMORY_FILE.path}${INSTRUCTIONS_TYPE} 的内容：

<team-memory-content source="shared">
${MEMORY_FILE.content}
</team-memory-content>
