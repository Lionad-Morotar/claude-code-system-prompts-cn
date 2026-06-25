<!--
name: 'Skill: /design-sync 斜杠命令'
description: 将 React 设计系统同步到 claude.ai/design 的技能定义，包含项目选择、转换器配置、验证、上传规划以及自检行为
ccVersion: 2.1.160
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
2. **有 Storybook 吗？** 搜索 `.storybook/` 和 `*.stories.*`。找到一个 → `npm run build-storybook` 并以 `storybook` 形态继续（转换器读取 `index.json` 获取组件列表和 story args）。找到多个 → `AskUserQuestion` 询问哪个是设计系统的。没找到 → `AskUserQuestion` 询问是否存在；如果用户指出，传递 `--storybook-config <dir>`；如果用户说没有，则回退。
3. **包形态——构建出 `dist/`。** 转换器需要构建好的 `dist/` 入口及其 `.d.ts` 树。检查入口（来自 `package.json` 的 `module`/`main`/`exports['.']`）是否已存在——安装时可能已通过 `prepare` 构建。如果缺失：
   - 运行 `<pm> run build`。没有 `build` 脚本 → 尝试 `prepare`/`prepack`。在 monorepo 中，构建可能在仓库根目录（`turbo build --filter=<pkg>`、`pnpm -F <pkg> build`、`nx build <pkg>`）。**某些构建脚本会 fork 一个 watcher 并提前 exit 0——命令返回后，`ls` 检查预期输出（dist/、build/esm/ 或 `package.json` 中 `module`/`main` 指向的任何路径），确认其已填充后再继续。** 如果为空，检查脚本中是否有 `--watch` 标志，使用单次运行变体，或轮询输出目录。
   - 仍然缺失 → `AskUserQuestion`("用什么命令构建此包？", 选项 = 包含 `tsc|tsup|rollup|vite build|esbuild|swc` 的任意 `scripts.*`，以及自由输入)。将答案记录为配置中的 `buildCmd`。
   - 用户说没有构建 → 转换器将从 `src/` 合成入口（最后手段——`.d.ts` 契约会更弱；建议添加构建步骤）。
4. **检查项目中已有的内容。** 对目标项目调用 `DesignSync(list_files)`。如果返回文件，通过 `DesignSync(get_file)` 读取 `_ds_bundle.js`，从其首行 `/* @ds-bundle: {…} */` 头部记录组件名称——但**始终仍然重新构建**（步骤 7）；已有的打包文件在源码变更的那一刻就已过时。头部的 `sourceHashes` diff 决定了通过 `DesignSync` *增量上传*哪些内容，而不是构建什么。
5. **构建前与用户确认计划。** `AskUserQuestion` 包含：你找到的组件列表（如果很长，给出数量加几个名称）、令牌/CSS 来自哪些文件、以及你将运行的构建命令。构建可能需要数分钟并消耗大量 token——现在对齐可以避免因指向了错误的包或遗漏了一半组件而重新运行。
   - 如果项目已有 N 个组件（步骤 4），在问题中包含此信息并提供范围选项：**(a)** 完整重建 + 重新上传所有内容，**(b)** 仅更新变更的组件（根据 `sourceHashes` 的 diff），**(c)** 仅令牌 + CSS（不重建组件）。当 diff 较小时默认选择 (b)。
