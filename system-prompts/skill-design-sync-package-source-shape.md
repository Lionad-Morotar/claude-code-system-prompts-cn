<!--
name: '技能：/design-sync 包源代码形态'
description: 针对 /design-sync 的形态特定说明，用于从已构建的包（无 Storybook）同步 React 设计系统
ccVersion: 2.1.162
-->
# 包源代码形态

没有 Storybook —— 组件列表来自包发布的 `.d.ts` 导出。预览根据 `.d.ts` 属性类型加上 `cfg.previewArgs` 生成。

## 2. 探索，然后编写配置（续）

3. 转换器需要已构建的 `dist/` 入口及其 `.d.ts` 树。检查入口（来自 `package.json` 的 `module`/`main`/`exports['.']`）是否已存在 —— 安装时可能已通过 `prepare` 构建。如果缺失：
   - 运行 `<pm> run build`。如果没有 `build` 脚本 → 尝试 `prepare`/`prepack`。在 monorepo 中，构建可能在仓库根目录（`turbo build --filter=<pkg>`、`pnpm -F <pkg> build`、`nx build <pkg>`）。**某些构建脚本会 fork 一个监视器并提前以 0 退出 —— 命令返回后，`ls` 查看预期输出（dist/、build/esm/ 或 `package.json` 的 `module`/`main` 指向的任何位置），确认其中有内容后再继续。** 如果为空，检查脚本中是否有 `--watch` 标志并使用一次性变体，或者轮询输出目录。
   - 仍然缺失 → `AskUserQuestion`("什么命令可以构建此包？"，选项 = 所有包含 `tsc|tsup|rollup|vite build|esbuild|swc` 的 `scripts.*`，外加自由输入)。将答案记录为配置中的 `buildCmd`。
   - 用户说没有构建 → 转换器将从 `src/` 合成入口（最后手段 —— `.d.ts` 合约会较弱；建议添加构建步骤）。
4. **检查项目中已有的内容。** 对目标调用 `DesignSync(list_files)`。如果返回文件，通过 `DesignSync(get_file)` 读取 `_ds_bundle.js`，并注意其首行 `/* @ds-bundle: {…} */` 头中的组件名称 —— 但**仍然始终重新构建**（步骤 7）；现有包在源代码变更的那一刻就已经过时。头部的 `sourceHashes` 差异决定了通过 `DesignSync` 增量*上传*的内容，而非要构建的内容。
5. **在构建前向用户确认计划。** 使用 `AskUserQuestion` 并包含：找到的组件列表（如果列表很长，则给出数量加几个名称）、token/CSS 来自哪些文件，以及将运行哪个构建命令。构建可能需要几分钟并消耗大量 token —— 现在对齐可以避免因为指向了错误的包或遗漏了一半组件而重新运行。
   - 如果项目中已有 N 个组件（步骤 4），在问题中说明并给出范围选项：**(a)** 完全重建 + 重新上传全部内容，**(b)** 仅更新已变更的组件（根据 `sourceHashes` 的差异），**(c)** 仅 token + CSS（不重建组件）。当差异较小时默认选 (b)。
