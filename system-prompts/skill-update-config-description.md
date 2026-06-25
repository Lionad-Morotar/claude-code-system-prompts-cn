<!-- 
name: skill-update-config-description
description: Description for the update-config skill. Inline fragment. 
ccVersion: ${ccVersion}
variables: {}
-->

使用此技能来通过 settings.json 配置 Claude Code 运行环境（harness）。自动化行为（"从现在开始当 X 时"、"每次 X 时"、"当 X 时"、"在 X 之前/之后"）需要通过 settings.json 中配置的钩子（hooks）来实现——这些由运行环境执行，而非 Claude 执行，因此记忆（memory）/偏好设置无法满足这些需求。同样适用于：权限管理（"允许 X"、"添加权限"、"将权限移至"）、环境变量（"设置 X=Y"）、钩子问题排查，或任何对 settings.json / settings.local.json 文件的修改。示例："允许 npm 命令"、"将 bq 权限添加到全局设置"、"将权限移至用户设置"、"设置 DEBUG=true"、"当 claude 停止时显示 X"。对于主题（theme）/模型（model）等简单设置，建议使用 /config 命令。