6. **编写 `design-sync.config.json` 并提交**——重新同步时复用此文件，确保输出可重现。只有 `pkg` 和 `globalName` 是必填的。**如果文件已存在，先读取并保留 `previewArgs`、`dtsPropsFor`、`libOverrides`、`overrides` 和 `notes`——只向这些字段追加，绝不替换。** 它们累积了之前验证循环迭代中的修复。

   | 字段 | 值 |
   |---|---|
   | `pkg` / `globalName` | 包名和要赋值的 `window.*` 全局变量——必填 |
   | `buildCmd` | 发现的构建命令；重新同步时重新运行 |
   | `srcDir` | 源码根目录，当不是 `src/`/`lib/`/`components/` 时指定 |
   | `tsconfig` | `tsconfig.json` 的路径——esbuild 读取 `compilerOptions.paths`，使 `@/…` 路径别名在合成入口模式下能够解析 |
   | `extraEntries` | 要与 DS 入口一起合并到 `window.<globalName>` 的包名（例如 DS 独立的图标包）。同一 scope 下的同级图标包会被自动检测（`[ICON_PKG]`）。 |
   | `componentSrcMap` | **稀疏的** `{Name: path}`——非 null 值固定/添加组件的源码路径；`null` 排除 `.d.ts` 导出的内部组件 |
   | `dtsPropsFor` | `{Name: "prop?: Type; …"}`——当自动提取失败时（复杂泛型、跨包类型），手动编写的 `<Name>Props` 主体 |
   | `previewArgs` | `{Name: {prop: value, …}}`——在自动生成的 `.design-sync/previews/<Name>.tsx` 中渲染为 `Preview` 导出的 props。用于简单扁平 props；对于需要组合 JSX 子元素的情况，直接编辑 `.tsx`。 |
   | `storiesPattern` | 正则表达式（字符串），当同级 stories 默认匹配不适用时（例如 `"/__stories__/.*\\.stories\\.tsx$"`），用于匹配绝对源码路径 |
   | `cssEntry` / `tokensPkg` / `tokensGlob` | 样式表和令牌文件 |
   | `docsDir` | 目录（相对于包；可以指向外部，例如 `../../apps/docs`），包含每个组件的 `.md`/`.mdx` 文档。自动检测为包下的 `docs/` 或 `documentation/`。 |
   | `docsMap` | 稀疏的 `{Name: path \| null}`——每个组件的显式文档路径（覆盖自动发现）；`null` 排除 |
   | `guidelinesGlob` | 字符串或字符串数组（相对于包），指定要复制到 `guidelines/` 的设计指南 `.md` 文件。默认 `['docs/guides/**/*.md', 'docs/*.md', 'guides/**/*.md']`。 |
   | `extraFonts` | 路径（相对于包；可以指向包外部，例如同级的 typography 包），指向 DS 期望宿主应用提供的品牌字体家族的 `@font-face` `.css` 文件或裸 `.woff2`/`.ttf`/`.otf` 文件。CSS 条目会被解析，其中的本地字体文件会被复制到 `fonts/`；裸字体文件按原样复制。当 validate 打印 `[FONT_MISSING]` 时使用。 |
   | `runtimeFontPrefixes` | string[]——宿主应用在运行时通过字体服务（`<script>` 或 JS 加载器）提供的字体家族名称前缀，因此没有 `@font-face` 可打包。对匹配的家族抑制 `[FONT_MISSING]`。当品牌字体不应随打包文件一起发布时使用。 |
   | `replaces` | `{<raw-element>: [<ComponentName>, …]}`——扩展 adherence 配置的原始元素映射 |
   | `libOverrides` | `{"<name>.mjs": "<一行原因>"}`——声明此仓库 fork 了哪些 `.design-sync/lib/*.mjs` 文件及其原因（参见故障排除章节）。构建时交叉检查。 |
   | `notes` | 自由格式字符串——你发现的仓库特定怪癖（工作区构建顺序、不稳定的 stories、奇怪的入口路径）。**重新同步时首先阅读此项；学到新内容时追加。** |

7. **运行转换器。** 对于大型设计系统（200+ 组件），ts-morph 的 `.d.ts` 解析可能需要数分钟——stderr 上的 `[DTS]` 进度行表明正在工作中。

```bash
# 转换器在技能目录下——将整套文件复制过来。如果 `cp` 被
# 权限拒绝，通过 `cat` 写入：`cat "<src>" > ./lib/<name>.mjs`。
cp -r "<skill-base-dir>"/package-build.mjs "<skill-base-dir>"/package-validate.mjs "<skill-base-dir>"/lib .
npm i --no-save esbuild ts-morph @types/react   # 如果此仓库使用 pnpm，参见下方的 pnpm 说明
node package-build.mjs --config design-sync.config.json --node-modules ./node_modules \
  --entry ./dist/index.es.js --out ./ds-bundle
node package-validate.mjs ./ds-bundle
```

将 `package-build.mjs` 和 `package-validate.mjs` 作为单独的命令运行，并检查各自的退出码——在后台链式运行的 `build && validate` 在构建步骤失败时会以非零退出且没有可见日志。**在 headless / `-p` 会话中，两者都同步运行**（不使用 `run_in_background`）——headless 模式下没有任务通知重新触发，因此后台运行永远不会被恢复。在交互式会话中，后台运行构建是可以的。

在 DS 自身的仓库中，`node_modules/<pkg>` 通常不存在（npm 不会自安装），因此需要 `--entry`。

**在 pnpm 仓库上使用 esbuild/ts-morph：** `npm i --no-save esbuild ts-morph` 在 pnpm 管理的 `node_modules` 上可能失败或保持未提升状态（转换器的导入将无法解析）。如果出现此情况，将其安装到 pnpm 可见的位置（`pnpm add -D esbuild ts-morph @types/react`），或从 `$(pnpm root)/.pnpm/` 创建转换器解析目标的符号链接。

