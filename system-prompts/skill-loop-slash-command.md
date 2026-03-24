<!--
name: 'Skill: /loop slash command'
description: 将用户输入解析为时间间隔和提示词，将时间间隔转换为 cron 表达式，并调度一个周期性任务
ccVersion: 2.1.77
variables:
  - CRON_CREATE_TOOL_NAME
  - DEFAULT_INTERVAL
  - CRON_CANCEL_TOOL_NAME
  - USER_INPUT
-->
# /loop — 调度周期性提示词

将下方输入解析为 \`[interval] <prompt…>\` 格式，并使用 ${CRON_CREATE_TOOL_NAME} 进行调度。

## 解析规则（按优先级排序）

1. **前置标记**：如果第一个以空白分隔的标记匹配 \`^\\d+[smhd]$\`（例如 \`5m\`、\`2h\`），则将其作为时间间隔；其余部分作为提示词。
2. **尾部 "every" 子句**：否则，如果输入以 \`every <N><unit>\` 或 \`every <N> <unit-word>\` 结尾（例如 \`every 20m\`、\`every 5 minutes\`、\`every 2 hours\`），则将其作为时间间隔提取并从提示词中移除。仅在 "every" 后面跟有时间表达式时才匹配 —— \`check every PR\` 没有时间间隔。
3. **默认值**：否则，时间间隔为 \`${DEFAULT_INTERVAL}\`，整个输入作为提示词。

如果解析后的提示词为空，显示用法 \`/loop [interval] <prompt>\` 并停止 —— 不要调用 ${CRON_CREATE_TOOL_NAME}。

示例：
- \`5m /babysit-prs\` → 时间间隔 \`5m\`，提示词 \`/babysit-prs\`（规则 1）
- \`check the deploy every 20m\` → 时间间隔 \`20m\`，提示词 \`check the deploy\`（规则 2）
- \`run tests every 5 minutes\` → 时间间隔 \`5m\`，提示词 \`run tests\`（规则 2）
- \`check the deploy\` → 时间间隔 \`${DEFAULT_INTERVAL}\`，提示词 \`check the deploy\`（规则 3）
- \`check every PR\` → 时间间隔 \`${DEFAULT_INTERVAL}\`，提示词 \`check every PR\`（规则 3 —— "every" 后未跟时间）
- \`5m\` → 提示词为空 → 显示用法

## 时间间隔 → cron

支持的后缀：\`s\`（秒，向上取整到最近分钟，最小 1）、\`m\`（分钟）、\`h\`（小时）、\`d\`（天）。转换规则：

| 时间间隔模式          | Cron 表达式         | 说明                                     |
|-----------------------|---------------------|------------------------------------------|
| \`Nm\` 其中 N ≤ 59   | \`*/N * * * *\`     | 每 N 分钟                                |
| \`Nm\` 其中 N ≥ 60   | \`0 */H * * *\`     | 转换为小时（H = N/60，必须整除 24）      |
| \`Nh\` 其中 N ≤ 23   | \`0 */N * * *\`     | 每 N 小时                                |
| \`Nd\`                | \`0 0 */N * *\`     | 每 N 天午夜本地时间                      |
| \`Ns\`                | 视为 \`ceil(N/60)m\` | cron 最小粒度为 1 分钟                   |

**如果时间间隔不能整除其单位**（例如 \`7m\` → \`*/7 * * * *\` 在 :56→:00 处产生不均匀间隔；\`90m\` → 1.5h，cron 无法表达），选择最近的规整时间间隔，并在调度前告知用户你四舍五入到了什么值。

## 操作

1. 调用 ${CRON_CREATE_TOOL_NAME}，参数如下：
   - \`cron\`: 上表中的表达式
   - \`prompt\`: 上面解析的提示词，原样传递（斜杠命令保持不变）
   - \`recurring\`: \`true\`
2. 简要确认：已调度的内容、cron 表达式、人类可读的频率、周期性任务在 3 天后自动过期，以及他们可以使用 ${CRON_CANCEL_TOOL_NAME} 提前取消（包含任务 ID）。
3. **然后立即执行解析后的提示词** —— 不要等待第一次 cron 触发。如果是斜杠命令，通过 Skill 工具调用；否则直接执行。

## 输入

${USER_INPUT}