6. **编写 `design-sync.config.json` 并提交** —— 重新同步时复用该文件，使输出可复现。只有 `pkg` 和 `globalName` 是必需的。**如果文件已存在，先读取它并保留 `previewArgs`、`dtsPropsFor`、`libOverrides` 和 `overrides` —— 只向这些字段添加内容，绝不替换。** 它们累积了之前验证循环迭代中的修复。**在做任何其他事情之前，还要先读取 `.design-sync/NOTES.md`（或 `cfg.notes` 指向的任何文件）** —— 它记录了先前同步留下的仓库特定注意事项。

   | 字段 | 说明 |
   |---|---|
   | `pkg` / `globalName` | 包名称和要赋值的 `window.*` 全局变量 —— 必需 |
   | `shape` | `'storybook'` 或 `'package'` —— 固定源代码形态（覆盖自动检测）。在首次运行时写入。 |
   | `buildCmd` | 发现的构建命令；重新同步时重新运行 |
   | `srcDir` | 当不是 `src/`/`lib/`/`components/` 时的源代码根目录 |
   | `tsconfig` | `tsconfig.json` 的路径 —— esbuild 读取 `compilerOptions.paths`，使 `@/…` 路径别名在合成入口模式下能解析 |
   | `extraEntries` | 要与 DS 入口一起合并到 `window.<globalName>` 的包名称（例如 DS 的独立图标包）。同一 scope 下的同级图标包会被自动检测（`[ICON_PKG]`）。 |
   | `componentSrcMap` | **稀疏** `{Name: path}` —— 非 null 值固定/添加组件的源路径；`null` 排除一个 `.d.ts` 导出的内部组件 |
   | `dtsPropsFor` | `{Name: "prop?: Type; …"}` —— 当自动提取失败时（复杂泛型、跨包类型），手写的 `<Name>Props` 体 |
   | `previewArgs` | `{Name: {prop: value, …}}` —— 在自动生成的 `.design-sync/previews/<Name>.tsx` 中渲染为 `Preview` 导出的属性。用于简单的扁平属性；对于组合 JSX 子元素，直接编辑 `.tsx`。 |
   | `cssEntry` / `tokensPkg` / `tokensGlob` | 样式表 + token 文件 |
   | `docsDir` | 包含每个组件 `.md`/`.mdx` 文档的目录（相对于包；可以指向外部，如 `../../apps/docs`）。自动检测为包下的 `docs/` 或 `documentation/`。 |
   | `docsMap` | 稀疏 `{Name: path \| null}` —— 每个组件的显式文档路径（覆盖自动发现）；`null` 排除 |
   | `guidelinesGlob` | 字符串或 string[]（相对于包），指定要复制到 `guidelines/` 的设计指南 `.md` 文件。默认 `['docs/guides/**/*.md', 'docs/*.md', 'guides/**/*.md']`。 |
   | `extraFonts` | 路径（相对于包；可以指向包外部，如一个同级的字体包），指向 `@font-face` `.css` 文件或裸 `.woff2`/`.ttf`/`.otf` 文件，用于 DS 期望宿主应用提供的品牌字体族。CSS 条目会被解析，其本地字体文件会复制到 `fonts/`；裸字体文件按原样复制。当 validate 打印 `[FONT_MISSING]` 时使用。 |
   | `runtimeFontPrefixes` | string[] —— 宿主应用在运行时通过字体服务（通过 `<script>` 或 JS 加载器，因此没有 `@font-face` 可分发）提供的字体的族名前缀。对匹配的族名抑制 `[FONT_MISSING]`。当品牌字体根本不打算随包分发时使用。 |
   | `replaces` | `{<raw-element>: [<ComponentName>, …]}` —— 扩展一致性配置的原始元素映射 |
   | `libOverrides` | `{"<name>.mjs": "<单行原因>"}` —— 声明此仓库 fork 了哪些 `.design-sync/lib/*.mjs` 文件及原因（参见§故障排除）。在构建时交叉检查。 |
   | `notes` | Markdown 笔记文件的路径 —— 默认 `"./.design-sync/NOTES.md"`。 |

   **`.design-sync/NOTES.md`** 是记录仓库特定怪癖的地方（工作区构建顺序、不稳定的 story、奇怪的入口路径，以及任何未来重新同步应该知道的内容）。以多行 Markdown 编写 —— 每个注意事项一行要点。**在验证循环中学到任何东西时都追加到其中**，并与配置文件一起提交。

7. **运行转换器。** 对于大型 DS（200+ 组件），ts-morph 的 `.d.ts` 解析可能需要几分钟 —— stderr 上的 `[DTS]` 进度行显示它正在工作。

```bash
# 转换器随技能目录一起分发 —— 准备整套文件。如果 `cp` 被
# 权限拒绝，通过 `cat` 写入：`cat "<src>" > ./lib/<name>.mjs`。
cp -r "<skill-base-dir>"/package-build.mjs "<skill-base-dir>"/package-validate.mjs "<skill-base-dir>"/lib .
npm i --no-save esbuild ts-morph @types/react   # 如果此仓库使用 pnpm，请参阅下面的 pnpm 说明
node package-build.mjs --config design-sync.config.json --node-modules ./node_modules \
  --entry ./dist/index.es.js --out ./ds-bundle
node package-validate.mjs ./ds-bundle
```

将 `package-build.mjs` 和 `package-validate.mjs` 作为单独的命令运行，并检查每个退出码 —— 在后台链式运行的 `build && validate` 在构建步骤失败时以非零退出，且没有可见日志。**在无头 / `-p` 会话中，同步运行两者**（不使用 `run_in_background`）—— 无头模式下没有任务通知重新调用，因此后台运行的命令永远不会被恢复。在交互式会话中，后台运行构建是可以的。

