<!--
name: 'Skill: /design-sync Storybook 源形态'
description: 针对从 Storybook 故事和构建产物同步 React 设计系统的 /design-sync 形态专属说明
ccVersion: 2.1.162
-->
# Storybook 源形态

`.storybook/` 已发现 —— 组件列表和 story args 来自 `storybook-static/index.json`。运行 `npm run build-storybook`（如果已有构建产物，则传入 `--storybook-config <dir>` / `--storybook-static <dir>` 给转换器）。

## 2. 探索，然后编写配置（续）

3. 转换器需要构建后的 `dist/` 入口及其 `.d.ts` 树。检查入口（来自 `package.json` 的 `module`/`main`/`exports['.']`）是否已存在 —— 安装时可能已通过 `prepare` 构建。如果缺失：
   - 运行 `<pm> run build`。没有 `build` 脚本 → 尝试 `prepare`/`prepack`。在 monorepo 中，构建可能在仓库根目录执行（`turbo build --filter=<pkg>`、`pnpm -F <pkg> build`、`nx build <pkg>`）。**某些构建脚本会 fork 一个 watcher 然后提前 exit 0 —— 命令返回后，`ls` 查看预期输出（dist/、build/esm/，或 `package.json` 的 `module`/`main` 指向的任何目录）并确认其已填充后再继续。** 如果为空，检查脚本中是否有 `--watch` 标志并使用一次性变体，或轮询输出目录。
   - 仍然缺失 → `AskUserQuestion`("此包使用什么命令构建？"，选项 = 任何包含 `tsc|tsup|rollup|vite build|esbuild|swc` 的 `scripts.*`，外加自由输入)。将答案记录为配置中的 `buildCmd`。
   - 用户说没有构建 → 转换器将从 `src/` 合成入口（最后手段 —— `.d.ts` 契约会较弱；建议添加构建步骤）。
4. **检查项目中已有的内容。** 对目标执行 `DesignSync(list_files)`。如果返回了文件，通过 `DesignSync(get_file)` 读取 `_ds_bundle.js`，并记下其首行 `/* @ds-bundle: {…} */` 头中的组件名称 —— 但**始终仍需重新构建**（第 7 步）；现有 bundle 在源文件变更的那一刻就已过时。头中的 `sourceHashes` 差异决定了通过 `DesignSync` *增量上传*哪些内容，而非构建哪些内容。
5. **构建前与用户确认计划。** 使用 `AskUserQuestion`，包含：你找到的组件列表（或数量加几个名称，如果列表很长的话）、token/CSS 来自哪些文件、以及你将运行哪个构建命令。构建可能耗时数分钟并消耗大量 token —— 此时对齐可避免因指向错误的包或遗漏一半组件而重新运行。
   - 如果项目已有 N 个组件（第 4 步），在问题中包含该信息并提供范围选项：**(a)** 完整重建 + 重新上传所有内容，**(b)** 仅更新变更的组件（基于 `sourceHashes` 的差异），**(c)** 仅更新 token + CSS（不重建组件）。当差异较小时默认选择 (b)。