`@types/react` 是属性提取所必需的——没有它，`React.ComponentPropsWithoutRef<…>` 等工具类型会解析为 `any`，生成的 `<Name>.d.ts` 会丢失继承的 props（转换器打印 `[DTS_REACT]`）。

如果构建 monorepo 过于复杂，可以 `npm install <your-pkg>@latest react react-dom` 到一个临时目录，并传递 `--node-modules <scratch>/node_modules`——使用已发布的 dist 和扁平化的依赖。

## 源码形态

两种形态，相同输出。**storybook** 形态：当发现 `.storybook/` 时（从 `storybook-static/index.json` 获取组件列表 + story args）；**package** 形态：否则（打包 `dist/`，当存在时从 `src/` 丰富每个组件——JSDoc、分组、同级 `*.stories.tsx` args）。无论哪种方式，预览都从 `_ds_bundle.js` 自包含渲染；没有 story args 的组件会得到一个脚手架。

## 转换器生成的内容

每个组件，在 `components/<group>/<Name>/` 下：`<Name>.jsx`（单行再导出存根）、`<Name>.d.ts`（来自已发布类型的 props 接口）、`<Name>.prompt.md` 和 `<Name>.html`（预览卡片）。你不需要编写其中任何一个——转换器会完成。

`<Name>.prompt.md` 是匹配的每个组件的文档（当存在时：同级 `<Name>.md`/`.mdx` → `cfg.docsDir` 查找 → `<Name>.stories.mdx`；frontmatter 中的 `category` 设置组件的 `<group>`）。否则，它由 `.d.ts` props 主体、前导 JSDoc 以及 `.design-sync/previews/<Name>.tsx` 中的任何示例合成——严格比之前的存根更丰富。`[DOCS_UNMAPPED]` 列出未匹配的组件。

`<Name>.html` 通过编译后的 `.design-sync/previews/<Name>.tsx` 从 `window.<GLOBAL>.<Name>` 渲染组件（每个命名导出 = 一个带标签的单元格）。当该文件的构建失败时，回退到旧的 story-grid / `.d.ts` 脚手架路径。**需要组合子元素的结构化/复合组件**：编辑 `.design-sync/previews/<Name>.tsx`（真实的 JSX，带 DS 导入）并删除其首行标记——这是修复方法，而非"预期空白"。对 `.html` 的手动编辑会在重建时被覆盖。

**`.design-sync/previews/`**：每个组件一个 `<Name>.tsx`，每次运行从最佳可用来源自动生成（CSF3 render-fn JSX → story args → `cfg.previewArgs` → `.d.ts` 变体网格 → 命名空间存根 → 默认）。首行是 `// @ds-preview generated <sha12> — …`；sha12 是其下方主体的哈希。当标记存在且哈希匹配时，文件会被重新生成；删除标记以接管所有权，转换器将不再触碰它（日志显示 `(preview override: <Name>)`）。如果你编辑了主体但保留了标记，转换器会警告 `(preview edited under marker: <Name>)` 并跳过——删除第 1 行以保留你的编辑，或删除文件以重新生成。与 `design-sync.config.json` 和 `.design-sync/lib/` 一起提交。

## 3. 自愈循环

`package-validate.mjs` 在 stderr 上输出 `[TAG]` 前缀的诊断信息。对于每个错误：匹配下表中的标签 → 应用修复 → 重建 → 重新验证。重复直到退出码为 0。少数确实无法静态渲染的 stories（交互驱动型、数据获取型）放入 `cfg.overrides.<Component>.skip`（内联在 `design-sync.config.json` 中，或 `cfg.overrides` 可以是指向单独 JSON 文件的路径）。

