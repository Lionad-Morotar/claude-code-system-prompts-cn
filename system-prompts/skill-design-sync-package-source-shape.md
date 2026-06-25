<!--
name: '技能：/design-sync 包源码形态'
description: 针对从已构建包（无 Storybook）同步 React 设计系统的形态特定 /design-sync 指令
ccVersion: 2.1.162
-->
# 包源码形态

没有 Storybook —— 组件列表来自包的已发布 `.d.ts` 导出。预览根据 `.d.ts` 的 prop 类型加上 `cfg.previewArgs` 生成。

## 2. 探索，然后编写配置（续）

3. 转换器需要已构建的 `dist/` 入口及其 `.d.ts` 树。检查入口（来自 `package.json` 的 `module`/`main`/`exports['.']`）是否已存在 —— 安装可能已通过 `prepare` 构建了它。如果缺失：
   - 运行 `<pm> run build`。没有 `build` 脚本 → 尝试 `prepare`/`prepack`。在 monorepo 中，构建可能在仓库根目录（`turbo build --filter=<pkg>`、`pnpm -F <pkg> build`、`nx build <pkg>`）。**某些构建脚本会 fork 一个 watcher 后提前退出 0 —— 命令返回后，`ls` 检查预期输出（dist/、build/esm/ 或 `package.json` 的 `module`/`main` 指向的任何目录），确认其已填充后再继续。** 如果为空，检查脚本中是否有 `--watch` 标志并使用一次性变体，或轮询输出目录。
   - 仍然缺失 → `AskUserQuestion`("此包用什么命令构建？"，选项为包含 `tsc|tsup|rollup|vite build|esbuild|swc` 的任何 `scripts.*`，外加自由输入)。将答案记录为配置中的 `buildCmd`。
   - 用户说没有构建 → 转换器将从 `src/` 合成入口（最后手段 —— `.d.ts` 契约会较弱；建议添加构建）。
4. **检查项目中已有的内容。** 对目标执行 `DesignSync(list_files)`。如果返回文件，通过 `DesignSync(get_file)` 读取 `_ds_bundle.js`，并注意其首行 `/* @ds-bundle: {…} */` 头中的组件名称 —— 但**始终仍要重新构建**（步骤 7）；现有 bundle 在源码变更的那一刻就已过时。头中的 `sourceHashes` 差异决定了要通过 `DesignSync` *增量上传* 的内容，而非要构建的内容。
5. **构建前与用户确认计划。** 使用 `AskUserQuestion` 询问：你找到的组件列表（如果列表较长则给出数量加几个名称）、token/CSS 来自哪些文件、以及你将运行的构建命令。构建可能需要几分钟并消耗大量 token —— 现在对齐可以避免因指向错误的包或遗漏一半组件而重新运行。
   - 如果项目已有 N 个组件（步骤 4），在问题中包含该信息并提供范围选项：**(a)** 全量重建 + 重新上传所有内容，**(b)** 仅更新变更的组件（根据 `sourceHashes` 差异），**(c)** 仅更新 token + CSS（不重建组件）。差异较小时默认为 (b)。
