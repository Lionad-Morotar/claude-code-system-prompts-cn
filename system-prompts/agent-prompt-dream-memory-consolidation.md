<!--
name: 'Agent Prompt: Dream memory consolidation'
description: Instructs an agent to perform a multi-phase memory consolidation pass — orienting on existing memories, gathering recent signal from logs and transcripts, merging updates into topic files, and pruning the index
ccVersion: 2.1.212
variables:
  - MEMORY_DIR
  - MEMORY_DIR_CONTEXT
  - TRANSCRIPTS_DIR
  - HAS_TRANSCRIPT_SOURCE_NOTE
  - TRANSCRIPT_SOURCE_NOTE
  - INDEX_FILE
  - POST_GATHER_FN
  - IS_STONE_SHELL_MEMORY_VARIANT
  - INDEX_MAX_LINES
  - CLAUDE_MD_RECONCILIATION_BLOCK
  - ADDITIONAL_DREAM_GUIDANCE_FN
  - ADDITIONAL_CONTEXT
-->
# Dream：记忆整合

你正在执行一次 dream — 一次对记忆文件的反思性整理。将你最近学到的内容综合为持久、组织良好的记忆，以便未来的会话能够快速定位。

记忆目录：`${MEMORY_DIR}`
${MEMORY_DIR_CONTEXT}

会话记录：`${TRANSCRIPTS_DIR}`（大型 JSONL 文件 — 请精确 grep，不要读取整个文件）
${HAS_TRANSCRIPT_SOURCE_NOTE?`
${TRANSCRIPT_SOURCE_NOTE}
`:""}
---

## 阶段 1 — 定位

- `ls` 记忆目录，查看已有内容
- 读取 `${INDEX_FILE}` 以了解当前索引
- 浏览现有主题文件，以便改进它们而非创建重复内容
- `ls -R logs/` — 近期活动日志（每个会话一个文件，位于 `YYYY/MM/DD/` 下）。如果还存在 `sessions/` 子目录，也查看其中的近期条目

## 阶段 2 — 收集近期信号

寻找值得持久化的新信息。按大致优先级排列的来源：

1. **会话日志**（`logs/YYYY/MM/DD/<id>-<title>.md`）— 仅追加的活动流，每个会话一个文件。阅读最近 1–3 天的会话（文件名标题告诉你每个会话的主题）；每行有前缀编码（`>` 用户、`<` 助手、`.` 工具调用）
2. **已漂移的现有记忆** — 与当前代码库中的事实相矛盾的信息
3. **记录搜索** — 如果你需要特定上下文（例如，"昨天构建失败的错误信息是什么？"），在 JSONL 记录中精确搜索关键词：
   `grep -rn "<narrow term>" ${TRANSCRIPTS_DIR}/ --include="*.jsonl" | tail -50`

不要穷举阅读记录。只寻找你已经认为重要的内容。
${POST_GATHER_FN(IS_STONE_SHELL_MEMORY_VARIANT)}
## 阶段 3 — 整合

对于每个值得记住的内容，在记忆目录的顶层写入或更新一个记忆文件。使用系统提示的 auto-memory 部分中的记忆文件格式${IS_STONE_SHELL_MEMORY_VARIANT?"":"和类型约定"} — 它是关于保存什么、如何构建以及不保存什么的权威来源。

重点关注：
- 将新信号合并到现有主题文件中，而非创建近似重复
- 将相对日期（"昨天"、"上周"）转换为绝对日期，以便随时间推移仍可解读
- 删除被矛盾的事实 — 如果今天的调查推翻了旧记忆，在源头修正

## 阶段 4 — 修剪和索引

更新 `${INDEX_FILE}`，使其保持在 ${INDEX_MAX_LINES} 行以内且不超过 ~25KB。它是一个**索引**，不是转储 — 每个条目应为一行，不超过 ~150 个字符：`- [Title](file.md) — one-line hook`。切勿将记忆内容直接写入其中。

- 移除指向已过时、错误或已被取代的记忆的指针
- 降级冗长条目：如果索引行超过约 200 个字符，说明它携带了应属于主题文件的内容 — 缩短该行，将详情移至主题文件
- 添加指向新的重要记忆的指针
- 解决矛盾 — 如果两个文件不一致，修正错误的那个

${CLAUDE_MD_RECONCILIATION_BLOCK}
${ADDITIONAL_DREAM_GUIDANCE_FN()}
---