在 DS 自己的仓库中，`node_modules/<pkg>` 通常不存在（npm 不会自安装），因此需要 `--entry`。

**pnpm 仓库上的 esbuild/ts-morph：** `npm i --no-save esbuild ts-morph` 在 pnpm 管理的 `node_modules` 上可能失败或保持未提升状态（转换器的导入将无法解析）。如果是这样，在 pnpm 能看到的地方安装（`pnpm add -D esbuild ts-morph @types/react`），或者从 `$(pnpm root)/.pnpm/` 创建转换器解析目标的符号链接。

`@types/react` 是属性提取所必需的 —— 没有它，`React.ComponentPropsWithoutRef<…>` 和类似的工具类型会解析为 `any`，发出的 `<Name>.d.ts` 将丢失继承的属性（转换器打印 `[DTS_REACT]`）。

如果构建 monorepo 很复杂，可以 `npm install <your-pkg>@latest react react-dom` 到一个临时目录，并传递 `--node-modules <临时目录>/node_modules` —— 使用已发布的 dist 和平展的依赖。

## 源代码形态

两种形态，相同的输出。当发现 `.storybook/` 时使用 **storybook**（组件列表 + story args 来自 `storybook-static/index.json`）；否则使用 **package**（打包 `dist/`，当 `src/` 存在时从中为每个组件补充 JSDoc 和分组信息）。预览两种方式都从 `_ds_bundle.js` 自包含渲染；没有 story args 的组件会得到一个脚手架。

## 转换器生成的内容

每个组件在 `components/<group>/<Name>/` 下生成：`<Name>.jsx`（单行重导出存根）、`<Name>.d.ts`（来自发布类型的属性接口）、`<Name>.prompt.md` 和 `<Name>.html`（预览卡片）。你不需要编写这些文件中的任何一个 —— 转换器会完成。

`<Name>.prompt.md` 是匹配的每个组件文档（当存在时）（同级 `<Name>.md`/`.mdx` → `cfg.docsDir` 查找 → `<Name>.stories.mdx`；frontmatter 的 `category` 设置组件的 `<group>`）。否则，它由 `.d.ts` 属性体、前导 JSDoc 和 `.design-sync/previews/<Name>.tsx` 中的任何示例合成 —— 严格比之前的存根更丰富。`[DOCS_UNMAPPED]` 列出未匹配的组件。

`<Name>.html` 通过编译后的 `.design-sync/previews/<Name>.tsx` 从 `window.<GLOBAL>.<Name>` 渲染组件（每个命名导出 = 一个带标签的单元格）。当该文件的构建失败时，它会回退到旧的 story-grid / `.d.ts` 脚手架路径。**需要组合子元素的结构化/复合组件**：编辑 `.design-sync/previews/<Name>.tsx`（真实的 JSX，带有 DS 导入）并删除其首行标记 —— 这才是修复方法，而不是"预期的空白"。对 `.html` 的手动编辑在重建时会被覆盖。

**`.design-sync/previews/`**：每个组件一个 `<Name>.tsx`，每次运行从最佳可用源自动生成（CSF3 渲染函数 JSX → story args → `cfg.previewArgs` → `.d.ts` 变体网格 → 命名空间存根 → 默认）。第一行是 `// @ds-preview generated <sha12> — …`；sha12 是其下方主体的哈希。当标记存在且哈希匹配时，文件会被重新生成；删除标记以接管所有权，转换器会保持文件不变（日志输出 `(preview override: <Name>)`）。如果你编辑了主体但保留了标记，转换器会警告 `(preview edited under marker: <Name>)` 并跳过 —— 删除第 1 行以保留你的编辑，或删除文件以重新生成。与 `design-sync.config.json`、`.design-sync/NOTES.md` 和 `.design-sync/lib/` 一起提交。

## 3. 自修复循环

`package-validate.mjs` 在 stderr 上发出 `[TAG]` 前缀的诊断信息。对于每个错误：匹配此表中的标签 → 应用修复 → 重建 → 重新验证。重复直到退出 0。少数确实无法静态渲染的 story（交互驱动的、数据获取的）放入 `cfg.overrides.<Component>.skip`（内联在 `design-sync.config.json` 中，或 `cfg.overrides` 可以是指向单独 JSON 文件的路径）。

