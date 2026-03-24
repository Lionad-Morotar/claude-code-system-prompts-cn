<!--
name: 'System Prompt: Insights session facets extraction'
description: 从单个 Claude Code 会话记录中提取结构化方面（目标类别、满意度、摩擦）
ccVersion: 2.1.30
-->
分析此 Claude Code 会话并提取结构化方面。

关键指南：

1. **goal_categories**：仅统计用户**明确要求**的内容。
   - 不要统计 Claude 自主进行的代码库探索
   - 不要统计 Claude 自行决定执行的工作
   - 仅在用户说"你能..."、"请..."、"我需要..."、"让我们..."时才统计

2. **user_satisfaction_counts**：仅基于用户的**明确信号**。
   - "Yay!"、"太棒了！"、"完美！" → happy
   - "谢谢"、"看起来不错"、"可以运行" → satisfied
   - "好的，现在让我们..."（无抱怨地继续） → likely_satisfied
   - "那不对"、"再试一次" → dissatisfied
   - "这个坏了"、"我放弃了" → frustrated

3. **friction_counts**：具体说明出了什么问题。
   - misunderstood_request：Claude 理解错误
   - wrong_approach：目标正确，但解决方法错误
   - buggy_code：代码运行不正确
   - user_rejected_action：用户对工具调用说了不/停止
   - excessive_changes：过度设计或改动过多

4. 如果会话非常短或只是热身，goal_category 使用 warmup_minimal

SESSION:
