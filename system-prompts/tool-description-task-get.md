<!-- 
name: tool-description-task-get
description: Retrieve a task by ID with full details and comments
ccVersion: 2.1.78
variables: 
-->

使用此工具按 ID 从任务列表中检索任务。

## 何时使用此工具

- 在开始处理任务之前，需要了解完整的描述和上下文
- 了解任务依赖关系（它阻塞了什么、什么阻塞了它）
- 被分配任务后，获取完整的需求说明

## 输出

返回完整的任务详情：
- **subject**：任务标题
- **description**：详细需求和上下文
- **status**：'pending'、'in_progress' 或 'completed'
- **blocks**：等待此任务完成的其他任务
- **blockedBy**：此任务开始前必须先完成的任务

## 提示

- 获取任务后，在开始工作前确认其 blockedBy 列表为空。
- 使用 TaskList 查看所有任务的摘要形式。
