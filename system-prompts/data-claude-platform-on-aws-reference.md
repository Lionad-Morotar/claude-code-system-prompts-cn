<!--
name: 'Data: Claude Platform on AWS 参考文档'
description: 通过 AWS 基础设施使用 Claude 开发者平台的参考文档，涵盖 AnthropicAWS 客户端、必需的 region 和 workspace 配置、SigV4 认证以及短期 API 密钥
ccVersion: 2.1.139
-->
# AWS 上的 Claude Platform

**由 Anthropic 运营**，通过 AWS 基础设施访问 Claude 开发者平台——SigV4 认证、AWS IAM 访问控制和 AWS Marketplace 计费。由于由 Anthropic 运营，**API 接口与第一方保持一致，实现同日更新**：Managed Agents、服务端工具、批处理、Files 以及本技能中的每个功能均以相同方式工作。模型 ID 使用裸第一方字符串（`{{OPUS_ID}}`、`{{SONNET_ID}}`）——**不带 provider 前缀**。

> **不同于 Amazon Bedrock。** Bedrock 由合作伙伴运营（AWS 运行服务；发布计划各不相同，功能子集，模型 ID 带 `anthropic.` 前缀）。AWS 上的 Claude Platform 与 Bedrock 并存；选择依据是需要 AWS 原生 IAM/计费且保持完整 Anthropic API 兼容性（本页面），还是 Bedrock 自有生态。

---

## 客户端与安装

| 语言 | 安装 | 客户端 |
|---|---|---|
| Python | `pip install -U "anthropic[aws]"` | `from anthropic import AnthropicAWS` → `AnthropicAWS()` |
| TypeScript | `npm install @anthropic-ai/aws-sdk` | `import AnthropicAws from "@anthropic-ai/aws-sdk"` → `new AnthropicAws()` |
| Go | `go get github.com/anthropics/anthropic-sdk-go` | `import anthropicaws "github.com/anthropics/anthropic-sdk-go/aws"` → `anthropicaws.NewClient(ctx, anthropicaws.ClientConfig{})` |
| C# | `dotnet add package Anthropic.Aws` | `new AnthropicAwsClient()` |
| Java | 参见 `shared/live-sources.md` 中的 SDK 仓库 | 参见 `shared/live-sources.md` 中的 SDK 仓库 |
| Ruby | `gem install anthropic aws-sdk-core` | 参见 `shared/live-sources.md` 中的 SDK 仓库 |
| PHP | `composer require anthropic-ai/sdk aws/aws-sdk-php` | 参见 `shared/live-sources.md` 中的 SDK 仓库 |

构造之后，**像使用 `Anthropic()` 一样使用客户端**——`client.messages.create(...)`、`client.beta.sessions.*` 等，使用裸模型 ID。

```python
from anthropic import AnthropicAWS

client = AnthropicAWS()  # region + workspace_id 从环境变量读取；详见下文
client.messages.create(
    model="{{OPUS_ID}}",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
)
```

---

## 必需的配置

必须提供两个值（构造函数参数或环境变量）——**两者均无默认回退值**：

| 值 | 环境变量 | 备注 |
|---|---|---|
| AWS region | `AWS_REGION` | 必需。与 `AnthropicBedrock` 不同，没有 `us-east-1` 回退。 |
| Workspace ID | `ANTHROPIC_AWS_WORKSPACE_ID` | 必需。将请求路由到你的 Claude workspace。 |

端点模式：`https://aws-external-anthropic.{region}.api.aws/v1/...`。请求使用服务名 `aws-external-anthropic` 进行 SigV4 签名。

## 认证

客户端按照标准优先级链解析 AWS 凭证：显式构造函数参数 → 环境变量（`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_SESSION_TOKEN`）→ 共享配置文件 → 代入角色 / 实例元数据。

**短期 API 密钥**也受支持，适用于 SigV4 不实用的场景（如浏览器、简单脚本）。使用各语言的 token 生成器包创建一个；将其作为客户端的 `api_key` 传入。有效期为**以下三者中的最小值**：请求的时长、底层凭证的过期时间以及 **12 小时**。有关包名和 IAM 详细信息，请 WebFetch `shared/live-sources.md` 中的 Claude Platform on AWS 页面。

---

## 告知用户的内容

- 将其视为第一方：本技能的所有章节均保持不变。**不要**应用 Bedrock 的功能可用性屏蔽。
- 模型 ID 为裸字符串（`{{OPUS_ID}}`）。**不要**添加 `anthropic.` 前缀。
- 缺少 region 或 `workspace_id` 会在客户端构造时抛出异常（不会发送请求）。**403** 表示请求已到达服务器——检查是否使用了**错误的** `workspace_id` 或主体缺少 IAM 操作权限。参见 `shared/live-sources.md` 中的 IAM 操作参考。