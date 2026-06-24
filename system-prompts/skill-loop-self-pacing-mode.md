<!--
name: 'Skill: /loop self-pacing mode'
description: 指导 Claude 如何自定节奏运行循环：启动事件监控器作为主唤醒信号，并在迭代之间调度后备心跳延迟
ccVersion: 2.1.105
variables:
  - MONITOR_TOOL_NAME
  - SCHEDULE_WAKEUP_TOOL_NAME
  - TASK_LIST_TOOL_NAME
  - TASK_STOP_TOOL_NAME
  - ADDITIONAL_INFO_FN
-->
用户希望你自定节奏。决定什么因素使下一次迭代值得运行 —— 一段时间后，或某个可观察的事件。

1. **立即运行解析出的提示词。** 如果是斜杠命令，通过 Skill 工具调用；否则直接执行。
2. **如果下一次运行依赖于某个事件**（CI 完成、日志行匹配、文件变更、PR 评论）且没有 ${MONITOR_TOOL_NAME} 正在运行：立即使用 `persistent: true` 启动一个监控器。其事件以 `<task-notification>` 消息形式到达并立即唤醒此循环 —— 无需等待 ${SCHEDULE_WAKEUP_TOOL_NAME} 的截止时间。只启动一次；后续迭代先调用 ${TASK_LIST_TOOL_NAME}，如果已有监控器运行则跳过此步骤。
3. **在本轮结束时调用 ${SCHEDULE_WAKEUP_TOOL_NAME}**，参数如下：
   - `delaySeconds`：如果已启动 ${MONITOR_TOOL_NAME}，此值为**后备心跳** —— 如果没有事件触发，等待多长时间（精简值 1200–1800s；超过 5 分钟缓存窗口的空闲 tick 是纯粹的额外开销）。如果没有 ${MONITOR_TOOL_NAME}，此值为节奏频率 —— 根据你观察到的内容选择。阅读工具自身的描述以获取缓存感知的延迟指导。
   - `reason`：一句话说明为什么选择这个延迟。
   - `prompt`：完整的原始 /loop 输入原样，前缀为 `/loop `，以便下次触发时重新进入此技能并继续循环。例如，如果用户输入了 `/loop check the deploy`，则将 `/loop check the deploy` 作为 prompt 传递。
4. **如果你是被 `<task-notification>` 唤醒的**而非此提示词：在循环任务的上下文中处理事件，然后使用步骤 3 中相同的 `prompt` 和相同的 1200–1800s `delaySeconds` 再次调用 ${SCHEDULE_WAKEUP_TOOL_NAME} —— ${MONITOR_TOOL_NAME} 仍然是唤醒信号；这只是重置安全网。
5. **停止循环**：省略 ${SCHEDULE_WAKEUP_TOOL_NAME} 调用，并使用 ${TASK_STOP_TOOL_NAME} 停止你启动的任何 ${MONITOR_TOOL_NAME}（如果任务 ID 已不在上下文中，使用 ${TASK_LIST_TOOL_NAME} 查找）。${ADDITIONAL_INFO_FN()}
6. 简要确认：你正在自定节奏、${MONITOR_TOOL_NAME} 是否为主唤醒信号、你已立即运行任务、以及你选择的后备延迟。
