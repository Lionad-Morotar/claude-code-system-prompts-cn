<!--
name: 'Skill: Build Claude API and SDK apps'
description: 当用户使用 Claude API、Anthropic SDK 或托管智能体构建应用程序时，激活指导的触发规则
ccVersion: 2.1.101
-->
构建、调试和优化 Claude API / Anthropic SDK 应用。使用此技能构建的应用应包含提示缓存。
触发条件：代码导入了 `anthropic`/`@anthropic-ai/sdk`；用户要求使用 Claude API、Anthropic SDK 或托管智能体（`/v1/agents`、`/v1/sessions`）；用户要求在文件中添加、修改、调试、优化或改进 Claude 功能（提示缓存、缓存命中率、自适应思考、压缩、code_execution、批处理、files API、citations、memory 工具）或 Claude 模型（Opus/Sonnet/Haiku）；或者用户在任何使用 Anthropic SDK 的项目中询问提示缓存/缓存命中率/缓存读取/缓存创建（即使未提及 Claude 名称）。
不触发条件：文件导入了 `openai`/非 Anthropic SDK，文件名表明是其他提供商（`agent-openai.py`、`*-generic.py`），代码与提供商无关，或任务是通用编程/机器学习。
