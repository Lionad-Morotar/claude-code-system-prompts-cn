<!--
name: 'Skill: /design-sync Storybook 源形状'
description: 针对 /design-sync 的形状特定指令，用于从 Storybook stories 和构建后的包输出同步 React 设计系统
ccVersion: 2.1.162
-->
# Storybook 源形状

发现 `.storybook/` —— 组件列表和 story args 来自 `storybook-static/index.json`。运行 `npm run build-storybook`（如果你已有构建好的版本，也可以传入 `--storybook-config <dir>` / `--storybook-static <dir>`）。

## 2. 探索，然后编写配置（续）

3. 转换器需要构建后的 `dist/` 入口及其 `.d.ts` 树。检查入口（来自 `package.json` 的 `module`/`main`/`exports['.']`）是否已存在 —— 安装时可能已通过 `prepare` 构建。如果缺失：
   - 运行 `<pm> run build`。如果没有 `build` 脚本 → 尝试 `prepare`/`prepack`。在 monorepo 中，构建可能在仓库根目录（`turbo build --filter=<pkg>`、`pnpm -F <pkg> build`、`nx build <pkg>`）。**部分构建脚本会 fork 一个 watcher 并提前以 0 退出 —— 命令返回后，`ls` 检查预期的输出（dist/、build/esm/ 或 `package.json` 的 `module`/`main` 指向的任何目录），确认其内容已填充后再继续。** 如果为空，检查脚本中是否有 `--watch` 标志并使用一次性变体，或轮询输出目录。
   - 仍然缺失 → `AskUserQuestion`（"哪个命令用于构建此包？"，选项包括所有包含 `tsc|tsup|rollup|vite build|esbuild|swc` 的 `scripts.*`，加上自由输入）。将答案记录为配置中的 `buildCmd`。
   - 用户表示没有构建 → 转换器将从 `src/` 合成一个入口（最后手段 —— `.d.ts` 合约会更弱；建议添加构建步骤）。
4. **检查项目中已有的内容。** 对目标执行 `DesignSync(list_files)`。如果它返回文件，通过 `DesignSync(get_file)` 读取 `_ds_bundle.js`，并记下其第一行 `/* @ds-bundle: {…} */` 头中的组件名称 —— 但**始终仍然重新构建**（步骤 7）；现有包在源文件变更的那一刻就已经过时。头中的 `sourceHashes` diff 决定了通过 `DesignSync` *增量上传*的内容，而不是构建内容。
5. **在构建前与用户确认计划。** `AskUserQuestion` 包含：你找到的组件列表（或数量 + 几个名称，如果列表较长）、tokens/CSS 来自哪些文件、以及你将运行哪个构建命令。构建可能需要几分钟并消耗大量 token —— 现在对齐可以避免因指向错误的包或遗漏一半组件而重新运行。
   - 如果项目已有 N 个组件（步骤 4），将其包含在问题中并提供范围选项：**(a)** 完全重建 + 重新上传所有内容，**(b)** 仅更新已变更的组件（根据 `sourceHashes` 的 diff），**(c)** 仅 tokens + CSS（不重建组件）。当 diff 较小时默认选择 (b)。
