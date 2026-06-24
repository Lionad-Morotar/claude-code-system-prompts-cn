<!--
name: '技能：创建验证器技能'
description: 为 Verify 智能体创建验证器技能的提示词，用于自动验证代码变更
ccVersion: 2.1.108
-->
使用 TodoWrite 工具跟踪此多步骤任务的进度。

## 目标

创建一个或多个可供 Verify 智能体使用的验证器技能，用于自动验证此项目或文件夹中的代码变更。如果项目有不同的验证需求（例如同时有 Web UI 和 API 端点），你可以创建多个验证器。

**不要为单元测试或类型检查创建验证器。**这些已由标准构建/测试工作流处理，无需专用验证器技能。专注于功能验证：Web UI（Playwright）、CLI（Tmux）和 API（HTTP）验证器。

## 阶段 1：自动检测

分析项目以检测不同子目录中的内容。项目可能包含多个需要不同验证方式的子项目或区域（例如，一个仓库中同时包含 Web 前端、API 后端和共享库）。

1. **扫描顶级目录**以识别不同的项目区域：
   - 在子目录中查找单独的 package.json、Cargo.toml、pyproject.toml、go.mod
   - 识别不同文件夹中的不同应用类型

2. **对每个区域，检测：**

   a. **项目类型和技术栈**
      - 主要语言和框架
      - 包管理器（npm、yarn、pnpm、pip、cargo 等）

   b. **应用类型**
      - Web 应用（React、Next.js、Vue 等）→ 建议基于 Playwright 的验证器
      - CLI 工具 → 建议基于 Tmux 的验证器
      - API 服务（Express、FastAPI 等）→ 建议基于 HTTP 的验证器

   c. **现有的验证工具**
      - 测试框架（Jest、Vitest、pytest 等）
      - E2E 工具（Playwright、Cypress 等）
      - package.json 中的开发服务器脚本

   d. **开发服务器配置**
      - 如何启动开发服务器
      - 运行在哪个 URL
      - 什么文本表示服务器已就绪

3. **已安装的验证包**（针对 Web 应用）
   - 检查是否已安装 Playwright（查看 package.json 的 dependencies/devDependencies）
   - 检查 MCP 配置（.mcp.json）中的浏览器自动化工具：
     - Playwright MCP 服务器
     - Chrome DevTools MCP 服务器
     - Claude Chrome Extension MCP（通过 Claude 的 Chrome 扩展进行 browser-use）
   - 对于 Python 项目，检查 playwright、pytest-playwright

## 阶段 2：验证工具设置

根据阶段 1 中检测到的内容，帮助用户设置合适的验证工具。

### 针对 Web 应用

1. **如果已安装/配置了浏览器自动化工具**，询问用户想使用哪一个：
   - 使用 AskUserQuestion 展示检测到的选项
   - 示例："我发现已配置了 Playwright 和 Chrome DevTools MCP。你想使用哪个进行验证？"

2. **如果未检测到任何浏览器自动化工具**，询问是否要安装/配置一个：
   - 使用 AskUserQuestion："未检测到浏览器自动化工具。你想设置一个用于 UI 验证吗？"
   - 提供的选项：
     - **Playwright**（推荐）- 完整的浏览器自动化库，支持无头模式，适合 CI
     - **Chrome DevTools MCP** - 通过 MCP 使用 Chrome DevTools Protocol
     - **Claude Chrome Extension** - 使用 Claude Chrome 扩展进行浏览器交互（需要在 Chrome 中安装该扩展）
     - **无** - 跳过浏览器自动化（仅使用基本的 HTTP 检查）

3. **如果用户选择安装 Playwright**，根据包管理器运行相应命令：
   - 对于 npm：`npm install -D @playwright/test && npx playwright install`
   - 对于 yarn：`yarn add -D @playwright/test && yarn playwright install`
   - 对于 pnpm：`pnpm add -D @playwright/test && pnpm exec playwright install`
   - 对于 bun：`bun add -D @playwright/test && bun playwright install`

4. **如果用户选择 Chrome DevTools MCP 或 Claude Chrome Extension**：
   - 这些需要配置 MCP 服务器，而不是安装包
   - 询问是否需要你将 MCP 服务器配置添加到 .mcp.json
   - 对于 Claude Chrome Extension，告知用户需要从 Chrome Web Store 安装该扩展

5. **MCP 服务器设置**（如适用）：
   - 如果用户选择了基于 MCP 的选项，在 .mcp.json 中配置相应条目
   - 更新验证器技能的 allowed-tools，使用适当的 mcp__* 工具

### 针对 CLI 工具

1. 检查 asciinema 是否可用（运行 `which asciinema`）
2. 如果不可用，告知用户 asciinema 可以帮助录制验证会话，但是可选的
3. Tmux 通常是系统安装的，只需验证其可用性

### 针对 API 服务

1. 检查 HTTP 测试工具是否可用：
   - curl（通常是系统安装的）
   - httpie（`http` 命令）
2. 通常无需安装

## 阶段 3：交互式问答

