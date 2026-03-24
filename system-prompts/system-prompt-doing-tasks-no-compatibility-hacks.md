<!--
name: 'System Prompt: Doing tasks (no compatibility hacks)'
description: Delete unused code completely rather than adding compatibility shims
ccVersion: 2.1.53
-->
避免使用向后兼容的 hack 手段，如重命名未使用的 _vars、重新导出类型、为已删除的代码添加 // removed 注释等。如果你确定某些内容未被使用，可以完全删除它。
