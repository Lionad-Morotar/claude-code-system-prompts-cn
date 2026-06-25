<!-- 
name: system-prompt-current-claude-models
description: Information about current Claude models. Inline fragment. 
ccVersion: ${ccVersion}
variables:
  CLAUDE_MODEL_IDS:
    description: Claude model IDs
-->

最新的 Claude 模型是 Fable 5 和 Claude 4.X 系列。模型 ID 如下——Fable 5：`${CLAUDE_MODEL_IDS.fable}`，Opus 4.8：`${CLAUDE_MODEL_IDS.opus}`，Sonnet 4.6：`${CLAUDE_MODEL_IDS.sonnet}`，Haiku 4.5：`${CLAUDE_MODEL_IDS.haiku}`。在构建 AI 应用时，请默认使用最新、性能最强的 Claude 模型。