6. **编写 `design-sync.config.json` 并提交** —— 重新同步时复用此文件，确保输出可重现。仅 `pkg` 和 `globalName` 为必填项。**如果文件已存在，先读取它并保留 `previewArgs`、`dtsPropsFor`、`libOverrides` 和 `overrides` —— 只向这些字段追加内容，绝不要替换它们。** 它们累积了之前验证循环迭代中的修复。**在其他任何操作之前，还要 Read `.design-sync/NOTES.md`（或 `cfg.notes` 指向的任何文件）** —— 它包含了之前同步记录的仓库特定注意事项。

   | 字段 | 值 |
   |---|---|
   | `pkg` / `globalName` | 包名及要赋值的 `window.*` 全局变量 —— 必填 |
   | `shape` | `'storybook'` 或 `'package'` —— 固定源码形态（覆盖自动检测）。首次运行时写入。 |
   | `buildCmd` | 已发现的构建命令；重新同步时会重新运行 |
   | `srcDir` | 源码根目录，当不是 `src/`/`lib/`/`components/` 时设置 |
   | `tsconfig` | `tsconfig.json` 的路径 —— esbuild 读取 `compilerOptions.paths` 以便在合成入口模式下解析 `@/…` 路径别名 |
   | `extraEntries` | 要与 DS 入口一起合并到 `window.<globalName>` 的包名（例如 DS 的独立图标包）。同作用域下的兄弟图标包会被自动检测（`[ICON_PKG]`）。 |
   | `componentSrcMap` | **稀疏** `{Name: path}` —— 非 null 值固定/添加组件的源码路径；`null` 排除某个 `.d.ts` 导出的内部组件 |
   | `dtsPropsFor` | `{Name: "prop?: Type; …"}` —— 当自动提取失败时（复杂泛型、跨包类型），手动编写的 `<Name>Props` 体 |
   | `previewArgs` | `{Name: {prop: value, …}}` —— 在自动生成的 `.design-sync/previews/<Name>.tsx` 中渲染为 `Preview` 导出的 props。用于简单的扁平 props；对于组合 JSX 子元素，直接编辑 `.tsx`。 |
   | `cssEntry` / `tokensPkg` / `tokensGlob` | 样式表 + token 文件 |
   | `docsDir` | 目录（包相对路径；可指向外部，如 `../../apps/docs`），包含每个组件的 `.md`/`.mdx` 文档。自动检测为包下的 `docs/` 或 `documentation/`。 |
   | `docsMap` | 稀疏 `{Name: path \| null}` —— 每个组件的显式文档路径（覆盖自动发现）；`null` 排除 |
   | `guidelinesGlob` | 字符串或 string[]（包相对路径），指定要复制到 `guidelines/` 的设计指南 `.md` 文件。默认值 `['docs/guides/**/*.md', 'docs/*.md', 'guides/**/*.md']`。 |
   | `extraFonts` | 路径（包相对路径；可指向包外部，例如兄弟排版包），指向 DS 期望宿主应用提供的品牌字体系列的 `@font-face` `.css` 文件或裸 `.woff2`/`.ttf`/`.otf` 文件。CSS 条目会被解析，其本地字体文件复制到 `fonts/`；裸字体文件按原样复制。当 validate 打印 `[FONT_MISSING]` 时使用。 |
   | `runtimeFontPrefixes` | string[] —— 宿主应用在运行时通过字体服务（通过 `<script>` 或 JS 加载器，因此没有要打包的 `@font-face`）提供的字体系列名称前缀。抑制匹配系列名的 `[FONT_MISSING]`。当品牌字体不应随 bundle 一起发布时使用。 |
   | `replaces` | `{<raw-element>: [<ComponentName>, …]}` —— 扩展 adherence-config 的原始元素映射 |
   | `libOverrides` | `{"<name>.mjs": "<单行原因>"}` —— 声明此仓库 fork 了哪些 `.design-sync/lib/*.mjs` 文件及其原因（参见§故障排除）。构建时交叉校验。 |
   | `notes` | Markdown 笔记文件的路径 —— 默认值 `"./.design-sync/NOTES.md"`。 |

   **`.design-sync/NOTES.md`** 是存放仓库特定怪癖的地方（工作区构建顺序、不稳定的 story、奇怪的入口路径，以及未来重新同步时需要了解的任何事项）。以多行 Markdown 编写 —— 每个注意事项一个要点。**在验证循环中学到任何内容时都追加到其中**，并与配置一起提交。

7. **运行转换器。** 对于大型 DS（200+ 组件），ts-morph 的 `.d.ts` 解析可能需要几分钟 —— stderr 上的 `[DTS]` 进度行表明其正在工作。

```bash
# 转换器随技能目录一起发布 —— 整体复制。如果 `cp` 权限被拒绝，
# 通过 `cat` 写入：`cat "<src>" > ./lib/<name>.mjs`。
cp -r "<skill-base-dir>"/package-build.mjs "<skill-base-dir>"/package-validate.mjs "<skill-base-dir>"/lib .
npm i --no-save esbuild ts-morph @types/react   # 如果此仓库使用 pnpm，参见下面的 pnpm 说明
node package-build.mjs --config design-sync.config.json --node-modules ./node_modules \
  --entry ./dist/index.es.js --out ./ds-bundle
node package-validate.mjs ./ds-bundle
```

分别运行 `package-build.mjs` 和 `package-validate.mjs` 并检查每个退出码 —— 在后台链式运行的 `build && validate` 在构建步骤失败时以非零退出但无可见日志。**在 headless / `-p` 会话中，同步运行两者**（不使用 `run_in_background`）—— headless 模式下没有任务通知重新调用，后台运行永远不会被恢复。在交互式会话中，后台运行构建是可以的。