6. **编写 `design-sync.config.json` 并提交** —— 重新同步时会复用它，因此输出是可复现的。只有 `pkg` 和 `globalName` 是必填的。**如果文件已存在，先读取它并保留 `previewArgs`、`dtsPropsFor`、`libOverrides` 和 `overrides` —— 只向这些字段添加内容，绝不替换。** 它们累积了之前验证循环迭代中的修复。**在其他任何操作之前，还应 Read `.design-sync/NOTES.md`（或 `cfg.notes` 指向的任何文件）** —— 它包含之前同步记录的仓库特定注意事项。

   | 字段 | 值 |
   |---|---|
   | `pkg` / `globalName` | 包名和要赋值的 `window.*` 全局变量 —— 必填 |
   | `shape` | `'storybook'` 或 `'package'` —— 锁定源形态（覆盖自动检测）。首次运行时写入。 |
   | `storybookConfigDir` | `.storybook/` 目录的路径（相对于此配置文件），当它位于包外部时 —— 例如 monorepo 中的中心化 `apps/storybook/.storybook` |
   | `storybookStatic` | 预构建的 `storybook-static/` 目录的路径，如果你已经运行了 `build-storybook` |
   | `titleMap` | `{storyTitle: ComponentName}` —— 将 Storybook 故事标题映射到组件导出名称，当它们不匹配时（参见 `[TITLE_UNMAPPED]`） |
   | `buildCmd` | 发现的构建命令；重新同步时会重新运行 |
   | `tsconfig` | `tsconfig.json` 的路径 —— esbuild 读取 `compilerOptions.paths` 以便 `@/…` 路径别名在合成入口模式下可解析 |
   | `extraEntries` | 要合并到 `window.<globalName>` 中的包名，与 DS 入口并列（例如 DS 独立的 icon 包）。同一 scope 下的同级 icon 包会被自动检测（`[ICON_PKG]`）。 |
   | `componentSrcMap` | **稀疏** `{Name: path}` —— 非 null 值固定/添加组件的源路径；`null` 排除 `.d.ts` 导出的内部组件 |
   | `dtsPropsFor` | `{Name: "prop?: Type; …"}` —— 当自动提取失败时（复杂泛型、跨包类型），手写的 `<Name>Props` 体 |
   | `previewArgs` | `{Name: {prop: value, …}}` —— 在自动生成的 `.design-sync/previews/<Name>.tsx` 中渲染为 `Preview` 导出的 props。用于简单的扁平 props；对于需要组合 JSX 子元素的组件，直接编辑 `.tsx`。 |
   | `cssEntry` / `tokensPkg` / `tokensGlob` | 样式表和 token 文件 |
   | `docsDir` | 目录（相对于包；可指向外部，例如 `../../apps/docs`），包含每个组件的 `.md`/`.mdx` 文档。自动检测为包下的 `docs/` 或 `documentation/`。 |
   | `docsMap` | 稀疏 `{Name: path \| null}` —— 每个组件的显式文档路径（覆盖自动发现）；`null` 排除 |
   | `guidelinesGlob` | 字符串或 string[]（相对于包），要复制到 `guidelines/` 中的设计指南 `.md` 文件。默认 `['docs/guides/**/*.md', 'docs/*.md', 'guides/**/*.md']`。 |
   | `extraFonts` | 路径（相对于包；可指向包外部，例如同级 typography 包），指向 DS 期望宿主应用提供的品牌字体家族的 `@font-face` `.css` 文件或裸 `.woff2`/`.ttf`/`.otf` 文件。CSS 条目会被解析，其本地字体文件复制到 `fonts/`；裸字体文件按原样复制。当 validate 输出 `[FONT_MISSING]` 时使用。 |
   | `runtimeFontPrefixes` | string[] —— 宿主应用在运行时通过字体服务（通过 `<script>` 或 JS 加载器）提供的字体家族名称前缀，因此没有需要随附的 `@font-face`。抑制匹配家族的 `[FONT_MISSING]`。当品牌字体不应随 bundle 一起发布时使用。 |
   | `replaces` | `{<raw-element>: [<ComponentName>, …]}` —— 扩展 adherence 配置的 raw-element 映射 |
   | `libOverrides` | `{"<name>.mjs": "<一行原因>"}` —— 声明此仓库 fork 了哪些 `.design-sync/lib/*.mjs` 文件及其原因（参见 §故障排除）。构建时交叉检查。 |
   | `notes` | 指向 markdown 笔记文件的路径 —— 默认 `"./.design-sync/NOTES.md"`。 |

   **`.design-sync/NOTES.md`** 是存放仓库特定怪癖的地方（工作区构建顺序、不稳定的 story、奇怪的入口路径、任何未来重新同步时应了解的事项）。以多行 markdown 编写 —— 每个注意事项一条 bullet。**在验证循环中学到任何东西时追加到其中**，并随配置文件一起提交。

7. **运行转换器。** 对于大型 DS（200+ 组件），ts-morph 的 `.d.ts` 解析可能需要几分钟 —— stderr 上的 `[DTS]` 进度行表明它正在工作。

```bash
# 转换器随 skill 目录一起发布 —— 将整个集合 stage。如果 `cp` 权限被拒绝，通过 `cat` 写入：`cat "<src>" > ./lib/<name>.mjs`。
cp -r "<skill-base-dir>"/package-build.mjs "<skill-base-dir>"/package-validate.mjs "<skill-base-dir>"/lib .
npm i --no-save esbuild ts-morph @types/react   # 如果此仓库使用 pnpm，请参阅下面的 pnpm 说明
node package-build.mjs --config design-sync.config.json --node-modules ./node_modules \
  --entry ./dist/index.es.js --out ./ds-bundle
node package-validate.mjs ./ds-bundle
```

将 `package-build.mjs` 和 `package-validate.mjs` 作为独立命令运行，并检查每个的退出码 —— 在后台链接的 `build && validate` 在构建步骤失败时以非零退出但无可见日志。**在 headless / `-p` 会话中，同步运行两者**（不使用 `run_in_background`）—— headless 模式下没有任务通知重新调用，因此后台运行永远不会被恢复。在交互式会话中，将构建放到后台是可以的。

在 DS 自己的仓库中，`node_modules/<pkg>` 通常不存在（npm 不会自安装），因此需要 `--entry`。