| 标签 | 症状 | 修复 |
|---|---|---|
| `[NO_DIST]` | `entry <path> doesn't exist` | DS 包未构建。运行其构建脚本（`npm run build` / `turbo run build`），或使用上述已发布 dist 替代方案。 |
| `[SB_BUILD_FAIL]` | `npx storybook build` 以非零退出 | 修复底层的 Storybook 构建错误（在上方日志中），或自行运行 `npm run build-storybook` 并传递 `--storybook-static <dir>`。 |
| `[WORKSPACE_SIBLING]` | 打包期间 `Could not resolve "<sibling>"` | 工作区同级包未构建。构建它（`turbo build`），或将已发布版本 `npm install` 到临时目录。 |
| `[MULTI_STORYBOOK]` | 转换器选错了 `.storybook/` 目录 | 传递 `--storybook-config <react-pkg>/.storybook`。 |
| `[TITLE_UNMAPPED]` | N 个 storybook 标题与包导出不匹配 | story 标题的最后一段不是组件的导出名称（例如 `Notifications/Toast` 与导出名 `ToastNotification`）。在配置中添加 `"titleMap": {"Toast": "ToastNotification"}`。注意：`titleMap` 以*派生*名称作为键，因此无法消除两个派生为相同名称的标题的歧义（例如 `Components/Button` 和 `Components/ListItem/Button` 都 → `Button`）；后者会静默合并到前者。如果两者都需要作为独立组件，在源码中重命名其中一个 story 的标题。 |
| `[CONFIG]` | `<path>: <json error>` | `design-sync.config.json` 缺失或 JSON 格式错误。修复语法。 |
| `[ZERO_MATCH]` | 未发现组件 | Storybook 形态：`storybook-static/index.json` 没有 story 条目（检查 storybook 配置的 `stories` glob）。Package 形态：没有 PascalCase 的 `.d.ts` 导出且 `componentSrcMap` 为空。 |
| `[OUT_UNSAFE]` | `refusing to rm <path>` | `--out` 指向了 `/`、`$HOME`、cwd 或非空的非先前打包目录。将 `--out` 指向空目录。 |
| `[UNRESOLVED_IMPORT]` | `<pkg> missing from node_modules` | DS 导入的某个依赖未安装。运行仓库的安装（步骤 2.1）或添加该包。 |
| `[DSCARD_MISSING]` | `<path>: first line isn't a @dsCard comment` | 预览的首行必须是 `<!-- @dsCard group="…" -->`，DS 面板才能识别它。通常是本地 `lib/emit.mjs` 编辑删除了头部——恢复它，或重新运行转换器。 |
| `[LINK_HREF_MISSING]` | `<path>: <link href="…"> doesn't resolve` | 预览的样式表路径相对于文件无法解析（预览无样式地发布）。输出深度不匹配——重新运行转换器；如果你手动编辑了预览，修复 `../` 深度。 |
| `[CSS_IMPORT_MISSING]` | `styles.css @imports "…" which doesn't exist` | `styles.css` 引用的某个抓取的 CSS 文件不在磁盘上。检查 `cfg.cssEntry` / `cfg.tokensGlob` 指向存在的文件，然后重新运行。 |
| `[PROMPT_EMPTY]` | `<path>: first line is empty` | `.prompt.md` 首行是设计代理读取的元素索引摘要。重新运行转换器；如果仍然为空，该组件没有 JSDoc——在其源码中添加一个。 |
| `[CSS_ASSETS]` | `N relative url() ref(s) in the fallback CSS won't resolve post-upload` | 仅供参考。storybook-static 的 CSS 回退引用了（未上传的）storybook 构建目录下的资源。字体单独复制；背景图片会 404，但类规则仍然适用。如果图片很重要，将 `cfg.cssEntry` 设置为自包含的样式表。 |
| `[RENDER]` | `<path>: root empty` | 某个 `<Name>.html` 在 headless chromium 中未渲染。检查 `.render-check.json` 中的 `firstErr`；通常是组件读取的 provider/context 不在 `cfg.provider` 中。如果是纯数据获取或交互驱动的 story，将其添加到 `cfg.overrides.<Component>.skip`。 |
| `[RENDER_ERRORS]` | `<path>: <first pageerror>` | 仅供参考——预览已渲染（根非空）但抛出了 `pageerror`。通常是组件读取的 provider/context 不在 `cfg.provider` 中（参见故障排除章节）。非阻塞，除非 `[RENDER]` 也触发。 |
| `[RENDER_BLANK]` | `<path>: renders but PNG is <5KB` | 预览已渲染（无错误）但截图基本是空白的——自动生成的 JSX 未产生可见内容。为 `cfg.previewArgs.<Name>` 添加代表性 props（参见 `<Name>.d.ts`）；对于需要组合子元素的复合组件，直接编辑 `.design-sync/previews/<Name>.tsx` 并删除其首行标记。 |
| `[RENDER_THIN]` | `mounted text is just "<Name>"` / `variants render identically` | 预览渲染了但只显示占位文本，或者每个变体看起来都一样。与 `[RENDER_BLANK]` 相同的修复方法。 |
| `[CSS_FROM_STORYBOOK]` | `_ds_bundle.css` was an `@import`-only stub | 仅供参考——转换器回退到 storybook-static 编译后的 CSS。对于 utility-CSS 或 CSS-in-JS 设计系统很常见。无需操作，除非回退 CSS 不正确；此时显式设置 `cfg.cssEntry`。 |
| `[CSS_PLACEHOLDER]` | 存根 CSS 且未找到 storybook 回退 | 将 `cfg.cssEntry` 设置为编译后的样式表（查找 `dist/` 下最大的 `.css` 文件，或包自身文档中指定的导入路径）。 |
| `[CSS_RUNTIME]` | 任何地方都未找到静态 CSS；写了一个自样式的 `styles.css` | 仅供参考，**非阻塞**（`validate` 仍然 exit 0）。对于在运行时注入样式的 CSS-in-JS 设计系统是预期行为——打包文件是自样式的。确认渲染检查通过。**仅当** DS 确实发布了样式表但抓取遗漏时：将 `cfg.cssEntry` 设置为该样式表。如果 DS 依赖在 `.storybook/preview-head.html` 中声明的远程 webfont，转换器现在会自动将其捕获为 `@import url(...)`；任何其他全局内容你可以编写到一个小的 CSS 文件中，并将 `cfg.cssEntry` 指向它。 |
| `[FONT_MISSING]` | 发布的 CSS 引用了未打包 `@font-face` 的字体家族 | 非阻塞。DS 引用了它期望宿主应用提供的品牌字体家族（通常通过字体令牌）。将 `cfg.extraFonts` 设置为 `@font-face` css / woff2（通常是同级 typography 包）并重建，或接受替代字体——DS 面板会用系统字体渲染这些组件。 |
| `[DOCS_UNMAPPED]` | `<Name>`——未找到每个组件的文档文件 | 仅供参考。将 `cfg.docsDir` 设置为文档树或将 `cfg.docsMap.<Name>` 设置为文件。未匹配的组件改为从 `.d.ts` + 预览合成 `.prompt.md`。 |
| `[FONT_DANGLING]` | 打包了 `@font-face` 规则但其 `url()` 目标文件不存在 | 非阻塞。字体文件未被复制到 `fonts/`——通常是构建日志中的 `! extraFonts:` / `! cssEntry:` 跳过。修复 `cfg.extraFonts` 路径，或将 woff2 复制到 DS 包下。 |
| — | 图标渲染为空框或缺失 | DS 的图标包不在打包文件中。检查构建日志中的 `[ICON_PKG]`（相同 scope 的图标包会自动包含）；如果没有触发，将图标包名添加到 `cfg.extraEntries`。 |
| — | 组件渲染了但没有 CSS | 将 `cfg.cssEntry` 设置为包的样式表。 |
| — | DS 面板中显示"缺少品牌字体"横幅 | 与 `[FONT_MISSING]` 相同的原因：打包文件引用了未发布的字体家族。如果文件可用且许可允许，通过 `cfg.extraFonts` 引入，或接受替代字体。 |
| — | `! extraFonts: <path> resolves outside the workspace root — skipped` | `extraFonts` 条目被限制在 `dirname(--node-modules)` 范围内。在 pnpm-workspace / yarn-nohoist 仓库中，`--node-modules` 是每个包的 `node_modules`，同级 typography 包超出了该边界。变通方案：将 `@font-face` css + woff2 复制到 DS 包下并将 `extraFonts` 指向那里，或在包管理器允许的情况下使用仓库根级别的 `node_modules` 重新运行。 |

