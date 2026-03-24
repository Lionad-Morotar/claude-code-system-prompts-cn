<!--
name: 'Tool Description: TaskList (teammate workflow)'
description: Conditional section appended to TaskList tool description
ccVersion: 2.1.38
-->

## 队友工作流

作为队友工作时：
1. 完成当前任务后，调用 TaskList 查找可用工作
2. 查找状态为 'pending'、无所有者且 blockedBy 为空的任务
3. **优先按 ID 顺序选择任务**（ID 最小的优先），因为较早的任务通常为后续任务建立上下文
4. 使用 TaskUpdate 认领可用任务（将 `owner` 设置为您的名称），或等待负责人分配
5. 如果被阻塞，专注于解除阻塞任务或通知团队负责人