6. **编写 `design-sync.config.json` 并提交** —— 重新同步时会复用它，使输出可重现。只有 `pkg` 和 `globalName` 是必需的。**如果文件已存在，先读取它并保留 `previewArgs`、`dtsPropsFor`、`libOverrides` 和 `overrides` —— 只能向这些字段添加内容，绝不能替换。** 它们累积了之前验证循环迭代中的修复。**在任何其他操作之前，也要读取 `.design-sync/NOTES.md`（或 `cfg.notes` 指向的任何文件）** —— 它包含先前同步记录的本仓库特定陷阱。

   | 字段 | 值 |
   |---|---|
   | `pkg` / `globalName` | 包名和要赋值的 `window.*` 全局变量 —— 必需 |
   | `shape` | `'storybook'` 或 `'package'` —— 固定源形状（覆盖自动检测）。首次运行时写入。 |
   | `storybookConfigDir` | 当 `.storybook/` 目录在包外部时的路径（相对于此配置文件）—— 例如 monorepo 中的中央 `apps/storybook/.storybook` |
   | `storybookStatic` | 指向已预先构建的 `storybook-static/` 目录的路径（如果你已经运行过 `build-storybook`） |
   | `titleMap` | `{storyTitle: ComponentName}` —— 当 Storybook story 标题与组件导出名称不匹配时进行映射（参见 `[TITLE_UNMAPPED]`） |
   | `buildCmd` | 发现的构建命令；重新同步时重新运行它 |
   | `tsconfig` | 指向 `tsconfig.json` 的路径 —— esbuild 读取 `compilerOptions.paths`，以便在合成入口模式下解析 `@/…` 路径别名 |
   | `extraEntries` | 要与 DS 入口一起合并到 `window.<globalName>` 的包名（例如 DS 的独立图标包）。同一 scope 下的同级图标包会被自动检测（`[ICON_PKG]`）。 |
   | `componentSrcMap` | **稀疏的** `{Name: path}` —— 非 null 值固定/添加组件的源路径；`null` 排除一个 `.d.ts` 导出的内部组件 |
   | `dtsPropsFor` | `{Name: "prop?: Type; …"}` —— 当自动提取失败时（复杂泛型、跨包类型），手写 `<Name>Props` 体 |
   | `previewArgs` | `{Name: {prop: value, …}}` —— 在自动生成的 `.design-sync/previews/<Name>.tsx` 中渲染为 `Preview` 导出的 props。用于简单的扁平 props；对于组合 JSX 子元素，直接编辑 `.tsx`。 |
   | `cssEntry` / `tokensPkg` / `tokensGlob` | 样式表 + token 文件 |
   | `docsDir` | 包含每个组件 `.md`/`.mdx` 文档的目录（相对于包；可以指向外部，例如 `../../apps/docs`）。自动检测为包下的 `docs/` 或 `documentation/`。 |
   | `docsMap` | 稀疏的 `{Name: path \| null}` —— 每个组件的显式文档路径（覆盖自动发现）；`null` 排除 |
   | `guidelinesGlob` | 字符串或字符串数组（相对于包），指定要复制到 `guidelines/` 的设计指南 `.md` 文件。默认 `['docs/guides/**/*.md', 'docs/*.md', 'guides/**/*.md']`。 |
   | `extraFonts` | 指向 `@font-face` `.css` 文件或裸 `.woff2`/`.ttf`/`.otf` 的路径（相对于包；可以指向包外部，例如同级的 typography 包），用于 DS 期望其宿主应用提供的品牌字体族。CSS 条目会被解析，其本地字体文件会被复制到 `fonts/`；裸字体文件按原样复制。当 validate 输出 `[FONT_MISSING]` 时使用。 |
   | `runtimeFontPrefixes` | 字符串数组 —— 宿主应用在运行时通过字体服务（通过 `<script>` 或 JS 加载器，因此没有要打包的 `@font-face`）提供的字体族名称前缀。抑制匹配字体族的 `[FONT_MISSING]`。当品牌字体不应随包一起分发时使用。 |
   | `replaces` | `{<raw-element>: [<ComponentName>, …]}` —— 扩展 adherence-config 的原始元素映射 |
   | `libOverrides` | `{"<name>.mjs": "<单行原因>"}` —— 声明此仓库 fork 了哪些 `.design-sync/lib/*.mjs` 文件及其原因（参见§故障排除）。在构建时进行交叉检查。 |
   | `notes` | 指向 markdown 笔记文件的路径 —— 默认 `"./.design-sync/NOTES.md"`。 |

   **`.design-sync/NOTES.md`** 是存放仓库特定怪癖的地方（工作区构建顺序、不稳定的 stories、奇怪的入口路径，以及将来重新同步时需要了解的任何内容）。将其写为多行 markdown —— 每个陷阱一个项目符号。**在验证循环中每次学到新东西时都追加到其中**，并与配置一起提交。

7. **运行转换器。** 对于大型设计系统（200+ 组件），ts-morph 的 `.d.ts` 解析可能需要几分钟 —— stderr 上的 `[DTS]` 进度行表明它正在运行。

```bash
# 转换器随 skill 目录一起分发 —— 暂存整个集合。如果 `cp` 被
# 权限拒绝，通过 `cat` 写入：`cat "<src>" > ./lib/<name>.mjs`。
cp -r "<skill-base-dir>"/package-build.mjs "<skill-base-dir>"/package-validate.mjs "<skill-base-dir>"/lib .
npm i --no-save esbuild ts-morph @types/react   # 如果此仓库使用 pnpm，请参见下方的 pnpm 注意事项
node package-build.mjs --config design-sync.config.json --node-modules ./node_modules \
  --entry ./dist/index.es.js --out ./ds-bundle
node package-validate.mjs ./ds-bundle
```

将 `package-build.mjs` 和 `package-validate.mjs` 作为单独的命令运行并检查每个的退出码 —— 在后台链式运行的 `build && validate` 当构建步骤失败时以非零退出，但没有可见日志。**在 headless / `-p` 会话中，同步运行两者**（不要使用 `run_in_background`）—— headless 模式下没有任务通知重新调用，因此后台运行永远不会被恢复。在交互式会话中，后台运行构建是可以的。

在 DS 自己的仓库中，`node_modules/<pkg>` 通常不存在（npm 不会自安装），因此需要 `--entry`。