**pnpm 仓库上的 esbuild/ts-morph：** `npm i --no-save esbuild ts-morph` 在 pnpm 管理的 `node_modules` 上可能失败或保持未提升状态（转换器的 import 将无法解析）。如果如此，安装到 pnpm 可见的位置（`pnpm add -D esbuild ts-morph @types/react`），或将转换器的解析目标符号链接到 `$(pnpm root)/.pnpm/`。

需要 `@types/react` 用于 prop 提取 —— 没有它，`React.ComponentPropsWithoutRef<…>` 和类似的工具类型解析为 `any`，生成的 `<Name>.d.ts` 会丢失继承的 props（转换器输出 `[DTS_REACT]`）。

如果构建 monorepo 很复杂，`npm install <your-pkg>@latest react react-dom` 到一个临时目录，并传入 `--node-modules <scratch>/node_modules` —— 使用你已发布的 dist 配合扁平化的依赖。

## 源形态

两种形态，相同输出。**storybook** 在发现 `.storybook/` 时使用（组件列表 + story args 来自 `storybook-static/index.json`）；**package** 在其他情况下使用（打包 `dist/`，在存在时从 `src/` 丰富每个组件 —— JSDoc、分组、同级 `*.stories.tsx` 的 args）。预览始终从 `_ds_bundle.js` 自包含渲染；没有 story args 的组件获得一个脚手架。

## 转换器生成的内容

每个组件，位于 `components/<group>/<Name>/` 下：`<Name>.jsx`（一行重新导出存根）、`<Name>.d.ts`（来自发布类型的 props 接口）、`<Name>.prompt.md` 和 `<Name>.html`（预览卡片）。你不需要编写这些 —— 转换器会生成。

`<Name>.prompt.md` 是匹配的每个组件的文档（当存在时：同级 `<Name>.md`/`.mdx` → `cfg.docsDir` 查找 → `<Name>.stories.mdx`；frontmatter `category` 设置组件的 `<group>`）。否则它从 `.d.ts` props 体、前导 JSDoc 和 `.design-sync/previews/<Name>.tsx` 中的任何示例合成 —— 严格比之前的存根更丰富。`[DOCS_UNMAPPED]` 列出未匹配的组件。

`<Name>.html` 通过编译的 `.design-sync/previews/<Name>.tsx` 从 `window.<GLOBAL>.<Name>` 渲染组件（每个具名导出 = 一个带标签的格子）。当该文件的构建失败时，回退到较旧的 story-grid / `.d.ts`-scaffold 路径。**需要组合子元素的结构化/复合组件**：编辑 `.design-sync/previews/<Name>.tsx`（真正的 JSX，带 DS 导入）并删除其首行标记 —— 这才是修复方式，而不是"预期为空白"。对 `.html` 的手动编辑会在重建时被覆盖。

**`.design-sync/previews/`**：每个组件一个 `<Name>.tsx`，每次运行从最佳可用源自动生成（CSF3 render-fn JSX → story args → `cfg.previewArgs` → `.d.ts` 变体网格 → namespace 存根 → 默认）。首行是 `// @ds-preview generated <sha12> — …`；sha12 是其下方内容的哈希。当标记存在且哈希匹配时，文件会被重新生成；删除标记以接管所有权，转换器将保持其不变（日志输出 `(preview override: <Name>)`）。如果你编辑了内容但保留了标记，转换器警告 `(preview edited under marker: <Name>)` 并跳过 —— 删除第 1 行以保留你的编辑，或删除文件以重新生成。随 `design-sync.config.json`、`.design-sync/NOTES.md` 和 `.design-sync/lib/` 一起提交。

## 3. 自愈循环

`package-validate.mjs` 在 stderr 上输出 `[TAG]` 前缀的诊断信息。对于每个错误：在此表中匹配标签 → 应用修复 → 重建 → 重新验证。重复直到退出码为 0。少数确实无法静态渲染的 story（交互驱动、数据获取）放入 `cfg.overrides.<Component>.skip`（内联在 `design-sync.config.json` 中，或 `cfg.overrides` 可以是指向单独 JSON 文件的路径）。