在 DS 自己的仓库中，`node_modules/<pkg>` 通常不存在（npm 不会自安装），因此需要 `--entry`。

**pnpm 仓库上的 esbuild/ts-morph：** `npm i --no-save esbuild ts-morph` 在 pnpm 管理的 `node_modules` 上可能失败或保持未提升状态（转换器的导入将无法解析）。如果是这样，安装到 pnpm 能看到的地方（`pnpm add -D esbuild ts-morph @types/react`）或从 `$(pnpm root)/.pnpm/` 符号链接转换器的解析目标。

`@types/react` 是 prop 提取所必需的 —— 没有它，`React.ComponentPropsWithoutRef<…>` 和类似的工具类型会解析为 `any`，生成的 `<Name>.d.ts` 会丢失继承的 props（转换器会打印 `[DTS_REACT]`）。

如果构建 monorepo 很复杂，可以 `npm install <your-pkg>@latest react react-dom` 到一个临时目录，然后传递 `--node-modules <scratch>/node_modules` —— 使用已发布的 dist 和扁平化的依赖。

## 源码形态

两种形态，相同输出。**storybook** 适用于找到 `.storybook/` 时（从 `storybook-static/index.json` 获取组件列表 + story args）；**package** 适用于其他情况（打包 `dist/`，当存在 `src/` 时从中丰富每个组件 —— JSDoc 和分组）。预览在任何情况下都从 `_ds_bundle.js` 自包含渲染；没有 story args 的组件会得到一个脚手架。

## 转换器输出内容

每个组件，在 `components/<group>/<Name>/` 下：`<Name>.jsx`（单行再导出存根）、`<Name>.d.ts`（来自已发布类型的 props 接口）、`<Name>.prompt.md` 和 `<Name>.html`（预览卡片）。这些都不需要你编写 —— 转换器会完成。

`<Name>.prompt.md` 是匹配的每个组件的文档（当存在时：同级 `<Name>.md`/`.mdx` → `cfg.docsDir` 查找 → `<Name>.stories.mdx`；frontmatter 中的 `category` 设置组件的 `<group>`）。否则从 `.d.ts` props 体、前导 JSDoc 和 `.design-sync/previews/<Name>.tsx` 中的任何示例合成 —— 严格比之前的存根更丰富。`[DOCS_UNMAPPED]` 列出未匹配的组件。

`<Name>.html` 通过编译后的 `.design-sync/previews/<Name>.tsx` 从 `window.<GLOBAL>.<Name>` 渲染组件（每个具名导出 = 一个带标签的单元格）。当该文件构建失败时，回退到旧的 story-grid / `.d.ts`-脚手架路径。**需要组合子元素的结构化/复合组件**：编辑 `.design-sync/previews/<Name>.tsx`（真实的 JSX，使用 DS 导入）并删除其首行标记 —— 这才是修复方法，而不是"预期为空"。对 `.html` 的手动编辑会在重建时被覆盖。

**`.design-sync/previews/`**：每个组件一个 `<Name>.tsx`，每次运行从最佳可用源自动生成（CSF3 render-fn JSX → story args → `cfg.previewArgs` → `.d.ts` 变体网格 → 命名空间存根 → 默认值）。第一行是 `// @ds-preview generated <sha12> — …`；sha12 是其下方正文的哈希。当标记存在且哈希匹配时，文件会被重新生成；删除标记以接管所有权，转换器会保持其不变（日志输出 `(preview override: <Name>)`）。如果你编辑了正文但保留了标记，转换器会警告 `(preview edited under marker: <Name>)` 并跳过 —— 删除第 1 行以保留你的编辑，或删除文件以重新生成。与 `design-sync.config.json`、`.design-sync/NOTES.md` 和 `.design-sync/lib/` 一起提交。

## 3. 自愈循环

`package-validate.mjs` 在 stderr 上输出 `[TAG]` 前缀的诊断信息。对每个错误：匹配此表中的标签 → 应用修复 → 重建 → 重新验证。重复直到退出 0。少数确实无法静态渲染的 story（交互驱动、数据获取）放入 `cfg.overrides.<Component>.skip`（内联在 `design-sync.config.json` 中，或 `cfg.overrides` 可以是指向单独 JSON 文件的路径）。

