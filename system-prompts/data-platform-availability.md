<!--
name: '数据：平台可用性'
description: Claude API 各提供商平台的功能可用性矩阵（第一方、AWS 上的 Claude Platform、Bedrock、Vertex 和 Foundry）
ccVersion: 2.1.182
-->
# 平台可用性

各功能在不同提供商平台上的支持情况。**本表格是本 skill 中的唯一事实来源** — 各功能章节引用此处而非重复声明可用性。在为第三方平台（Bedrock、Vertex、Foundry）或 AWS 上的 Claude Platform 编写代码时，请首先查阅此表格；如果某功能不受支持，则应使用第一方 Claude API 或其他替代方案。

列说明：**1P** = 第一方 Claude API，**P-AWS** = AWS 上的 Claude Platform（由 Anthropic 运营，同日功能同步），**Bedrock** = Amazon Bedrock，**Vertex** = Google Cloud Vertex AI，**Foundry** = Microsoft Foundry。✅ = 正式发布，β = 测试版，❌ = 不支持。

| 功能 | 1P | P-AWS | Bedrock | Vertex | Foundry | 备注 |
|---|---|---|---|---|---|---|
| Messages、流式、工具调用 | ✅ | ✅ | ✅ | ✅ | ✅ | 核心 API |
| PDF 输入 | ✅ | ✅ | ✅ | ✅ | β | |
| 结构化输出 / 严格工具调用 | ✅ | ✅ | ✅ | ✅ | β | |
| 自适应思考 / effort | ✅ | ✅ | ✅ | ✅ | β | |
| 扩展思考 | ✅ | ✅ | ✅ | ✅ | β | |
| Prompt 缓存（5 分钟、1 小时） | ✅ | ✅ | ✅ | ✅ | β | |
| 自动 Prompt 缓存 | ✅ | ✅ | ❌ | ❌ | β | |
| Token 计数 | ✅ | ✅ | ✅ | ✅ | β | |
| 引用 | ✅ | ✅ | ✅ | ✅ | β | |
| 搜索结果内容块 | ✅ | ✅ | ✅ | ✅ | β | |
| 细粒度工具流式 | ✅ | ✅ | ✅ | ✅ | ✅ | |
| 压缩 | β | β | β | β | β | |
| 上下文编辑 | β | β | β | β | β | |
| 上下文窗口（1M） | ✅ | ✅ | ✅ | ✅ | β | |
| `inference_geo`（数据驻留） | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **服务端工具** | | | | | | |
| &nbsp;&nbsp;网页搜索 | ✅ | ✅ | ❌ | ✅ | β | Vertex：仅支持基础 `web_search_20250305`（不含 `_20260209` 动态过滤） |
| &nbsp;&nbsp;网页抓取 | ✅ | ✅ | ❌ | ❌ | β | |
| &nbsp;&nbsp;代码执行 | ✅ | ✅ | ❌ | ❌ | β | |
| &nbsp;&nbsp;工具搜索 | ✅ | ✅ | ✅ | ✅ | β | Bedrock：仅限 InvokeModel API，不支持 Converse |
| &nbsp;&nbsp;Advisor 工具 | β | β | ❌ | ❌ | ❌ | |
| **客户端实现的工具** | | | | | | |
| &nbsp;&nbsp;Bash、文本编辑器、记忆 | ✅ | ✅ | ✅ | ✅ | β | |
| &nbsp;&nbsp;计算机使用 | β | β | β | β | β | |
| **Agent / 编排** | | | | | | |
| &nbsp;&nbsp;Agent Skills（Messages API） | β | β | ❌ | ❌ | β | |
| &nbsp;&nbsp;编程式工具调用 | ✅ | ✅ | ❌ | ❌ | β | |
| &nbsp;&nbsp;MCP 连接器 | β | β | ❌ | ❌ | β | |
| &nbsp;&nbsp;Managed Agents | β | β | ❌ | ❌ | ❌ | Foundry ❌ 为推断（Foundry 文档中双向均未提及） |
| &nbsp;&nbsp;自托管沙箱 | β | β | ❌ | ❌ | ❌ | P-AWS：`GET /v1/environments/{id}/work` 列表端点不支持；其他 work 端点正常 |
| **API 端点** | | | | | | |
| &nbsp;&nbsp;消息批处理 | ✅ | ✅ | ❌ | ❌ | ❌ | |
| &nbsp;&nbsp;Files API | β | β | ❌ | ❌ | β | |
| &nbsp;&nbsp;Models API | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **其他** | | | | | | |
| &nbsp;&nbsp;对话中途系统消息 | ✅ | ✅ | ❌ | ❌ | ❌ | 仅限 {{OPUS_NAME}} |
| &nbsp;&nbsp;快速模式 | β | ❌ | ❌ | ❌ | ❌ | 研究预览，beta `fast-mode-2026-02-01`，仅限第一方 API |
| &nbsp;&nbsp;缓存诊断 | β | ❌ | ❌ | ❌ | ❌ | 仅限第一方 API |
| &nbsp;&nbsp;任务预算 | β | β | ❌ | ❌ | ❌ | Beta 头 `task-budgets-2026-03-13`；第三方平台可用性未记录 — 假设不支持 |

