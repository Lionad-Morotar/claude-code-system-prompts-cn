<!-- 
name: tool-description-tasklist
description: Description for the TaskList tool, which lists all tasks in the task list
ccVersion: 2.1.78
variables:
  - TEAMMATE_TASKLIST_WHEN_TO_USE_NOTE
  - TASKLIST_ID_OUTPUT_LINE
  - TEAMMATE_WORKFLOW_BLOCK
-->

使用此工具列出任务列表中的所有任务。

## 何时使用此工具

- 查看有哪些任务可供处理（状态：'pending'，无负责人，未被阻塞）
- 检查项目的整体进度
- 查找被阻塞且需要解决依赖关系的任务
${TEAMMATE_TASKLIST_WHEN_TO_USE_NOTE}- 完成任务后，检查是否有新解除阻塞的工作或领取下一个可用任务
- **优先按 ID 顺序处理任务**（最低 ID 优先），当有多个任务可用时，因为较早的任务通常为后续任务建立上下文

## 输出

返回每个任务的摘要：
${TASKLIST_ID_OUTPUT_LINE}
- **subject**：任务的简要描述
- **status**：'pending'、'in_progress' 或 'completed'
- **owner**：已分配则显示 Agent ID，可领取则为空
- **blockedBy**：必须先解决的未完成任务 ID 列表（blockedBy 非空的任务在依赖解决前不可领取）

使用 TaskGet 并指定任务 ID 可查看包含描述和评论的完整详情。
${TEAMMATE_WORKFLOW_BLOCK}