| 标签 | 症状 | 修复方法 |
|---|---|---|
| `[NO_DIST]` | `entry <path> doesn't exist` | DS 包未构建。运行其构建脚本（`npm run build` / `turbo run build`），或使用上文提到的已发布 dist 替代方案。 |
| `[WORKSPACE_SIBLING]` | 打包时 `Could not resolve "<sibling>"` | 工作区同级包未构建。构建它（`turbo build`），或 `npm install` 已发布版本到临时目录。 |
| `[CONFIG]` | `<path>: <json error>` | `design-sync.config.json` 缺失或 JSON 格式错误。修复语法。 |
| `[ZERO_MATCH]` | 未发现任何组件 | 没有 PascalCase `.d.ts` 导出且 `componentSrcMap` 为空。 |
| `[OUT_UNSAFE]` | `refusing to rm <path>` | `--out` 指向 `/`、`$HOME`、cwd 或非空的非先前包目录。将 `--out` 指向空目录。 |
| `[UNRESOLVED_IMPORT]` | `<pkg> missing from node_modules` | DS 导入的某个依赖未安装。运行仓库的安装（步骤 2.1）或添加该包。 |
| `[DSCARD_MISSING]` | `<path>: first line isn't a @dsCard comment` | 预览的第一行必须是 `<!-- @dsCard group="…" -->` 才能使 DS 面板注册它。通常是本地 `lib/emit.mjs` 编辑丢弃了头部 —— 恢复它，或重新运行转换器。 |
| `[LINK_HREF_MISSING]` | `<path>: <link href="…"> doesn't resolve` | 预览的样式表路径无法相对于文件解析（预览不带样式发布）。生成深度不匹配 —— 重新运行转换器；如果你手动编辑了预览，修正 `../` 的深度。 |
| `[CSS_IMPORT_MISSING]` | `styles.css @imports "…" which doesn't exist` | `styles.css` 引用的抓取 CSS 文件在磁盘上不存在。检查 `cfg.cssEntry` / `cfg.tokensGlob` 指向的文件是否存在，然后重新运行。 |
| `[PROMPT_EMPTY]` | `<path>: first line is empty` | `.prompt.md` 的第一行是设计代理读取的元素索引摘要。重新运行转换器；如果仍然为空，则组件没有 JSDoc —— 在其源代码中添加一个。 |
| `[RENDER]` | `<path>: root empty` | `<Name>.html` 在无头 Chromium 中未渲染。检查 `.render-check.json` 的 `firstErr`；通常是组件读取的 provider/context 不在 `cfg.provider` 中。如果是数据获取或纯交互 story，将其添加到 `cfg.overrides.<Component>.skip`。 |
| `[RENDER_ERRORS]` | `<path>: <first pageerror>` | 信息性 —— 预览已渲染（根非空）但抛出了 `pageerror`。通常是组件读取的 provider/context 不在 `cfg.provider` 中（参见§故障排除）。不阻塞，除非 `[RENDER]` 也触发。 |
| `[RENDER_BLANK]` | `<path>: renders but PNG is <5KB` | 预览渲染了（无错误）但截图实际上是空白的 —— 自动生成的 JSX 没有产生可见内容。使用代表性属性添加 `cfg.previewArgs.<Name>`（参见 `<Name>.d.ts`）；对于需要组合子元素的复合组件，直接编辑 `.design-sync/previews/<Name>.tsx` 并删除其首行标记。 |
| `[RENDER_THIN]` | `mounted text is just "<Name>"` / `variants render identically` | 预览渲染了但仅显示占位文本，或者每个变体看起来都一样。修复方法与 `[RENDER_BLANK]` 相同。 |
| `[CSS_PLACEHOLDER]` | `_ds_bundle.css` 是一个仅有 `@import` 的存根 | 将 `cfg.cssEntry` 设置为编译后的样式表（在 `dist/` 下或包的官方文档指示导入的位置查找最大的 `.css` 文件）。 |
| `[TOKENS_MISSING]` | `N CSS custom properties referenced but not defined` | 不阻塞。组件 CSS 使用了 `var(--token-*)` 但没有已发布的样式表定义它们 —— 通常 DS 将 token 放在同级包中。将 `cfg.tokensPkg` 设置为该包（检查构建日志中的 `[TOKENS_PKG]` —— 同一 scope 下的 `*tokens*`/`*theme*` 依赖会被自动检测）。如果 token 是在运行时由主题 provider 注入而非通过样式表，则设置 `cfg.provider`。 |
| `[CSS_RUNTIME]` | 没有找到任何静态 CSS；写入了自样式化的 `styles.css` | 信息性，**不阻塞**（`validate` 仍以 0 退出）。对于在运行时注入样式的 CSS-in-JS DS 是预期行为 —— 包是自样式化的。确认渲染检查通过。**仅当** DS 实际发布了抓取遗漏的样式表时：将 `cfg.cssEntry` 设置为它。对于其他全局资源（如远程 Web 字体），编写一个小 CSS 文件并将 `cfg.cssEntry` 指向它。 |
| `[FONT_MISSING]` | 已发布 CSS 引用了字体族但没有发布 `@font-face` | 不阻塞。DS 引用了它期望宿主应用提供的品牌字体族（通常通过字体 token）。将 `cfg.extraFonts` 设置为 `@font-face` css / woff2 文件（通常是同级字体包）并重建，或接受替代字体 —— DS 面板将使用系统字体渲染这些组件。 |
| `[DOCS_UNMAPPED]` | `<Name>` —— 未找到每个组件的文档文件 | 信息性。将 `cfg.docsDir` 设置为文档树或将 `cfg.docsMap.<Name>` 设置为该文件。未匹配的组件将从 `.d.ts` + 预览合成 `.prompt.md`。 |
| `[FONT_DANGLING]` | 存在 `@font-face` 规则但其 `url()` 目标文件不存在 | 不阻塞。字体文件未被复制到 `fonts/` —— 通常是构建日志中的 `! extraFonts:` / `! cssEntry:` 跳过。修复 `cfg.extraFonts` 路径，或将 woff2 复制到 DS 包下。 |
| — | 图标渲染为空框或缺失 | DS 的图标包不在包中。检查构建日志中的 `[ICON_PKG]`（同一 scope 下的图标包会被自动包含）；如果未触发，将图标包名称添加到 `cfg.extraEntries`。 |
| — | 组件渲染了但没有 CSS | 将 `cfg.cssEntry` 设置为包的样式表。 |
| — | DS 面板中出现"缺少品牌字体"横幅 | 与 `[FONT_MISSING]` 相同的原因：包引用了未分发的字体族。如果文件可用且许可允许，通过 `cfg.extraFonts` 连接它们，或接受替代字体。 |
| — | `! extraFonts: <path> resolves outside the workspace root — skipped` | `extraFonts` 条目被限制在 `dirname(--node-modules)` 内。在 pnpm-workspace / yarn-nohoist 仓库中，`--node-modules` 是每个包的 `node_modules`，同级字体包超出了该边界。解决方法：将 `@font-face` css + woff2 复制到 DS 包下并将 `extraFonts` 指向那里，或在包管理器允许时使用仓库根目录的 `node_modules` 重新运行。 |

