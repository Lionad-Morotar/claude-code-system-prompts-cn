<!--
name: '数据：流式参考 — PHP'
description: PHP 流式参考，包括流式事件和处理内容块增量（需要 SDK v0.5.0+）
ccVersion: 2.1.182
-->
# 流式 — PHP

## 流式

> **需要 SDK v0.5.0+。** v0.4.0 及更早版本使用单一的 `$params` 数组；使用命名参数调用会抛出 `Unknown named parameter $model`。升级方式：`composer require "anthropic-ai/sdk:^0.7"`

```php
use Anthropic\Messages\RawContentBlockDeltaEvent;
use Anthropic\Messages\TextDelta;

$stream = $client->messages->createStream(
    model: '{{OPUS_ID}}',
    maxTokens: 64000,
    messages: [
        ['role' => 'user', 'content' => 'Write a haiku'],
    ],
);

foreach ($stream as $event) {
    if ($event instanceof RawContentBlockDeltaEvent && $event->delta instanceof TextDelta) {
        echo $event->delta->text;
    }
}
```

---