| 标签 | 症状 | 修复 |
|---|---|---|
| `[NO_DIST]` | `entry <path> doesn't exist` | DS 包未构建。运行其构建脚本（`npm run build` / `turbo run build`），或使用上述已发布 dist 的替代方案。 |
| `[SB_BUILD_FAIL]` | `npx storybook build` 以非零退出 | 修复底层的 Storybook 构建错误（日志在上方），或自行运行 `npm run build-storybook` 并传入 `--storybook-static <dir>`。 |
| `[WORKSPACE_SIBLING]` | 打包时 `Could not resolve "<sibling>"` | 工作区同级包未构建。构建它（`turbo build`），或将已发布版本 `npm install` 到临时目录。 |
| `[MULTI_STORYBOOK]` | 转换器选错了 `.storybook/` 目录 | 传入 `--storybook-config <react-pkg>/.storybook`。 |
| `[TITLE_UNMAPPED]` | N 个 storybook 标题不匹配包导出 | story 标题的最后一段不是组件的导出名（例如 `Notifications/Toast` 与导出 `ToastNotification`）。向配置添加 `"titleMap": {"Toast": "ToastNotification"}`。注意：`titleMap` 按键是*派生*名称，因此无法消歧两个派生到相同名称的标题（例如 `Components/Button` 和 `Components/ListItem/Button` 都 → `Button`）；第二个会静默合并到第一个。如果两者都需要作为独立组件，在源文件中重命名其中一个 story 的标题。 |
| `[CONFIG]` | `<path>: <json error>` | `design-sync.config.json` 缺失或 JSON 格式错误。修复语法。 |
| `[ZERO_MATCH]` | 未发现组件 | `storybook-static/index.json` 没有 story 条目（检查 storybook 配置的 `stories` glob）。 |
| `[OUT_UNSAFE]` | `refusing to rm <path>` | `--out` 指向 `/`、`$HOME`、cwd 或非空且不是之前 bundle 的目录。将 `--out` 指向空目录。 |
| `[UNRESOLVED_IMPORT]` | `<pkg> missing from node_modules` | DS 导入的某个依赖未安装。运行仓库的安装（步骤 2.1）或添加该包。 |
| `[DSCARD_MISSING]` | `<path>: first line isn't a @dsCard comment` | 预览的首行必须是 `<!-- @dsCard group="…" -->`，DS 面板才能注册它。通常是本地 `lib/emit.mjs` 编辑删除了头部 —— 恢复它，或重新运行转换器。 |
| `[LINK_HREF_MISSING]` | `<path>: <link href="…"> doesn't resolve` | 预览的样式表路径无法相对于文件解析（预览不带样式发布）。emit 深度不匹配 —— 重新运行转换器；如果你手动编辑了预览，修正 `../` 的深度。 |
| `[CSS_IMPORT_MISSING]` | `styles.css @imports "…" which doesn't exist` | `styles.css` 引用的抓取 CSS 文件不在磁盘上。检查 `cfg.cssEntry` / `cfg.tokensGlob` 指向存在的文件，然后重新运行。 |
| `[PROMPT_EMPTY]` | `<path>: first line is empty` | `.prompt.md` 的首行是设计代理读取的元素索引摘要。重新运行转换器；如果仍然为空，说明组件没有 JSDoc —— 在其源文件中添加。 |
| `[CSS_ASSETS]` | `N relative url() ref(s) in the fallback CSS won't resolve post-upload` | 信息性。storybook-static CSS 回退引用了（未上传的）storybook 构建目录下的资源。字体会单独复制；背景图片将 404 但类规则仍然生效。如果图片很重要，将 `cfg.cssEntry` 设置为自包含的样式表。 |
| `[RENDER]` | `<path>: root empty` | `<Name>.html` 在 headless chromium 中未渲染。检查 `.render-check.json` 中的 `firstErr`；通常是组件读取的 provider/context 不在 `cfg.provider` 中。如果是仅数据获取或仅交互的 story，将其添加到 `cfg.overrides.<Component>.skip`。 |
| `[RENDER_ERRORS]` | `<path>: <first pageerror>` | 信息性 —— 预览已渲染（root 非空）但抛出了 `pageerror`。通常是组件读取的 provider/context 不在 `cfg.provider` 中（参见 §故障排除）。非阻塞，除非 `[RENDER]` 也触发。 |
| `[RENDER_BLANK]` | `<path>: renders but PNG is <5KB` | 预览已渲染（无错误）但截图实际为空白 —— 自动生成的 JSX 未产生可见内容。使用代表性 props 添加 `cfg.previewArgs.<Name>`（参见 `<Name>.d.ts`）；对于需要组合子元素的复合组件，直接编辑 `.design-sync/previews/<Name>.tsx` 并删除其首行标记。 |
| `[RENDER_THIN]` | `mounted text is just "<Name>"` / `variants render identically` | 预览已渲染但只显示占位文本，或每个变体看起来完全相同。修复方式同 `[RENDER_BLANK]`。 |
| `[CSS_FROM_STORYBOOK]` | `_ds_bundle.css` 只是一个 `@import` 存根 | 信息性 —— 转换器回退到 storybook-static 编译的 CSS。常见于工具类 CSS 或 CSS-in-JS DS。无需操作，除非回退 CSS 不正确；则显式设置 `cfg.cssEntry`。 |
| `[CSS_PLACEHOLDER]` | 存根 CSS 且未找到 storybook 回退 | 将 `cfg.cssEntry` 设置为编译后的样式表（在 `dist/` 下或包自身文档指示导入的位置查找最大的 `.css`）。 |
| `[TOKENS_MISSING]` | `N CSS custom properties referenced but not defined` | 非阻塞。组件 CSS 使用了 `var(--token-*)` 但发布的样式表未定义它们 —— 通常 DS 将 token 放在同级包中。将 `cfg.tokensPkg` 设置为该包（检查构建日志中的 `[TOKENS_PKG]` —— 同一 scope 下的 `*tokens*`/`*theme*` 依赖会被自动检测）。如果 token 是由主题 provider 在运行时注入而非通过样式表，则改为设置 `cfg.provider`。 |
| `[CSS_RUNTIME]` | 未找到任何静态 CSS；写入了自样式化的 `styles.css` | 信息性，**非阻塞**（`validate` 仍以 0 退出）。预期用于在运行时注入样式的 CSS-in-JS DS —— bundle 是自样式化的。确认渲染检查通过。**仅当** DS 实际发布了抓取遗漏的样式表时：将 `cfg.cssEntry` 设置为它。如果 DS 依赖 `.storybook/preview-head.html` 中声明的远程 webfont，转换器现在会自动将其捕获为 `@import url(...)`；任何其他全局内容你可以编写到一个小 CSS 文件中并将 `cfg.cssEntry` 指向它。 |
| `[FONT_MISSING]` | 发布的 CSS 引用了家族但没有随附的 `@font-face` | 非阻塞。DS 引用了它期望宿主应用提供的品牌字体家族（通常通过字体 token）。将 `cfg.extraFonts` 设置为 `@font-face` css / woff2（通常是同级 typography 包）并重建，或接受替代 —— DS 面板将使用系统字体渲染这些组件。 |
| `[DOCS_UNMAPPED]` | `<Name>` —— 未找到每个组件的文档文件 | 信息性。将 `cfg.docsDir` 设置为文档树或将 `cfg.docsMap.<Name>` 设置为文件。未匹配的组件将改为从 `.d.ts` + 预览获得合成的 `.prompt.md`。 |
| `[FONT_DANGLING]` | 发布了 `@font-face` 规则但其 `url()` 目标文件未发布 | 非阻塞。字体文件未被复制到 `fonts/` —— 通常是构建日志中的 `! extraFonts:` / `! cssEntry:` 跳过。修复 `cfg.extraFonts` 路径，或将 woff2 复制到 DS 包下。 |
| — | 图标渲染为空框或缺失 | DS 的 icon 包不在 bundle 中。检查构建日志中的 `[ICON_PKG]`（同一 scope 下的 icon 包会自动包含）；如果未触发，将 icon 包名添加到 `cfg.extraEntries`。 |
| — | 组件渲染但无 CSS | 将 `cfg.cssEntry` 设置为包的样式表。 |
| — | DS 面板中"缺失品牌字体"横幅 | 根本原因同 `[FONT_MISSING]`：bundle 引用了未随附的字体家族。如果文件可用且许可允许，通过 `cfg.extraFonts` 接入，或接受替代。 |
| — | `! extraFonts: <path> resolves outside the workspace root — skipped` | `extraFonts` 条目受限于 `dirname(--node-modules)`。在 pnpm-workspace / yarn-nohoist 仓库中，`--node-modules` 是每个包的 `node_modules`，同级 typography 包落在此边界之外。变通方案：将 `@font-face` css + woff2 复制到 DS 包下并将 `extraFonts` 指向那里，或使用包管理器允许的仓库根 `node_modules` 重新运行。 |