## 4. 验证预览渲染

`package-validate.mjs` 的无头渲染检查（打开每个 `<Name>.html`，在根为空时失败）需要 playwright + chromium。**首先检查是否已有安装** —— `ls ~/.cache/ms-playwright/` 或 `which chromium chromium-headless-shell google-chrome`。如果 chromium 构建已缓存，**安装匹配的 playwright 版本**（目录名是 `chromium-<build>`；`npm view playwright@latest` 很少匹配它 —— 应检查仓库自己的 `package.json`/lockfile 中是否有固定版本的 `playwright`/`@playwright/test`，然后 `npm i -D playwright@<该版本>`）。不匹配的 playwright↔chromium 会导致 `browserType.launch: Executable doesn't exist`。

**如果未找到，在安装任何东西之前 `AskUserQuestion`：**
> "要进行自动预览验证，我需要安装 playwright + chromium（约 200MB）。选项：(a) 可以安装，(b) 跳过 —— 我会在自己的浏览器中打开预览，(c) 完全跳过验证。"

- **(a) 可以** → `npm i -D playwright && npx playwright install chromium`。如果安装失败（CDN 被阻止、版本不匹配），回退到 (b)。
- **(b) 我会打开** → `npx serve ds-bundle`，列出 5–8 个预览路径（混合简单、复合、叠加类型）供用户打开。询问哪些看起来空白或错误；根据用户的描述为每个添加 `cfg.previewArgs.<Name>` 条目并重新运行。
- **(c) 完全跳过** → 使用智能脚手架默认值发布。在最终输出中注明预览未经过视觉验证。

> **当后台运行长时间命令时**（playwright 安装、构建、服务器）：用 `PID=$!` 捕获其 PID 并用 `kill -0 "$PID"` 轮询。不要使用 `pgrep -f '<command string>'` —— pgrep 调用本身会匹配自己的参数，导致循环永不退出。