**在 pnpm 仓库上使用 esbuild/ts-morph：** `npm i --no-save esbuild ts-morph` 在 pnpm 管理的 `node_modules` 上可能失败或保持未提升状态（转换器的导入将无法解析）。如果是这样，将其安装在 pnpm 可以看到的地方（`pnpm add -D esbuild ts-morph @types/react`）或将转换器的解析目标从 `$(pnpm root)/.pnpm/` 创建符号链接。

`@types/react` 是 props 提取所必需的 —— 没有它，`React.ComponentPropsWithoutRef<…>` 和类似的工具类型会解析为 `any`，生成的 `<Name>.d.ts` 会丢失继承的 props（转换器输出 `[DTS_REACT]`）。

如果构建 monorepo 很复杂，可以在临时目录中执行 `npm install <your-pkg>@latest react react-dom` 并传入 `--node-modules <临时目录>/node_modules` —— 使用已发布的 dist 和平坦化的依赖。

## 源形状

两种形状，相同输出。**storybook** 当发现 `.storybook/` 时（组件列表 + story args 来自 `storybook-static/index.json`）；**package** 否则（打包 `dist/`，在存在时从 `src/` 丰富每个组件 —— JSDoc、分组、同级的 `*.stories.tsx` args）。无论哪种方式，预览都从 `_ds_bundle.js` 自包含渲染；没有 story args 的组件会获得一个脚手架。

## 转换器输出的内容

每个组件，在 `components/<group>/<Name>/` 下：`<Name>.jsx`（单行重新导出存根）、`<Name>.d.ts`（来自已发布类型的 props 接口）、`<Name>.prompt.md` 和 `<Name>.html`（预览卡片）。你不用编写这些 —— 转换器会处理。

`<Name>.prompt.md` 是匹配的每个组件文档（存在时：同级的 `<Name>.md`/`.mdx` → `cfg.docsDir` 查找 → `<Name>.stories.mdx`；frontmatter 的 `category` 设置组件的 `<group>`）。否则，它从 `.d.ts` props 体、前导 JSDoc 和 `.design-sync/previews/<Name>.tsx` 中的任何示例合成 —— 严格来说比之前的存根更丰富。`[DOCS_UNMAPPED]` 列出未匹配的组件。

`<Name>.html` 通过编译后的 `.design-sync/previews/<Name>.tsx`（每个命名导出 = 一个带标签的单元格）从 `window.<GLOBAL>.<Name>` 渲染组件。当该文件的构建失败时，它会回退到旧的 story-grid / `.d.ts` 脚手架路径。**需要组合子元素的结构/复合组件**：编辑 `.design-sync/previews/<Name>.tsx`（真实的 JSX，带 DS 导入）并删除其第一行标记 —— 这才是修复方法，而不是"预期为空白"。对 `.html` 的手动编辑在重建时会被覆盖。

**`.design-sync/previews/`**：每个组件一个 `<Name>.tsx`，每次运行从最佳可用源自动生成（CSF3 render-fn JSX → story args → `cfg.previewArgs` → `.d.ts` 变体网格 → 命名空间存根 → 默认）。第一行是 `// @ds-preview generated <sha12> — …`；sha12 是其下方正文的哈希值。当标记存在且哈希匹配时，文件会被重新生成；删除标记以接管所有权，转换器将不再触碰它（日志显示 `(preview override: <Name>)`）。如果你编辑了正文但保留了标记，转换器会警告 `(preview edited under marker: <Name>)` 并跳过 —— 删除第 1 行以保留你的编辑，或删除文件以重新生成。与 `design-sync.config.json`、`.design-sync/NOTES.md` 和 `.design-sync/lib/` 一起提交。

## 3. 自愈循环

`package-validate.mjs` 在 stderr 上输出带有 `[TAG]` 前缀的诊断信息。对于每个错误：在此表中匹配标签 → 应用修复 → 重建 → 重新验证。重复直到它以 0 退出。少数确实无法静态渲染的 stories（交互驱动的、数据获取的）放入 `cfg.overrides.<Component>.skip`（内联在 `design-sync.config.json` 中，或者 `cfg.overrides` 可以是指向单独 JSON 文件的路径）。