## 4. 验证预览渲染

`package-validate.mjs` 的 headless 渲染检查（打开每个 `<Name>.html`，在根为空时失败）需要 playwright + chromium。**首先检查是否已安装**——`ls ~/.cache/ms-playwright/` 或 `which chromium chromium-headless-shell google-chrome`。如果缓存了 chromium 构建，**安装匹配的 playwright 版本**（目录名是 `chromium-<build>`；`npm view playwright@latest` 很少匹配——应检查仓库自身的 `package.json`/lockfile 中锁定的 `playwright`/`@playwright/test` 版本，并 `npm i -D playwright@<该版本>`）。不匹配的 playwright↔chromium 会产生 `browserType.launch: Executable doesn't exist`。

**如果未找到，在安装任何东西之前 `AskUserQuestion`**：
> "为了自动验证预览，我需要安装 playwright + chromium（约 200MB）。选项：(a) 允许安装，(b) 跳过——我会在自己的浏览器中打开预览，(c) 完全跳过验证。"

- **(a) 允许** → `npm i -D playwright && npx playwright install chromium`。如果安装失败（CDN 被阻止、版本不匹配），回退到 (b)。
- **(b) 我来打开** → `npx serve ds-bundle`，列出 5–8 个预览路径（混合简单、复合、浮层组件）供用户打开。询问哪些看起来空白或错误；根据用户的描述为每个添加 `cfg.previewArgs.<Name>` 条目并重新运行。
- **(c) 完全跳过** → 使用智能脚手架默认值发布。在最终输出中注明预览未经视觉验证。

