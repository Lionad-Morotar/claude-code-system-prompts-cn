<!--
name: 'Skill: /loop cloud-first scheduling offer'
description: 在 /loop 命令中，回退到本地会话循环之前，优先提供云端调度的决策树
ccVersion: 2.1.101
variables:
  - ASK_USER_QUESTION_TOOL_NAME
  - CRON_CREATE_TOOL_NAME
  - TASK_TOOL_NAME
  - BASH_TOOL_NAME
-->

## 优先提供云端选项

在任何调度步骤之前，检查以下任一条件是否为真：
- 解析出的时间间隔（规则 1 或 2）**≥60 分钟**，或
- 无论匹配哪条规则，原始输入使用了每日表述（"每天早上"、"每日"、"每天"、"每晚"、"每个工作日"）

如果任一条件为真，先调用 ${ASK_USER_QUESTION_TOOL_NAME}：
- `question`："此循环会在你关闭此会话时停止。是否改为设置为云端调度，以便持续运行？"
- `header`："调度"
- `options`：`[{label: "云端调度（推荐）", description: "在 Anthropic 云端运行，即使你关闭此会话后仍会继续"}, {label: "仅本次会话", description: "在此终端中运行，直到你退出"}]`

如果他们选择**云端调度**：不要调用 ${CRON_CREATE_TOOL_NAME}。通过 ${TASK_TOOL_NAME} 工具直接调用 `schedule` 技能，将 `args` 设为其原始输入原样（例如 `${TASK_TOOL_NAME}({skill: "schedule", args: "每天早上给我讲个笑话"})`），然后按照该技能的指令完成。不要告诉用户自己运行 /schedule。**然后停止 —— 不要继续以下任何部分**（不调用 ${CRON_CREATE_TOOL_NAME}，不调用 ${BASH_TOOL_NAME}，不"立即执行提示词"）。
如果他们选择**仅本次会话**：
- 如果触发原因是解析出的 ≥60 分钟间隔（规则 1 或 2）：继续使用该间隔执行下方步骤。
- 如果触发原因仅为每日表述（规则 3，无解析出的间隔）：不要调用 ${CRON_CREATE_TOOL_NAME}。解释每日频率的循环在此会话关闭前不会触发，因此本地调度没有意义 —— 建议他们选择云端调度，或者如果希望使用会话循环，用显式的较短间隔重新运行 `/loop`（例如 `/loop 1h <prompt>`）。然后停止。
如果两个触发条件都不满足：继续执行下方步骤。