| 标签 | 症状 | 修复 |
|---|---|---|
| `[NO_DIST]` | `entry <path> doesn't exist` | DS 包未构建。运行其构建脚本（`npm run build` / `turbo run build`），或使用上述已发布 dist 的替代方案。 |
| `[SB_BUILD_FAIL]` | `npx storybook build` 以非零退出 | 修复底层的 Storybook 构建错误（在上方记录），或自行运行 `npm run build-storybook` 并传入 `--storybook-static <dir>`。 |
| `[WORKSPACE_SIBLING]` | 打包期间 `Could not resolve "<sibling>"` | 工作区同级包未构建。构建它（`turbo build`），或将已发布版本 `npm install` 到临时目录。 |
| `[MULTI_STORYBOOK]` | 转换器选择了错误的 `.storybook/` 目录 | 传入 `--storybook-config <react-pkg>/.storybook`。 |
| `[TITLE_UNMAPPED]` | N 个 storybook 标题不匹配包导出 | story 标题的最后一段不是组件的导出名称（例如 `Notifications/Toast` vs 导出 `ToastNotification`）。在配置中添加 `"titleMap": {"Toast": "ToastNotification"}`。注意：`titleMap` 的键是*派生*名称，因此无法消除两个派生为相同名称的标题的歧义（例如 `Components/Button` 和 `Components/ListItem/Button` 都 → `Button`）；第二个会静默合并到第一个中。如果需要两者作为不同的组件，请在源中重命名其中一个 story 的标题。 |
| `[CONFIG]` | `<path>: <json error>` | `design-sync.config.json` 缺失或 JSON 格式错误。修复语法。 |
| `[ZERO_MATCH]` | 未发现组件 | `storybook-static/index.json` 没有 story 条目（检查 storybook 配置的 `stories` glob）。 |
| `[OUT_UNSAFE]` | `refusing to rm <path>` | `--out` 指向 `/`、`$HOME`、cwd 或一个非空且不是先前包的目录。将 `--out` 指向一个空目录。 |
| `[UNRESOLVED_IMPORT]` | `<pkg> missing from node_modules` | DS 导入的依赖未安装。运行仓库的安装（步骤 2.1）或添加该包。 |
| `[DSCARD_MISSING]` | `<path>: first line isn't a @dsCard comment` | 预览的第一行必须是 `<!-- @dsCard group="…" -->`，DS 面板才能注册它。通常是本地的 `lib/emit.mjs` 编辑丢失了头部 —— 恢复它，或重新运行转换器。 |
| `[LINK_HREF_MISSING]` | `<path>: <link href="…"> doesn't resolve` | 预览的样式表路径无法相对于文件解析（预览不带样式交付）。输出深度不匹配 —— 重新运行转换器；如果你手动编辑了预览，修复 `../` 的深度。 |
| `[CSS_IMPORT_MISSING]` | `styles.css @imports "…" which doesn't exist` | `styles.css` 引用的某个抓取的 CSS 文件不在磁盘上。检查 `cfg.cssEntry` / `cfg.tokensGlob` 指向存在的文件，并重新运行。 |
| `[PROMPT_EMPTY]` | `<path>: first line is empty` | `.prompt.md` 的第一行是设计代理读取的元素索引摘要。重新运行转换器；如果仍然为空，该组件没有 JSDoc —— 在其源中添加一个。 |
| `[CSS_ASSETS]` | `N relative url() ref(s) in the fallback CSS won't resolve post-upload` | 仅供参考。storybook-static CSS 回退引用了（未上传的）storybook 构建目录下的资源。字体会单独复制；背景图片会 404，但类规则仍然适用。如果图片很重要，将 `cfg.cssEntry` 设置为一个自包含的样式表。 |
| `[RENDER]` | `<path>: root empty` | 一个 `<Name>.html` 在 headless chromium 中没有渲染。检查 `.render-check.json` 中的 `firstErr`；通常是组件读取的 provider/context 不在 `cfg.provider` 中。如果是数据获取或纯交互式的 story，将其添加到 `cfg.overrides.<Component>.skip`。 |
| `[RENDER_ERRORS]` | `<path>: <first pageerror>` | 仅供参考 —— 预览已渲染（根元素非空），但抛出了 `pageerror`。通常是组件读取的 provider/context 不在 `cfg.provider` 中（参见§故障排除）。除非同时触发了 `[RENDER]`，否则不阻塞。 |
| `[RENDER_BLANK]` | `<path>: renders but PNG is <5KB` | 预览已渲染（无错误），但截图实际上是空白的 —— 自动生成的 JSX 没有产生可见内容。添加 `cfg.previewArgs.<Name>` 并填入有代表性的 props（参见 `<Name>.d.ts`）；对于需要组合子元素的复合组件，直接编辑 `.design-sync/previews/<Name>.tsx` 并删除其第一行标记。 |
| `[RENDER_THIN]` | `mounted text is just "<Name>"` / `variants render identically` | 预览已渲染但只显示占位文本，或每个变体看起来都一样。与 `[RENDER_BLANK]` 相同的修复方法。 |
| `[CSS_FROM_STORYBOOK]` | `_ds_bundle.css` 是仅含 `@import` 的存根 | 仅供参考 —— 转换器回退到 storybook-static 的编译 CSS。对于 utility-CSS 或 CSS-in-JS 设计系统很常见。无需操作，除非回退 CSS 不正确；此时显式设置 `cfg.cssEntry`。 |
| `[CSS_PLACEHOLDER]` | 存根 CSS 且未找到 storybook 回退 | 将 `cfg.cssEntry` 设置为编译后的样式表（查找 `dist/` 下最大的 `.css` 文件，或包自身文档指示导入的位置）。 |
| `[TOKENS_MISSING]` | `N CSS custom properties referenced but not defined` | 不阻塞。组件 CSS 使用了 `var(--token-*)` 但没有已发布的样式表定义它们 —— 通常 DS 将 tokens 放在同级包中。将 `cfg.tokensPkg` 设置为该包（检查构建日志中的 `[TOKENS_PKG]` —— 同一 scope 下的 `*tokens*`/`*theme*` 依赖会被自动检测）。如果 tokens 是在运行时由主题 provider 注入而非通过样式表，则改为设置 `cfg.provider`。 |
| `[CSS_RUNTIME]` | 在任何地方都未找到静态 CSS；写入了自样式化的 `styles.css` | 仅供参考，**不阻塞**（`validate` 仍然以 0 退出）。对于在运行时注入样式的 CSS-in-JS 设计系统来说是预期的 —— 包是自样式化的。确认渲染检查通过。**仅当** DS 实际上发布了抓取遗漏的样式表时：将 `cfg.cssEntry` 设置为它。如果 DS 依赖 `.storybook/preview-head.html` 中声明的远程 webfont，转换器现在会自动将其捕获为 `@import url(...)`；任何其他全局内容你可以编写到一个小的 CSS 文件中并将 `cfg.cssEntry` 指向它。 |
| `[FONT_MISSING]` | 已发布 CSS 引用的字体族没有配套的 `@font-face` | 不阻塞。DS 引用了它期望宿主应用提供的品牌字体族（通常通过字体 tokens）。将 `cfg.extraFonts` 设置为 `@font-face` css / woff2（通常是同级的 typography 包）并重建，或接受替代字体 —— DS 面板将使用系统字体渲染这些组件。 |
| `[DOCS_UNMAPPED]` | `<Name>` —— 未找到每个组件的文档文件 | 仅供参考。将 `cfg.docsDir` 设置为文档树或将 `cfg.docsMap.<Name>` 设置为文件。未匹配的组件会获得从 `.d.ts` + 预览合成的 `.prompt.md`。 |
| `[FONT_DANGLING]` | 发布了 `@font-face` 规则但其 `url()` 目标文件不在 | 不阻塞。字体文件未被复制到 `fonts/` —— 通常是构建日志中的 `! extraFonts:` / `! cssEntry:` 跳过。修复 `cfg.extraFonts` 路径，或将 woff2 复制到 DS 包下。 |
| — | 图标渲染为空框或缺失 | DS 的图标包不在包中。检查构建日志中的 `[ICON_PKG]`（同一 scope 下的图标包会自动包含）；如果未触发，将图标包名添加到 `cfg.extraEntries`。 |
| — | 组件渲染但没有 CSS | 将 `cfg.cssEntry` 设置为包的样式表。 |
| — | DS 面板中出现"缺少品牌字体"横幅 | 与 `[FONT_MISSING]` 相同的根本原因：包引用了未分发的字体族。如果文件可用且许可证允许，通过 `cfg.extraFonts` 接入它们，或接受替代字体。 |
| — | `! extraFonts: <path> resolves outside the workspace root — skipped` | `extraFonts` 条目被限制在 `dirname(--node-modules)` 内。在 pnpm-workspace / yarn-nohoist 仓库中，`--node-modules` 是每个包的 `node_modules`，同级的 typography 包会超出该边界。变通方法：将 `@font-face` css + woff2 复制到 DS 包下并将 `extraFonts` 指向那里，或使用仓库根目录的 `node_modules` 重新运行（当包管理器允许时）。 |

