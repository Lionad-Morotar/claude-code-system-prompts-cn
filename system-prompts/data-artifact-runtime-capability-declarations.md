<!--
name: 'Data: Artifact runtime capability declarations'
description: Defines Artifact runtime capability declaration, carry-forward, clearing, replacement, and contract pinning semantics
ccVersion: 2.1.209
-->
# Artifact 运行时能力

已发布的 Artifact 页面可以声明**运行时能力** —— claude.ai 查看器在打开时授予页面的功能 —— 方法是向 Artifact 工具传递 `capabilities: {name: config}`。控制平面是有效名称和配置形状的唯一权威。声明姿势：**省略**重新部署时的 `capabilities` 会原样向前传递存储的声明（并保留 Artifact 存储的合约固定）；**空对象** `{}` 是显式全部清除；**非空对象**是全量声明（已存储但未重新声明的任何内容都将被撤销）。移动已重新发布的 Artifact 的运行时版本是一个有意的姿势 —— 传递 `contract: 'latest'` 进行升级，或传递特定版本进行固定或回滚 —— 绝不是编辑的副作用。