<!--
GROUNDING（仅供审核者；运行时由 processSkillMarkdown 移除）。
所有路径均在 docker_eval/resources/cdp-skill/public-docs/ 下。

主要来源：build-with-claude/overview.mdx <PlatformAvailability> props
（claudeApi→1P、claudePlatformAws→P-AWS、bedrock→Bedrock、vertexAi→Vertex、
azureAi→Foundry；*Beta 后缀→β；prop 缺失→❌）。按行引用：

  上下文窗口                  ov:44
  自适应思考                  ov:45
  批处理 / 消息批处理         ov:46；bed:360；vtx:381；fdy:507
  引用                        ov:47
  inference_geo              ov:48
  Effort                     ov:49
  扩展思考                    ov:50
  PDF 输入                    ov:51
  搜索结果                    ov:52
  结构化输出                  ov:53
  Advisor 工具                ov:63
  代码执行                    ov:64
  网页抓取                    ov:65
  网页搜索                    ov:66；agents-and-tools/tool-use/web-search-tool.mdx:41
  Bash/文本编辑器/记忆         ov:72,75,74
  计算机使用                  ov:73
  Agent Skills               ov:83
  细粒度流式                  ov:84
  MCP 连接器                  ov:85；agents-and-tools/mcp-connector.mdx:36
  编程式工具调用               ov:86
  工具搜索                    ov:87；agents-and-tools/tool-use/tool-search-tool.mdx:24-30
  压缩                        ov:95
  上下文编辑                  ov:96
  自动缓存                    ov:97
  Prompt 缓存 5 分钟/1 小时    ov:98,99
  Token 计数                  ov:100
  Files API                  ov:108；build-with-claude/files.mdx:17
  Managed Agents             managed-agents/overview.mdx:11,70-72；bed:360；vtx:381
  自托管沙箱                  build-with-claude/claude-platform-on-aws.mdx:525,547
  对话中途系统消息             build-with-claude/mid-conversation-system-messages.mdx:15
  快速模式                    build-with-claude/fast-mode.mdx:23
  缓存诊断                    build-with-claude/cache-diagnostics.mdx:15,1379
  任务预算                    build-with-claude/task-budgets.mdx:15
  Models API                 bed:360；vtx:381；fdy:506

  ov  = build-with-claude/overview.mdx
  bed = build-with-claude/claude-in-amazon-bedrock.mdx
  vtx = build-with-claude/claude-on-vertex-ai.mdx
  fdy = build-with-claude/claude-in-microsoft-foundry.mdx
-->