## 4. 验证预览渲染

`package-validate.mjs` 的 headless 渲染检查（打开每个 `<Name>.html`，在根元素为空时失败）需要 playwright + chromium。**先检查现有的安装** —— `ls ~/.cache/ms-playwright/` 或 `which chromium chromium-headless-shell google-chrome`。如果 chromium 构建已缓存，**安装匹配的 playwright 版本**（目录名是 `chromium-<build>`；`npm view playwright@latest` 很少匹配它 —— 改为检查仓库自身的 `package.json`/lockfile 中是否有固定版本的 `playwright`/`@playwright/test`，然后 `npm i -D playwright@<该版本>`）。不匹配的 playwright↔chromium 会导致 `browserType.launch: Executable doesn't exist`。

**如果未找到，在安装任何东西之前 `AskUserQuestion`**：
> "为了自动化预览验证，我需要安装 playwright + chromium（约 200MB）。选项：(a) 可以安装，(b) 跳过 —— 我会在自己的浏览器中打开预览，(c) 完全跳过验证。"

- **(a) 可以** → `npm i -D playwright && npx playwright install chromium`。如果安装失败（CDN 被阻止、版本不匹配），回退到 (b)。
- **(b) 我会打开** → `npx serve ds-bundle`，列出 5-8 个预览路径（混合简单、复合、浮层组件）供用户打开。询问哪些看起来空白或有问题；根据其描述为每个添加 `cfg.previewArgs.<Name>` 条目并重新运行。
- **(c) 完全跳过** → 使用智能脚手架默认值交付。在你的最终输出中注明预览未经可视化验证。