## 4. 验证预览渲染

`package-validate.mjs` 的 headless 渲染检查（打开每个 `<Name>.html`，在 root 为空时失败）需要 playwright + chromium。**首先检查现有安装** —— `ls ~/.cache/ms-playwright/` 或 `which chromium chromium-headless-shell google-chrome`。如果 chromium 构建已缓存，**安装匹配的 playwright 版本**（目录名是 `chromium-<build>`；`npm view playwright@latest` 很少匹配它 —— 改为检查仓库自身的 `package.json`/lockfile 中锁定的 `playwright`/`@playwright/test`，然后 `npm i -D playwright@<that-version>`）。不匹配的 playwright↔chromium 会报 `browserType.launch: Executable doesn't exist`。

**如果未找到，在安装任何内容之前执行 `AskUserQuestion`**：
> "为了自动预览验证，我将安装 playwright + chromium（约 200MB）。选项：(a) 允许安装，(b) 跳过 —— 我将在我自己的浏览器中打开预览，(c) 完全跳过验证。"

- **(a) 允许** → `npm i -D playwright && npx playwright install chromium`。如果安装失败（CDN 被阻止、版本不匹配），回退到 (b)。
- **(b) 我来打开** → `npx serve ds-bundle`，列出 5–8 个预览路径（混合简单、复合、浮层组件）供用户打开。询问哪些看起来是空白或有问题；根据用户的描述为每个添加 `cfg.previewArgs.<Name>` 条目并重新运行。
- **(c) 完全跳过** → 使用智能脚手架默认值发布。在最终输出中注明预览未进行视觉验证。

