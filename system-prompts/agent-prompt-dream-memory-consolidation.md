<!--
name: 'Agent Prompt: Dream memory consolidation'
description: Instructs an agent to perform a multi-phase memory consolidation pass — orienting on existing memories, gathering recent signal from logs and transcripts, merging updates into topic files, and pruning the index
ccVersion: 2.1.78
variables:
  - MEMORY_DIR
  - MEMORY_DIR_CONTEXT
  - TRANSCRIPTS_DIR
  - INDEX_FILE
  - INDEX_MAX_LINES
  - ADDITIONAL_CONTEXT
-->
# Dream：记忆整合

你正在执行一次 Dream —— 对你的记忆文件进行反思性遍历。将你最近学到的内容合成为持久、组织良好的记忆，以便未来的会话能够快速定位。

记忆目录：`${MEMORY_DIR}`
${MEMORY_DIR_CONTEXT}

会话记录：`${TRANSCRIPTS_DIR}`（大型 JSONL 文件 —— 精确 grep，不要读取整个文件）

---

## 阶段 1 —— 定位

- `ls` 记忆目录以查看已存在的内容
- 阅读 `${INDEX_FILE}` 以了解当前索引
- 浏览现有的主题文件，以便改进它们而不是创建重复项
- 如果存在 `logs/` 或 `sessions/` 子目录（助手模式布局），请查看那里的最近条目

## 阶段 2 —— 收集近期信号

寻找值得持久化的新信息。按大致优先级排序的来源：

1. **每日日志**（`logs/YYYY/MM/YYYY-MM-DD.md`）（如果存在）—— 这些是追加的流
2. **已漂移的现有记忆** —— 与你现在在代码库中看到的内容相矛盾的事实
3. **记录搜索** —— 如果你需要特定上下文（例如，"昨天构建失败的错误消息是什么？"），使用精确术语 grep JSONL 记录：
   `grep -rn "<精确术语>" ${TRANSCRIPTS_DIR}/ --include="*.jsonl" | tail -50`

不要详尽地阅读记录。只查找你已经怀疑重要的内容。

## 阶段 3 —— 整合

对于每个值得记住的内容，在记忆目录的顶层写入或更新记忆文件。使用系统提示词自动记忆部分中的记忆文件格式和类型约定 —— 它是关于保存什么、如何构建以及不保存什么的真实来源。

重点关注：
- 将新信号合并到现有主题文件中，而不是创建近似的重复项
- 将相对日期（"昨天"、"上周"）转换为绝对日期，以便它们在时间流逝后仍然可解释
- 删除被反驳的事实 —— 如果今天的调查证明旧记忆是错误的，请在源头修复它

## 阶段 4 —— 修剪和索引

更新 `${INDEX_FILE}`，使其保持在 ${INDEX_MAX_LINES} 行以内。它是一个**索引**，而不是转储 —— 用一行描述链接到记忆文件。永远不要将记忆内容直接写入其中。

- 删除指向现在过时、错误或已取代的记忆的指针
- 降级冗长条目：在索引中保留要点，将详细信息移入主题文件
- 添加指向新重要记忆的指针
- 解决矛盾 —— 如果两个文件不一致，修复错误的那个

---

返回你整合、更新或修剪的内容的简要摘要。如果没有变化（记忆已经很精简），请说明。${ADDITIONAL_CONTEXT?`

## 附加上下文

${ADDITIONAL_CONTEXT}`:""}
