<!--
name: 'Data: Token counting reference'
description: 使用 Messages count_tokens 端点和 Anthropic SDK 或 CLI 示例对 Claude 模型进行 token 计数的参考文档，包含不要使用 OpenAI tokenizer 的警告
ccVersion: 2.1.163
-->
# Token 计数

使用 `count_tokens` 端点（`POST /v1/messages/count_tokens`）对 Claude 模型进行准确的
token 计数。Token 计数是**特定于模型**的——传入与你推理时相同的模型 ID。

**不要使用 `tiktoken`。** 那是 OpenAI 的 tokenizer。它对 Claude token 的计数
比实际低约 15-20%（典型文本），对于代码或非英文输入则偏差更大。
任何来自 `tiktoken`、`gpt-tokenizer` 或类似工具的估算结果对 Claude 来说都是不准确的。

## 对文件或字符串计数

```python
from anthropic import Anthropic

client = Anthropic()
resp = client.messages.count_tokens(
    model="{{OPUS_ID}}",
    messages=[{"role": "user", "content": open("CLAUDE.md").read()}],
)
print(resp.input_tokens)
```

TypeScript：`await client.messages.countTokens({model, messages})` →
`.input_tokens`。其他 SDK 请参阅 `{lang}/claude-api/README.md`。

## CLI

```sh
ant messages count-tokens --model {{OPUS_ID}} \
  --message '{role: user, content: "@./CLAUDE.md"}' \
  --transform input_tokens -r
```

## 对比文件在两个版本间的差异

该端点是无状态的——分别对每个版本计数然后相减：

```python
from anthropic import Anthropic
import subprocess

client = Anthropic()
def count(text: str) -> int:
    return client.messages.count_tokens(
        model="{{OPUS_ID}}",
        messages=[{"role": "user", "content": text}],
    ).input_tokens

before = subprocess.check_output(["git", "show", "HEAD:CLAUDE.md"], text=True)
after = open("CLAUDE.md").read()
print(count(after) - count(before))
```

完整文档：参见 `shared/live-sources.md` 中的 Token Counting 条目。