有了 playwright（已有的或新安装的），**`package-validate.mjs` 会截取每个预览的截图**到 `ds-bundle/_screenshots/<group>__<Name>.png`，并将每个组件的状态写入 `ds-bundle/.render-check.json`（`[{name, group, errs, firstErr, pngBytes, blank, rootEmpty, thin, nameOnly, allHollow, collapsed, hasPlaceholder, maxHeight, variantsIdentical, bad, texts}]`）。读取 `.render-check.json` 并：

1. **概览。** 读取 `_screenshots/contact-sheets.json`。如果缺失，说明缩略表步骤未完成 —— 跳到步骤 2。否则读取它列出的每个 `_screenshots/contact-sheet-N.png`（每个平铺约 16 个带标签的预览）；注意任何看起来不对的缩略图 —— 只有名称、空的变体标签、视觉损坏或占位符。
2. **深入检查。** 对于每个 (a) 在 `.render-check.json` 中被标记的组件（`bad`、`thin`、`hasPlaceholder` 或 `variantsIdentical` 为 true），(b) 在概览中看起来不对的，或 (c) 如果步骤 1 没有找到 json 则检查**所有**组件：读取其单独的 `_screenshots/<group>__<Name>.png` —— 绝不要从缩略表缩略图判断，绝不要抽样。如果它看起来已经正确（Divider 只是一条线；Icon 只是一个字形），跳过 —— `thin` 是提示，不是判决。否则读取 `<Name>.d.ts` 并要么编写 `cfg.previewArgs.<Name>` 条目（简单的扁平属性），要么对于需要组合子元素或内联测试数据的复合组件，打开 `.design-sync/previews/<Name>.tsx`，编辑 JSX，并删除其首行 `// @ds-preview generated` 标记，使转换器保留你的编辑。`hasPlaceholder: true` 意味着显示的是生成的虚线框占位符 —— 用真实内容编辑 `.tsx`。`blank: true`（PNG <5KB）通常意味着自动生成的 JSX 没有合成任何有用内容；`errs > 0` 且带有 context/provider 消息 → 参见§故障排除。如果构建日志显示 `(preview: <Name> — N renderSource(s) reference undeclared …)`，story 的 JSX 引用了 story 文件局部测试数据 —— 将这些数据内联到 `.tsx` 中。
   **选择 `cfg.previewArgs` 还是编辑 `.tsx`：** `previewArgs` 用于扁平的 JSON 可序列化属性 —— 它在生成的 `.tsx` 中作为一个额外的 `Preview` 导出出现。对于组合子元素（`<Tabs><Tab/><Tab/></Tabs>`）、测试数据或任何需要真实 JSX 的情况，直接编辑 `.design-sync/previews/<Name>.tsx` 并删除其标记行；`previewArgs` 无法表达这些。如果 `firstErr` 是 TypeScript 错误（`Property '…' is missing`、`Type '…' is not assignable`），修复在 `.tsx` 中 —— 生成的 JSX 具有错误的属性形态。
3. 重新运行 `package-build.mjs` 然后 `package-validate.mjs`。只有你编辑了 `.tsx`（标记已删除 → 保留）或添加了 `previewArgs` 的组件会改变；带有标记的文件会被重新生成。
4. 重复直到 `bad` 集合为空或达到 3 次迭代。
5. 最后一遍后，使用来自 `.render-check.json` 的聚合数据调用 `DesignSync({method: 'report_validate', counts: {total, bad, thin, variantsIdentical, iterations}})`（`total` = 条目数；`bad`/`thin`/`variantsIdentical` = true 的计数；`iterations` = 你运行的重建次数）。
6. 如果 validate 打印了 `[FONT_MISSING]`：在交互式会话中，`AskUserQuestion` 询问是通过 `cfg.extraFonts` 连接字体族（并重建）还是接受系统字体替代。如果是无头模式，在最终摘要中注明并继续。

步骤 1–5 是进入 §5 的门槛 —— 在完成之前不要进入 `finalize_plan`/上传。

**给用户的最终输出**："N/M 个预览渲染正常；X 个通过 previewArgs 修复；Y 个仍需关注：[名称]；已检查 Y/Y 个标记的预览 + S 个缩略表。" 对于 Y，读取并附加 PNG 以便用户看到问题所在。