> **当后台运行长时间命令时**（playwright 安装、构建、服务器）：使用 `PID=$!` 捕获其 PID 并用 `kill -0 "$PID"` 轮询。不要使用 `pgrep -f '<command string>'` —— pgrep 调用本身会匹配自己的参数，导致循环永不退出。

有了 playwright（现有的或已安装的），**`package-validate.mjs` 会为每个预览截图**到 `ds-bundle/_screenshots/<group>__<Name>.png`，并将每个组件的状态写入 `ds-bundle/.render-check.json`（`[{name, group, errs, firstErr, pngBytes, blank, rootEmpty, thin, nameOnly, allHollow, collapsed, hasPlaceholder, maxHeight, variantsIdentical, bad, texts}]`）。读取 `.render-check.json` 并：

1. **浏览。** 读取 `_screenshots/contact-sheets.json`。如果缺失，说明概览表步骤未完成 —— 转到步骤 2。否则，读取它列出的每个 `_screenshots/contact-sheet-N.png`（每个拼贴约 16 个带标签的预览）；注意任何看起来不对的缩略图 —— 仅显示名称、空变体标签、视觉上损坏或占位符。
2. **深入。** 对于每个 (a) 在 `.render-check.json` 中被标记的组件（`bad`、`thin`、`hasPlaceholder` 或 `variantsIdentical` 为 true），(b) 在浏览中看起来有问题，或 (c) **任何**组件（如果步骤 1 未找到 json）：读取其单独的 `_screenshots/<group>__<Name>.png` —— 永远不要从概览表缩略图判断，不要抽样。如果它看起来已经正确（Divider 只是一条线；Icon 只是一个字形），就继续 —— `thin` 是提示，不是定论。否则，读取 `<Name>.d.ts` 并编写 `cfg.previewArgs.<Name>` 条目（简单的扁平 props），或者对于需要组合子元素或内联 fixture 数据的复合组件，打开 `.design-sync/previews/<Name>.tsx`，编辑 JSX，并删除其第一行的 `// @ds-preview generated` 标记，以便转换器保留你的编辑。`hasPlaceholder: true` 意味着显示的是生成的虚线框占位符 —— 用真实内容编辑 `.tsx`。`blank: true`（PNG <5KB）通常意味着自动生成的 JSX 没有合成出有用的内容；`errs > 0` 带有 context/provider 消息 → 参见§故障排除。如果构建日志显示 `(preview: <Name> — N renderSource(s) reference undeclared …)`，说明 story 的 JSX 闭包引用了 story 文件局部的 fixtures —— 将该数据内联到 `.tsx` 中。
   **选择 `cfg.previewArgs` 还是编辑 `.tsx`：** `previewArgs` 用于扁平 JSON 可序列化的 props —— 它在生成的 `.tsx` 中表现为一个额外的 `Preview` 导出。对于组合子元素（`<Tabs><Tab/><Tab/></Tabs>`）、fixture 数据或任何需要真实 JSX 的内容，直接编辑 `.design-sync/previews/<Name>.tsx` 并删除其标记行；`previewArgs` 无法表达这些。如果 `firstErr` 是 TypeScript 错误（`Property '…' is missing`、`Type '…' is not assignable`），修复在 `.tsx` 中 —— 生成的 JSX 具有错误的 prop 形状。
3. 重新运行 `package-build.mjs` 然后 `package-validate.mjs`。只有你编辑了 `.tsx`（标记已删除 → 保留）或添加了 `previewArgs` 的组件会变化；带有标记的文件会被重新生成。
4. 重复直到 `bad` 集合为空或达到 3 次迭代。
5. 在最终通过后，调用 `DesignSync({method: 'report_validate', counts: {total, bad, thin, variantsIdentical, iterations}})`，使用 `.render-check.json` 中的汇总数据（`total` = 条目数；`bad`/`thin`/`variantsIdentical` = 为 true 的计数；`iterations` = 你运行的重建次数）。
6. 如果 validate 输出了 `[FONT_MISSING]`：在交互式会话中，`AskUserQuestion` 询问是通过 `cfg.extraFonts` 接入字体族（并重建）还是接受系统字体替代。如果是 headless，在最终摘要中注明并继续。

步骤 1-5 是§5 的门槛 —— 在完成之前不要进入 `finalize_plan`/上传。

