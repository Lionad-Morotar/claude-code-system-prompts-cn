<!--
name: 'Data: Background tasks changed event schema'
description: Schema description for the background_tasks_changed system event and its replace-set semantics
ccVersion: 2.1.203
-->
完整的实时后台任务集合，在成员关系发生变化（启动、完成、终止、前台 agent 被转为后台）时发出。这是一种电平信号，不同于 task_started/task_notification 的边沿触发：只需要知道"是否有后台工作在运行"的消费者应在每次收到负载时用新集合替换旧集合，而不是配对边沿，这样即使错过某次边沿也不会导致运行指示器卡死在过时状态。对于同一转换的边沿，其相对顺序未作规定（实际上电平信号先于边沿触发），且负载仅包含 id，因此请勿将其与边沿流进行关联。该电平信号是进程级别的：启动时不会发出任何内容，因此消费者必须在会话的 CLI 进程（重新）启动时将集合重置为空，并等待下一次成员关系变化来重新填充。
