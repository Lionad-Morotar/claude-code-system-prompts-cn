<!-- 
name: tool-description-taskupdate
description: Tool for updating an existing task's properties
ccVersion: 2.1.78
variables: 
-->

更新任务列表中的现有任务。使用此工具更新任务状态、描述和依赖关系。

## 何时使用此工具

- 开始处理任务时，将其状态更新为 `in_progress`
- 完成任务时，将其状态更新为 `completed`
- 将任务重新分配给其他负责人
- 更新任务的描述、依赖关系或其他元数据

## 任务状态管理

1. **标记为 in_progress**：当你开始处理某个任务时
2. **标记为 completed**：当所有工作完成并验证后
3. 同一时间只应有一个任务处于 `in_progress` 状态

## 依赖关系管理

- 使用 `blockedBy` 指定此任务开始前必须先完成的任务
- `blockedBy` 非空的任务在所有阻塞任务变为 `completed` 之前，不能标记为 `in_progress`

## 示例

### 开始一个任务
```
taskUpdate({ id: "1", status: "in_progress" })
```

### 完成一个任务
```
taskUpdate({ id: "1", status: "completed" })
```

### 设置依赖关系
```
taskUpdate({ id: "2", blockedBy: ["1"] })
```