| 标签 | 症状 | 修复 |
|---|---|---|
| `[NO_DIST]` | `entry <path> 不存在` | DS 包未构建。运行其构建脚本（`npm run build` / `turbo run build`），或使用上述已发布 dist 的替代方案。 |
| `[WORKSPACE_SIBLING]` | 打包时 `无法解析 "<sibling>"` | 工作区兄弟包未构建。构建它（`turbo build`），或 `npm install` 已发布版本到临时目录。 |
| `[CONFIG]` | `<path>: <json 错误>` | `design-sync.config.json` 缺失或 JSON 格式错误。修复语法。 |
| `[ZERO_MATCH]` | 未发现任何组件 | 没有 PascalCase 的 `.d.ts` 导出且 `componentSrcMap` 为空。 |
| `[OUT_UNSAFE]` | `拒绝删除 <path>` | `--out` 指向 `/`、`$HOME`、cwd 或非空的非先前 bundle 目录。将 `--out` 指向空目录。 |
| `[UNRESOLVED_IMPORT]` | `<pkg> 在 node_modules 中缺失` | DS 导入的某个依赖未安装。运行仓库的 install（步骤 2.1）或添加该包。 |
| `[DSCARD_MISSING]` | `<path>: 第一行不是 @dsCard 注释` | 预览的第一行必须是 `<!-- @dsCard group="…" -->`，DS 面板才能注册它。通常是本地 `lib/emit.mjs` 编辑丢失了头信息 —— 恢复它，或重新运行转换器。 |
| `[LINK_HREF_MISSING]` | `<path>: <link href="…"> 无法解析` | 预览的样式表路径相对于文件无法解析（预览不带样式发布）。输出深度不匹配 —— 重新运行转换器；如果你手动编辑了预览，修复 `../` 深度。 |
| `[CSS_IMPORT_MISSING]` | `styles.css @import 了 "…" 而该文件不存在` | `styles.css` 引用的某个抓取的 CSS 文件不在磁盘上。检查 `cfg.cssEntry` / `cfg.tokensGlob` 指向存在的文件，然后重新运行。 |
| `[PROMPT_EMPTY]` | `<path>: 第一行为空` | `.prompt.md` 的第一行是设计代理读取的元素索引摘要。重新运行转换器；如果仍为空，该组件没有 JSDoc —— 在其源码中添加一个。 |
| `[RENDER]` | `<path>: root 为空` | `<Name>.html` 在 headless chromium 中未渲染。检查 `.render-check.json` 中的 `firstErr`；通常是组件读取的 provider/context 不在 `cfg.provider` 中。如果是数据获取或纯交互 story，将其添加到 `cfg.overrides.<Component>.skip`。 |
| `[RENDER_ERRORS]` | `<path>: <首个 pageerror>` | 信息性 —— 预览已渲染（root 非空）但抛出了 `pageerror`(s)。通常是组件读取的 provider/context 不在 `cfg.provider` 中（参见§故障排除）。非阻塞，除非 `[RENDER]` 也触发。 |
| `[RENDER_BLANK]` | `<path>: 已渲染但 PNG <5KB` | 预览已渲染（无错误）但截图实际上为空 —— 自动生成的 JSX 未产生可见内容。添加 `cfg.previewArgs.<Name>` 并填入有代表性的 props（参见 `<Name>.d.ts`）；对于需要组合子元素的复合组件，直接编辑 `.design-sync/previews/<Name>.tsx` 并删除其首行标记。 |
| `[RENDER_THIN]` | `挂载的文本仅为 "<Name>"` / `变体渲染结果完全相同` | 预览已渲染但仅显示占位文本，或每个变体看起来都一样。修复方法与 `[RENDER_BLANK]` 相同。 |
| `[CSS_PLACEHOLDER]` | `_ds_bundle.css` 是一个仅含 `@import` 的存根 | 将 `cfg.cssEntry` 设置为编译后的样式表（在 `dist/` 下或包自身文档说明的导入位置查找最大的 `.css` 文件）。 |
| `[TOKENS_MISSING]` | `引用了 N 个 CSS 自定义属性但未定义` | 非阻塞。组件 CSS 使用了 `var(--token-*)` 但没有任何发布的样式表定义它们 —— 通常 DS 将 token 放在兄弟包中。将 `cfg.tokensPkg` 设置为该包（检查构建日志中的 `[TOKENS_PKG]` —— 同作用域的 `*tokens*`/`*theme*` 依赖会被自动检测）。如果 token 是在运行时由主题 provider 注入而非通过样式表，则设置 `cfg.provider`。 |
| `[CSS_RUNTIME]` | 任何地方都找不到静态 CSS；写入了自样式化的 `styles.css` | 信息性，**非阻塞**（`validate` 仍然退出 0）。适用于在运行时注入样式的 CSS-in-JS DS —— bundle 是自样式化的。确认渲染检查通过。**仅当** DS 确实发布了样式表但抓取遗漏时：将 `cfg.cssEntry` 设置为它。对于其他全局内容（例如远程 webfont），编写一个小型 CSS 文件并将 `cfg.cssEntry` 指向它。 |
| `[FONT_MISSING]` | 已发布的 CSS 引用了字体系列但没有发布的 `@font-face` | 非阻塞。DS 引用了品牌字体系列（通常通过字体 token），期望宿主应用提供。将 `cfg.extraFonts` 设置为 `@font-face` css / woff2（通常是一个兄弟排版包）并重建，或接受替代字体 —— DS 面板将使用系统字体渲染这些组件。 |
| `[DOCS_UNMAPPED]` | `<Name>` —— 未找到每个组件的文档文件 | 信息性。将 `cfg.docsDir` 设置为文档树或将 `cfg.docsMap.<Name>` 设置为文件。未匹配的组件将改为从 `.d.ts` + 预览合成 `.prompt.md`。 |
| `[FONT_DANGLING]` | 发布了 `@font-face` 规则但其 `url()` 目标文件未发布 | 非阻塞。字体文件未被复制到 `fonts/` —— 通常是构建日志中的 `! extraFonts:` / `! cssEntry:` 跳过。修复 `cfg.extraFonts` 路径，或将 woff2 复制到 DS 包下。 |
| — | 图标渲染为空框或缺失 | DS 的图标包不在 bundle 中。检查构建日志中的 `[ICON_PKG]`（同作用域的图标包会自动包含）；如果未触发，将图标包名添加到 `cfg.extraEntries`。 |
| — | 组件已渲染但没有 CSS | 将 `cfg.cssEntry` 设置为包的样式表。 |
| — | DS 面板中显示"缺少品牌字体"横幅 | 根本原因与 `[FONT_MISSING]` 相同：bundle 引用了未发布的字体系列。如果文件可用且许可允许，通过 `cfg.extraFonts` 接入，或接受替代字体。 |
| — | `! extraFonts: <path> 解析到工作区根目录之外 —— 已跳过` | `extraFonts` 条目限定在 `dirname(--node-modules)` 范围内。在 pnpm-workspace / yarn-nohoist 仓库中，`--node-modules` 是每个包的 `node_modules`，兄弟排版包超出了该边界。变通方法：将 `@font-face` css + woff2 复制到 DS 包下并将 `extraFonts` 指向那里，或在包管理器允许的情况下使用仓库根目录的 `node_modules` 重新运行。 |

