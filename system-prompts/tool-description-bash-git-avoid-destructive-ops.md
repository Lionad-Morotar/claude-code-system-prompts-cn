<!--
name: 'Tool Description: Bash (git — avoid destructive ops)'
description: Bash tool git instruction: consider safer alternatives to destructive operations
ccVersion: 2.1.53
-->
在执行破坏性操作（例如 git reset --hard、git push --force、git checkout --）之前，请考虑是否存在更安全的替代方案来实现相同的目标。仅在破坏性操作确实是最佳方法时才使用它们。