自动生成的预览使用每个组件的最佳可用源（CSF3 渲染函数 JSX → story args → `cfg.previewArgs` → `.d.ts` 变体网格 → 命名空间存根 → 默认）。复合/叠加组件可能确实需要 `cfg.previewArgs` 或手动编辑的 `.tsx` —— 这是预期的，不是转换器的 bug。

同时确认：
- `components:` 计数与你在 §2 中与用户确认的匹配。不足 → §故障排除（`componentSrcMap`）。
- 在任何预览的浏览器控制台中（`npx serve ds-bundle`），`Object.keys(window.<globalName>)` 列出了每个导出的组件。

## 5. 上传

只有在转换器完全完成且 `package-validate.mjs` 以 0 退出后才上传 —— 运行中途的快照会产生带有悬空引用的包。

在 **DS 项目根目录**上传 —— 自检期望顶层有 `_ds_bundle.js`、`styles.css`、`components/`、`tokens/`、`fonts/` 和 `README.md`。

创建一个空的 `./ds-bundle/_ds_needs_recompile`（例如 `touch ds-bundle/_ds_needs_recompile`）。

`DesignSync(finalize_plan)` 使用 `localDir: "./ds-bundle"`，`writes: ["components/**", "tokens/**", "fonts/**", "_vendor/**", "_preview/**", "guidelines/**", "_ds_bundle.js", "_ds_bundle.css", "styles.css", "README.md", "_ds_needs_recompile"]`（转换器的输出集加上重新编译哨兵），以及 `deletes: []`（必需，即使为空）。以点开头的根条目（`.ds-build-meta.json`、`.ds-bundle`、`.pkg-entry.mjs`、`.bundle-entry.mjs`、`.sb-static/`）和 `_screenshots/` 是构建产物，保留在本地。`_vendor/` 会上传（预览卡片从中加载 React）。只有当 `cfg.demo` 设置时才添加 `"demo.html"`。

`finalize_plan` 会向用户显示交互式批准提示。**如果被拒绝，停止** —— 不要用不同的 `localDir`/`writes` 值重试；拒绝意味着会话无法批准，而不是参数错误。包已在 §4 验证；报告 `ds-bundle/` 路径并让用户交互式运行上传。

作为计划批准后的**第一个**写入，`DesignSync(write_files, [{path: "_ds_needs_recompile", localPath: "_ds_needs_recompile"}])` —— 这在上传进行期间隔离了应用的清单/复制机制，使消费者永远不会看到半上传状态。然后对匹配计划的每个其他文件执行 `DesignSync(write_files)`，逐字保留相对于根的路径。该工具每次调用最多 256 个文件，因此列出目录树，分成 ≤256 个文件的批次，并在同一个 `planId` 下发出多个 `write_files` 调用。在所有其他上传完成后，再次写入哨兵 —— `DesignSync(write_files, [{path: "_ds_needs_recompile", localPath: "_ds_needs_recompile"}])` —— 以便在项目在同步过程中被打开时重新启用重新编译。`DesignSync(list_files)` 确认计数匹配。每个 `<Name>.html` 带有首行 `<!-- @dsCard group="…" -->` 注释，claude.ai/design 应用的自检会读取它以注册卡片。

完成后告诉用户：项目 URL（`https://claude.ai/design/p/<projectId>`）、组件数量、已上传的文件数，以及 `package-validate.mjs` 干净退出。**将 `design-sync.config.json`、`.design-sync/NOTES.md` 和任何 `.design-sync/lib/` 覆盖提交到仓库**，以便将来运行时重用你在验证循环中添加的 `previewArgs`/`dtsPropsFor`/`libOverrides` 和笔记。

## 6. 自检（服务端）

上传后你就完成了。应用的自检在项目打开时触发（你写入的 `_ds_needs_recompile` 哨兵触发了它），因此 DS 面板在几秒内就会填充。自检读取每个 `<Name>.d.ts` 作为组件的 API 合约（`<Name>Props` 接口是设计代理看到的内容），读取每个 `<Name>.html` 的 `@dsCard` 行以注册预览卡片，从上传的源代码重新生成一致性配置和 `ds_manifest`，并清除哨兵。

## 工作原理

两条独立的构建路径：