## 4. 验证预览渲染

`package-validate.mjs` 的 headless 渲染检查（打开每个 `<Name>.html`，在 root 为空时失败）需要 playwright + chromium。**首先检查是否已有安装** —— `ls ~/.cache/ms-playwright/` 或 `which chromium chromium-headless-shell google-chrome`。如果有 chromium 构建已缓存，**安装匹配的 playwright 版本**（目录名为 `chromium-<build>`；`npm view playwright@latest` 很少匹配 —— 改为检查仓库自身的 `package.json`/lockfile 中是否有固定的 `playwright`/`@playwright/test` 版本，然后 `npm i -D playwright@<该版本>`）。playwright 与 chromium 版本不匹配会导致 `browserType.launch: 可执行文件不存在`。

**如果未找到，在安装任何内容之前 `AskUserQuestion`**：
> "为进行自动化预览验证，我需要安装 playwright + chromium（约 200MB）。选项：(a) 可以安装，(b) 跳过 —— 我会在自己的浏览器中打开预览，(c) 完全跳过验证。"

- **(a) 可以** → `npm i -D playwright && npx playwright install chromium`。如果安装失败（CDN 被阻止、版本不匹配），回退到 (b)。
- **(b) 我来打开** → `npx serve ds-bundle`，列出 5–8 个预览路径（混合简单、复合、浮层组件）供用户打开。询问哪些看起来是空白或有问题的；根据其描述为每个添加 `cfg.previewArgs.<Name>` 条目并重新运行。
- **(c) 完全跳过** → 使用智能脚手架默认值发布。在最终输出中注明预览未经视觉验证。