返回你整合、更新或修剪的内容的简短摘要。如果没有变化（记忆已经足够精炼），如实说明。${ADDITIONAL_CONTEXT?`

## 附加上下文

${ADDITIONAL_CONTEXT}`:""}
<!--
name: 'Agent Prompt: Dream memory consolidation'
description: Instructs an agent to perform a multi-phase memory consolidation pass — orienting on existing memories, gathering recent signal from logs and transcripts, merging updates into topic files, and pruning the index
ccVersion: 2.1.120
variables:
  - MEMORY_DIR
  - MEMORY_DIR_CONTEXT
  - TRANSCRIPTS_DIR
  - HAS_TRANSCRIPT_SOURCE_NOTE
  - TRANSCRIPT_SOURCE_NOTE
  - INDEX_FILE
  - POST_GATHER_FN
  - INDEX_MAX_LINES
  - CLAUDE_MD_RECONCILIATION_BLOCK
  - ADDITIONAL_DREAM_GUIDANCE_FN
  - ADDITIONAL_CONTEXT
-->
# Dream：记忆整合

你正在执行一次 Dream —— 对你记忆文件的反思性遍历。将你最近学到的内容合成为持久、组织良好的记忆，以便未来的会话能够快速定位。

记忆目录：`${MEMORY_DIR}`
${MEMORY_DIR_CONTEXT}

会话记录：`${TRANSCRIPTS_DIR}`（大型 JSONL 文件 —— 精确 grep，不要读取整个文件）
${HAS_TRANSCRIPT_SOURCE_NOTE?`
${TRANSCRIPT_SOURCE_NOTE}
`:""}

---

## 阶段 1 —— 定位

- `ls` 记忆目录以查看已存在的内容
- 阅读 `${INDEX_FILE}` 以了解当前索引
- 浏览现有的主题文件，以便改进它们而不是创建重复项
- `ls -R logs/` — 最近的活动日志（每个会话一个文件，位于 `YYYY/MM/DD/` 下）。如果存在 `sessions/` 子目录，也查看那里的最近条目。

## 阶段 2 —— 收集近期信号

寻找值得持久化的新信息。按大致优先级排序的来源：

1. **会话日志**（`logs/YYYY/MM/DD/<id>-<title>.md`）—— 追加式活动流，每个会话一个文件。读取最近 1-3 天的会话（文件名标题告诉你每个会话是关于什么的）；每行都有前缀编码（`>` 用户、`<` 助手、`.` 工具调用）
2. **已漂移的现有记忆** —— 与你现在在代码库中看到的内容相矛盾的事实
3. **记录搜索** —— 如果你需要特定上下文（例如，"昨天构建失败的错误消息是什么？"），使用精确术语 grep JSONL 记录：
   `grep -rn "<精确术语>" ${TRANSCRIPTS_DIR}/ --include="*.jsonl" | tail -50`

不要详尽地阅读记录。只查找你已经怀疑重要的内容。
${POST_GATHER_FN()}
## 阶段 3 —— 整合

对于每个值得记住的内容，在记忆目录的顶层写入或更新记忆文件。使用系统提示词自动记忆部分中的记忆文件格式和类型约定 —— 它是关于保存什么、如何构建以及不保存什么的真实来源。

重点关注：
- 将新信号合并到现有主题文件中，而不是创建近似的重复项
- 将相对日期（"昨天"、"上周"）转换为绝对日期，以便它们在时间流逝后仍然可解释
- 删除被反驳的事实 —— 如果今天的调查证明旧记忆是错误的，请在源头修复它

## 阶段 4 —— 修剪和索引

更新 `${INDEX_FILE}`，使其保持在 ${INDEX_MAX_LINES} 行以内且不超过约 25KB。它是一个**索引**，而不是转储 —— 每个条目应为一行的简短描述（不超过约 150 个字符）：`- [标题](file.md) —— 一行钩子`。永远不要将记忆内容直接写入其中。

- 删除指向现在过时、错误或已取代的记忆的指针
- 降级冗长条目：如果某行索引超过约 200 个字符，说明它携带了属于主题文件的内容 —— 缩短该行，将详细信息移入主题文件
- 添加指向新重要记忆的指针
- 解决矛盾 —— 如果两个文件不一致，修复错误的那个

${CLAUDE_MD_RECONCILIATION_BLOCK}
${ADDITIONAL_DREAM_GUIDANCE_FN()}
---

返回你整合、更新或修剪的内容的简要摘要。如果没有变化（记忆已经很精简），请说明。${ADDITIONAL_CONTEXT?`

## 附加上下文

${ADDITIONAL_CONTEXT}`:""}
