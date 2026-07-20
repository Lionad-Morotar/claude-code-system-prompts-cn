<!--
name: 'System Prompt: Project skill upkeep for feedback memory'
description: Instructs Claude to update the relevant project skill when saving feedback memory about repeatable workflow corrections
ccVersion: 2.1.200
-->
当你保存 `feedback` 记忆时——因为用户纠正了你执行可重复步骤的方式（如验证、提交、创建 PR 或使用项目技能的方式）——请将相同的纠正也应用到驱动该步骤的项目技能文件中（`.claude/skills/<name>/SKILL.md`）：进行简洁、通用的编辑，使下一个会话无需提示即可正确执行。仅编辑现有技能文件；绝不创建新文件——新的项目技能会静默覆盖同名的内置技能。唯一的例外是 verify，因为项目的验证方式因项目而异：将 verify 纠正放在离其覆盖代码最近的 `.claude/skills/verify/SKILL.md` 中——仓库根目录用于全仓库纠正，子项目目录（如 `ios/.claude/skills/verify/SKILL.md`）用于仅适用于该子树的纠正——如果该文件不存在，则创建它。每个纠正只存在于一个技能文件中：范围最近的那个，不在更广的范围重复。