> **后台运行长时间命令时**（playwright 安装、构建、服务器）：使用 `PID=$!` 捕获其 PID 并通过 `kill -0 "$PID"` 轮询。不要使用 `pgrep -f '<命令字符串>'` —— pgrep 调用本身会匹配其自身的参数，导致循环永不退出。

有了 playwright（已有或已安装），**`package-validate.mjs` 会截图每个预览**到 `ds-bundle/_screenshots/<group>__<Name>.png`，并将每个组件的状态写入 `ds-bundle/.render-check.json`（`[{name, group, errs, firstErr, pngBytes, blank, rootEmpty, thin, nameOnly, allHollow, collapsed, hasPlaceholder, maxHeight, variantsIdentical, bad, texts}]`）。读取 `.render-check.json` 并：

1. **扫视。** 读取 `_screenshots/contact-sheets.json`。如果缺失，说明联系表步骤未完成 —— 转到步骤 2。否则读取其列出的每个 `_screenshots/contact-sheet-N.png`（每个平铺约 16 个带标签的预览）；注意任何看起来不对的缩略图 —— 仅名称、变体标签为空、视觉上损坏或占位符。
2. **深入检查。** 对每个满足以下条件的组件：(a) 在 `.render-check.json` 中被标记（`bad`、`thin`、`hasPlaceholder` 或 `variantsIdentical` 为 true），(b) 在扫视中看起来有问题，或 (c) 如果步骤 1 未找到 json 则检查**任意**组件：读取其单独的 `_screenshots/<group>__<Name>.png` —— 绝不要仅凭联系表缩略图判断，绝不要抽样。如果它看起来已经正确（Divider 只是一条线；Icon 只是一个字形），跳过 —— `thin` 是提示而非定论。否则读取 `<Name>.d.ts`，然后要么编写 `cfg.previewArgs.<Name>` 条目（简单扁平 props），要么对于需要组合子元素或内联固件数据的复合组件，打开 `.design-sync/previews/<Name>.tsx`，编辑 JSX，并删除其首行 `// @ds-preview generated` 标记，以便转换器保留你的编辑。`hasPlaceholder: true` 表示生成的虚线框占位符正在显示 —— 用真实内容编辑 `.tsx`。`blank: true`（PNG <5KB）通常意味着自动生成的 JSX 未合成任何有用内容；`errs > 0` 并带有 context/provider 消息 → 参见§故障排除。如果构建日志显示 `(preview: <Name> — N renderSource(s) 引用了未声明的 …)`，则 story 的 JSX 闭包引用了 story 文件本地的固件 —— 将该数据内联到 `.tsx` 中。
   **选择 `cfg.previewArgs` 还是编辑 `.tsx`：** `previewArgs` 适用于扁平的 JSON 可序列化 props —— 它会在生成的 `.tsx` 中表现为一个额外的 `Preview` 导出。对于组合子元素（`<Tabs><Tab/><Tab/></Tabs>`）、固件数据或任何需要真实 JSX 的内容，直接编辑 `.design-sync/previews/<Name>.tsx` 并删除其标记行；`previewArgs` 无法表达这些。如果 `firstErr` 是 TypeScript 错误（`缺少属性 '…'`、`类型 '…' 不可赋值`），修复在 `.tsx` 中 —— 生成的 JSX 的 prop 形状有误。
3. 重新运行 `package-build.mjs` 然后 `package-validate.mjs`。只有你编辑了 `.tsx`（标记已删除 → 保留）或添加了 `previewArgs` 的组件会变更；带标记的文件会被重新生成。
4. 重复直到 `bad` 集合为空或达到 3 次迭代。
5. 最终遍历后，调用 `DesignSync({method: 'report_validate', counts: {total, bad, thin, variantsIdentical, iterations}})`，使用 `.render-check.json` 中的聚合数据（`total` = 条目数；`bad`/`thin`/`variantsIdentical` = true 的计数；`iterations` = 你运行的重建遍数）。
6. 如果 validate 打印了 `[FONT_MISSING]`：在交互式会话中，`AskUserQuestion` 询问是通过 `cfg.extraFonts` 接入字体系列（并重建）还是接受系统字体替代。如果是 headless 模式，在最终摘要中注明并继续。

步骤 1–5 是 §5 的门槛 —— 在完成之前不要进入 `finalize_plan`/上传。

**给用户的最终输出**："N/M 个预览渲染正常；X 个通过 previewArgs 修复；Y 个仍需关注：[名称]；已审查 Y/Y 个标记的预览 + S 张联系表。" 对于 Y，读取并附加 PNG 图片，以便用户看到问题所在。

