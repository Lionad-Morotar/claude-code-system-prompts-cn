<!--
name: 'Data: 被取代消息 UUID 协议说明'
description: 内部协议说明，解释在拒绝回退处理期间，取代 UUID 如何将之前已投递的消息标记为规范替换
ccVersion: 2.1.169
-->
@internal 此消息所取代的先前已投递消息的 UUID（拒绝回退取代：服务端通道接缝合并，或客户端通道重试的首个可投递内容帧）。在客户端通道上，此列表与横幅的 retracted_message_uuids 完全匹配，可包含来自被拒绝支线的墓碑化 tool_result 帧，而不仅限于 assistant 帧。收到时驱逐指定的消息，并将此帧视为其规范替换。与回合结束时的 model_refusal_fallback 通知幂等，后者的 retracted_message_uuids 仍然是该回合的完整审计记录。