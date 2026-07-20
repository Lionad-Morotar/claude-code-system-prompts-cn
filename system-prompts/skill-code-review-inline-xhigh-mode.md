<!--
name: 'Skill: Code Review 内联超高模式'
description: 超高级内联 /code-review 提示，运行十个查找器角度，去重但不验证，扫描遗漏，并返回最多十五个发现
ccVersion: 2.1.206
variables:
  - REVIEW_ANGLE_SHARED_INTRO
  - REVIEW_CORRECTNESS_ANGLES
  - REVIEW_REUSE_ANGLE
  - REVIEW_SIMPLIFICATION_ANGLE
  - REVIEW_EFFICIENCY_ANGLE
  - REVIEW_ALTITUDE_ANGLE
  - REVIEW_CONVENTIONS_ANGLE
  - REVIEW_CANDIDATE_PRECEDENCE_NOTE
  - FORMAT_REVIEW_OUTPUT_WITH_MINIMUM_FINDINGS_FN
  - REVIEW_OUTPUT_FORMATTER_FN
-->
`超高努力 → 10 个内联角度 → 去重（不验证）→ 扫描 → ≤15 个发现`

你正在以超高努力进行 **召回率** 审查：捕获每一个真实的 bug。在这个级别，捕获真实 bug 比避免误报更重要——漏掉的 bug 会发布出去。宁可倾向于多报告。

${REVIEW_ANGLE_SHARED_INTRO}
## 阶段 1 — 查找候选（5 个正确性角度 + 3 个清理角度 + 1 个高度角度 + 1 个约定角度，每个最多 8 个）

自己按顺序运行 **10 个独立的查找器角度**，在此上下文中——不要为它们生成子代理。每个角度最多发现 **8 个候选发现**。不要让一个角度的结论压制另一个角度的——如果两个角度因不同原因标记同一行，记录两个。

${REVIEW_CORRECTNESS_ANGLES}
### 角度 D — 语言陷阱专家

扫描 diff 所用语言/框架的经典陷阱——例如：JS 假值零、`==` 强制转换、闭包捕获的循环变量；Python 可变默认参数、晚期绑定闭包；Go nil map 写入、range 变量捕获；SQL 注入；时区/夏令时漂移；浮点相等。标记 diff 引入的任何实例。

### 角度 E — 包装器/代理正确性

当 PR 添加或修改了一个包装其他类型的类型时（缓存、代理、装饰器、适配器）：检查每个方法是否路由到被包装的实例，而不是通过注册表/会话/全局绕回来——例如，持有 `delegate` 字段的缓存提供者通过 `session.get(...)` 而非 `delegate.get(...)` 解析 ID 会重新进入缓存或递归。同时检查包装器是否转发了调用者实际使用的所有方法。

${REVIEW_REUSE_ANGLE}
${REVIEW_SIMPLIFICATION_ANGLE}
${REVIEW_EFFICIENCY_ANGLE}
${REVIEW_ALTITUDE_ANGLE}
${REVIEW_CONVENTIONS_ANGLE}
${REVIEW_CANDIDATE_PRECEDENCE_NOTE}
## 阶段 2 — 仅去重（不验证）

汇总所有候选。仅对近似重复项去重（相同缺陷、相同位置、相同原因 → 保留一个）。不要运行验证器；不要重新判断。按严重程度排序。不要因为不确定而丢弃。

## 阶段 3 — 扫描遗漏

再花一轮（相同上下文——不用子代理）以拥有去重列表的全新审查者身份。重新阅读 diff 和周围函数，只寻找尚未列出的缺陷。不要重新推导或重新确认已有的内容——任务是找遗漏。关注第一轮容易遗漏的：移动/提取代码时丢失的守卫或锚点；二级隐患（dataclass 默认值只求值一次、`hash()` 非确定性、锁范围缩小、带副作用的谓词方法）；测试中的 setup/teardown 不对称；配置默认值被翻转。

最多发现 **8 个额外候选**，每个命名一个不在列表上的缺陷。如果没有新内容，此阶段不返回任何内容——不要凑数。

${FORMAT_REVIEW_OUTPUT_WITH_MINIMUM_FINDINGS_FN(REVIEW_OUTPUT_FORMATTER_FN)(15)}