自动生成的预览使用每个组件的最佳可用源（CSF3 render-fn JSX → story args → `cfg.previewArgs` → `.d.ts` 变体网格 → 命名空间存根 → 默认值）。复合/浮层组件可能确实需要 `cfg.previewArgs` 或手动编辑的 `.tsx` —— 这是预期行为，而非转换器 bug。

还需确认：
- `components:` 计数与你在 §2 中与用户确认的一致。不足 → §故障排除（`componentSrcMap`）。
- 在任意预览的浏览器控制台中（`npx serve ds-bundle`），`Object.keys(window.<globalName>)` 列出了每个导出的组件。

## 5. 上传

仅在转换器完全完成且 `package-validate.mjs` 退出 0 后才上传 —— 运行中的快照会产生带有悬空引用的 bundle。

在 **DS 项目根目录**上传 —— 自检期望 `_ds_bundle.js`、`styles.css`、`components/`、`tokens/`、`fonts/` 和 `README.md` 位于顶层。

创建一个空的 `./ds-bundle/_ds_needs_recompile`（例如 `touch ds-bundle/_ds_needs_recompile`）。

`DesignSync(finalize_plan)` 使用 `localDir: "./ds-bundle"`、`writes: ["components/**", "tokens/**", "fonts/**", "_vendor/**", "_preview/**", "guidelines/**", "_ds_bundle.js", "_ds_bundle.css", "styles.css", "README.md", "_ds_needs_recompile"]`（转换器的输出集加上重新编译哨兵），以及 `deletes: []`（必填，即使为空）。点号前缀的根条目（`.ds-build-meta.json`、`.ds-bundle`、`.pkg-entry.mjs`、`.bundle-entry.mjs`、`.sb-static/`）和 `_screenshots/` 是构建产物，保留在本地。`_vendor/` 需要上传（预览卡片从中加载 React）。仅当设置了 `cfg.demo` 时才添加 `"demo.html"`。

`finalize_plan` 向用户显示交互式批准提示。**如果被拒绝，停止** —— 不要用不同的 `localDir`/`writes` 值重试；拒绝意味着会话无法批准，而非参数有误。bundle 已在 §4 中验证；报告 `ds-bundle/` 路径并让用户交互式运行上传。

作为计划批准后的**第一个**写入，`DesignSync(write_files, [{path: "_ds_needs_recompile", localPath: "_ds_needs_recompile"}])` —— 这在上传进行中隔离了应用的 manifest/复制机制，使消费者永远不会看到半上传状态。然后对匹配计划的所有其他文件执行 `DesignSync(write_files)`，原样保留根相对路径。该工具每次调用上限为 256 个文件，因此列出树，分块为 ≤256 个文件的批次，并在同一个 `planId` 下发出多个 `write_files` 调用。所有其他上传完成后，再次写入哨兵 —— `DesignSync(write_files, [{path: "_ds_needs_recompile", localPath: "_ds_needs_recompile"}])` —— 以在项目在同步过程中被打开时重新激活重新编译。`DesignSync(list_files)` 确认计数匹配。每个 `<Name>.html` 携带首行 `<!-- @dsCard group="…" -->` 注释，claude.ai/design 应用的自检读取它来注册卡片。

完成后告诉用户：项目 URL（`https://claude.ai/design/p/<projectId>`）、组件数量、上传的文件数，以及 `package-validate.mjs` 干净退出。**将 `design-sync.config.json`、`.design-sync/NOTES.md` 和任何 `.design-sync/lib/` 覆盖提交到仓库**，以便未来运行复用你在验证循环中添加的 `previewArgs`/`dtsPropsFor`/`libOverrides` 和笔记。

## 6. 自检（服务端）

上传完成后你就完成了。应用的自检在项目打开时触发（你写入的 `_ds_needs_recompile` 哨兵触发它），因此 DS 面板在几秒内填充。自检读取每个 `<Name>.d.ts` 作为组件的 API 契约（`<Name>Props` 接口是设计代理看到的内容），读取每个 `<Name>.html` 的 `@dsCard` 行以注册预览卡片，从上传的源码重新生成 adherence 配置和 `ds_manifest`，并清除哨兵。

## 工作原理

两条独立的构建路径：