> **后台运行长时间命令时**（playwright 安装、构建、服务器）：用 `PID=$!` 捕获其 PID，用 `kill -0 "$PID"` 轮询。不要使用 `pgrep -f '<command string>'`——pgrep 调用本身会匹配自己的参数，导致循环永不退出。

有了 playwright（已有的或安装的），**`package-validate.mjs` 为每个预览截图**到 `ds-bundle/_screenshots/<group>__<Name>.png`，并将每个组件的状态写入 `ds-bundle/.render-check.json`（`[{name, group, errs, firstErr, pngBytes, blank, rootEmpty, thin, nameOnly, allHollow, collapsed, hasPlaceholder, maxHeight, variantsIdentical, bad, texts}]`）。读取 `.render-check.json` 并：

1. **扫视。** 读取 `_screenshots/contact-sheets.json`。如果缺失，说明联系表步骤未完成——转到步骤 2。否则，读取其列出的每个 `_screenshots/contact-sheet-N.png`（每个平铺约 16 个带标签的预览）；记录任何看起来不对劲的缩略图——仅名称、空的变体标签、视觉上损坏或占位符。
2. **深入。** 对于每个 (a) 在 `.render-check.json` 中被标记的（`bad`、`thin`、`hasPlaceholder` 或 `variantsIdentical` 为 true）、(b) 在扫视中看起来不对劲的，或 (c) 如果步骤 1 未找到 json 则检查**任意**组件：读取其单独的 `_screenshots/<group>__<Name>.png`——永远不要从联系表缩略图判断，永远不要抽样。如果它看起来已经正确（Divider 只是一条线；Icon 只是一个字形），则跳过——`thin` 是提示，不是判决。否则，读取 `<Name>.d.ts` 并编写 `cfg.previewArgs.<Name>` 条目（简单扁平 props），或者对于需要组合子元素或内联 fixture 数据的复合组件，打开 `.design-sync/previews/<Name>.tsx`，编辑 JSX，并删除其首行 `// @ds-preview generated` 标记，使转换器保留你的编辑。`hasPlaceholder: true` 意味着显示的是生成的虚线框占位符——用真实内容编辑 `.tsx`。`blank: true`（PNG <5KB）通常意味着自动生成的 JSX 未合成出有用的内容；`errs > 0` 且带有 context/provider 消息 → 参见故障排除章节。如果构建日志显示 `(preview: <Name> — N renderSource(s) reference undeclared …)`，说明 story 的 JSX 引用了 story 文件本地的 fixture——将该数据内联到 `.tsx` 中。
   **选择 `cfg.previewArgs` 还是编辑 `.tsx`：** `previewArgs` 用于扁平的可 JSON 序列化的 props——它在生成的 `.tsx` 中呈现为一个额外的 `Preview` 导出。对于组合子元素（`<Tabs><Tab/><Tab/></Tabs>`）、fixture 数据或任何需要真实 JSX 的内容，直接编辑 `.design-sync/previews/<Name>.tsx` 并删除其标记行；`previewArgs` 无法表达这些。如果 `firstErr` 是 TypeScript 错误（`Property '…' is missing`、`Type '…' is not assignable`），修复在 `.tsx` 中——生成的 JSX 的 prop 形状有误。
3. 重新运行 `package-build.mjs` 然后 `package-validate.mjs`。只有你编辑了 `.tsx`（标记已删除 → 保留）或添加了 `previewArgs` 的组件会变化；带标记的文件会被重新生成。
4. 重复直到 `bad` 集合为空或达到 3 次迭代。
5. 最后一轮后，调用 `DesignSync({method: 'report_validate', counts: {total, bad, thin, variantsIdentical, iterations}})`，使用 `.render-check.json` 中的汇总数据（`total` = 条目数；`bad`/`thin`/`variantsIdentical` = 为 true 的计数；`iterations` = 你运行的重建轮数）。
6. 如果 validate 打印了 `[FONT_MISSING]`：在交互式会话中，`AskUserQuestion` 询问是否通过 `cfg.extraFonts` 引入字体家族（并重建）还是接受系统字体替代。如果是 headless 模式，在最终摘要中注明并继续。

步骤 1–5 是第 5 章的门槛——在完成之前不要进入 `finalize_plan`/上传。

**给用户的最终输出**："N/M 个预览渲染正常；X 个通过 previewArgs 修复；Y 个仍需关注：[名称]；已审查 Y/Y 个被标记的预览 + S 张联系表。" 对于 Y，读取并附加 PNG 图片，以便用户看到问题所在。