**最终输出给用户**："N/M 个预览渲染干净；X 个通过 previewArgs 修复；Y 个仍需关注：[名称]；已审查 Y/Y 个标记的预览 + S 张概览表。" 对于 Y，读取并附加 PNG 以便用户看到问题所在。

自动生成的预览使用每个组件的最佳可用源（CSF3 render-fn JSX → story args → `cfg.previewArgs` → `.d.ts` 变体网格 → 命名空间存根 → 默认）。复合/浮层组件可能确实需要 `cfg.previewArgs` 或手动编辑的 `.tsx` —— 这是预期行为，不是转换器 bug。

同时确认：
- `components:` 计数与你在§2 中与用户确认的一致。不足 → §故障排除（`componentSrcMap`）。
- 在任何预览的浏览器控制台中（`npx serve ds-bundle`），`Object.keys(window.<globalName>)` 列出每个导出的组件。

## 5. 上传

只有在转换器完全完成且 `package-validate.mjs` 以 0 退出后才上传 —— 运行中的快照会产生带有悬空引用的包。

在 **DS 项目根目录**上传 —— 自检期望在顶层有 `_ds_bundle.js`、`styles.css`、`components/`、`tokens/`、`fonts/` 和 `README.md`。

创建一个空的 `./ds-bundle/_ds_needs_recompile`（例如 `touch ds-bundle/_ds_needs_recompile`）。

`DesignSync(finalize_plan)` 使用 `localDir: "./ds-bundle"`、`writes: ["components/**", "tokens/**", "fonts/**", "_vendor/**", "_preview/**", "guidelines/**", "_ds_bundle.js", "_ds_bundle.css", "styles.css", "README.md", "_ds_needs_recompile"]`（转换器的输出集加上重新编译哨兵），以及 `deletes: []`（必需，即使为空）。点前缀的根条目（`.ds-build-meta.json`、`.ds-bundle`、`.pkg-entry.mjs`、`.bundle-entry.mjs`、`.sb-static/`）和 `_screenshots/` 是构建产物，保留在本地。`_vendor/` 需要上传（预览卡片从中加载 React）。仅在设置了 `cfg.demo` 时添加 `"demo.html"`。

`finalize_plan` 向用户显示交互式审批提示。**如果被拒绝，停止** —— 不要用不同的 `localDir`/`writes` 值重试；拒绝意味着会话无法审批，而不是参数错误。包已在§4 验证；报告 `ds-bundle/` 路径并让用户交互式运行上传。

作为计划批准后的**第一个**写入，`DesignSync(write_files, [{path: "_ds_needs_recompile", localPath: "_ds_needs_recompile"}])` —— 这在上传进行时围栏保护应用的清单/复制机制，使消费者永远不会看到半上传状态。然后对匹配计划的所有其他文件执行 `DesignSync(write_files)`，保持根相对路径逐字不变。该工具每次调用最多 256 个文件，因此列出树、分块为 ≤256 个文件的批次，并在同一个 `planId` 下发出多个 `write_files` 调用。在所有其他上传完成后，再次写入哨兵 —— `DesignSync(write_files, [{path: "_ds_needs_recompile", localPath: "_ds_needs_recompile"}])` —— 以在项目在同步中打开时重新启用重新编译。`DesignSync(list_files)` 确认计数匹配。每个 `<Name>.html` 带有第一行 `<!-- @dsCard group="…" -->` 注释，claude.ai/design 应用的自检读取该注释来注册卡片。

完成后，告诉用户：项目 URL（`https://claude.ai/design/p/<projectId>`）、组件数量、上传的文件数，以及 `package-validate.mjs` 干净退出。**将 `design-sync.config.json`、`.design-sync/NOTES.md` 和任何 `.design-sync/lib/` 覆盖提交到仓库**，以便将来运行时复用你在验证循环中添加的 `previewArgs`/`dtsPropsFor`/`libOverrides` 和笔记。

## 6. 自检（服务端）

上传后你就完成了。应用的自检在项目打开时触发（你写入的 `_ds_needs_recompile` 哨兵触发它），因此 DS 面板在几秒内填充。自检读取每个 `<Name>.d.ts` 作为组件的 API 合约（`<Name>Props` 接口是设计代理看到的内容），从每个 `<Name>.html` 读取 `@dsCard` 行来注册预览卡片，从上传的源重新生成 adherence 配置和 `ds_manifest`，并清除哨兵。

## 工作原理

两个独立的构建路径：

**可导入的包**（根 `_ds_bundle.js`）：esbuild 获取包的已发布 `dist/` 入口 → 一个 IIFE，将每个导出赋值给 `window.<globalName>`，带有第一行 `/* @ds-bundle: {…} */` 头，应用的自检会读取它。其 CSS 附属文件（`_ds_bundle.css`）加上抓取的 tokens/fonts 通过一个根 `styles.css`（用 `@import` 引入它们）连接起来。这就是 claude.ai/design 代理实际导入和构建的内容。独立于 Storybook；适用于每个设计系统。