> **后台运行长时间命令时**（playwright 安装、构建、服务器）：使用 `PID=$!` 捕获其 PID 并用 `kill -0 "$PID"` 轮询。不要使用 `pgrep -f '<command string>'` —— pgrep 调用本身会匹配自己的参数，导致循环永不退出。

有了 playwright（已有或已安装），**`package-validate.mjs` 会将每个预览截图**到 `ds-bundle/_screenshots/<group>__<Name>.png`，并将每个组件的状态写入 `ds-bundle/.render-check.json`（`[{name, group, errs, firstErr, pngBytes, blank, rootEmpty, thin, nameOnly, allHollow, collapsed, hasPlaceholder, maxHeight, variantsIdentical, bad, texts}]`）。读取 `.render-check.json` 并：

1. **扫视。** 读取 `_screenshots/contact-sheets.json`。如果缺失，说明拼图步骤未完成 —— 转到步骤 2。否则读取其列出的每个 `_screenshots/contact-sheet-N.png`（每张拼图排列约 16 个带标签的预览）；注意任何看起来不对的缩略图 —— 仅显示名称、空的变体标签、视觉破损或占位符。
2. **深入。** 对于每个 (a) 在 `.render-check.json` 中被标记（`bad`、`thin`、`hasPlaceholder` 或 `variantsIdentical` 为 true）、(b) 在扫视中看起来不对，或 (c) **任何**组件（如果步骤 1 未找到 json）的组件：读取其单独的 `_screenshots/<group>__<Name>.png` —— 绝不要从拼图缩略图判断，绝不要抽样。如果它已经看起来正确（Divider 只是一条线；Icon 只是一个字形），则跳过 —— `thin` 是提示，不是判决。否则读取 `<Name>.d.ts` 并编写 `cfg.previewArgs.<Name>` 条目（简单扁平 props），或对于需要组合子元素或内联夹具数据的复合组件，打开 `.design-sync/previews/<Name>.tsx`，编辑 JSX，并删除其首行 `// @ds-preview generated` 标记，以便转换器保留你的编辑。`hasPlaceholder: true` 意味着生成的虚线框占位符正在显示 —— 用真实内容编辑 `.tsx`。`blank: true`（PNG <5KB）通常意味着自动生成的 JSX 未合成任何有用内容；`errs > 0` 带有 context/provider 消息 → 参见 §故障排除。如果构建日志显示 `(preview: <Name> — N renderSource(s) reference undeclared …)`，说明 story 的 JSX 引用了 story 文件本地的夹具数据 —— 将该数据内联到 `.tsx` 中。
   **选择 `cfg.previewArgs` 还是编辑 `.tsx`：** `previewArgs` 用于扁平的 JSON 可序列化 props —— 它在生成的 `.tsx` 中呈现为一个额外的 `Preview` 导出。对于组合子元素（`<Tabs><Tab/><Tab/></Tabs>`）、夹具数据或任何需要真正 JSX 的内容，直接编辑 `.design-sync/previews/<Name>.tsx` 并删除其标记行；`previewArgs` 无法表达这些。如果 `firstErr` 是 TypeScript 错误（`Property '…' is missing`、`Type '…' is not assignable`），修复在 `.tsx` 中 —— 生成的 JSX 具有错误的 prop 形状。
3. 重新运行 `package-build.mjs` 然后 `package-validate.mjs`。只有你编辑了 `.tsx`（标记已删除 → 保留）或添加了 `previewArgs` 的组件会改变；带有标记的文件会被重新生成。
4. 重复直到 `bad` 集合为空或达到 3 次迭代。
5. 最终遍次后，调用 `DesignSync({method: 'report_validate', counts: {total, bad, thin, variantsIdentical, iterations}})`，使用来自 `.render-check.json` 的汇总数据（`total` = 条目数；`bad`/`thin`/`variantsIdentical` = 为 true 的计数；`iterations` = 你运行的重建遍数）。
6. 如果 validate 输出了 `[FONT_MISSING]`：在交互式会话中，使用 `AskUserQuestion` 询问是通过 `cfg.extraFonts` 接入字体家族（并重建）还是接受系统字体替代。如果是 headless 模式，在最终摘要中注明并继续。

步骤 1–5 是 §5 的门禁 —— 在它们完成之前不要进入 `finalize_plan`/上传。

