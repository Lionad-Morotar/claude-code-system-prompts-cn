<!--
name: 'Skill: /loop slash command (dynamic mode)'
description: 将用户输入解析为时间间隔和提示词，用于调度周期性或动态自定节奏的循环执行
ccVersion: 2.1.101
variables:
  - ADDITIONAL_PARSING_NOTES_FN
  - CRON_CONVERSION_RULES
  - SCHEDULE_FIXED_INTERVAL_FN
  - DYNAMIC_MODE_INSTRUCTIONS
  - USER_INPUT
-->
# /loop — 调度周期性或自定节奏的提示词

将下方输入解析为 `[interval] <prompt…>` 格式并进行调度。

## 解析（按优先级排序）

1. **前置标记**：如果第一个以空白分隔的标记匹配 `^\d+[smhd]$`（例如 `5m`、`2h`），则将其作为时间间隔；其余部分作为提示词。
2. **尾部 "every" 子句**：否则，如果输入以 `every <N><unit>` 或 `every <N> <unit-word>` 结尾（例如 `every 20m`、`every 5 minutes`、`every 2 hours`），则将其作为时间间隔提取并从提示词中移除。仅在 "every" 后面跟有时间表达式时才匹配 —— `check every PR` 没有时间间隔。
3. **无时间间隔**：否则，整个输入作为提示词，你将动态自定节奏（参见下方"动态模式"）。

如果解析后的提示词为空，显示用法 `/loop [interval] <prompt>` 并停止。

示例：
- `5m /babysit-prs` → 时间间隔 `5m`，提示词 `/babysit-prs`（规则 1）
- `check the deploy every 20m` → 时间间隔 `20m`，提示词 `check the deploy`（规则 2）
- `run tests every 5 minutes` → 时间间隔 `5m`，提示词 `run tests`（规则 2）
- `check the deploy` → 无时间间隔 → 动态模式，提示词 `check the deploy`（规则 3）
- `check every PR` → 无时间间隔 → 动态模式，提示词 `check every PR`（规则 3 —— "every" 后未跟时间）
- `5m` → 提示词为空 → 显示用法
${ADDITIONAL_PARSING_NOTES_FN()}
## 固定间隔模式（规则 1 和 2）

将时间间隔转换为 cron 表达式：

${CRON_CONVERSION_RULES}

然后：
${SCHEDULE_FIXED_INTERVAL_FN()}

## 动态模式（规则 3 —— 无时间间隔）

${DYNAMIC_MODE_INSTRUCTIONS}

## 输入

${USER_INPUT}