自动生成的预览使用每个组件的最佳可用来源（CSF3 render-fn JSX → story args → `cfg.previewArgs` → `.d.ts` 变体网格 → 命名空间存根 → 默认）。复合/浮层组件可能确实需要 `cfg.previewArgs` 或手动编辑的 `.tsx`——这是预期的，不是转换器 bug。

同时确认：
- `components:` 的数量与你在第 2 章中与用户确认的一致。不足 → 参见故障排除章节（`componentSrcMap`）。
- 在任意预览的浏览器控制台中（`npx serve ds-bundle`），`Object.keys(window.<globalName>)` 列出每个导出的组件。

## 5. 上传

仅在转换器完全完成且 `package-validate.mjs` exit 0 之后上传——运行中的快照会产生带有悬空引用的打包文件。

上传到 **DS 项目根目录**——自检期望 `_ds_bundle.js`、`styles.css`、`components/`、`tokens/`、`fonts/` 和 `README.md` 位于顶层。

`DesignSync(finalize_plan)` 使用 `localDir: "./ds-bundle"`、`writes: ["components/**", "tokens/**", "fonts/**", "_vendor/**", "_preview/**", "guidelines/**", "_ds_bundle.js", "_ds_bundle.css", "styles.css", "README.md"]` 和 `deletes: []`（必填，即使为空）——转换器的输出集合。点前缀的根条目（`.ds-build-meta.json`、`.ds-bundle`、`.pkg-entry.mjs`、`.bundle-entry.mjs`、`.sb-static/`）和 `_screenshots/` 是构建产物，保留在本地。`_vendor/` 需要上传（预览卡片从中加载 React）。仅当设置了 `cfg.demo` 时才添加 `"demo.html"`。

`finalize_plan` 向用户显示交互式批准提示。**如果被拒绝，停止**——不要用不同的 `localDir`/`writes` 值重试；拒绝意味着会话无法批准，而不是参数有误。打包文件已在第 4 章验证；报告 `ds-bundle/` 路径，让用户交互式地运行上传。

然后对计划中匹配的每个文件调用 `DesignSync(write_files)`，逐字保留相对于根目录的路径。该工具每次调用上限为 256 个文件，因此列出树结构，分块为 ≤256 个文件的批次，在同一 `planId` 下发起多次 `write_files` 调用。`DesignSync(list_files)` 确认数量匹配。每个 `<Name>.html` 携带首行 `<!-- @dsCard group="…" -->` 注释，claude.ai/design 应用的自检读取它来注册卡片。

完成后，告诉用户：项目 URL（`https://claude.ai/design/p/<projectId>`）、组件数量、上传的文件数，以及 `package-validate.mjs` 干净退出。**将 `design-sync.config.json` 和任何 `.design-sync/lib/` 覆盖提交到仓库**，以便将来运行时复用你在验证循环中添加的 `previewArgs`/`dtsPropsFor`/`libOverrides`。

## 6. 自检（服务端）

上传后你就完成了。应用的自检会在打开新上传的项目时触发，因此 DS 面板会自动填充。如果卡片在几秒内未出现，发送消息触发刷新。自检读取每个 `<Name>.d.ts` 作为组件的 API 契约（`<Name>Props` 接口是设计代理看到的内容），从每个 `<Name>.html` 读取 `@dsCard` 行以注册预览卡片，并从上传的源码重新生成 adherence 配置和 `ds_manifest`。

## 工作原理

两条独立的构建路径：

**可导入的打包文件**（根 `_ds_bundle.js`）：esbuild 获取包的已发布 `dist/` 入口 → 一个 IIFE，将每个导出赋值到 `window.<globalName>`，带有首行 `/* @ds-bundle: {…} */` 头部供应用自检读取。其 CSS 附属文件（`_ds_bundle.css`）加上抓取的令牌/字体通过一个 `@import` 它们的根 `styles.css` 连接起来。这是 claude.ai/design 代理实际导入和构建所用的内容。与 Storybook 无关；适用于所有设计系统。

转换器**不会**生成 adherence 配置、`ds_manifest`、版本文件或 barrel `index.js`——应用的自检会从上传的源码重新生成这些。

**适用范围**：React 设计系统。`_ds_bundle.js` 和预览都通过 React 渲染——非 React 的设计系统没有可供 claude.ai/design 代理构建的内容。

**检查方法**：`npx serve ds-bundle` 并打开任意 `<Name>.html`。

## 故障排除

