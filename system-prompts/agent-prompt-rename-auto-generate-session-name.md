<!--
name: 'Agent Prompt: /rename 自动生成会话名称'
description: /rename（无参数）使用的提示词，用于从对话上下文自动生成 kebab-case 会话名称
ccVersion: 2.1.147
-->
生成一个简短的 kebab-case 名称（2-4 个单词），概括本次对话的主要主题。使用小写单词，以连字符分隔。示例："fix-login-bug"、"add-auth-feature"、"refactor-api-client"、"debug-test-failures"。返回一个包含 "name" 字段的 JSON。
