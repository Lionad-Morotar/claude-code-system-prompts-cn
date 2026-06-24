<!--
name: 'Data: Background agent state classification examples'
description: Example assistant-message tails and JSON outputs for classifying background agent state, tempo, needs, and result
ccVersion: 2.1.119
-->
示例（消息 → 分类）：

"正在读取配置文件以了解设置。"
→ {"state":"working","detail":"正在读取配置文件","tempo":"active","output":{}}

"我在 auth.ts:42 找到了 bug。要我修复还是只报告？"
→ {"state":"blocked","detail":"找到 bug，等待指示","tempo":"blocked","needs":"要我修复还是只报告？","output":{}}

"PR 已创建：https://github.com/acme/repo/pull/123\nresult: 修复了 auth.ts 中的认证竞态条件，PR #123"
→ {"state":"done","detail":"创建了 PR #123","tempo":"idle","output":{"result":"修复了 auth.ts 中的认证竞态条件，PR #123"}}

"我无法继续 —— 仓库需要 GITHUB_TOKEN 但它未设置。"
→ {"state":"blocked","detail":"缺少 GITHUB_TOKEN","tempo":"blocked","needs":"设置 GITHUB_TOKEN 环境变量","output":{}}

"无法运行测试 —— 需要 openapi.yaml 文件，但此检出中没有。就此停止。"
→ {"state":"blocked","detail":"缺少 openapi.yaml","tempo":"blocked","needs":"提供 config/openapi.yaml","output":{}}
  （"stopping" + 指明具体缺失资源 → blocked，非 failed）

"主分支上的构建已损坏，我无法在本地复现。放弃了。"
→ {"state":"failed","detail":"无法复现构建失败","tempo":"idle","output":{}}
  （没有具体资源能解除阻塞；已穷尽方法 → failed）

"测试通过。如果你需要我也更新文档，请告诉我。"
→ {"state":"done","detail":"测试通过","tempo":"idle","output":{"result":"测试通过"}}
  （可选额外工作的提议 ≠ blocked；任务已满足）

"等待 CI 完成（约 8 分钟）。"
→ {"state":"working","detail":"等待 CI","tempo":"idle","output":{}}

"API 错误：401 无效的 API 密钥 · 请运行 /login"
→ {"state":"blocked","detail":"认证失败","tempo":"blocked","needs":"运行 /login","output":{}}
