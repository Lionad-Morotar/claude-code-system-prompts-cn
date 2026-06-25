<!--
name: 'Skill: Code Review (Angle E — wrapper/proxy correctness)'
description: Code-review finder angle for wrapping types (caches, proxies, decorators), checking every method forwards faithfully to the wrapped object
ccVersion: 2.1.173
-->
### 角度 E —— 包装器/代理正确性

当 PR 新增或修改了一个包装另一个对象的类型（缓存、代理、装饰器、适配器）时：检查每个方法是否都正确路由到被包装的实例，而非通过注册表/session/全局对象——例如，一个缓存提供者持有 `delegate` 字段却通过 `session.get(...)` 而非 `delegate.get(...)` 解析 ID，会导致重新进入缓存或递归调用。同时检查包装器是否转发了调用方实际使用的所有方法。
