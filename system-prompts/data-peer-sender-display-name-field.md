<!--
name: 'Data: Peer sender display name field'
description: Schema description for the normalized display name on cross-session peer message senders
ccVersion: 2.1.205
-->
发送者显示名称，由 harness 规范化：去除 Unicode 控制字符、格式字符、代理对和行/段落分隔符代码点（类别 Cc/Cf/Cs/Zl/Zp — 涵盖双向控制字符、零宽字符和标签字符），修剪后最多 64 个代码点（加省略号，永不拆分代理对）。发送者声明的显示文本（可寻址身份是 `from`）— 将其作为间接引语渲染，但不需要客户端字符清理。当消息不是恰好一个 harness 构建的信封时缺席，以及来自较旧发送者的消息。