**可导入的 bundle**（根 `_ds_bundle.js`）：esbuild 取包的已发布 `dist/` 入口 → 一个 IIFE，将所有导出赋值给 `window.<globalName>`，带有首行 `/* @ds-bundle: {…} */` 头，应用的自检读取它。其 CSS 附属文件（`_ds_bundle.css`）加上抓取的 token/字体通过根 `styles.css` 连接，该文件 `@import` 它们。这是 claude.ai/design 代理实际导入和构建的内容。独立于 Storybook；适用于所有 DS。

转换器**不**生成 adherence 配置、`ds_manifest`、版本文件或 barrel `index.js` —— 应用的自检从上传的源码重新生成这些。

**适用范围**：React 设计系统。`_ds_bundle.js` 和预览都通过 React 渲染 —— 非 React DS 没有可供 claude.ai/design 代理构建的内容。

**检查方法**：`npx serve ds-bundle` 并打开任意 `<Name>.html`。

## 故障排除

**预览显示 "context" 或 "provider" 错误**（例如 "No <X> context"、"use<Hook> 必须在 <Provider> 内部"）→ DS 需要 provider 包装器。将 `cfg.provider` 设置为 DS 的顶层 provider。对于链式嵌套，通过 `inner` 嵌套：
```json
{"provider": {"component": "ThemeProvider", "props": {"theme": {}}, "inner": {"component": "RouterProvider"}}}
```
查找名为 `*Provider` 或 `Theme` 的导出，或检查 DS 自身文档中"包裹你的应用"的部分。`component` 可以是 DS 导出中的点分路径（例如 `"<ExportedContext>.Provider"`）。


**输出缺失或组件错误？** `grep ASSUMPTION lib/*.mjs` —— 每行命名了覆盖该启发式的 `cfg.*` 字段。将覆盖添加到 `design-sync.config.json` 并重新运行。`componentSrcMap` 覆盖大多数情况：`{"Portal": null}` 排除导出的内部组件；`{"TextInput": "src/forms/text-input/index.tsx"}` 固定模糊查找遗漏的源码路径。在合成入口模式下（无 dist，无 `.d.ts`），内容扫描可能过度包含 PascalCase 的非组件导出（例如 `ButtonVariants`）—— 使用 `componentSrcMap: {"ButtonVariants": null}` 修剪。

**大型 DS 的渲染检查：** `package-validate.mjs` 默认截图每个预览。对于非常大的 DS（200+ 组件）且速度太慢时，传递 `--render-sample N` 以检查确定性的步长为 N 的采样。

**为此仓库 fork lib 脚本：** 当没有配置覆盖适用时，将特定适配器复制到 `.design-sync/lib/<name>.mjs`（例如 `.design-sync/lib/dts.mjs`）并在那里编辑。`package-build.mjs` 优先检查 `.design-sync/lib/`，使用 fork 时记录 `[OVERRIDE]`。添加头注释 `// forked from design-sync lib/<name>.mjs — <单行原因>`，将相同的原因添加到 `cfg.libOverrides`（例如 `"libOverrides": {"dts.mjs": "VariantProps 交叉类型模式"}`），并与 `design-sync.config.json` 一起提交，以便重新同步可重现。fork 自身的 `import './common.mjs'` 在 `.design-sync/lib/` 下解析，因此也要复制（不变地）fork 导入的任何兄弟 lib 文件。重新同步时，将 `.design-sync/lib/<name>.mjs` 与打包的 `lib/<name>.mjs` 进行差异比较，并提示合并上游变更。`lib/emit.mjs` 和 `lib/bundle.mjs` 定义了与应用自检的输出契约 —— 不要 fork 这些；改用配置覆盖或 `cfg.dtsPropsFor`。

**已知限制：**
- `.d.ts` props 通过 TypeScript 检查器（ts-morph）解析 —— 泛型、`extends` 链、交叉类型和类型别名解析为其结构形状；React 和 CSS-in-JS 样式系统 props 被过滤。上游类型 bug 原样传播。
- 组件从 context 读取的 provider（主题、路由、i18n）必须在 `cfg.provider` 中，否则预览渲染为空白。
- 带有中央 `apps/storybook` 的 monorepo：设置 `cfg.storybookConfigDir` 改为运行 storybook 形态。
- 仅含 token 的 DS（无组件）：仅输出 `styles.css` 和一个空体的 `_ds_bundle.js`。

## 本功能不是什么

不是用 LLM 重写组件。客户真实发布的代码是真相来源；转换器确定性地打包它并使用客户自己的 Storybook 配置渲染。你（代理）负责发现、配置和自愈尾部 —— 绝不是组件创作。