**预览显示"context"或"provider"错误**（例如 "No <X> context"、"use<Hook> must be inside <Provider>"）→ DS 需要 provider 包装器。**首次构建时不要设置 `cfg.provider`**——storybook 形态的 DS 会自动应用 `.storybook/preview.*` 装饰器（打包到 `_vendor/preview-decorators.js`），设置 `cfg.provider` 会跳过此步骤。检查构建日志中的 `preview-decorators.js: bundled`（已运行）或 `decorator auto-detect skipped`（跳过的原因）。仅当 `[RENDER]`/`[RENDER_ERRORS]` 的 context 错误在自动装饰器处理之后仍然存在，或者是 package 形态的 DS 时，才设置 `cfg.provider`。对于链式 provider，通过 `inner` 嵌套：
```json
{"provider": {"component": "ThemeProvider", "props": {"theme": {}}, "inner": {"component": "RouterProvider"}}}
```
查找名为 `*Provider` 或 `Theme` 的导出，或检查 DS 自身文档中的"包裹你的应用"。`component` 可以是 DS 导出中的点路径（例如 `"<ExportedContext>.Provider"`）。

**输出缺少组件或组件不对？** `grep ASSUMPTION lib/*.mjs`——每行命名了覆盖该启发式规则的 `cfg.*` 字段。将覆盖项添加到 `design-sync.config.json` 并重新运行。`componentSrcMap` 覆盖大多数情况：`{"Portal": null}` 排除导出的内部组件；`{"TextInput": "src/forms/text-input/index.tsx"}` 固定模糊查找遗漏的源码路径。在合成入口模式下（无 dist、无 `.d.ts`），内容扫描可能过度包含 PascalCase 的非组件导出（例如 `ButtonVariants`）——用 `componentSrcMap: {"ButtonVariants": null}` 修剪。

**大型设计系统的渲染检查：** `package-validate.mjs` 默认对每个预览截图。对于非常大的设计系统（200+ 组件），如果太慢，传递 `--render-sample N` 以确定性步长 N 进行检查。

**为此仓库 fork lib 脚本：** 当没有配置覆盖项适用时，将特定的适配器复制到 `.design-sync/lib/<name>.mjs`（例如 `.design-sync/lib/dts.mjs`）并在那里编辑。`package-build.mjs` 首先检查 `.design-sync/lib/`，使用 fork 时日志显示 `[OVERRIDE]`。添加头部注释 `// forked from design-sync lib/<name>.mjs — <一行原因>`，将相同的原因添加到 `cfg.libOverrides`（例如 `"libOverrides": {"dts.mjs": "VariantProps intersection pattern"}`），并与 `design-sync.config.json` 一起提交，以便重新同步可重现。fork 自身的 `import './common.mjs'` 在 `.design-sync/lib/` 下解析，因此还要将 fork 导入的任何同级 lib 文件（不变地）一并复制。重新同步时，将 `.design-sync/lib/<name>.mjs` 与打包的 `lib/<name>.mjs` 进行 diff，并提供合并上游更改的选项。`lib/emit.mjs` 和 `lib/bundle.mjs` 定义了与应用自检的输出契约——不要 fork 这些；改用配置覆盖项或 `cfg.dtsPropsFor`。

**已知限制：**
- `.d.ts` props 通过 TypeScript 检查器（ts-morph）解析——泛型、`extends` 链、交叉类型和类型别名解析为其结构形状；React 和 CSS-in-JS 样式系统 props 被过滤。上游类型 bug 会原样传播。
- 预览从 `window.<NS>.<Name>` 使用 story args 渲染，而非 Storybook 的 `iframe.html`——MSW 处理器和 addon 转换不会被应用；`.storybook/preview.*` 装饰器按最大努力自动打包。
- Story args 来自 `.args`——带有 `render` 函数的 CSF3 stories 的 args 为空，使用智能脚手架。
- 组件从 context 读取的 provider（主题、路由、i18n）必须在 `cfg.provider` 中或从装饰器自动检测到，否则预览渲染为空白。
- 带有中心 `apps/storybook` 的 monorepo：`.storybook/` 不在包级别，因此形态回退到 `package`；src-enrich 仍然会获取每个组件的 `*.stories.tsx`。
- 仅令牌的设计系统（无组件）：仅生成 `styles.css`，带空主体的 `_ds_bundle.js`。

## 此技能不是什么

不是让 LLM 重写组件。客户真实的已发布代码是唯一的事实来源；转换器确定性地打包它，并使用客户自己的 Storybook 配置渲染。你（代理）负责发现、配置和自愈循环——绝不涉及组件编写。
