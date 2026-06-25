<!-- 
name: skill-code-review-efficiency-dimension
description: Efficiency dimension for code review skills. Inline fragment. 
ccVersion: ${ccVersion}
variables:
  EFFICIENCY_DIMENSION:
    description: Efficiency dimension for code review skills
    value: |
      ### 效率（Efficiency）

      标记差异引入的浪费性工作：重复计算或重复 I/O、被串行执行的独立操作、被添加到启动路径或热路径（hot path）上的阻塞性工作。同时标记由闭包或捕获环境构建的长生命周期对象——它们会在对象的整个生命周期内保持整个封闭作用域存活（当该作用域持有大量值时，这会构成内存泄漏）；建议使用只复制所需字段的 class/struct 来替代。指出更廉价的替代方案。
  EFFICIENCY_SKILL_HEADER:
    description: Efficiency dimension header for code review skills
    value: |
      始终审查代码的效率——寻找更简洁、更直接、同样易读的等价代码。
-->
