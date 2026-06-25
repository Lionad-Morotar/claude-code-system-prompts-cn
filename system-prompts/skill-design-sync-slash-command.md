<!--
name: 'Skill: /design-sync 斜杠命令'
description: 将 React 设计系统同步到 claude.ai/design 的技能定义，包含项目选择、源形态检测、转换器配置、验证、上传规划以及自检行为
ccVersion: 2.1.162
-->
---
name: design-sync
description: 将 React 设计系统推送到 claude.ai/design。此技能运行一个转换器，将真实的组件代码（来自 Storybook 或裸包）打包并上传。当用户运行 /design-sync 或说"将我的设计系统同步到 Claude Design"时使用。
---

# 将设计系统同步到 claude.ai/design

你有一个 `DesignSync` 工具，可以读写用户的 claude.ai/design 项目。此技能将 React 设计系统仓库转换为 claude.ai/design 消费的格式，然后上传。

**目标——设计系统项目在 claude.ai/design 上的样子：**
- 项目根目录下有一个 `_ds_bundle.js`，将每个组件赋值到 `window.<globalName>.*`，这样设计代理就可以用真实代码来构建。
- 一个 `styles.css`，通过 `@import` 引入令牌、组件 CSS 和字体。
- 每个组件对应 `components/<group>/<Name>/`：一个 `<Name>.d.ts`，其 `<Name>Props` 接口是组件的 API 契约；一个 `<Name>.prompt.md`，包含使用示例；一个 `<Name>.html` 预览卡片。

转换器从仓库自身的 `dist/` 中确定性地构建所有这些内容。Storybook 是理想路径（最丰富的预览）；任何已构建的 npm 包也可以使用。**核心原则：交付客户已经构建好的东西**——打包的是他们编译好的 `dist/`，而不是重新实现。

## 1. 选择目标项目

如果 `DesignSync` 不在你的工具列表中，先通过 `ToolSearch(query: "select:DesignSync")` 加载它。然后调用 `DesignSync(list_projects)`。一个或多个结果 → `AskUserQuestion` 列出每一个，外加一个"创建名为 '<name>' 的新项目"选项（名称取自包/设计系统）；如果用户选择此项，则 `DesignSync(create_project)`。没有结果 → 直接提供 `create_project`。如果用户给了 UUID，`DesignSync(get_project)` 并检查 `type` 是否为 `PROJECT_TYPE_DESIGN_SYSTEM`。

## 2. 探索，然后编写配置

工作流程是 **探索仓库 → 编写 `design-sync.config.json` → 根据配置文件确定性地运行转换器**。转换器的发现机制基于启发式规则；每个启发式规则都有对应的配置覆盖项（`grep ASSUMPTION lib/*.mjs` 列出它们），因此不符合默认配置的仓库只需编写配置，无需修改代码。只有在最后手段时才编辑 `lib/*.mjs`（参见故障排除章节）。

1. **使用仓库自身的包管理器进行忠实安装。** 使用仓库锁定的 node 版本（`.nvmrc` / `engines.node`），然后根据 lockfile 检测：`yarn.lock` → `yarn install --immutable`；`pnpm-lock.yaml` → `pnpm i --frozen-lockfile`；`bun.lockb`/`bun.lock` → `bun install --frozen-lockfile`；`package-lock.json` → `npm ci`。
2. **确定源形态。** 如果 `design-sync.config.json` 已存在且有 `"shape"` 字段，则使用它。否则搜索 `.storybook/` 和 `*.stories.*`：
   - 找到 `.storybook/` 目录 → `shape = 'storybook'`。找到多个 → `AskUserQuestion` 询问哪个是设计系统的；该目录成为 `storybookConfigDir`。
   - 找到 `*.stories.*` 文件但目标中没有 `.storybook/` 目录 → `AskUserQuestion`："找到了 story 文件但这里没有 `.storybook/`——此仓库中是否有其他地方有 Storybook 配置（例如 monorepo 中的 `apps/storybook/.storybook`）？"如果用户指向一个 → `shape = 'storybook'`，将该路径记录为 `storybookConfigDir`。如果用户说没有 → `shape = 'package'`。
   - 没有 `.storybook/` 也没有 `*.stories.*` → `AskUserQuestion` 询问是否根本存在 Storybook。如果用户指向一个，将其记录为 `storybookConfigDir` 且 `shape = 'storybook'`。如果没有，`shape = 'package'`。

然后 `Read` `<skill-base-dir>/storybook/SKILL.md` 或 `<skill-base-dir>/non-storybook/SKILL.md` 并从此处继续——每个文件都是自包含的。在编写 `design-sync.config.json` 时将 `"shape"`（以及设置了 `"storybookConfigDir"` 时也一起）记录进去，以便重新同步时跳过检测。转换器脚本在形态间共享，位于 `<skill-base-dir>/package-build.mjs`、`package-validate.mjs` 和 `lib/`。