**给用户的最终输出**："N/M 个预览渲染正常；X 个通过 previewArgs 修复；Y 个仍需关注：[名称]；已审查 Y/Y 个标记的预览 + S 张拼图。" 对于 Y，Read 并附加 PNG 图片，以便用户可以看到问题所在。

自动生成的预览使用每个组件的最佳可用源（CSF3 render-fn JSX → story args → `cfg.previewArgs` → `.d.ts` 变体网格 → namespace 存根 → 默认）。复合/浮层组件可能确实需要 `cfg.previewArgs` 或手动编辑的 `.tsx` —— 这是预期行为，不是转换器 bug。

同时确认：
- `components:` 计数与你在 §2 中与用户确认的一致。不足 → §故障排除（`componentSrcMap`）。
- 在任何预览的浏览器控制台中（`npx serve ds-bundle`），`Object.keys(window.<globalName>)` 列出每个导出的组件。

## 5. 上传

仅在转换器完全完成且 `package-validate.mjs` 以 0 退出后才上传 —— 运行中的快照会产生带有悬空引用的 bundle。

在 **DS 项目根目录**上传 —— 自检期望 `_ds_bundle.js`、`styles.css`、`components/`、`tokens/`、`fonts/` 和 `README.md` 位于顶层。

创建一个空的 `./ds-bundle/_ds_needs_recompile`（例如 `touch ds-bundle/_ds_needs_recompile`）。

`DesignSync(finalize_plan)`，使用 `localDir: "./ds-bundle"`、`writes: ["components/**", "tokens/**", "fonts/**", "_vendor/**", "_preview/**", "guidelines/**", "_ds_bundle.js", "_ds_bundle.css", "styles.css", "README.md", "_ds_needs_recompile"]`（转换器的输出集加上重新编译哨兵），以及 `deletes: []`（必填，即使为空）。以点号开头的根条目（`.ds-build-meta.json`、`.ds-bundle`、`.pkg-entry.mjs`、`.bundle-entry.mjs`、`.sb-static/`）和 `_screenshots/` 是构建产物，保留在本地。`_vendor/` 需要上传（预览卡片从中加载 React）。仅当 `cfg.demo` 设置时才添加 `"demo.html"`。

`finalize_plan` 向用户显示交互式批准提示。**如果被拒绝，停止** —— 不要用不同的 `localDir`/`writes` 值重试；拒绝意味着会话无法批准，而不是参数错误。bundle 已在 §4 验证；报告 `ds-bundle/` 路径并让用户交互式运行上传。

作为计划批准后的**第一个**写入，`DesignSync(write_files, [{path: "_ds_needs_recompile", localPath: "_ds_needs_recompile"}])` —— 这在上传进行中隔离应用的 manifest/复制机制，因此消费者永远不会看到半上传状态。然后对匹配计划的每个其他文件执行 `DesignSync(write_files)`，逐字保留相对于根的路径。该工具每次调用上限为 256 个文件，因此列出文件树，分成 ≤256 个文件的批次，并在同一 `planId` 下发出多个 `write_files` 调用。所有其他上传完成后，再次写入哨兵 —— `DesignSync(write_files, [{path: "_ds_needs_recompile", localPath: "_ds_needs_recompile"}])` —— 以在项目在上传中被打开时重新激活重新编译。`DesignSync(list_files)` 确认计数匹配。每个 `<Name>.html` 携带首行 `<!-- @dsCard group="…" -->` 注释，claude.ai/design 应用的自检读取它以注册卡片。

完成后，告诉用户：项目 URL（`https://claude.ai/design/p/<projectId>`）、组件数量、上传的文件数，以及 `package-validate.mjs` 干净退出。**将 `design-sync.config.json`、`.design-sync/NOTES.md` 和任何 `.design-sync/lib/` 覆盖提交到仓库**，以便未来的运行重用你在验证循环中添加的 `previewArgs`/`dtsPropsFor`/`libOverrides` 和笔记。

## 6. 自检（服务端）

上传后你就完成了。应用的自检在项目打开时触发（你写入的 `_ds_needs_recompile` 哨兵触发它），因此 DS 面板在几秒内填充。自检读取每个 `<Name>.d.ts` 作为组件的 API 契约（`<Name>Props` 接口是设计代理看到的），从每个 `<Name>.html` 读取 `@dsCard` 行以注册预览卡片，从上传的源重新生成 adherence 配置和 `ds_manifest`，并清除哨兵。

## 工作原理

两条独立的构建路径：

**可导入的 bundle**（根 `_ds_bundle.js`）：esbuild 获取包的已发布 `dist/` 入口 → 一个 IIFE，将每个导出赋值给 `window.<globalName>`，带有首行 `/* @ds-bundle: {…} */` 头，应用的自检读取它。其 CSS 附属文件（`_ds_bundle.css`）加上抓取的 token/字体通过一个 `@import` 它们的根 `styles.css` 连接。这是 claude.ai/design 代理实际导入和构建的内容。独立于 Storybook；适用于每个 DS。