**可导入的包**（根 `_ds_bundle.js`）：esbuild 获取包发布的 `dist/` 入口 → 生成一个 IIFE，将所有导出赋值给 `window.<globalName>`，带有首行 `/* @ds-bundle: {…} */` 头部供应用自检读取。其 CSS 附属文件（`_ds_bundle.css`）加上抓取的 token/字体通过一个 `@import` 它们的根 `styles.css` 连接。这就是 claude.ai/design 代理实际导入和构建的内容。独立于 Storybook；适用于每个 DS。

转换器不会生成一致性配置、`ds_manifest`、版本文件或 barrel `index.js` —— 应用的自检会从上传的源代码重新生成这些。

**适用范围**：React 设计系统。`_ds_bundle.js` 和预览都通过 React 渲染 —— 非 React DS 没有可供 claude.ai/design 代理构建的内容。

**检查方法**：`npx serve ds-bundle` 并打开任何 `<Name>.html`。

## 故障排除

**预览显示"context"或"provider"错误**（例如 "No <X> context"、"use<Hook> must be inside <Provider>"）→ DS 需要 provider 包装器。将 `cfg.provider` 设置为 DS 的顶层 provider。对于链式 provider，通过 `inner` 嵌套：
```json
{"provider": {"component": "ThemeProvider", "props": {"theme": {}}, "inner": {"component": "RouterProvider"}}}
```
查找名为 `*Provider` 或 `Theme` 的导出，或查看 DS 官方文档中的"包裹你的应用"部分。`component` 可以是进入 DS 导出的点分路径（例如 `"<ExportedContext>.Provider"`）。


**输出缺少或错误的组件？** `grep ASSUMPTION lib/*.mjs` —— 每行命名了覆盖该启发式的 `cfg.*` 字段。将覆盖添加到 `design-sync.config.json` 并重新运行。`componentSrcMap` 涵盖大多数情况：`{"Portal": null}` 排除一个导出的内部组件；`{"TextInput": "src/forms/text-input/index.tsx"}` 固定一个模糊查找遗漏的源路径。在合成入口模式（无 dist、无 `.d.ts`）中，内容扫描可能过度包含 PascalCase 非组件导出（例如 `ButtonVariants`）—— 用 `componentSrcMap: {"ButtonVariants": null}` 修剪。

**大型 DS 的渲染检查：** `package-validate.mjs` 默认截取每个预览的截图。对于非常大（200+ 组件）的 DS，如果太慢，传递 `--render-sample N` 以按确定的步长 N 检查。

**为此仓库 fork 一个 lib 脚本：** 当没有配置覆盖适用时，将特定适配器复制到 `.design-sync/lib/<name>.mjs`（例如 `.design-sync/lib/dts.mjs`）并在那里编辑。`package-build.mjs` 会先检查 `.design-sync/lib/`，并在使用 fork 时记录 `[OVERRIDE]`。添加头部注释 `// forked from design-sync lib/<name>.mjs — <单行原因>`，将相同的原因添加到 `cfg.libOverrides`（例如 `"libOverrides": {"dts.mjs": "VariantProps intersection pattern"}`），并将两者与 `design-sync.config.json` 一起提交，使重新同步可复现。fork 自己的 `import './common.mjs'` 会在 `.design-sync/lib/` 下解析，因此还要复制（不变的）fork 导入的任何同级 lib 文件。在重新同步时，将 `.design-sync/lib/<name>.mjs` 与捆绑的 `lib/<name>.mjs` 进行 diff，并提供合并上游更改的选项。`lib/emit.mjs` 和 `lib/bundle.mjs` 定义了与应用自检的输出合约 —— 不要 fork 这些；使用配置覆盖或 `cfg.dtsPropsFor` 代替。

**已知限制：**
- `.d.ts` 属性通过 TypeScript 检查器（ts-morph）解析 —— 泛型、`extends` 链、交叉类型和类型别名解析为其结构形态；React 和 CSS-in-JS 样式系统属性被过滤。上游类型错误会原样传播。
- 组件从 context 中读取的 provider（主题、路由、i18n）必须在 `cfg.provider` 中，否则预览渲染为空白。
- 具有中央 `apps/storybook` 的 monorepo：设置 `cfg.storybookConfigDir` 改为运行 storybook 形态。
- 仅 token 的 DS（无组件）：仅生成 `styles.css` 和空主体的 `_ds_bundle.js`。

## 这不是什么

这不是 LLM 重写组件。客户真正发布的代码是真相来源；转换器确定性地打包它，并使用客户自己的 Storybook 配置进行渲染。你（代理）做的是发现、配置和自修复尾部 —— 绝不涉及组件编写。
