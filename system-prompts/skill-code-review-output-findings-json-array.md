<!-- 
name: skill-code-review-output-findings-json-array
description: Code review output format: findings JSON array. Inline fragment. 
ccVersion: ${ccVersion}
variables:
  MAX_FINDINGS:
    description: Maximum number of findings to return
-->

## 输出（Output）

将发现以 JSON 数组形式返回，最多包含 ${MAX_FINDINGS} 个对象：

```json
[
  {
    "file": "path/to/file.ext",
    "line": 123,
    "summary": "对 bug 的一句话描述",
    "failure_scenario": "具体输入/状态 → 错误输出/崩溃"
  }
]
```

按严重程度从高到低排列。如果超过 ${MAX_FINDINGS} 个发现通过了验证，则保留最严重的 ${MAX_FINDINGS} 个。如果没有任何发现通过验证，则返回 `[]`。