转换器**不会**输出 adherence 配置、`ds_manifest`、版本文件或 barrel `index.js` —— 应用的自检会从上传的源重新生成这些。

**范围**：React 设计系统。`_ds_bundle.js` 和预览都通过 React 渲染 —— 非 React 设计系统没有可供 claude.ai/design 代理构建的内容。

**要检查**：`npx serve ds-bundle` 并打开任何 `<Name>.html`。

## 故障排除

**预览显示"context"或"provider"错误**（例如 "No <X> context"、"use<Hook> must be inside <Provider>"） → DS 需要 provider 包装器。**首次构建时不要设置 `cfg.provider`** —— storybook 形状的 DS 会自动应用 `.storybook/preview.*` 装饰器（打包到 `_vendor/preview-decorators.js`），设置 `cfg.provider` 会跳过该步骤。检查构建日志中的 `preview-decorators.js: bundled`（已运行）或 `decorator auto-detect skipped`（为什么跳过）。仅在自动装饰器通过后 `[RENDER]`/`[RENDER_ERRORS]` context 错误仍然存在时，或者它是 package 形状的 DS 时，才设置 `cfg.provider`。对于链式嵌套，通过 `inner` 嵌套：
```json
{"provider": {"component": "ThemeProvider", "props": {"theme": {}}, "inner": {"component": "RouterProvider"}}}
```
查找名为 `*Provider` 或 `Theme` 的导出，或检查 DS 自身文档中的"wrap your app in"。`component` 可以是 DS 导出的点分路径（例如 `"<ExportedContext>.Provider"`）。


**输出缺少或包含错误的组件？** `grep ASSUMPTION lib/*.mjs` —— 每行命名覆盖该启发式的 `cfg.*` 字段。将覆盖添加到 `design-sync.config.json` 并重新运行。`componentSrcMap` 覆盖大多数情况：`{"Portal": null}` 排除导出的内部组件；`{"TextInput": "src/forms/text-input/index.tsx"}` 固定模糊查找遗漏的源路径。

**大型设计系统的渲染检查：** 默认情况下 `package-validate.mjs` 会为每个预览截图。对于非常大的设计系统（200+ 组件），如果太慢，传入 `--render-sample N` 以按确定性的步长 N 进行检查。

**为此仓库 fork lib 脚本：** 当没有配置覆盖适用时，将特定适配器复制到 `.design-sync/lib/<name>.mjs`（例如 `.design-sync/lib/dts.mjs`）并在那里编辑。`package-build.mjs` 首先检查 `.design-sync/lib/`，并在使用 fork 时记录 `[OVERRIDE]`。添加头注释 `// forked from design-sync lib/<name>.mjs — <单行原因>`，将相同的原因添加到 `cfg.libOverrides`（例如 `"libOverrides": {"dts.mjs": "VariantProps intersection pattern"}`），并与 `design-sync.config.json` 一起提交两者，使重新同步可重现。fork 自身的 `import './common.mjs'` 在 `.design-sync/lib/` 下解析，因此也要复制（不变的）fork 导入的任何同级 lib 文件。在重新同步时，将 `.design-sync/lib/<name>.mjs` 与捆绑的 `lib/<name>.mjs` 进行 diff，并提供合并上游变更的选项。`lib/emit.mjs` 和 `lib/bundle.mjs` 定义了与应用自检的输出合约 —— 不要 fork 这些；改用配置覆盖或 `cfg.dtsPropsFor`。

**已知限制：**
- `.d.ts` props 通过 TypeScript checker（ts-morph）解析 —— 泛型、`extends` 链、交叉类型和类型别名解析为其结构形状；React 和 CSS-in-JS 样式系统 props 被过滤。上游类型 bug 会原样传播。
- 预览从 `window.<NS>.<Name>` 使用 story args 渲染，而不是 Storybook 的 `iframe.html` —— MSW 处理器和 addon 转换不会被应用；`.storybook/preview.*` 装饰器会尽力自动打包。
- Story args 来自 `.args` —— 带有 `render` 函数的 CSF3 stories 则具有空 args 并使用智能脚手架。
- 组件从 context 读取的 provider（theme、router、i18n）必须在 `cfg.provider` 中或从装饰器自动检测，否则预览渲染为空白。
- 纯 tokens 的 DS（无组件）：仅输出 `styles.css`，附带空体的 `_ds_bundle.js`。

## 这不是什么

不是 LLM 重写组件。客户实际发布的代码是真实来源；转换器确定性打包它并使用客户自己的 Storybook 配置渲染。你（代理）负责发现、配置和自愈尾部 —— 绝不负责组件编写。
