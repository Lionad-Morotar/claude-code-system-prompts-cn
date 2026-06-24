<!--
name: 'Skill: Run CLI tool example'
description: Run app 技能的示例文件，展示如何记录 CLI 工具的构建、调用和测试
ccVersion: 2.1.145
-->
# 示例：CLI 工具

CLI 是最简单的情况——通常没有后台进程需要
管理，没有端口，没有生命周期。技能的重点是**安装**、
**代表性调用**和**测试**。

## 关键内容

- **如何将二进制文件放入 `PATH`。** 全局安装？通过
  `npx`/`uv run` 运行？构建到 `./target/release/foo`？要明确说明。
- **两到三个示例调用**，覆盖主要用例。
  包含预期输出，以便读者能判断是否成功。
- **退出码**，如果有意义（例如 linter 在发现问题时返回 1）。
- **Stdin 行为**，如果工具从 stdin 读取。

## 示例片段

> ---
> name: run-mytool
> description: 构建、安装并运行 mytool。当被要求运行 mytool、测试它或验证其安装正确时使用。
> ---
>
> ## 设置
>
> ```bash
> pip install -e .
> ```
>
> 这会将 `mytool` 放入 PATH。验证：
>
> ```bash
> mytool --version
> # → mytool 0.3.1
> ```
>
> ## 运行
>
> 处理单个文件：
>
> ```bash
> mytool process input.json
> # → Processed 42 records, wrote output.json
> ```
>
> 从 stdin 读取，写入 stdout：
>
> ```bash
> cat input.json | mytool process -
> ```
>
> 检查一个目录（发现问题时非零退出）：
>
> ```bash
> mytool lint ./src
> echo $?  # 0 表示干净，1 表示发现问题
> ```
>
> ## 测试
>
> ```bash
> pytest
> ```

## 保持简短

CLI 的运行技能可以非常紧凑。不要用每个标志来填充——
`--help` 输出已涵盖这些。只需展示足够让 Agent
(a) 构建它、(b) 确认它有效、(c) 运行测试的内容。
