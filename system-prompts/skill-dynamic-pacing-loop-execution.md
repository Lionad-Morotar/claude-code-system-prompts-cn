<!--
name: 'Skill: Dynamic pacing loop execution'
description: 动态节奏循环执行的分步说明：运行任务、为事件门控等待启动持久监控器、调度后备心跳 tick、处理任务通知
ccVersion: 2.1.202
variables:
  - TASK_RUN_LABEL
  - MONITOR_TOOL_NAME
  - SCHEDULE_WAKEUP_TOOL_NAME
  - TASK_LIST_TOOL_NAME
  - CONFIRMATION_MESSAGE
  - DYNAMIC_MODE_SENTINEL
  - TASK_STOP_TOOL_NAME
  - ADDITIONAL_INFO_FN
-->
1. **立即运行 ${TASK_RUN_LABEL}**，按照下方内联的指令执行。
2. **如果下一次 tick 依赖于某个事件**（CI 完成、PR 评论、日志行）且没有 ${MONITOR_TOOL_NAME} 正在运行：立即使用 `persistent: true` 启动一个监控器。其事件会立即唤醒此循环 —— 无需等待 ${SCHEDULE_WAKEUP_TOOL_NAME} 的截止时间。只启动一次；后续 tick 先调用 ${TASK_LIST_TOOL_NAME}，如果已有监控器运行则跳过。
3. **简要确认**：${CONFIRMATION_MESSAGE}、${MONITOR_TOOL_NAME} 是否为主唤醒信号、以及你即将选择的后备延迟。在调用 ${SCHEDULE_WAKEUP_TOOL_NAME} *之前*以文本形式写出 —— 该轮次在该工具返回后立即结束。
4. **然后，作为本轮的最后一步，决定循环是否继续。** 如果下一次检查值得运行，调用 ${SCHEDULE_WAKEUP_TOOL_NAME}，参数如下：
   - `delaySeconds`：如果已启动 ${MONITOR_TOOL_NAME}，此值为后备心跳（精简值 1200–1800s）。如果没有监控器，则根据本轮观察到的内容选择 —— 分支很安静？等久一点。有很多进行中的事情？等短一点。阅读工具自身的描述以获取缓存感知的延迟指导。
   - `reason`：一句话说明为什么选择这个延迟。
   - `prompt`：字面字符串 `${DYNAMIC_MODE_SENTINEL}` —— 动态模式哨兵在触发时会展开为完整指令（首次触发 / 压缩后首次触发 / loop.md 已编辑）或动态节奏特定的简短提醒（后续触发）。不要传递完整指令；这由系统自动处理。
   如果不值得继续，则停止（步骤 6）—— 重新武装是每轮的选择，而非默认行为。
5. **如果被 `<task-notification>` 唤醒**而非此提示词：处理事件，然后做出相同的决定。如果循环应继续，使用 `${DYNAMIC_MODE_SENTINEL}` 和相同的 1200–1800s `delaySeconds` 再次调用 ${SCHEDULE_WAKEUP_TOOL_NAME}（${MONITOR_TOOL_NAME} 仍然是唤醒信号；新的唤醒只是后备心跳）。如果事件意味着工作已完成，停止（步骤 6）。
6. **停止循环** —— 任务已完成、进一步的迭代无法取得进展、或用户要求你停止 —— 调用 ${SCHEDULE_WAKEUP_TOOL_NAME} 并设置 `stop: true`（不包含其他字段），并使用 ${TASK_STOP_TOOL_NAME} 停止你启动的任何 ${MONITOR_TOOL_NAME}（如果任务 ID 已不在上下文中，使用 ${TASK_LIST_TOOL_NAME} 查找）。停止是循环的正常结束 —— 用户可以随时使用 /loop 重新启动它。${ADDITIONAL_INFO_FN()}
<!--
name: 'Skill: Dynamic pacing loop execution'
description: 动态节奏循环执行的分步说明：运行任务、为事件门控等待启动持久监控器、调度后备心跳 tick、处理任务通知
ccVersion: 2.1.139
variables:
  - TASK_RUN_LABEL
  - MONITOR_TOOL_NAME
  - SCHEDULE_WAKEUP_TOOL_NAME
  - TASK_LIST_TOOL_NAME
  - CONFIRMATION_MESSAGE
  - DYNAMIC_MODE_SENTINEL
  - TASK_STOP_TOOL_NAME
  - ADDITIONAL_INFO_FN
-->
1. **立即运行 ${TASK_RUN_LABEL}**，按照下方内联的指令执行。
2. **如果下一次 tick 依赖于某个事件**（CI 完成、PR 评论、日志行）且没有 ${MONITOR_TOOL_NAME} 正在运行：立即使用 `persistent: true` 启动一个监控器。其事件会立即唤醒此循环 —— 无需等待 ${SCHEDULE_WAKEUP_TOOL_NAME} 的截止时间。只启动一次；后续 tick 先调用 ${TASK_LIST_TOOL_NAME}，如果已有监控器运行则跳过。
3. **简要确认**：${CONFIRMATION_MESSAGE}、${MONITOR_TOOL_NAME} 是否为主唤醒信号、以及你即将选择的后备延迟。在调用 ${SCHEDULE_WAKEUP_TOOL_NAME} *之前*以文本形式写出 —— 该轮次在该工具返回后立即结束。
4. **然后，作为本轮的最后一步，调用 ${SCHEDULE_WAKEUP_TOOL_NAME}**，参数如下：
   - `delaySeconds`：如果已启动 ${MONITOR_TOOL_NAME}，此值为后备心跳（精简值 1200–1800s）。如果没有监控器，则根据本轮观察到的内容选择 —— 分支很安静？等久一点。有很多进行中的事情？等短一点。阅读工具自身的描述以获取缓存感知的延迟指导。
   - `reason`：一句话说明为什么选择这个延迟。
   - `prompt`：字面字符串 `${DYNAMIC_MODE_SENTINEL}` —— 动态模式哨兵在触发时会展开为完整指令（首次触发 / 压缩后首次触发 / loop.md 已编辑）或动态节奏特定的简短提醒（后续触发）。不要传递完整指令；这由系统自动处理。
5. **如果被 `<task-notification>` 唤醒**而非此提示词：处理事件，然后使用 `${DYNAMIC_MODE_SENTINEL}` 和相同的 1200–1800s `delaySeconds` 再次调用 ${SCHEDULE_WAKEUP_TOOL_NAME} —— ${MONITOR_TOOL_NAME} 仍然是唤醒信号；这只是重置安全网。
6. **停止循环**：省略 ${SCHEDULE_WAKEUP_TOOL_NAME} 调用，并使用 ${TASK_STOP_TOOL_NAME} 停止你启动的任何 ${MONITOR_TOOL_NAME}（如果任务 ID 已不在上下文中，使用 ${TASK_LIST_TOOL_NAME} 查找）。${ADDITIONAL_INFO_FN()}