转换器**不**生成 adherence 配置、`ds_manifest`、版本文件或 barrel `index.js` —— 应用的自检从上传的源重新生成这些。

**范围**：React 设计系统。`_ds_bundle.js` 和预览都通过 React 渲染 —— 非 React DS 没有可供 claude.ai/design 代理构建的内容。

**检查方式**：`npx serve ds-bundle` 并打开任何 `<Name>.html`。

## 故障排除

**预览显示"context"或"provider"错误**（例如 "No <X> context"、"use<Hook> must be inside <Provider>"）→ DS 需要 provider 包装器。**在首次构建时保持 `cfg.provider` 未设置** —— storybook 形态的 DS 会自动应用 `.storybook/preview.*` 装饰器（打包到 `_vendor/preview-decorators.js`），设置 `cfg.provider` 会跳过它。检查构建日志中的 `preview-decorators.js: bundled`（已运行）或 `decorator auto-detect skipped`（为何未运行）。仅当 `[RENDER]`/`[RENDER_ERRORS]` context 错误在自动装饰器遍历后仍然存在，或它是 package 形态的 DS 时，才设置 `cfg.provider`。对于链式包装，通过 `inner` 嵌套：
```json
{"provider": {"component": "ThemeProvider", "props": {"theme": {}}, "inner": {"component": "RouterProvider"}}}
```
查找名为 `*Provider` 或 `Theme` 的导出，或检查 DS 自身文档中的"将你的应用包裹在"相关内容。`component` 可以是指向 DS 导出的点号路径（例如 `"<ExportedContext>.Provider"`）。


**输出缺失或组件错误？** `grep ASSUMPTION lib/*.mjs` —— 每行命名了覆盖该启发式的 `cfg.*` 字段。将覆盖添加到 `design-sync.config.json` 并重新运行。`componentSrcMap` 覆盖大多数情况：`{"Portal": null}` 排除一个导出的内部组件；`{"TextInput": "src/forms/text-input/index.tsx"}` 固定模糊查找遗漏的源路径。

**大型 DS 的渲染检查：** `package-validate.mjs` 默认截图每个预览。对于非常大的 DS（200+ 组件），如果太慢，传入 `--render-sample N` 以按确定性步长检查 N 个。

**为此仓库 fork lib 脚本：** 当没有配置覆盖适用时，将特定的适配器复制到 `.design-sync/lib/<name>.mjs`（例如 `.design-sync/lib/dts.mjs`）并在那里编辑。`package-build.mjs` 首先检查 `.design-sync/lib/`，并在使用 fork 时记录 `[OVERRIDE]`。添加头部注释 `// forked from design-sync lib/<name>.mjs — <一行原因>`，将相同的原因添加到 `cfg.libOverrides`（例如 `"libOverrides": {"dts.mjs": "VariantProps intersection pattern"}`），并随 `design-sync.config.json` 一起提交两者，以便重新同步可复现。fork 自身的 `import './common.mjs'` 在 `.design-sync/lib/` 下解析，因此也要（不做更改地）复制该 fork 导入的任何同级 lib 文件。重新同步时，将 `.design-sync/lib/<name>.mjs` 与打包的 `lib/<name>.mjs` 进行 diff，并提供合并上游更改的选项。`lib/emit.mjs` 和 `lib/bundle.mjs` 定义了与应用自检的输出契约 —— 不要 fork 这些；改用配置覆盖或 `cfg.dtsPropsFor`。

**已知限制：**
- `.d.ts` props 通过 TypeScript 检查器（ts-morph）解析 —— 泛型、`extends` 链、交叉类型和类型别名解析为其结构形状；React 和 CSS-in-JS 样式系统 props 被过滤。上游类型 bug 会原样传播。
- 预览从 `window.<NS>.<Name>` 渲染，使用 story args，而非 Storybook 的 `iframe.html` —— MSW 处理器和 addon 转换不会被应用；`.storybook/preview.*` 装饰器会尽力自动打包。
- Story args 来自 `.args` —— 带有 `render` 函数的 CSF3 story 具有空 args，并使用智能脚手架。
- 组件从 context 读取的 provider（主题、路由、i18n）必须在 `cfg.provider` 中或从装饰器自动检测，否则预览渲染为空白。
- 仅 token 的 DS（无组件）：仅生成 `styles.css`，带有一个空体的 `_ds_bundle.js`。

## 这不是什么

不是 LLM 重写组件。客户实际发布的代码是真相来源；转换器确定性打包并以客户自己的 Storybook 配置渲染。你（代理）做的是发现、配置和自愈尾部 —— 绝不是组件创作。
