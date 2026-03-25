<!--
name: 'Skill: update-config (7-step verification flow)'
description: 一个引导 Claude 完成构建和验证 Claude Code 钩子（hooks）的 7 步流程 skill，确保它们在用户特定的项目环境中正常工作。
ccVersion: 2.1.77
-->
## 构建钩子（带验证）

给定事件、匹配器、目标文件和期望行为，遵循此流程。每一步捕获不同的失败类别——一个静默失效的钩子比没有钩子更糟糕。

1. **去重检查。** 读取目标文件。如果同一事件+匹配器上已存在钩子，显示现有命令并询问：保留、替换或并行添加。

2. **为当前项目构建命令——不要假设。** 钩子通过 stdin 接收 JSON。构建一个满足以下要求的命令：
   - 安全提取所需负载——使用 `jq -r` 导入带引号的变量或 `{ read -r f; ... "$f"; }`，不要使用无引号的 `| xargs`（会在空格处分割）
   - 以本项目运行底层工具的方式调用（npx/bunx/yarn/pnpm？Makefile 目标？全局安装？）
   - 跳过工具无法处理的输入（格式化工具通常有 `--ignore-unknown`；如果没有，按扩展名过滤）
   - 暂时保持原始状态——不加 `|| true`，不抑制 stderr。管道测试通过后再包装。

3. **管道测试原始命令。** 合成钩子将接收的 stdin 负载并直接管道传递：
   - `Pre|PostToolUse` 在 `Write|Edit` 上：`echo '{"tool_name":"Edit","tool_input":{"file_path":"<此仓库中的真实文件>"}}' | <cmd>`
   - `Pre|PostToolUse` 在 `Bash` 上：`echo '{"tool_name":"Bash","tool_input":{"command":"ls"}}' | <cmd>`
   - `Stop`/`UserPromptSubmit`/`SessionStart`：大多数命令不读取 stdin，所以 `echo '{}' | <cmd>` 足够

   检查退出代码和副作用（文件是否实际格式化，测试是否实际运行）。如果失败，你会得到真实的错误——修复（包管理器错误？工具未安装？jq 路径错误？）并重新测试。一旦成功，用 `2>/dev/null || true` 包装（除非用户需要阻塞检查）。

4. **写入 JSON。** 合并到目标文件（模式结构见上文"钩子结构"部分）。如果首次创建 `.claude/settings.local.json`，将其添加到 .gitignore——Write 工具不会自动将其加入 gitignore。

5. **一次性验证语法 + 模式：**

   `jq -e '.hooks.<event>[] | select(.matcher == "<matcher>") | .hooks[] | select(.type == "command") | .command' <target-file>`

   退出码 0 + 打印你的命令 = 正确。退出码 4 = 匹配器不匹配。退出码 5 = JSON 格式错误或嵌套错误。损坏的 settings.json 会静默禁用该文件的所有设置——同时修复任何预先存在的格式错误。

6. **证明钩子触发**——仅适用于可在当前回合触发的匹配器上的 `Pre|PostToolUse`（通过 Edit 触发 `Write|Edit`，通过 Bash 触发 `Bash`）。`Stop`/`UserPromptSubmit`/`SessionStart` 在当前回合外触发——跳到第 7 步。

   对于 `PostToolUse`/`Write|Edit` 上的**格式化工具**：通过 Edit 引入可检测的违规（两个连续空行、错误缩进、缺少分号——此格式化工具能修正的内容；不是尾随空格，Edit 在写入前会去除它），重新读取，确认钩子**修复**了它。对于**其他任何东西**：在 settings.json 中的命令前临时添加前缀 `echo "$(date) hook fired" >> /tmp/claude-hook-check.txt; `，触发匹配工具（Edit 对应 `Write|Edit`，无害的 `true` 对应 `Bash`），读取哨兵文件。

   **始终清理**——还原违规内容，移除哨兵前缀——无论验证通过还是失败。

   **如果验证失败但管道测试通过且 `jq -e` 通过**：设置监视器未监视 `.claude/`——它只监视此会话启动时有设置文件的目录。钩子写入正确。告诉用户打开一次 `/hooks`（重新加载配置）或重启——你无法自己执行此操作；`/hooks` 是用户 UI 菜单，打开它会结束当前回合。

7. **交接。** 告诉用户钩子已激活（或根据监视器限制需要 `/hooks`/重启）。指引他们使用 `/hooks` 稍后查看、编辑或禁用它。UI 仅在钩子出错或运行缓慢时显示"运行了 N 个钩子"——静默成功按设计是不可见的。
