<!--
name: 'Skill: Run TUI interactive terminal app example'
description: Run 技能示例文件，展示如何使用 tmux、就绪轮询、面板捕获、按键参考和清理来驱动交互式终端应用
ccVersion: 2.1.145
-->
# 示例：TUI / 交互式终端应用

交互式终端应用（文本编辑器、REPL、基于 curses 的 UI）不能被 Agent 的 bash 工具直接驱动——它们会接管终端。技能必须展示如何在 `tmux` 中包装它们，以便 Agent 能够发送输入、捕获输出和截屏。

## tmux 模式

这是标准方法：

1. 在分离的 tmux 会话中启动 TUI
2. 使用 `tmux send-keys` 发送按键
3. 使用 `tmux capture-pane` 读取屏幕内容
4. 使用 `tmux kill-session` 清理

技能的 `SKILL.md` 应将其展示为驱动应用的主要方式。一个小的 `driver.sh` 包装启动+附加序列可以放在技能目录中，但对于大多数 TUI，技能正文中的原始 tmux 命令就足够了。

## 示例片段

> ## Run（交互式，供 Agent 使用）
>
> 在 tmux 内启动 TUI：
>
> ```bash
> tmux new-session -d -s app -x 120 -y 40 './myapp'
> ```
>
> 轮询直到就绪标记出现（比固定 sleep 更快且更可靠——应用一就绪就立即返回，未就绪则明确失败）：
>
> ```bash
> timeout 10 bash -c 'until tmux capture-pane -t app -p | grep -q "Ready"; do sleep 0.2; done'
> tmux capture-pane -t app -p
> ```
>
> 发送输入（此示例导航到 Settings 屏幕并切换一个选项）：
>
> ```bash
> tmux send-keys -t app 's'
> timeout 5 bash -c 'until tmux capture-pane -t app -p | grep -q "Settings"; do sleep 0.2; done'
> tmux send-keys -t app 'Down' 'Down' 'Space'  # 导航 + 切换
> timeout 5 bash -c 'until tmux capture-pane -t app -p | grep -qF "[x]"; do sleep 0.2; done'
> tmux capture-pane -t app -p
> ```
>
> 如果你发现自己写了超过两行这样的轮询代码，将它们提取到技能旁边的 `driver.sh` 中的 `wait_for()` 辅助函数中。
>
> 退出：
>
> ```bash
> tmux send-keys -t app 'q'
> tmux kill-session -t app 2>/dev/null || true
> ```
>
> ### 按键参考
>
> | 按键 | 操作 |
> |---|---|
> | `j` / `k` 或 `Down` / `Up` | 导航列表 |
> | `Enter` | 选择 |
> | `s` | 设置 |
> | `q` | 退出 |

## 值得记录的细节

- **终端尺寸。** 某些 TUI 在宽度较小时会崩溃或隐藏内容。在 `tmux new-session -x -y` 参数中指定已知可用的尺寸。
- **启动时间。** 轮询就绪标记（`until tmux capture-pane | grep -q X`）而非固定 `sleep N`——应用一就绪就立即返回，未就绪时则能有效失败。说明什么字符串表示就绪。
- **按键绑定参考。** 一个主要按键的表格。这是 TUI 的"API"——Agent 需要它来驱动应用。
- **干净退出。** 展示退出按键*以及* `tmux kill-session` 作为后备。
- **颜色/Unicode 问题。** 如果 `capture-pane` 输出难以阅读，注明有用的标志（`-e` 用于转义序列，`-J` 用于合并折行）。

## 同时记录直接调用方式

对于人类交互式运行应用，tmux 是过度设计。也包含一行命令：

> ## Run（直接，供人类使用）
>
> ```bash
> ./myapp
> ```
>
> 按 `q` 退出。
