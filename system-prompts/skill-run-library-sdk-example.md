<!--
name: 'Skill: Run library SDK example'
description: Run 技能示例文件，展示如何记录在库或 SDK 的公共包边界上进行构建、测试和冒烟检查
ccVersion: 2.1.145
-->
# 示例：库 / SDK

库没有流程意义上的"运行"步骤——没有需要启动的服务器，也没有需要调用的 CLI。对于库来说，run 技能的核心在于：

1. **从源码构建**库
2. **运行测试套件**
3. **一个最小可工作的示例**，用于验证库已正确安装并能正常使用

保持简洁。模板的 Build 和 Test 部分已覆盖大部分内容。

## 冒烟测试示例

库特有的主要补充内容是一个小程序（或 REPL 代码片段），它导入库并执行一件真实的事情。这是 Agent 确认"是的，该库可用"的方式：

> ## Verify
>
> ```bash
> python -c '
> from mylib import Client
> c = Client()
> print(c.ping())
> '
> # → pong
> ```

对于编译型语言：

> ```bash
> cat > /tmp/smoke.go <<GO
> package main
> import "example.com/mylib"
> func main() { println(mylib.Version()) }
> GO
> go run /tmp/smoke.go
> # → v1.2.3
> ```

## 示例片段

> ---
> name: run-mylib
> description: 从源码构建、安装和测试 mylib。在需要验证 mylib 是否正常工作、运行其测试或构建分发包时使用。
> ---
>
> `mylib` 是一个 Python 库——"运行"它意味着从源码构建并执行测试套件。
>
> ## Setup
>
> ```bash
> pip install -e '.[dev]'
> ```
>
> ## Verify
>
> ```bash
> python -c 'import mylib; print(mylib.__version__)'
> # → 2.1.0
> ```
>
> ## Test
>
> ```bash
> pytest
> ```
>
> 运行测试子集：`pytest tests/unit/`。带覆盖率：`pytest --cov=mylib`。
>
> ## Build（分发包）
>
> ```bash
> pip install build
> python -m build
> # → dist/mylib-2.1.0-py3-none-any.whl
> ```

## 值得记录的事项

- **开发模式 vs 安装模式。** `pip install -e .` 与 `pip install .`——如果行为不同，说明各自适用于什么场景。
- **可选依赖。** `[dev]`、`[test]`、`[docs]` 等 extras 以及各自何时需要。
- **生成代码。** 如果有代码生成步骤（protobuf、OpenAPI 客户端），请记录下来——README 中几乎总是缺少这一项。