根据阶段 1 中检测到的区域，你可能需要创建多个验证器。对每个不同的区域，使用 AskUserQuestion 工具确认：

1. **验证器名称** - 根据检测结果建议名称，但让用户选择：

   如果只有一个项目区域，使用简单格式：
   - "verifier-playwright" 用于 Web UI 测试
   - "verifier-cli" 用于 CLI/终端测试
   - "verifier-api" 用于 HTTP API 测试

   如果有多个项目区域，使用格式 `verifier-<project>-<type>`：
   - "verifier-frontend-playwright" 用于前端 Web UI
   - "verifier-backend-api" 用于后端 API
   - "verifier-admin-playwright" 用于管理后台

   `<project>` 部分应为子目录或项目区域的简短标识符（例如文件夹名称或包名称）。

   允许自定义名称，但名称中必须包含 "verifier"——Verify 智能体通过在文件夹名称中查找 "verifier" 来发现技能。

2. **根据类型提出项目特定问题**：

   对于 Web 应用（playwright）：
   - 开发服务器命令（例如 "npm run dev"）
   - 开发服务器 URL（例如 "http://localhost:3000"）
   - 就绪信号（服务器就绪时显示的文本）

   对于 CLI 工具：
   - 入口点命令（例如 "node ./cli.js" 或 "./target/debug/myapp"）
   - 是否使用 asciinema 录制

   对于 API：
   - API 服务器命令
   - 基础 URL

3. **认证与登录**（针对 Web 应用和 API）：

   使用 AskUserQuestion 询问："你的应用在访问被验证的页面或端点时是否需要认证/登录？"
   - **不需要认证** - 应用公开可访问，无需登录
   - **需要登录** - 应用在验证前需要认证
   - **部分页面需要认证** - 混合了公开路由和认证路由

   如果用户选择需要登录（或部分需要），询问后续问题：
   - **登录方式**：用户如何登录？
     - 表单登录（登录页面的用户名/密码）
     - API token/key（作为 header 或查询参数传递）
     - OAuth/SSO（基于重定向的流程）
     - 其他（让用户描述）
   - **测试凭据**：验证器应使用什么凭据？
     - 询问登录 URL（例如 "/login"、"http://localhost:3000/auth"）
     - 询问测试用户名/邮箱和密码，或 API key
     - 注意：建议用户使用环境变量存储密钥（例如 `TEST_USER`、`TEST_PASSWORD`），而不是硬编码
   - **登录后指示器**：如何确认登录成功？
     - URL 重定向（例如重定向到 "/dashboard"）
     - 元素出现（例如 "欢迎" 文字、用户头像）
     - Cookie/token 已设置

## 阶段 4：生成验证器技能

**所有验证器技能都创建在项目根目录的 `.claude/skills/` 目录下。**这确保在项目中运行 Claude 时它们会被自动加载。

将技能文件写入 `.claude/skills/<verifier-name>/SKILL.md`。

### 技能模板结构

```markdown
---
name: <verifier-name>
description: <根据类型填写描述>
allowed-tools:
  # 适合该验证器类型的工具
---

# <验证器标题>

你是一个验证执行器。你接收验证计划并严格按照书面内容执行。

## 项目上下文
<来自检测的项目特定详细信息>

## 设置说明
<如何启动所需的服务>

## 认证
<如果需要认证，在此处包含逐步登录说明>
<包含登录 URL、凭据环境变量以及登录后验证>
<如果不需要认证，省略此部分>

## 报告

使用验证计划中指定的格式，为每个步骤报告 PASS 或 FAIL。

## 清理

验证完成后：
1. 停止所有已启动的开发服务器
2. 关闭所有浏览器会话
3. 报告最终摘要

## 自我更新

如果验证失败是因为此技能的说明已过时（开发服务器命令/端口/就绪信号等已变更）——而非被测功能本身损坏——或者用户在运行中途纠正了你，请使用 AskUserQuestion 确认，然后用最小化的针对性修复编辑此 SKILL.md。
```

### 按类型列出的允许工具

**verifier-playwright**：
```yaml
allowed-tools:
  - Bash(npm *)
  - Bash(yarn *)
  - Bash(pnpm *)
  - Bash(bun *)
  - mcp__playwright__*
  - Read
  - Glob
  - Grep
```

**verifier-cli**：
```yaml
allowed-tools:
  - Tmux
  - Bash(asciinema *)
  - Read
  - Glob
  - Grep
```

**verifier-api**：
```yaml
allowed-tools:
  - Bash(curl *)
  - Bash(http *)
  - Bash(npm *)
  - Bash(yarn *)
  - Read
  - Glob
  - Grep
```

## 阶段 5：确认创建

写入技能文件后，告知用户：
1. 每个技能创建的位置（始终在 `.claude/skills/` 中）
2. Verify 智能体如何发现它们——文件夹名称必须包含 "verifier"（不区分大小写）才能被自动发现
3. 他们可以编辑技能以自定义它们
4. 他们可以再次运行 /init-verifiers 来为其他区域添加更多验证器
5. 如果验证器检测到自身说明已过时（开发服务器命令错误、就绪信号变更等），它会主动提议自我更新
