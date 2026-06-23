<!--
name: 'Data: Prompt Caching — Design & Optimization'
description: Document on how to design prompt-building code for effective caching, including placement patterns and anti-patterns.
ccVersion: 2.1.83
-->
# 提示缓存 — 设计与优化

本文档介绍如何设计提示构建代码以实现高效的缓存。有关语言特定的语法，请参阅各语言 README 或单文件文档中的 `## Prompt Caching` 部分。

## 一切遵循的唯一不变原则

**提示缓存是前缀匹配。前缀中任何位置的任何更改都会使之后的所有内容失效。**

缓存键由渲染后的提示词中每个 `cache_control` 断点之前的精确字节派生。位置 N 处的单个字节差异——一个时间戳、一个重排后的 JSON 键、列表中的不同工具——会使位置 ≥ N 的所有断点的缓存失效。

渲染顺序为：`tools` → `system` → `messages`。最后一个系统块上的断点会同时缓存 tools 和 system。

围绕此约束设计提示构建路径。顺序正确，大多数缓存就能免费生效。顺序错了，再多的 `cache_control` 标记也无济于事。

---

## 优化现有代码的工作流

当被要求添加或优化缓存时：

1. **追踪提示组装路径。** 找到 `system`、`tools` 和 `messages` 的构建位置。识别所有输入到它们的内容。
2. **按稳定性对每个输入分类：**
   - 从不变化 → 放在提示词的前部，在任何断点之前
   - 每次会话变化 → 放在全局前缀之后，按会话缓存
   - 每次轮次变化 → 放在末尾，在最后一个断点之后
   - 每次请求变化（时间戳、UUID、随机 ID）→ **消除或移到最末尾**
3. **检查渲染顺序是否与稳定性顺序一致。** 稳定内容必须在物理位置上先于易变内容。如果时间戳被插值到系统提示头部，那么无论标记如何，其后所有内容都不可缓存。
4. **在稳定性边界放置断点。** 参见下方的放置模式。
5. **审查静默失效因素。** 参见反模式表。

---

## 放置模式

### 跨多个请求共享的大型系统提示

在最后一个系统文本块上放置断点。如果有 tools，它们会在 system 之前渲染——在最后一个系统块上的标记会同时缓存 tools + system。

```json
"system": [
  {"type": "text", "text": "<大型共享提示>", "cache_control": {"type": "ephemeral"}}
]
```

### 多轮对话

在最近添加的轮次的最后一个内容块上放置断点。每次后续请求重用整个先前对话前缀。较早的断点仍然是有效的读取点，因此随着对话增长，缓存命中会逐步累积。

```json
// 最后一个用户轮次的最后一个内容块
messages[-1].content[-1].cache_control = {"type": "ephemeral"}
```

### 共享前缀，变化后缀

许多请求共享一个较大的固定前导部分（少样本示例、检索到的文档、指令），但最终问题各不相同。将断点放在**共享**部分的末尾，而不是整个提示的末尾——否则每个请求都会写入不同的缓存条目，且永远不会被读取。

```json
"messages": [{"role": "user", "content": [
  {"type": "text", "text": "<共享上下文>", "cache_control": {"type": "ephemeral"}},
  {"type": "text", "text": "<变化的问题>"}  // 无标记——每次不同
]}]
```

### 每次从头变化的提示

不要缓存。如果前 1K token 每次请求都不同，就没有可重用的前缀。添加 `cache_control` 只会付出缓存写入的代价而没有任何读取收益。保持无标记。

---

## 架构指导

以下决策比标记放置更重要。先解决这些问题。

**保持系统提示冻结。** 不要将"当前日期：X"、"模式：Y"、"用户名：Z"插值到系统提示中——它们位于前缀的开头，会使下游所有内容失效。将动态上下文作为用户或助手消息注入到 `messages` 中的较后位置。第 5 轮的消息不会使第 5 轮之前的任何内容失效。

**不要在对话中途更改 tools 或模型。** Tools 在位置 0 渲染；添加、移除或重排工具会使整个缓存失效。切换模型也是如此（缓存是模型作用域的）。如果需要"模式"，不要替换工具集——给 Claude 一个记录模式转换的工具，或将模式作为消息内容传递。确定性序列化 tools（按名称排序）。

**分支操作必须重用父进程的确切前缀。** 侧面计算（摘要、压缩、子代理）通常会发起单独的 API 调用。如果分支以任何差异重新构建 `system` / `tools` / `model`，它将完全错过父进程的缓存。逐字复制父进程的 `system`、`tools` 和 `model`，然后在末尾追加分支特定的内容。

---

## 静默失效因素

审查代码时，在馈送到提示前缀的任何内容中搜索以下模式：

| 模式 | 为什么会破坏缓存 |
|---|---|
| 系统提示中的 `datetime.now()` / `Date.now()` / `time.time()` | 前缀每次请求都在变化 |
| 内容早期出现的 `uuid4()` / `crypto.randomUUID()` / 请求 ID | 同上——每次请求都独一无二 |
| 不带 `sort_keys=True` 的 `json.dumps(d)` / 遍历 `set` | 非确定性序列化 → 前缀字节不同 |
| 将会话/用户 ID 插值到系统提示的 f-string | 每个用户前缀不同；无法跨用户共享 |
| 条件系统部分（`if flag: system += ...`） | 每个标志组合都是不同的前缀 |
| `tools=build_tools(user)` 且集合因用户而异 | Tools 在位置 0 渲染；跨用户无缓存 |

修复方法：将动态部分移到最后一个断点之后，使其确定性，或者如果它不是关键负载则直接删除。

---

## API 参考

```json
"cache_control": {"type": "ephemeral"}              // 5 分钟 TTL（默认）
"cache_control": {"type": "ephemeral", "ttl": "1h"} // 1 小时 TTL
```

- 每个请求最多 **4** 个 `cache_control` 断点。
- 可放在任何内容块上：系统文本块、工具定义、消息内容块（`text`、`image`、`tool_use`、`tool_result`、`document`）。
- `messages.create()` 上的顶层 `cache_control` 会自动放置在最后一个可缓存块上——当你不需要精细放置时，这是最简单的选项。
- 最小可缓存前缀取决于模型（通常为 1024–2048 token）。即使有标记，较短的前缀也不会被缓存。

**经济学：** 缓存写入成本约为基础输入价格的 1.25 倍；读取成本约为 0.1 倍。一个前缀必须在 TTL 内至少被两个请求使用才能收支平衡（一个写入缓存，后续的读取缓存）。对于突发流量，1 小时 TTL 可在间隔期间保持条目存活。

---

## 验证缓存命中

响应中的 `usage` 对象报告缓存活动：

| 字段 | 含义 |
|---|---|
| `cache_creation_input_tokens` | 此请求写入缓存的 token（你支付了约 1.25 倍的写入溢价） |
| `cache_read_input_tokens` | 此请求从缓存中读取的 token（你支付了约 0.1 倍） |
| `input_tokens` | 以全价处理的 token（未缓存） |

如果在具有相同前缀的重复请求中 `cache_read_input_tokens` 为零，则存在静默失效因素——比较两次请求之间渲染后的提示字节来定位问题。

语言特定访问方式：`response.usage.cache_read_input_tokens`（Python/TS/Ruby）、`$message->usage->cacheReadInputTokens`（PHP）、`resp.Usage.CacheReadInputTokens`（Go/C#）、`.usage().cacheReadInputTokens()`（Java）。
