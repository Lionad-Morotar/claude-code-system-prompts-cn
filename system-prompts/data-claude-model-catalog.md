<!--
name: 'Data: Claude model catalog'
description: Catalog of current and legacy Claude models with exact model IDs, aliases, context windows, and pricing
ccVersion: 2.1.73
-->
# Claude 模型目录

**仅使用本文件中列出的精确模型 ID。** 切勿猜测或构造模型 ID —— 错误的 ID 将导致 API 错误。尽可能使用别名。如需最新信息，请通过 WebFetch 获取 `shared/live-sources.md` 中的模型概览 URL。

## 当前模型（推荐）

| 友好名称 | 别名（请使用） | 完整 ID | 上下文 | 最大输出 | 状态 |
|-------------------|---------------------|-------------------------------|----------------|------------|--------|
| Claude Opus 4.6   | `claude-opus-4-6`   | —                             | 200K (1M beta) | 128K       | 活跃 |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | -                             | 200K (1M beta) | 64K        | 活跃 |
| Claude Haiku 4.5  | `claude-haiku-4-5`  | `claude-haiku-4-5-20251001`   | 200K           | 64K        | 活跃 |

### 模型描述

- **Claude Opus 4.6** — 我们用于构建智能体和编程的最智能模型。支持自适应思考（推荐），最大输出 128K 令牌（大输出需要流式传输）。可通过 `context-1m-2025-08-07` 标头以测试版形式使用 1M 上下文窗口。
- **Claude Sonnet 4.6** — 速度与智能的最佳结合。支持自适应思考（推荐）。可通过 `context-1m-2025-08-07` 标头以测试版形式使用 1M 上下文窗口。最大输出 64K 令牌。
- **Claude Haiku 4.5** — 用于简单任务的最快、最具成本效益的模型。

## 旧版模型（仍可用）

| 友好名称 | 别名（请使用） | 完整 ID | 状态 |
|-------------------|---------------------|-------------------------------|--------|
| Claude Opus 4.5   | `claude-opus-4-5`   | `claude-opus-4-5-20251101`    | 活跃 |
| Claude Opus 4.1   | `claude-opus-4-1`   | `claude-opus-4-1-20250805`    | 活跃 |
| Claude Sonnet 4.5 | `claude-sonnet-4-5` | `claude-sonnet-4-5-20250929`  | 活跃 |
| Claude Sonnet 4   | `claude-sonnet-4-0` | `claude-sonnet-4-20250514`    | 活跃 |
| Claude Opus 4     | `claude-opus-4-0`   | `claude-opus-4-20250514`      | 活跃 |

## 已弃用模型（即将停用）

| 友好名称 | 别名（请使用） | 完整 ID | 状态 | 停用日期 |
|-------------------|---------------------|-------------------------------|------------|--------------|
| Claude Haiku 3    | —                   | `claude-3-haiku-20240307`     | 已弃用 | 2026年4月19日 |

## 已退役模型（不再可用）

| 友好名称 | 完整 ID | 退役日期 |
|-------------------|-------------------------------|-------------|
| Claude Sonnet 3.7 | `claude-3-7-sonnet-20250219`  | 2026年2月19日 |
| Claude Haiku 3.5  | `claude-3-5-haiku-20241022`   | 2026年2月19日 |
| Claude Opus 3     | `claude-3-opus-20240229`      | 2026年1月5日 |
| Claude Sonnet 3.5 | `claude-3-5-sonnet-20241022`  | 2025年10月28日 |
| Claude Sonnet 3.5 | `claude-3-5-sonnet-20240620`  | 2025年10月28日 |
| Claude Sonnet 3   | `claude-3-sonnet-20240229`    | 2025年7月21日 |
| Claude 2.1        | `claude-2.1`                  | 2025年7月21日 |
| Claude 2.0        | `claude-2.0`                  | 2025年7月21日 |

## 解析用户请求

当用户通过名称请求模型时，请使用此表查找正确的模型 ID：

| 用户说... | 使用此模型 ID |
|-------------------------------------------|--------------------------------|
| "opus", "most powerful"                   | `claude-opus-4-6`              |
| "opus 4.6"                                | `claude-opus-4-6`              |
| "opus 4.5"                                | `claude-opus-4-5`              |
| "opus 4.1"                                | `claude-opus-4-1`              |
| "opus 4", "opus 4.0"                      | `claude-opus-4-0`              |
| "sonnet", "balanced"                      | `claude-sonnet-4-6`            |
| "sonnet 4.6"                              | `claude-sonnet-4-6`            |
| "sonnet 4.5"                              | `claude-sonnet-4-5`            |
| "sonnet 4", "sonnet 4.0"                  | `claude-sonnet-4-0`            |
| "sonnet 3.7"                              | 已退役 — 建议使用 `claude-sonnet-4-5` |
| "sonnet 3.5"                              | 已退役 — 建议使用 `claude-sonnet-4-5` |
| "haiku", "fast", "cheap"                  | `claude-haiku-4-5`             |
| "haiku 4.5"                               | `claude-haiku-4-5`             |
| "haiku 3.5"                               | 已退役 — 建议使用 `claude-haiku-4-5` |
| "haiku 3"                                 | 已弃用 — 建议使用 `claude-haiku-4-5` |
