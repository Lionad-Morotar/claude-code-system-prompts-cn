<!--
name: 'Skill: Design sync Storybook source shape'
description: 在构建、验证、匹配、上传和重新同步组件预览时，使用仓库 Storybook 作为保真度预言机的设计同步子技能说明
ccVersion: 2.1.199
-->
# Storybook 源形态

Storybook 是**保真度预言机，而非运行时**。转换器将包的编译后 `dist/` 打包到 `_ds_bundle.js` —— 与 claude.ai/design 代理构建的包相同 —— 并通过**编译故事源模块本身**（hooks、fixtures、本地助手 —— 整个闭包一起）生成每个预览，每个组件导入都解析到该发布包（`lib/story-imports.mjs` 将包*和*相对组件导入重定向到 `window.<Global>`）。仓库自己的 storybook 渲染是那些预览必须匹配的基准：一个比较工具对参考 storybook 中的每个故事和匹配的预览渲染进行并排截图，你迭代直到它们匹配。storybook-static 中没有任何内容被上传，故事代码在构建时永远不会被求值 —— 故事只在浏览器中运行，针对真实制品。


需要 React 18+。Playwright + chromium 对此形态是**必需的**（比较循环是验证），不是可选的。

**首次同步还是重新同步？** 重新同步由 `projectId` 和 `pkg` 在本次运行开始前都已就位的配置标记 —— 本文档的大部分内容不适用；转到 §7，一个驱动运行路由工作，未触及的组件零成本。其他所有内容走完整流程（§2 构建 → §3 自愈 → §4 匹配 → 约定标题（基础 SKILL.md，上传前）→ §6 上传），每个组件被验证和评分一次 —— 包括中止运行留下的部分配置，以及本次运行刚在基础技能 §1 中记录的固定。（只有旧的 `design-sync.config.json` 存在？先移动并提交：`mkdir -p .design-sync && mv -n design-sync.config.json .design-sync/config.json`，然后应用相同的测试。）

## 2. 构建，然后运行转换器

1. **构建 DS 包*及其工作区依赖*。** 转换器将 `dist/` 打包到 `window.<Global>`。运行 `<pm> run build`；在 monorepo 中使用 `turbo run build --filter=<pkg>` 或 `pnpm -F "<pkg>..." build`（尾部的 `...` 是必需的 —— 裸 `-F <pkg>` 会跳过依赖，你会看到 `Cannot find module '@scope/tokens'`）。如果 `package.json` 的 `module`/`exports['.']` 指向 TS 源码，找到实际构建的入口并通过 `--entry` 传入。**在步骤 2 之前执行此操作** —— storybook 经常从其构建后的 `dist/` 导入同级包。
2. **将参考 storybook 构建一次到 `.design-sync/sb-reference/`** —— 不在 `ds-bundle/` 下（转换器在每次重建时清除 `--out`，storybook 构建需要几分钟；参考必须存活于修复循环中）：

   ```bash
   npx storybook build -c <storybookConfigDir> -o .design-sync/sb-reference
   ```

   从 `package.json` 具有 storybook devDependencies 的目录运行 —— 通常是包含 `.storybook/` 的那个；monorepo 通常有多个 storybook，选择覆盖你正在同步的包的那个。**使 `-o` 为仓库根路径**（例如 `-o "$(git rev-parse --show-toplevel)/.design-sync/sb-reference"`）：转换器和比较从仓库根解析 `.design-sync/`，所以在子包中的 cwd 相对 `-o` 会把参考放在找不到它的地方。直接使用 `npx storybook build`，**不是**仓库的 `npm run build-storybook` 脚本（输出目录错误）。然后检查 `.design-sync/sb-reference/iframe.html` 存在且 >10KB —— `index.json` 单独存在可能来自失败的构建。

   长时间构建：仅通过**shell 工具的后台模式**后台运行它们并等待完成通知。永远不要裸 `&`（未跟踪 —— 通知永远不会来），永远不要 `pgrep -f '<script>'` 轮询循环（它匹配自己的命令行并旋转到超时）。无头 / `-p` 会话：改为同步运行长命令 —— 那里没有任务通知重新调用，所以后台运行永远不会被恢复。

   `.gitignore` 添加：`.design-sync/sb-reference/`、`.design-sync/learnings/`、`.design-sync/.cache/`、`.design-sync/node_modules`（fork 符号链接 —— 每次克隆重建）、`.ds-sync/`、`ds-bundle/` —— 构建产物、临时暂存、验证工作状态、符号链接、暂存脚本、重新生成输出。已提交：持久集合（非 storybook §2 中的规则，这里相同：`.design-sync/` 下所有未被 gitignore 的内容 —— previews/ 仅包含你编写的文件；生成的故事模块包装器位于 `.design-sync/.cache/previews/` 中，每次构建重新生成；转换器从不写入或删除 `previews/` 中的任何内容）。验证状态永远不会被提交 —— 跨机器延续来自上传项目的 `_ds_sync.json`。仅在故事或 DS 源更改时重建参考。
3. **写入 `.design-sync/config.json`** —— 仅 `pkg` 和 `globalName` 必需。**如果已存在，先读取并保持其中的内容** —— `titleMap`、`overrides` 和 `provider` 从之前的同步累积修复。同时先读取 `.design-sync/NOTES.md` —— 其**重新同步风险**部分是之前运行的观察列表；重新验证那些项目而非假设延续覆盖了它们。`../non-storybook/SKILL.md` §2.6 中的包形态字段表逐字适用；这里最重要的字段：

   | 字段 | 值 |
   |---|---|
   | `pkg` / `globalName` | `pkg` 必需；省略时 `globalName` 从中自动派生 |
   | `shape` | `"storybook"` —— 固定检测 |
   | `storybookStatic` | `".design-sync/sb-reference"` —— 使重新同步和比较无需标志即可找到参考 |
   | `storybookConfigDir` | `.storybook/` 目录（monorepo） |
   | `buildCmd` | 重新同步时在转换器之前重新运行的命令 |
   | `titleMap` | 当故事标题不匹配导出名时为 `{title: ExportName}`；`{title: null}` 将非视觉/内部组件完全排除在同步之外 |
   | `overrides` | `{<Name>: {skip: [storyIds], cardMode: "single"\|"column", primaryStory: "<Export>", viewport: "WxH"}}` —— `skip` 用于无法静态渲染的故事；`cardMode: "single"` 用于覆盖组件（§4a.5、§5），`"column"` 用于比网格单元格更宽的故事（§3 中的 `[GRID_OVERFLOW]` 行） |
   | `provider` | 通常**预览**不需要 —— `.storybook/preview` 装饰器自动打包；仅在失败时设置。在 §6 上传之前，将装饰器提供的上下文提炼到 `cfg.provider` —— README/prompt.md 包装指南仅从配置生成（仅装饰器包装发送通用注释）。**设置它也会在下次构建时替换装饰器作为预览包装器**：切换后进行主题组件的范围比较 —— 不完整的提炼会回退装饰器渲染良好的预览，延续的评分不会捕获它。格式：`{"component": "ThemeProvider", "props": {…}, "inner": {…}}` —— 嵌套链，最外层优先；每个 `component` 必须是包导出。字面 `props` 用于小标量（`"theme": "light"`）和稳定片段。对于仓库中已存在的数据 —— 语言环境 JSON、主题对象 —— **优先使用 `{"$ref": "<export>"}`** 并通过 `cfg.extraEntries` 添加的 2 行模块支持（例如 `export { default as previewI18n } from '../locales/en.json'`）：`$ref` 发出 `window.<Global>.<export>`，所以数据在包中存在一次并在每次构建时从源文件重新读取。内联副本对于小而稳定的内容是可接受的，但要知道代价 —— 字面量会复制到每个卡片的 html 中并在源文件更改时静默腐烂，所以任何大的或演变中的内容都应该放在 `$ref` 后面。`extraEntries` 的路径形式：裸名从 `node_modules` 解析；仓库拥有的模块需要显式的 `./`/`../` 包相对路径（工作区限定 —— 如果逃逸，构建日志会记录 `! extraEntries: … skipped`）。 |

4. **暂存脚本 + 安装转换器依赖**（隔离在 `.ds-sync/` 中，仓库锁文件不变）：

   ```bash
   mkdir -p .ds-sync && cp -r "<skill-base-dir>"/package-build.mjs "<skill-base-dir>"/package-validate.mjs "<skill-base-dir>"/resync.mjs "<skill-base-dir>"/lib "<skill-base-dir>"/storybook "<skill-base-dir>"/non-storybook .ds-sync/
   echo '{"name":"ds-sync-deps","private":true}' > .ds-sync/package.json
   (cd .ds-sync && npm i esbuild ts-morph @types/react playwright && npx playwright install chromium)
   ```

   如果 chromium 安装失败，先 `npx playwright install-deps chromium`；如果环境无法安装 chromium，设置 `DS_CHROMIUM_PATH=<system-chromium>`。
5. **运行转换器、验证器和比较器** —— 同步执行，在第一个非零退出时停止（比较仅在构建 + 验证干净后运行 —— §3）。大型 DS（约 100+ 组件）可能需要 `NODE_OPTIONS=--max-old-space-size=<MB>` 用于构建；**永远不要通过 `head`/`tail` 管道传输构建**（管道掩盖退出码 —— OOM 看起来像成功）；重定向到文件并读取：

   ```bash
   node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules <pkg-node-modules> \
     --entry <built-dist-entry> --out ./ds-bundle
   node .ds-sync/package-validate.mjs ./ds-bundle
   node .ds-sync/storybook/compare.mjs --out ./ds-bundle --storybook-static .design-sync/sb-reference \
     --components <solo-phase picks>   # 将第一次比较限定在 §4b solo 组件
   ```

   在 monorepo 中，`--node-modules` 是 DS 包自己的 `node_modules` —— 除非提升使其稀疏（yarn 的 `node-modules` 链接器将 `react` 仅保留在仓库根）：如果内部缺少 `react/` 或 `react-dom/`，改为传递仓库根的 `node_modules`。在 DS 自己的源码仓库中 `node_modules/<pkg>` 不存在，因此需要 `--entry`。构建日志记录 `[ICON_PKG]` / `[TOKENS_PKG]` 自动检测并将 `.storybook/preview` 装饰器打包为预览包装器（`preview-decorators.js`），使预览获得与故事相同的提供者链。

   限定第一次比较运行的范围：大型 DS 的完整捕获是数千次 chromium 导航 —— 在 solo 阶段刷新全局问题之前毫无意义（每个全局修复使每次捕获失效）。第一次全名册运行在 §4b 步骤 3 发生 —— 在超过 20 个有故事的组件的 DS 上，即使那样也会被大小限制到 §4c 的范围批次中，所以唯一必须的完整名册运行是 §4d 收据，它延续已评分的工作而非重新捕获。对于超过 100 个有故事的组件的 DS，还要在扇出之前告诉用户预期规模（组件 × 故事），让他们可以缩小范围。

## 3. 自愈循环（构建 + 验证）

修复 `[TAG]` 错误 → 重建 → 重新验证直到两者退出 0，**在** §4 中开始比较循环**之前** —— 当包本身损坏时像素匹配预览没有意义。共享转换器标签（`[NO_DIST]`、`[WORKSPACE_SIBLING]`、`[CSS_*]`、`[FONT_*]`、`[TOKENS_MISSING]`、`[DTS_*]`、`[RENDER*]`、…）与包形态行为相同 —— 使用 `../non-storybook/SKILL.md` §3 中的表格。在错误下打印为 `hypothesis:` 的行是线索，不是指令：先运行其验证步骤，如果不确认，放弃假设并从错误文本本身诊断。Storybook 特有的：

| 标签 | 症状 | 修复 |
|---|---|---|
| `[SB_REFERENCE_MISSING]` | 比较找不到 `iframe.html` | 构建参考（§2.2）；设置 `cfg.storybookStatic`。 |
| `[SB_BUILD_FAIL]` | 转换器自己的 storybook 构建失败 | 你跳过了 §2.2 —— 自己构建参考并设置 `cfg.storybookStatic` 使转换器不再需要。 |
| `[ZERO_MATCH]`（storybook 变体）| 没有故事条目匹配 | 检查 storybook 配置的 `stories` glob；然后 `titleMap`。 |
| `[TITLE_UNMAPPED]` | N 个标题不匹配导出 | `cfg.titleMap {<title-name>: <export-name>}`。 |
| `(preview: <Name> — no story exports paired …)` | 索引故事名无法匹配模块导出键（配对尝试显示名，然后故事 ID 的尾部）| 组件显示基础卡片；修复配对 —— 通常是拥有的 `.tsx` 在可匹配名称下重新导出故事。 |
| 预览单元格以 `undefined`-组件 / 错误上下文消息报错 | 故事导入解析错误 —— 相对、tsconfig-alias 和裸工作区导入都通过相同策略（见 `lib/story-imports.mjs` 的规则）| `cfg.storyImports.shim` / `cfg.storyImports.bundle` 子字符串模式按解析路径强制解析 —— 在分叉接缝之前的廉价修复。 |
| `! preview build failed: <Name>` | 故事模块未编译（顶层 await、esbuild 无法解析的包导入、无加载器的资源扩展名）| 读取行上方的 esbuild 错误。未知资源扩展名 → `cfg.storyImports.loaders`（在默认值上合并，例如 `{".yaml": "text"}`）；无法解析的导入 → 拥有 `.tsx` 并删除它。组件显示基础卡片直到修复。 |
| 故事自己的样式表在其单元格中缺失 | 故事本地的 `.css`/`.scss` 副作用导入编译为空（组件样式通过包 css 传递）。例外：`.module.css` 确实被编译 —— 类解析且 `_preview/<Name>.css` 自动链接 | 通常没什么 —— 样式是 storybook 页面添加的装饰。如果故事确实依赖它们，在拥有的 `.tsx` 中内联样式。 |
| `[BUNDLE_EXPORT]` | 组件在 `window.<Global>` 上不是函数 | 子路径/图标导出的 `extraEntries`；检查 dist 入口是完整构建。 |
| `[SCHEDULER_MISSING]` | dist 导入 `scheduler` | react-dom 泄漏到 DS dist —— 检查其构建的外部依赖。 |
| `! preview decorator bundle failed` | 装饰器无法打包 | 手动设置 `cfg.provider`，或运行 `node .ds-sync/storybook/probe.mjs --storybook-static .design-sync/sb-reference` 从实时 storybook 推断链（用真实值替换每个 `$hint`）。 |
| 预览在 `_vendor/preview-decorators.js` 加载时报错（storybook-API `undefined` 错误）| `.storybook/preview` 导入图到达了存根未覆盖的 storybook 运行时模块 | `manager-api`/`preview-api` 用功能性无操作 hooks 存根，其他所有 `@storybook/*`/`msw` 模块用惰性可调用对象（`fn()`、`action()`、`setupWorker()` 在模块作用域都无害求值）；如果其他 API 仍然崩溃，显式设置 `cfg.provider` —— 它完全跳过装饰器打包。 |
| 来自比较的 `[ASSETS_BLOCKED]` | 捕获浏览器继承了网络沙箱化的 shell —— 故事资源（CDN 图片/字体）在**两个**面板上都失败，所以评分可能错误通过而最终用户看到不同输出 | 从有出站到列出主机的 shell 重新运行 `package-validate.mjs` + `compare.mjs --force`：在提示时批准不带沙箱运行命令，或将主机添加到沙箱允许列表。在此打印时不要评分带图片的组件。 |

**增量路径（基础 SKILL.md §3）—— 这是打开通道的门。** 第一次构建 + 验证都退出 0 时，在开始 §4 之前打开上传通道：用户在这里批准一次，然后在评分进行时观看组件落地。在第一个评分批次之前没有上传 —— 共享基础文件随之一起 —— 批次推送来自 §4b/§4c。（原子路径：在 §6 之前没有上传。）

## 4. 匹配预览到 storybook

`compare.mjs` 是**捕获工具 —— 它拍照，你评分。** 它不计算相似性启发式（像素/文本/字体评分在构图合理不同时具有误导性）；判断来自两个真实截图。编译后的预览**按故事**捕获 —— 每个故事通过 `?story=<Export>` 在完整捕获视口下单独渲染，与 storybook 构建参考侧的方式完全相同 —— 所以相邻故事不会干扰（portal 堆叠、共享 radio-group 名称、焦点、容器测量）。两个输出层：
- **瞬态**（在 `ds-bundle/` 下，被重建清除）：`_screenshots/compare/<group>__<Name>.png` —— 每个故事一行的表格：**真实 storybook 渲染 | 真实预览渲染**，并排。表格图像被缩小以适应；全分辨率原件在 `…/compare/raw/`（`…__sb.png` / `…__ds.png`）—— 当表格太小无法自信判断时读取这些。
- **活动状态**（在 `.design-sync/.cache/compare/` 中，gitignored）：`<Name>.grade.json` —— 你的裁决 —— 和 `<Name>.json` —— 捕获事实：故事↔单元格配对、截图路径、`previewKind`、组件的 `srcSha`（故事文件指纹）、抽查锚点。可重建 —— 缺失仅意味着"重新捕获"。脚本发出的唯一裁决是事实性的：`sb-error`（故事在 storybook 中不渲染）、`unpaired`（故事没有预览单元格）、`error`（单元格抛出）；每个渲染对都是 `needs-grade`。

比较默认每个组件最多捕获 6 个故事 —— 日志中的 `[STORY_CAP]` 命名有更多故事的组件，`--max-stories <n>` 提高上限。上限不是评分契约的一部分：提高它仅为增量评分捕获尾部故事，现有裁决存活。一个需要知道的后果：完全评分为 `match`/`close` 的被上限限制的组件在未来同步中通过上传完全验证，即使其尾部故事从未被单独评分 —— 当那些尾部故事携带值得验证的不同变体时提高上限。扇出子代理不得在波次中更改它（表格会覆盖与编排器工作列表假设不同的故事集）。

**跨运行状态** —— 第一次运行验证所有内容一次；之后，一个规则：**评分跟随你的源** —— 故事文件、你拥有的预览、故事集、影响预览的配置（`provider`/`storyImports`/`extraEntries`/`overrides`/`titleMap`），以及已提交的 `.design-sync/overrides/` fork。管道搅动（技能或工具链更新重新渲染所有内容）通过采样的 `[SPOT_CHECK]` 自动验证并保留评分；你的编辑仅重新评分它们触及的内容。像素抖动永远不会搅动评分。
- *源未更改* + 完全评分为 `match`/`close` → **直接跳过**（`carried forward`）：不捕获，不重新评分 —— 即使包、样式、storybook 或转换器本身被重建。`--force` 重新捕获所有内容**并清除所有评分** —— 系统性重新验证，不是随意的表格重新生成。
- *源已更改*（故事已编辑、`.tsx` 已编辑、配置/fork 已编辑）→ 重新捕获，评分清除，从新表格重新评分。`[STORY_CHANGED]` 标记代码已移动的故事 —— 那些是拥有的 `.tsx` **必须更新**的地方（生成的预览自动重新派生）；没有 `[STORY_CHANGED]` 的重新捕获通常只需要重新评分。
- *`[SPOT_CHECK]`* → 重新捕获命名组件**不清除其评分**；读取新表格并确认它们仍然匹配记录的评分。它可以在管道搅动后到达驱动触发的 —— 技能/工具链更新的正常验证，不是 bug。分歧修复随搅动集缩放：几个组件 → 仅重新评分那些；广泛 → 停止，诊断，然后 `--force` 完整传递。`--spot-check N` 调整完整运行的随机样本（0 禁用）；`--spot-check-components A,B` 显式命名选择，在范围运行中也遵守（§7 步骤 4 审计）。
- *`[REFERENCE_STALE?]`* → 包已更改但参考 storybook 没有。如果 DS 源已更改，在评分之前重建 `.design-sync/sb-reference` —— 过时的参考使每个评分都是对*旧*设计的比较。
- *故事每次捕获渲染不同*（`new Date()`/`Math.random()` 内容）→ 指纹是故事文件，所以契约是稳定的 —— 但像素不是，评分判断像素。冻结的捕获时钟稳定日期渲染；对于真正随机的内容，在拥有的 `.tsx` 中固定值或用 `cfg.overrides.<Name>.skip` 跳过故事并在 NOTES.md 中记录。

捕获为评分可比性稳定（动画快进、减少运动、冻结时钟 —— 两个面板显示相同的稳定帧，相同的渲染日期）。这仅用于验证：发布的预览不受影响且完全动画。

**评分由处理组件的人完成** —— 在 solo 阶段是你，在扇出中每个子代理负责其自己的组件。每次比较运行后：读取表格（有疑问时读取原始 PNG），**仅从图像**判断每个故事，将裁决写入 `.design-sync/.cache/compare/<Name>.grade.json`（活动本地工作状态 —— 使裁决持久的是上传：上传的 `_ds_sync.json` 在未来每次同步的每台机器上锚定上传验证跳过）：

```json
{"stories": {"Default": {"verdict": "match"}, "Compact": {"verdict": "match", "basis": "sibling-trusted"}}}
{"stories": {"Loading": {"verdict": "mismatch", "note": "spinner missing — story uses MSW mock"}}}
```

（两个组件的文件：一个在下面的采样规则下评分的干净组件 —— `Default` 是图像判断的主故事，`match` 在无警告组件上，这是许可 sibling-trusted 条目的条件 —— 以及一个不匹配的，其注释驱动下一次修复。）

评分标准 —— 从两个渲染中判断设计师会关心的内容：
- `match` —— 相同的内容、构图和样式。忽略抗锯齿模糊、滚动条细条、亚 5px 偏移和构图差异（storybook 画布和预览页面构图不同 —— 判断组件，而非其周围环境）。
- `close` —— 可识别的相同渲染带有微小差异（稍有不同的内边距、焦点环、占位文本）。**`close` 仍然是修复目标，不是退出：** 如果你能命名差异，你通常能命名调节器 —— 继续迭代。仅在迭代未能改善或没有可操作原因后接受 `close`，注释必须说明*什么不对*以及*你尝试了什么/为什么不可修复*（例如"焦点环颜色不同 —— storybook 应用全局焦点插件，不是 DS 的一部分"）。
- `mismatch` —— 错误/缺失内容、未样式化输出、错误变体、缺失图标/图片、默认字体。注释必须说明*什么*不同 —— 它驱动下一次修复。

当参考侧是制品时 —— storybook 在 UI 控件（主题/控件切换消息）后面限制故事，而预览渲染真实组件 —— 独立判断组件渲染并注明限制；渲染*多于*限制参考的预览不是 `close`。

**评分主故事，信任其余。** 一个组件的兄弟故事通过相同管道 —— 相同导入、相同提供者链、相同 CSS —— 所以当其中一个忠实渲染时其余通常也忠实。在首次同步时，仅从图像判断组件的**主故事**（设置时为 `cfg.overrides.<Name>.primaryStory` —— 与单模式卡片渲染的故事相同 —— 否则表格的第一个故事）。如果评分为 `match` 且组件干净 —— 没有 `sb-error`/`unpaired`/`error` 单元格、没有 `[PORTAL?]`、没有 `[RENDER_BLANK]`、没有空白或大小异常的截图 —— 为其余故事写入 `match` 并带有 basis 标记，`{"verdict": "match", "basis": "sibling-trusted"}`，使记录说明每个裁决如何达到（比较只读取 `verdict` 字符串）。组件的所有裁决 —— 图像判断的主条目加上每个 sibling-trusted 条目 —— 都在其一个 `grade.json` 写入中：信任的兄弟不消耗图像打开和每个故事传递。当组件有 portal/覆盖、主题或提供者敏感性、拥有的预览或任何警告时，逐故事详尽评分 —— 总是为 §4b solo 集，其详尽评分是赢得信任的基础。

无论如何捕获都会拍摄每个故事 —— 采样节省评分注意力，不是捕获时间，表格保持可用于任何刻意的后续查看（§7 步骤 4 延续评分审计使用相同的评分保留抽查路径）。这与 `[STORY_CAP]` 未评分尾部故事的信任级别相同，刻意应用。采样永远不会放松 `[FONT_MISSING]`（§4a）—— 无论如何该检查对比较图像不可见。

### 4a. 修复决策树 —— 全局优先

自上而下工作；全局修复一次修复每个组件，逐组件修复只修复一个：

1. **大多数/所有组件以相同方式错误** → 全局，在配置中修复 + 完整重建：
   - 单元格中的上下文/提供者错误（`use<X> must be inside <Provider>`）→ 装饰器未打包（§3 `! preview decorator bundle failed` 行）→ `cfg.provider`。
   - 所有未样式化 / 默认字体 → `cfg.cssEntry`（检查构建日志中的 `[CSS_FROM_STORYBOOK]`）、`cfg.tokensPkg`、`cfg.extraFonts`。
   - **`[FONT_MISSING]` —— 比较循环看不到这个。** 当双方都不提供字体时，双方都渲染相同的 chromium 回退，所以表格看起来"匹配"而每个 claude.ai/design 用户得到错误字体 —— 永远不要接受"双方以相同方式回退"作为通过。根据 `../non-storybook/SKILL.md` §3 中的 `[FONT_MISSING]` 行解决；storybook 特有的补充：`cfg.extraFonts` 路径受包含 `dirname(--node-modules)` 的 git 仓库约束 —— monorepo 中的同级排版包按原样工作；只有在没有 `.git` 祖先时约束才缩小到 `dirname(--node-modules)`，如果你添加了参考缺少的字体，将相同的 `@font-face` 注入 `.design-sync/sb-reference/iframe.html` 使预言机在双方都用真实字体验证。
   - 图标到处缺失 → `cfg.extraEntries`（检查 `[ICON_PKG]`）。
2. **一个组件，`unpaired` 或 `fallback preview`** → 其 `.tsx` 缺少该故事的单元格。预览编译完整的故事模块（hooks、fixtures、本地助手都包含 —— 闭包不是失败模式），所以原因是：配对失败（`storyName` 覆盖）、包装器构建失败（构建日志中的 `! preview build failed`），或模块在加载时抛出 —— 检查表格的 `(page)` 错误行获取真实异常（模块作用域调用到存根未覆盖的包）。打开包装器（生成的：`.design-sync/.cache/previews/<Name>.tsx`；拥有的：`.design-sync/previews/<Name>.tsx`），添加/重命名导出或删除有问题的导入 —— 如果是生成的，将你的修复保存为 `.design-sync/previews/<Name>.tsx` 不带首行标记（就地缓存编辑在此机器上保留但被 gitignore —— 在新克隆上消失，它重新编译但永不重新评分；只有拥有的副本移动评分契约，重建警告编辑的缓存副本）。故事导入使用位置无关的 `@ds-stories/<repo-relative path>` 形式，所以文件在两个位置都能不变地工作。
3. **一个组件，你评分为 `mismatch`** → 错误的 props/组合。读取故事源码；在拥有的 `.design-sync/previews/<Name>.tsx` 中镜像它（将缓存包装器复制到那里但去掉其标记行）。这是编译故事预览的唯一调节器。
4. **`sb-error`** → 故事在 storybook 中也不渲染（数据获取、交互驱动）。将其 id 添加到 `cfg.overrides.<Name>.skip` 并在 NOTES.md 中记录原因。
5. **`[PORTAL?]` / 覆盖组件**（Dialog/Tooltip/Toast）→ 评分已经隔离（每故事捕获），但产品卡片渲染整个网格 html，所以开放覆盖故事也在那里绘制到相邻单元格。设置 `cfg.overrides.<Name>.cardMode: "single"` —— 卡片在一个包装器中全出血渲染一个故事（`primaryStory` 选择它；否则第一个导出），包装器包含 `position:fixed` 后代，并在卡片上声明评分视口使产品在您验证的大小下渲染。对于仅仅太宽而无法放入网格单元格的故事（数据表、全宽条 —— 验证将这些标记为 `[GRID_OVERFLOW] … wide`），改用 `cardMode: "column"`：每个故事保持完整卡片宽度，不丢弃任何内容。对该组件进行有针对性的重建（`preview-rebuild.mjs --components <Name>`，秒级）—— **评分延续**（`cardMode`/`primaryStory` 不在评分键或标记的配置切片中）；只有 `viewport` 更改重新评分（它是捕获视口）并需要完整构建（它移动切片）。

**重建规则 —— 仅重建更改可以触及的内容。** 样式更改（css/字体/令牌）重新渲染每个预览但不移动任何评分契约 —— 评分延续。提供者、`storyImports`、`extraEntries` 和 fork 编辑是评分契约的一部分（它们改变预览挂载的内容）—— 受影响的评分清除并在重建时重新评分。

| 你更改了 | 重建 | 比较 |
|---|---|---|
| 仅预览 `.tsx` | 下面的有针对性的循环（秒级）| 范围 `--components <Name>` —— 其评分清除，重新评分 |
| `overrides`（`skip`/`viewport`）/ `titleMap` | 完整 `package-build.mjs` + `package-validate.mjs`（重新标记有针对性的重建检查的配置键）| 完整 `compare.mjs` —— 触及的组件重新评分；延续的 `match`/`close` 组件直接跳过，待处理集获得新表格（完整构建清除了它们 —— 下一波读取那些表格）|
| `overrides`（仅 `cardMode`/`primaryStory`）| **有针对性的循环**（`preview-rebuild.mjs --components <Name>`，秒级）—— 展示键不在标记的配置切片中，所以 `[CONFIG_STALE]` 不触发；循环重新发出卡片 html 并修补其 renderHash | **不重新评分**：仅展示键不在评分契约中 —— 评分延续；更改的卡片 html 重新发送，重新同步可能抽查它 |
| `provider` / `storyImports` / `.design-sync/overrides/` forks | 完整构建 + 验证 | 完整 `compare.mjs` —— 受影响的评分按上述规则重新评分 |
| css / 字体 / 令牌 | `package-build.mjs --skip-dts` + 验证 | 完整 `compare.mjs` —— 便宜：延续的 `match`/`close` 组件直接跳过，所以只有待处理集针对新样式重新捕获。评分延续 —— 零重新评分，不是零接触：更改的字节仍然重新发送，重新同步可能将它们作为 `verification.canary` 抽查显示 |
| `entry` / `extraEntries` | 完整构建 + 验证 —— 永远不要 `--skip-dts`（它们改变包和导出面）| 完整 `compare.mjs` —— 受影响的评分重新评分 |

活动中 —— §4c 波次仍在等待 —— 将此表的"完整 `compare.mjs`"解读为*最终通过批次*：重建无论如何清除受影响的评分，下一波的范围运行重新捕获那些组件，§4d 收据是全名册结算（§4c 波次间步骤 2）。仅当没有剩余波次时才支付立即的全名册比较。

`--skip-dts` 跳过每个组件的类型提取 —— 大型 DS 构建的慢速部分 —— 并发出存根 `.d.ts` 体，所以其验证按设计失败 `[DTS_STUBBED]`（渲染检查仍然回答"修复有效吗？"）；§4d/§6 门的验证退出 0 要求强制最终构建不带它运行。期望存根构建基础卡片和 README 片段看起来简陋 —— 最终构建恢复它们。`--skip-dts` 仅用于修复循环迭代：任何上传读取的构建 —— 增量批次推送（基础 SKILL.md §3）和 §6 收尾一样 —— 必须是真实的，所以如果 `.ds-build-meta.json` 仍然携带 `dtsStubbed`，在推送之前不带标志重建（批次推送上传磁盘上的 `.d.ts`）。

**将配置编辑批量化为一个周期。** 在支付重建之前，扫描所有待处理的表格裁决和已知问题，找出它们暗示的所有配置编辑（`skip`、`titleMap` 条目、`cardMode`）并一起应用 —— 几分钟内发现的两个编辑不应花费两个重建+验证+比较周期。

**比较运行中途死亡**（浏览器崩溃、OOM）：它捕获的表格有效 —— 先评分它们，然后重新运行；延续范围将重新捕获限定到间隙。永远不要用 `--force` 重启崩溃的运行（它清除你刚获得的评分）。

**在大型 DS 上，在支付完整重建之前验证修复是正确的**：先在一个受影响的组件上运行下面的有针对性循环（或探测其渲染页面）—— 被完整重建验证的错误猜测花费整个周期。**中间验证可以采样**：全局损坏本质上是系统性的，所以 `--render-sample 10` 以一小部分成本回答"修复有效吗？"；完整渲染检查在 §4d/§6 上传门需要 —— 当任何影响渲染的内容移动时；在锚定重新同步上 §7 驱动自动应用该规则（层级规则在那里）。

仅 `.tsx` 的有针对性循环：
  ```bash
  node .ds-sync/lib/preview-rebuild.mjs --config .design-sync/config.json --node-modules <nm> --out ./ds-bundle --components <Name>
  node .ds-sync/storybook/compare.mjs --out ./ds-bundle --storybook-static .design-sync/sb-reference --components <Name>
  ```

  有针对性的循环重新编译预览但不从源重新键入评分契约：故事文件编辑后仅运行此循环会延续旧评分直到下次完整构建或驱动运行重新键入 —— 通过完整构建路由故事编辑（驱动自动这样做）。

### 4b. Solo 阶段 —— 一个，然后几个

不要立即扇出。全局问题必须先进入配置，否则每个子代理都会重新发现它们。

1. **一个组件。** 选择一个简单的、有良好故事的组件（Button 类：几个故事，没有 portal）。运行 §4a 循环直到你从图像中评分每个故事为 `match` —— 仅在迭代停止改善时接受 `close`（上面的评分标准）。**每个修复成为 `.design-sync/NOTES.md` 中的一个要点**：症状 → 根本原因 → 修复，当不是组件特有的时标记 `[GENERAL]`。
2. **再选三个，以多样性为目标：** 一个复合/覆盖（Dialog/Tabs），一个图标或资源密集**且其故事加载远程图片**（这是 `[ASSETS_BLOCKED]` 金丝雀 —— §3 的行：网络沙箱化的 shell 在两个面板上都清空资源，所以评分错误通过；在这里显示它花费一个组件的重新捕获，在全名册通过后显示花费整个传递），一个主题/提供者敏感 —— 并确保集合跨越一个**文本密集**组件（字体/排版 bug 隐藏在仅按钮的 solo 中然后使整个评分波次失效）。同样的循环，solo。*增量路径：* 一旦每个故事评分为 `match`（或根据评分标准的接受标准 `close`），solo 集是第一个验证批次 —— 推送它（基础 SKILL.md §3）。
3. **第一次全名册捕获 —— 按有故事的组件数量大小限制。**
   - **20 个或更少：** 对名册运行一次完整 `compare.mjs`。通过 shell 工具的后台模式后台运行并等待完成通知 —— §2.2 的规则，在这里重述因为它在这里被违反：前台 `sleep` 轮询阻塞了会唤醒你的通知，`pgrep -f` 循环匹配自己的命令行并旋转到超时。（无头 / `-p` 会话：改为同步运行 —— 无头模式没有任务通知重新调用，所以后台运行永远不会被恢复。）如果 ≥30% 的组件以*相同*原因失败，那是你遗漏的全局问题 —— 在配置中修复并在扇出之前重新运行。**在重建之前批量化列表显示的每个 skip 和配对修复** —— 每个重建+比较周期花费几分钟；逐个修复每个项目都花费那个成本。
   - **超过 20 个：不要运行单体完整捕获。捕获在 §4c 的批次内发生** —— 每个子代理运行一个范围 `compare.mjs --components <其批次>` 并评分刚捕获的表格。这带来三个好处：范围捕获并发运行（名册在串行扫描的墙钟时间的一小部分内渲染）；评分在第一个批次的表格存在时开始而不是在最后一个组件渲染后；当一波显示 `[GENERAL]` 问题时，面临风险的工作是到目前为止评分的几个批次，而不是整个名册的捕获和评分。≥30% 相同原因检查随捕获移动 —— 它成为第 1 波学习审查（§4c 波次间）。你不跳过的全名册运行是 §4d 收据：到那时所有内容都已评分，所以它延续组件而非重新捕获它们，花费秒级而非分钟级。

### 4c. 扇出 —— 并行子代理

将仍需工作的组件分成 5-8 个批次 —— 在大型 DS 上（§4b 步骤 3 的 >20 门）那是 solo 集之外的每个组件，大多数还没有表格被捕获；在小型 DS 完整捕获后它是不匹配的集合。将相关组件分组（共享提供者、共享 fixtures —— 一个诊断然后服务整个批次）。每波启动最多 4 个子代理（Agent 工具，在一条消息中使它们并发运行）。四个也是浏览器并发上限：每个子代理的范围比较运行自己的 chromium，超过约 4 个并发捕获有来自机器级争用的启动失败风险。对于每个子代理，填写此提示中的每个 `{…}` 并粘贴**当前** NOTES.md 内容（子代理通过它继承 solo 阶段的学习）：

```text
修复设计同步预览使其匹配仓库自己的 storybook 渲染。
仓库：{REPO_ROOT}。你的组件（仅你的）：{COMPONENT_LIST}。

为什么这很重要：此设计系统正在同步到 claude.ai/design，那里
设计代理将从这个精确的编译包构建真实 UI。
storybook 渲染是每个组件应该样样的证明；
匹配它的预览证明组件完整到达，
不匹配意味着代理用它构建的每个设计都会以相同方式出错。

每个组件的制品（先读这些）：
- {OUT}/_screenshots/compare/<group>__<Name>.png —— 真实 storybook 渲染（左）vs 真实预览渲染（右），每个故事。全分辨率原件在 {OUT}/_screenshots/compare/raw/。
- .design-sync/.cache/compare/<Name>.json —— 配对事实 + 截图路径（无相似性评分 —— 你的眼睛是裁判）。
- 预览源码（真实 JSX 从 '{PKG}' 导入）：拥有时在 .design-sync/previews/<Name>.tsx，否则生成的 .design-sync/.cache/previews/<Name>.tsx。你的修复写入 .design-sync/previews/<Name>.tsx（步骤 2）。
- {OUT}/.stories-map.json —— 将组件映射到故事 id；通过其在 .design-sync/sb-reference/index.json 中的 id 找到每个故事的源文件（`importPath`）。故事源码是预期 props/组合的权威。
- .ds-sync/storybook/SKILL.md §4 —— 评分标准和修复决策树。

第一次操作，整个批次一次：如果你的任何组件还没有比较表格，运行
  node .ds-sync/storybook/compare.mjs --out {OUT} --storybook-static {SB_REF} --components {COMPONENT_LIST}
一次范围运行捕获你批次中每个缺失的表格（一次浏览器启动，不是每个组件一次）；已评分且源未变的组件自动跳过。

每个组件（最多 3 次迭代）：
1. 读取表格；根据 §4 采样规则从两张图像判断主故事（表格太小时用原始 PNG）—— 当组件有 portal、主题/提供者敏感性、拥有的预览或任何警告时详尽评分；通过决策树诊断失败。
2. 将 .design-sync/.cache/previews/<Name>.tsx 复制到 .design-sync/previews/<Name>.tsx 并删除其首行 `// @ds-preview generated …` 标记（拥有的文件生活在 previews/，胜过生成的副本，且持久 + 已提交；就地缓存编辑在此机器上在重建后存活但被 gitignore 并在新克隆上消失）。`@ds-stories/...` 导入从新位置不变地工作。镜像故事的 JSX；内联故事本地的 fixture 数据。
3. node .ds-sync/lib/preview-rebuild.mjs --config .design-sync/config.json --node-modules {NM} --out {OUT} --components <Name>
4. node .ds-sync/storybook/compare.mjs --out {OUT} --storybook-static {SB_REF} --components <Name>   （你的编辑改变了组件的契约，所以这清除其旧评分 —— 这是有意的）
5. 重新读取新表格并将你的裁决写入 .design-sync/.cache/compare/<Name>.grade.json（{"stories": {"<story>": {"verdict": "match|close|mismatch", "note": "…"}}}）；根据 §4 采样规则你信任的兄弟获得 {"verdict": "match", "basis": "sibling-trusted"} —— 在同一个 grade.json 写入中写入，不为它们打开图像。当你评分每个故事为 match 时完成。close 的故事仍然是修复目标 —— 如果你能命名差异，尝试它的调节器；仅在迭代没有改善或没有可操作原因时接受 close，注释必须说明什么不对以及你尝试了什么。3 次迭代后阻止 → 诚实评分（mismatch/close + 注释），记录确切阻塞器，继续。

硬性规则 —— 违反这些会破坏其他代理的工作：
- 仅编辑 .design-sync/previews/{<你的组件>}.tsx、你的组件的 .design-sync/.cache/compare/*.grade.json 文件，和 .design-sync/learnings/{BATCH_ID}.md。
- 永远不要编辑 .design-sync/config.json、.design-sync/NOTES.md、.ds-sync/ 或任何其他组件的文件。
- 永远不要运行 package-build.mjs 或 package-validate.mjs —— 它们重写共享包。preview-rebuild.mjs + 通过 --components 限定范围的 compare.mjs 是你唯一的构建命令。
- 永远不要为你在此迭代中没有打开图像的评分写入图像判断的评分。sibling-trusted 裁决必须携带 "basis": "sibling-trusted" 且仅在图像判断的主故事评分为 match 且组件无警告时允许（§4 采样规则）。
- 在 storybook 中也不渲染的故事（sb-error）需要 cfg.overrides.<Name>.skip；同样 [PORTAL?] 需要 cfg.overrides.<Name>.cardMode "single"。两者都是你可能不做配置编辑 —— 在你的学习文件和最终报告中记录它们；编排器应用它们。永远不要通过在 .tsx 中中和故事的开放状态来"修复"覆盖渗透 —— 那破坏了正在验证的保真度。
- 如果相同的根本原因出现在你的 2+ 个组件中 —— 或即使一次当原因是配置级的（提供者/css/字体/令牌/导入解析）—— 在这些组件上停止：它是全局的。写入你的学习文件 `[GENERAL]`，报告它，不要按组件解决它。全局原因的按组件修复比浪费更糟：没有任何东西会机器删除 `.design-sync/previews/`，所以你为它放置的拥有预览会持续并在每次未来构建中遮蔽修正的生成预览。

学习：在进行时追加到 .design-sync/learnings/{BATCH_ID}.md —— 每个发现一个要点：
`<组件>: <症状> → <根本原因> → <修复>`，如果超出该组件则前缀 [GENERAL]。

已知仓库陷阱（开始前读取）：
{CURRENT_NOTES_MD_CONTENT}

最终报告：每个组件 —— match/close/阻塞 + 一行原因；然后任何 [GENERAL] 学习逐字。
```

**波次间（编排器）—— 学习折叠是强制的，不是可选的：**
1. 读取每个 `.design-sync/learnings/*.md`。将 `[GENERAL]` 要点提升到 `.design-sync/NOTES.md`（去重；保持简洁），然后删除你折叠的每个学习文件。完整 `compare.mjs` 运行在任何学习文件存在时打印 `[LEARNINGS_UNMERGED]`，§4d 驱动收据在相同条件下失败其裁决 —— 被忽视的折叠不能静默发布。
2. **在下一波启动之前立即对每个 `[GENERAL]` 学习采取行动 —— 无论有多少组件显示它。** 2/24 的发生率仍然是全局的；在未行动的 `[GENERAL]` 之上派遣的波次按组件重新支付它，当配置修复最终到达时那些评分被冲掉。应用配置修复，**删除子代理为绕过该原因而编写的任何拥有的预览**（拥有的文件永远不会被机器删除 —— 留在原地它们遮蔽修复），然后完整重建（真实的 —— 步骤 3 的批次推送上传磁盘文件，所以永远不要 `--skip-dts` 存根）+ 验证。然后用范围 `compare.mjs --components` 在 1-2 个该问题实际触及的组件上证明修复有效 —— **不要在活动中运行全名册比较。** 重建已经清除了修复契约更改触及的任何评分；那些组件简单地重新加入队列，下一波的范围运行重新捕获它们，§4d 收据在结束时结算整个名册。活动中捕获大量组件的全名册运行是症状，不是常规步骤：要么捕获的组件从未评分（每个批次必须评分它捕获的所有内容），要么全局切片配置编辑清除了已获得的评分 —— 在支付渲染时间之前诊断。
3. *增量路径：* 推送现在满足 §4d 评分标准的波次组件（每个故事 `match`，或根据评分标准 `close`）作为验证批次（基础 SKILL.md §3）—— 在步骤 1-2 之后，所以来自此波次的全局修复先重建它们。
4. 下一波获得更新的 NOTES.md 内容和仍然失败的组件。在最后一波之后，对剩余内容重复步骤 1 并删除 `.design-sync/learnings/`。

### 4d. 完成标准 + 报告

- **一个 §7 驱动运行是结束收据 —— 每条路径。** 使会话的最终构建成为驱动（`resync.mjs`）；当没有锚存在时省略 `--remote`（首次同步、恢复的项目）—— 锚定项目的完整重新验证仍然通过。门是驱动的裁决：`ok: true` 且 `verification.pendingGrade` 为空。其捕获范围是其工作列表的可捕获子集 —— 首次同步时的每个有故事的组件，重新同步时的 `changed`+`added` 集 —— 跳过延续的评分，所以收据花费范围传递而非完整重新捕获（不可捕获成员通过上传分区重新发送，无需评分；上传验证的组件在门外）。驱动自己检查 `.design-sync/learnings/` 并在任何未折叠的学习文件存在时用 `[LEARNINGS_UNMERGED]` 失败裁决（`.compare-report.json` 聚合保持仅完整运行）。在这个最终运行上每个范围内的组件应该打印 `carried forward` 且零 `grade cleared` —— 该行是下次同步将很快的证明。无更改运行上的清除评分意味着非确定性源输入（不稳定的故事内容）—— 现在追踪它；驱动触发的 `[SPOT_CHECK]` 不是那样（管道搅动被自动验证 —— 确认表格并继续）。
- 每个范围内的有故事的组件有一个当前的 `.grade.json`，每个故事 `match` —— 或 `close` 满足评分标准的接受标准（§4）—— 或通过 `cfg.overrides.<Name>.skip` 跳过并带有 NOTES.md 理由。机械检查是驱动的 `verification.pendingGrade`：那里列出的组件有没有当前裁决的故事且未完成（上传验证的组件豁免）。
- `package-validate.mjs` 在最终重建后仍然退出 0，没有未解决的 `[FONT_MISSING]`（§4a —— 比较预言机看不到的唯一警告）。
- 从最终的 `ds-bundle/.render-check.json`（由 `package-validate.mjs` 写入；`iterations` = 完整重建通过次数）调用 `DesignSync({method: 'report_validate', counts: {total, bad, thin, variantsIdentical, iterations}})`。在驱动范围的收据（§7）上该文件不存在（跳过层级）或仅覆盖样本 —— 当此调用需要完整计数时先用 `--render-sample 0` 重新运行驱动；在不上传任何内容的无更改重新同步上，跳过调用。
- NOTES.md 有一个当前的**重新同步风险**部分，现在趁你还知道它们时写入：什么可能静默过时（内联到配置中的数据、中和的故事导出、绑定到上游 API 的拥有预览），什么仅被部分验证（故事上限、接受的 `close` 理由），以及构建假设了什么（工具链版本、CDN 获取的资源）。修复记录你做了什么；此部分告诉下次运行要观察什么。
- 告诉用户：N/M 个组件评分为 match，哪些是 `close`（以及为什么可接受），哪些被跳过以及为什么。

## 5. 当仓库奇怪时 —— 逃生舱

首次运行在不寻常的仓库上会命中默认值不覆盖的内容。每个启发式都有一个已提交的覆盖 —— 规则是：**永远不要手动修补生成的输出；把修复放在下次运行读取的文件中。** 从失败类别映射到调节器：

| 仓库的奇怪之处 | 调节器 | 存在于 |
|---|---|---|
| 非标准构建/入口（`module` 指向 TS 源码、奇特的 dist 布局）| `cfg.entry`、`cfg.buildCmd` | 配置 |
| CSS 由单独管道构建 / 无 dist 伴随 / CSS-in-JS | 如果有文件则 `cfg.cssEntry`；否则依赖 `[CSS_FROM_STORYBOOK]` —— 转换器从 `sb-reference` 中刮取**编译后** CSS，这是通用捕获所有：无论管道多奇怪，其输出在 storybook 构建中 | 配置 |
| 令牌作为单独包发布 | `cfg.tokensPkg` | 配置 |
| 来自运行时服务 / 专有 CDN 的字体 | `cfg.extraFonts`、`cfg.runtimeFontPrefixes` | 配置 |
| 子路径导出上的图标或组件 | `cfg.extraEntries` | 配置 |
| 命名约定（故事标题 ≠ 导出名）| `cfg.titleMap`；故事↔单元格配对也回退到顺序 | 配置 |
| 无法打包的装饰器/提供者（仅 vite 插件、MDX、别名）| `cfg.provider` —— 显式链胜过装饰器打包；`probe.mjs` 从实时 storybook 推断它；或在组件自己的 `.tsx` 中**内联组合提供者**（拥有的预览可以导入和包装包导出的任何内容）| 配置 / 预览 |
| 无法静态渲染的故事（MSW、数据获取、交互测试）| `cfg.overrides.<Name>.skip` + NOTES.md 行说明原因。Skip 移除故事的单元格，但包装器仍然导入完整的故事模块 —— 如果文件在导入时崩溃（模块作用域获取/worker），拥有 `.tsx` 并删除导入 | 配置 |
| `[PORTAL?]` —— 覆盖/portal 故事在网格卡片中绘制到单元格外 | `cfg.overrides.<Name>.cardMode: "single"`（+ 可选 `primaryStory`、`viewport: "WxH"`）—— 单故事卡片、固定位置包含、声明的产品视口。比较仍然通过 `?story=` 评分每个故事 | 配置 |
| `[GRID_OVERFLOW]` —— 验证测量了网格卡片的几何：`wide` = 故事渲染比单元格宽（单元格裁剪在产品中裁剪它们）；`escape` = 固定/portal 内容定位在任何单元格外 | 应用警告命名的覆盖 —— `wide` → `cardMode: "column"`（每行一个故事，完整卡片宽度，保留所有故事）；`escape` → `cardMode: "single"` + `primaryStory`。`.render-check.json` 中的结构化副本（`gridOverflow`、`gridOverflowCells`、`suggestedOverride`）。将每个标记的组件批量化到一个有针对性的重建（`preview-rebuild.mjs --components A,B,C`）—— 仅展示编辑不触发 `[CONFIG_STALE]` 且评分延续。不要追踪干净的重新验证来确认：应用的修复不能重新标记（single 完全豁免；column 不能重新标记 `wide` —— escape 保持监控，所以后来添加的 portal 故事仍然显示）；如果你想要视觉确认则目视检查 `.review.html` | 配置 |
| `[EXPORT_COLLISION]` —— 同级包（图标等）导出主包也导出的名称 | 主包赢得全局合并，所以从同级导入失败名称的故事渲染错误内容 | 日志命名修复：`cfg.storyImports.bundle: ["<sibling>"]` |
| `[FILE_TOO_LARGE]` —— 构建输出超过上传的 12 MB 每文件上限 | 通常是开发专用的重量级内容打包到预览或装饰器包（语法高亮器、代码即图标）| 立即精简，在评分之前 —— 评分后对拥有预览的精简会重新评分该组件 |
| `[PROVIDER_UNEXPORTED]` —— `cfg.provider` 组件不是包导出 | 构建在发出任何组件预览或文档之前退出 1 —— 输出目录保持部分；修复后重建 | 使用精确的导出名称，或通过 `cfg.extraEntries` 重新导出。检查读取包自己的导出列表，所以缺失是可靠的；隐藏在打包的 CommonJS 重新导出后面的名称无法枚举 —— 那些用 `[PROVIDER_UNVERIFIED]` 警告构建；如果每个预览然后失败"Element type is invalid"，名称错误 |
| 故事导入解析错误（应该在捆绑时填充，或反之 —— 任何导入样式）| `cfg.storyImports.shim` / `cfg.storyImports.bundle` —— 按解析路径匹配的子字符串模式（裸包导入按**指定符**填充，不解析 —— 对那些模式匹配指定符）。未知包子路径（`<pkg>/utils`）默认捆绑；如果应该通过全局，添加到 `cfg.extraEntries`。在包自己的源码仓库中捆绑的自导入没有可解析的内容 —— 先符号链接 `node_modules/<pkg>` → 构建后的 `dist/` | 配置 |
| 故事文件导入默认值无法加载的资源类型（`.yaml`、`?raw`、svg-as-component）| `cfg.storyImports.loaders` —— 在默认值上合并的 esbuild 加载器映射（例如 `{".yaml": "text"}`）| 配置 |
| 生成的预览有错误的 props/组合 | 将 `.design-sync/.cache/previews/<Name>.tsx` 复制到 `.design-sync/previews/<Name>.tsx` 去掉其标记行（永久拥有）| 预览 |
| 源/文档发现遗漏（不寻常的仓库布局）| `cfg.componentSrcMap`、`cfg.docsMap`、`cfg.dtsPropsFor`、`cfg.srcDir` | 配置 |
| 任何更深的 —— 自定义故事格式、奇特的参数提取、CSS 转换 | fork 适配器：将打包的 lib 模块复制到 `.design-sync/overrides/<name>.mjs` 并在 `cfg.libOverrides` 中声明并附一行原因（构建双向交叉检查：`[OVERRIDE_UNDECLARED]` / `[OVERRIDE_MISSING]`）。Fork 已提交，所以重新同步自动使用它们。**`emit.mjs` 和 `bundle.mjs` 是应用契约面 —— 永远不要 fork 它们。** | `.design-sync/overrides/` |

对于**故事处理**，fork 点按关注点分：`story-imports.mjs`（预览编译的所有导入解析策略 —— 为每仓库自定义构建的接缝；完整构建和 `preview-rebuild.mjs` 都遵守），`source-storybook.mjs`（index.json 发现、标题→组件映射、故事源解析 + 导出配对），`preview-gen-storybook.mjs`（包装器模板 / composeStories 语义），`css-fallback.mjs`（从 storybook 构建刮取 CSS/字体）。Fork 拥有损坏的*最窄*模块，保持其导出签名，并在 NOTES.md 中记录仓库的不同之处 —— 下次同步继承所有内容。Fork 从 `.design-sync/overrides/` 加载而其兄弟留在暂存脚本中 —— 将 fork 的相对导入（`./common.mjs` 等）重新指向 `../../.ds-sync/lib/`。导入裸转换器依赖（`esbuild`）的 fork 还需要 `ln -sfn ../.ds-sync/node_modules .design-sync/node_modules` 使节点能从 fork 的位置解析它 —— 每次克隆一次，不是永久一次：链接被 gitignore（`node_modules` 规则），而需要它的已提交 fork 在克隆中存活，所以重新创建它是新克隆设置的一部分。

对于真正在转换器范围之外的仓库，梯子的最后一阶：**上传格式是契约，不是转换器**（见基础技能）。无论如何仓库允许都生成布局 —— 但 `package-validate.mjs` 和比较/评分门对你生产的任何内容不变地应用。预言机永远不会被 fork。

该表中的所有内容都是已提交文件，§2.3 要求在做任何事情之前读取现有配置 + NOTES.md —— 所以每次运行 N+1 重放运行 N 做的每个决定。当你在奇怪的仓库上修复某些内容时，问："哪个已提交文件使这下次自动？"如果答案是没有，那至少是 NOTES.md 条目 —— 可能还有值得报告的缺失行。

## 编写约定标题（上传前）

预览验证后 —— 无论是新编写的还是通过重新同步延续的 —— 运行基础 SKILL.md 中的约定编写步骤（"编写约定标题"）—— 它将你刚才学到的使预览渲染的内容提炼到 `.design-sync/conventions.md`，通过 `readmeHeader` 配置键连接。顺序很重要：先编写文件并设置键，然后根据基础步骤的**重建规则**重建（每条路径上的新驱动运行 —— 首次同步省略 `--remote`）使生成的 README 实际携带标题且 §4d 收据描述 §6 上传的构建。然后继续下面的上传。

## 6. 上传

适用两条路径中的哪条由基础技能 § 路由器决定（运行开始时固定 → 原子；否则空 → 增量，非空 → 原子）：

**增量路径**（首次同步到空项目）：计划自本文件 §3 门以来一直开放，验证批次已经落地。在 §4d 通过且约定标题步骤运行后（基础 SKILL.md —— 它必须在上传其重建输入之前），运行基础 SKILL.md §3 中的收尾 —— 哨兵围栏 → 完整内容写入 → 协调删除 → 哨兵重新布防 → `_ds_sync.json` 最后。此部分的分块、卫生和保持本地规则适用于那些写入；`projectId` 已在 §1 中记录；此部分末尾的交接审计仍然适用。跳过此部分其余序列 —— 它是原子路径。

**原子路径**（重新同步，或任何非空目标 —— 它可能在使用中，所以在所有内容验证后一次通过更新）：以下所有内容。仅在 §4d 和约定标题步骤（基础 SKILL.md）之后。`DesignSync(finalize_plan)` 带 `localDir: "./ds-bundle"`。

- **写入 —— 所有内容，始终**（完整重新验证和重新同步同样）：`writes: ["components/**", "tokens/**", "fonts/**", "_vendor/**", "_preview/**", "guidelines/**", "_ds_bundle.js", "_ds_bundle.css", "styles.css", "README.md", "_ds_sync.json", "_ds_needs_recompile"]`。重新上传未更改的文件是幂等且便宜的。范围不足的写入列表会静默且永久地使项目不同步 —— 完整写入是安全的默认值。
- **删除。** 锚定重新同步：逐字来自差异 —— 精确复制 `.sync-diff.json` 的 `upload.deletePaths`；永远不要手动推导列表，当差异列出路径时永远不要传递 `[]`。没有锚（正在完全重新验证的重新采用或恢复的非空项目）：差异看不到项目的历史，所以现在审查其 `list_files` —— 在 `finalize_plan` 之前 —— 找出此构建不产生的文件，将那些审查过的路径放在计划的 `deletes` 中（未在计划中命名的删除被拒绝）。
- **§4d 结束收据同时是上传的真实来源。** 会话的最终构建已经是 §7 驱动运行（§4d）；裸 `package-build.mjs` 运行清除 `.sync-diff.json`，驱动的差异阶段重新生成它，所以 `deletePaths` 和 `upload.any` 描述你上传的精确字节 —— 一次运行既是验证收据又是上传清单，之后没有单独的完整比较。
- **`upload.any === false` → 完全跳过上传** —— 项目已经匹配此构建。（下面的交接审计仍然适用。）
- **`_ds_sync.json` 是绝对最后的写入** —— 在所有内容写入、所有删除和哨兵重新布防之后，在它自己的 `write_files` 调用中。如果提前上传，中途计划失败会使锚担保项目没有的文件，确定性重建意味着后续同步不会修复它们。
- **保持本地的内容**：`_sb/**`（storybook-static 是参考，永远不上传），点前缀条目（`.stories-map.json`、`.compare-report.json`、`.ds-build-meta.json`、`.sb-static/`、`.sync-diff.json`），和 `_screenshots/`。`_vendor/` 和 `_preview/` 确实上传 —— 预览卡片从它们加载 React 和编译后的预览。

如果 `finalize_plan` 被拒绝，**停止** —— 拒绝意味着会话无法批准，不是参数错误。告诉用户什么被拒绝并询问他们想如何继续：再次尝试批准，或拿验证后的 `ds-bundle/` 自己交互式运行上传。

在计划批准后，上传是固定序列：

1. **哨兵优先**：`DesignSync(write_files, [{path: "_ds_needs_recompile", localPath: "_ds_needs_recompile"}])` —— 它将应用的清单/复制机制防护在半上传状态。
2. **所有内容写入**，分块为 ≤256 文件的 `write_files` 调用在同一 `planId` 下。服务器还限制有效载荷字节，不只是文件数 —— 将二进制密集目录（fonts/、images）分批到更小的块，在 500 时减半块大小并重试。
3. **所有删除**：`DesignSync(delete_files)` 对 `upload.deletePaths` 中的每个路径。（无锚：你在 `finalize_plan` 时审查到计划 `deletes` 中的路径 —— 上面的删除要点。）如果 `delete_files` 拒绝远程不存在的路径（基础卡片组件没有 `_preview/` 文件），不带被拒绝的条目重试 —— 该未找到拒绝是你可能继续过去的唯一失败。
4. **哨兵重新布防，然后 `_ds_sync.json` 最后。** 锚也在删除之后 —— 失败的删除会留下刷新锚不再看到的远程文件。

任何其他重试无法清除的写入/删除失败意味着**停止** —— 不哨兵重新布防，不 `_ds_sync.json`。未锚定的项目仅在下一次同步时重新验证；半应用上传上的新锚是永久的。

**上传卫生**：保持文件列表和块清单在 `.design-sync/` 下 —— 永远不要裸 `/tmp` 路径，那里另一个仓库同步的过时列表会上传错误的设计系统。在上传之前立即从实时 `ds-bundle/` 重新生成列表，并检查：组件名称属于此设计系统，包的 `window.<globalName>` 匹配。以 `DesignSync(list_files)` 完成以确认计数。

仅在上传后 `list_files` 计数验证后，**在 `.design-sync/config.json` 中记录 `projectId`**（如果不存在或不同）（这是后挡 —— §1 在目标结算时为每条路径记录 id，所以通常已经存在；永远不应发生的是在上传验证之前在这里记录 id，将配置固定到内容还不真实的项目）—— 它固定哪个项目锚定未来重新同步。完成后，告诉用户：项目 URL（`https://claude.ai/design/p/<projectId>`）、组件计数、比较结果摘要，以及验证干净退出。持久集合（下面交接审计中的规则：`.design-sync/` 下所有未被 gitignore 的内容）必须落入仓库供重新同步重用每个修复；验证状态随上传的 `_ds_sync.json` 存在，不在 git 中。下面的交接审计覆盖提交提议。

**最后一步 —— 审计交接。** 未来运行的速度和正确性取决于这次运行留下的内容；验证它，不要假设：

1. `git status` —— 持久集合（`.design-sync/` 下所有未被 gitignore 的内容 —— 今天是 config.json、NOTES.md、`conventions.md`、`previews/`、`overrides/`；规则是契约，所以未来的持久文件通过构造在集合中）是同步的仓库足迹；`sb-reference/`、`learnings/`、`.cache/`、`.ds-sync/` 被忽略。如果此次运行创建或更改了任何持久文件，**提议提交它们并打开 PR**（一个提交，仅同步状态 —— 没有不相关文件）。未提交的修复是下次同步没有的修复。
2. 重新读取 NOTES.md，仿佛你是下一个代理，对本次会话一无所知：你能仅用写下的内容跳过今天的调试吗？每个拥有的预览、skip、配置调节器和 lib fork 应该追溯到一个要点，重新同步风险部分应该是当前的（§4d）。现在写入缺失的内容 —— 今天花费一分钟，避免以后重新推导。
3. 重新同步后 —— 无论它更改或重新评分了多少 —— 保持 NOTES.md 和 git 状态与你找到它们时完全相同，除非运行产生了下次运行需要知道的内容；只有当它为未来同步增加价值时才给用户一些提交的东西。

## 7. 重新同步 —— 一个命令路由工作

仓库承载同步的输入（配置、拥有的预览、NOTES.md）；上传的项目承载锚（`_ds_sync.json`）。先读取 NOTES.md（重新同步风险是观察列表），然后：

1. **刷新输入。** 重新复制暂存脚本（§2.4 的 `cp -r` 行 —— 瞬间；过时的 `.ds-sync/` 对这些指令运行旧转换器）。当 DS 源可能已更改时重新运行 `buildCmd` **并重建 `.design-sync/sb-reference`** —— 它们必须一起移动；有疑问时两者都重建（确定性构建使不必要的重建成为无操作）；捕获日志中的 `[REFERENCE_STALE?]` 意味着你忘记了）。新克隆补充：§2.4 依赖安装 + chromium、§2.2 sb-reference 构建，以及 —— 如果仓库携带带裸导入的 `.design-sync/overrides/` fork —— `ln -sfn ../.ds-sync/node_modules .design-sync/node_modules`。
2. **获取锚**：`DesignSync(get_file, path: "_ds_sync.json")` → 保存到 `.design-sync/.cache/remote-sync.json`。项目中没有 sidecar → 首次同步范围（省略下面的 `--remote`）。
3. **从仓库根运行驱动**：

   ```sh
   node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules <nm> \
     [--entry <dist-entry>] --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json
   ```

   它链接构建 → 差异 → 验证 → 捕获（限定到新 + 契约更改的组件）并打印一个裁决 JSON（也写入 `ds-bundle/.resync-verdict.json`）。暂存日志流到 stderr。驱动是幂等的 —— 修复后重新运行它。对于每个组件预览迭代使用 §4a 有针对性的循环（秒级，不是完整构建 + 渲染检查）；驱动重新运行是结束收据。

   驱动还按差异证明的内容限定验证的渲染检查（显式 `--render-sample` / `--no-render-check` 标志总是赢）。有健康锚且包 + 样式未更改时，每个未更改预览的渲染输入与上次上传渲染验证（或明确接受）的字节相同 —— 差异将锚固定到新 sidecar，`[SYNC_STALE]`/包 sha 重新计算将渲染面固定到磁盘（样式由刚写入两者的构建固定），重新渲染相同字节测试的是你的 chromium 安装，不是制品。所以：完全没有更改 → 渲染检查**跳过**（该运行上的 `[RENDER_SKIPPED]` 警告是驱动宣布且预期的 —— 不是要追踪的新警告）；某些东西仍然发布但没有影响渲染的内容移动（文档/指南编辑、锚刷新）→ **采样**（`--render-sample 10`）；任何可能更改渲染的内容移动 —— 组件更改/添加/搅动、包或样式（`.d.ts`/`.prompt.md` 编辑落在这里：它重新发送包，其标题嵌入那些文件的哈希）—— 或没有健康锚 → **完整**，一如既往。文件形状检查（`[SYNC_STALE]`、包标题、CSS/字体、`.d.ts` 解析）在每个层级完整运行；传递 `--render-sample 0` 强制完整渲染传递。
4. **对裁决采取行动** —— 每个需要你操作的字段：

   | 字段 | 你的工作 |
   |---|---|
   | `ok: false` | 失败的阶段（`stages.<name>`）记录了它的 [TAG] —— 按上面该阶段的部分修复，重新运行。每个阶段绿色？检查 `learningsUnmerged` |
   | `learningsUnmerged` 非空 | 未折叠的扇出学习 —— 折叠到 NOTES.md，删除文件（§4c 步骤 1），重新运行；仅此就失败 `ok`，运行保留参考漂移金丝雀供重试 |
   | `verification.pendingGrade` | 评分那些新表格（§4 标准）。在捕获日志中：`[STORY_CHANGED]` → 先在拥有的 `.tsx` 中镜像故事；`unpaired` → 添加导出；命名拥有导出的 `extraCells` → 修剪它 |
   | `verification.canary` | 管道搅动（或参考 storybook 更改）且你的源稳定 —— 评分保留；确认命名的 `[SPOT_CHECK]` 表格与记录的评分。几个分歧 → 重新评分那些组件；广泛分歧 → `--force` 完整传递 |
   | 验证日志中的警告行（`[RENDER_THIN]` 等）| 检查 NOTES.md 的已知列表 —— 那里记录的警告在之前的同步中被分类（合法短的组件永远读为 thin）；那里未记录的警告是新的 —— 查看该组件，然后修复它或记录在 NOTES.md 中 |
   | `verification.removed` | 上游消失的组件 —— 确认删除是有意的 |
   | `upload.styling: true` | 样式自动重新发送；评分保持 |
   | `upload.any: false` | 此裁决没有要上传的内容 —— 继续步骤 5；只有在它之后你才算完成（那里编写的标题重新运行驱动）|
   | `upload.any: true` | §6 上传 —— 默认完整写入，`deletes` 逐字来自 `upload.deletePaths`（永远不要按验证分区限定写入）|

   评分设计上跟随你的源 —— DS 源、CSS 和包更改延续，管道搅动作为 `verification.canary` 到达而非重新评分。要刻意审计延续的评分（在主要 DS 版本升级后，或怀疑时），运行 `node .ds-sync/storybook/compare.mjs --out ./ds-bundle --components <A,B> --spot-check-components <A,B>` —— 新表格，评分保留 —— 并确认表格仍然匹配记录的评分。
5. **运行约定标题步骤**（基础 SKILL.md "编写约定标题"）—— 在对裁决采取行动之后，在任何上传之前，无论裁决说了什么。在重新同步上它根据新构建验证现有的 `.design-sync/conventions.md` 并报告漂移；对于在该步骤存在之前同步的仓库它首次编写文件。如果它编写或更改了标题，根据基础步骤的**重建规则**重建（这里的驱动运行）并对新裁决采取行动 —— 之前的裁决先于标题。
6. 在 `finalize_plan` 之前立即重新获取 sidecar；如果它移动了（并发同步），重新运行驱动并对新裁决采取行动。
<!--
name: 'Skill: Design sync Storybook source shape'
description: Design sync sub-skill instructions for using a repo's Storybook as the fidelity oracle when building, validating, matching, uploading, and re-syncing component previews
ccVersion: 2.1.199
-->
# Storybook source shape

Storybook is the **fidelity oracle, not the runtime**. The converter bundles the package's compiled `dist/` into `_ds_bundle.js` — the same bundle the claude.ai/design agent builds with — and generates each preview by **compiling the story source module itself** (hooks, fixtures, local helpers — the whole closure comes along), with every component import resolved to that shipped bundle (`lib/story-imports.mjs` redirects package *and* relative component imports to `window.<Global>`). The repo's own storybook render is the ground truth those previews must match: a compare harness screenshots each story in the reference storybook and the matching preview render side by side, and you iterate until they match. Nothing from storybook-static is uploaded, and no story code is ever evaluated at build time — stories run only in the browser, against the real artifact.


Requires React 18+. Playwright + chromium are **required** for this shape (the compare loop is the verification), not optional.

**First sync or re-sync?** A re-sync is marked by a config whose `projectId` and `pkg` were both in place before this run started — most of this document then doesn't apply; go to §7, where one driver run routes the work and untouched components cost nothing. Everything else takes the full flow (§2 build → §3 self-heal → §4 match → conventions header (base SKILL.md, before upload) → §6 upload), where every component gets verified and graded once — that includes a partial config left by an aborted run, and a pin this run itself just recorded in the base skill's §1. (Only the old `design-sync.config.json` present? Move it first and commit: `mkdir -p .design-sync && mv -n design-sync.config.json .design-sync/config.json`, then apply the same test.)

## 2. Build, then run the converter

1. **Build the DS package *and its workspace dependencies*.** The converter bundles `dist/` into `window.<Global>`. Run `<pm> run build`; in a monorepo use `turbo run build --filter=<pkg>` or `pnpm -F "<pkg>..." build` (the trailing `...` is required — bare `-F <pkg>` skips dependencies and you'll see `Cannot find module '@scope/tokens'`). If `package.json` `module`/`exports['.']` points at TS source, find the actual built entry and pass it via `--entry`. **Do this before step 2** — storybook often imports sibling packages from their built `dist/`.
2. **Build the reference storybook ONCE into `.design-sync/sb-reference/`** — NOT under `ds-bundle/` (the converter wipes `--out` on every rebuild, and storybook builds take minutes; the reference must survive the fix loop):

   ```bash
   npx storybook build -c <storybookConfigDir> -o .design-sync/sb-reference
   ```

   Run it from the directory whose `package.json` has the storybook devDependencies — usually the one containing `.storybook/`; monorepos often have several storybooks, so pick the one covering the package you're syncing. **Make `-o` the repo-root path** (e.g. `-o "$(git rev-parse --show-toplevel)/.design-sync/sb-reference"`): the converter and compare resolve `.design-sync/` from the repo root, so a cwd-relative `-o` in a subpackage puts the reference where nothing will find it. Use `npx storybook build` directly, **not** the repo's `npm run build-storybook` script (wrong output dir). Then check `.design-sync/sb-reference/iframe.html` exists and is >10KB — `index.json` alone can exist with a failed build.

   Long builds: background them **through your shell tool's background mode only** and wait for the completion notification. Never a bare `&` (untracked — the notification never comes), and never a `pgrep -f '<script>'` poll loop (it matches its own command line and spins to timeout). Headless / `-p` sessions: run long commands synchronously instead — there is no task-notification re-invocation there, so a backgrounded run is never resumed.

   `.gitignore` additions: `.design-sync/sb-reference/`, `.design-sync/learnings/`, `.design-sync/.cache/`, `.design-sync/node_modules` (fork symlink — recreated per clone), `.ds-sync/`, `ds-bundle/` — build artifact, transient scratch, verification working state, the symlink, staged scripts, regenerated output. Committed: the durable set (the rule in non-storybook §2, same here: everything under `.design-sync/` not gitignored — previews/ holds your authored files ONLY; generated story-module wrappers live in `.design-sync/.cache/previews/` and regenerate every build; the converter never writes or deletes anything in `previews/`). Verification state is never committed — cross-machine carry-forward comes from the uploaded project's `_ds_sync.json`. Rebuild the reference only when stories or the DS source change.
3. **Write `.design-sync/config.json`** — only `pkg` and `globalName` required. **If it already exists, read it first and keep what's there** — `titleMap`, `overrides`, and `provider` accumulate fixes from prior syncs. Also Read `.design-sync/NOTES.md` first — its **Re-sync risks** section is the prior run's watch-list; re-verify those items instead of assuming carry-forward covers them. The package-shape field table in `../non-storybook/SKILL.md` §2.6 applies verbatim; the fields that matter most here:

   | Field | Value |
   |---|---|
   | `pkg` / `globalName` | `pkg` required; `globalName` auto-derived from it when omitted |
   | `shape` | `"storybook"` — pins detection |
   | `storybookStatic` | `".design-sync/sb-reference"` — so re-syncs and compare find the reference without flags |
   | `storybookConfigDir` | the `.storybook/` dir (monorepos) |
   | `buildCmd` | what to re-run before the converter on re-sync |
   | `titleMap` | `{title: ExportName}` when story titles don't match export names; `{title: null}` excludes a non-visual/internal component from the sync entirely |
   | `overrides` | `{<Name>: {skip: [storyIds], cardMode: "single"\|"column", primaryStory: "<Export>", viewport: "WxH"}}` — `skip` for stories that can't render statically; `cardMode: "single"` for overlay components (§4a.5, §5), `"column"` for stories wider than a grid cell (the `[GRID_OVERFLOW]` row in §3) |
   | `provider` | usually unnecessary for **previews** — `.storybook/preview` decorators are auto-bundled; set only when that fails. Before §6 upload, distill decorator-provided context into `cfg.provider` — README/prompt.md wrap guidance is generated from config only (decorator-only wrapping ships a generic note). **Setting it also replaces the decorators as the preview wrapper on the next build**: scoped-compare a themed component after the switch — an incomplete distillation regresses previews the decorators rendered fine, and carried-forward grades won't catch it. Format: `{"component": "ThemeProvider", "props": {…}, "inner": {…}}` — a nested chain, outermost first; each `component` must be a bundle export. Literal `props` are for small scalars (`"theme": "light"`) and stable snippets. For data that already exists in the repo — a locale JSON, a theme object — **prefer `{"$ref": "<export>"}`** backed by a 2-line module added via `cfg.extraEntries` (e.g. `export { default as previewI18n } from '../locales/en.json'`): a `$ref` emits `window.<Global>.<export>`, so the data lives once in the bundle and re-reads from its source file on every build. Inlining a copy is acceptable for something tiny and stable, but know the cost — a literal duplicates into every card's html and silently rots when the source file changes, so anything sizable or evolving belongs behind a `$ref`. Path forms for `extraEntries`: a bare name resolves from `node_modules`; a repo-owned module needs an explicit `./`/`../` package-relative path (workspace-bounded — the build logs `! extraEntries: … skipped` if it escapes). |

4. **Stage scripts + install converter deps** (isolated in `.ds-sync/`, repo lockfile untouched):

   ```bash
   mkdir -p .ds-sync && cp -r "<skill-base-dir>"/package-build.mjs "<skill-base-dir>"/package-validate.mjs "<skill-base-dir>"/resync.mjs "<skill-base-dir>"/lib "<skill-base-dir>"/storybook "<skill-base-dir>"/non-storybook .ds-sync/
   echo '{"name":"ds-sync-deps","private":true}' > .ds-sync/package.json
   (cd .ds-sync && npm i esbuild ts-morph @types/react playwright && npx playwright install chromium)
   ```

   If chromium install fails, `npx playwright install-deps chromium` first; if the environment can't install chromium, set `DS_CHROMIUM_PATH=<system-chromium>`.
5. **Run the converter, validator, and compare** — synchronously, stopping at the first non-zero exit (compare only runs once build + validate are clean — §3). Large DSes (≈100+ components) may need `NODE_OPTIONS=--max-old-space-size=<MB>` for the build; **never pipe the build through `head`/`tail`** (the pipeline masks the exit code — an OOM looks like success); redirect to a file and read it:

   ```bash
   node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules <pkg-node-modules> \
     --entry <built-dist-entry> --out ./ds-bundle
   node .ds-sync/package-validate.mjs ./ds-bundle
   node .ds-sync/storybook/compare.mjs --out ./ds-bundle --storybook-static .design-sync/sb-reference \
     --components <solo-phase picks>   # scope the FIRST compare to the §4b solo components
   ```

   In a monorepo, `--node-modules` is the DS package's own `node_modules` — unless hoisting leaves it sparse (yarn's `node-modules` linker keeps `react` only at the repo root): if `react/` or `react-dom/` is missing inside, pass the repo-root `node_modules` instead. In the DS's own source repo `node_modules/<pkg>` doesn't exist, hence `--entry`. The build logs `[ICON_PKG]` / `[TOKENS_PKG]` auto-detections and bundles `.storybook/preview` decorators as the preview wrapper (`preview-decorators.js`) so previews get the same provider chain stories do.

   Scope the first compare run: a full capture of a large DS is thousands of chromium navigations — pointless before the solo phase has flushed global issues (each global fix invalidates every capture). The first roster-wide run happens per §4b step 3 — and on a DS over 20 storied components even that is size-gated into §4c's scoped batches, so the only mandatory full-roster run is the §4d receipt, which carries graded work forward instead of recapturing it. For a DS with >100 storied components, also tell the user the expected scale (components × stories) before fan-out and let them narrow scope if they want.

## 3. Self-heal loop (build + validate)

Fix `[TAG]` errors → rebuild → re-validate until both exit 0, **before** starting the compare loop in §4 — there's no point pixel-matching previews while the bundle itself is broken. Shared converter tags (`[NO_DIST]`, `[WORKSPACE_SIBLING]`, `[CSS_*]`, `[FONT_*]`, `[TOKENS_MISSING]`, `[DTS_*]`, `[RENDER*]`, …) behave identically to the package shape — use the table in `../non-storybook/SKILL.md` §3. Lines printed as `hypothesis:` under an error are leads, not instructions: run their verify step first, and if it doesn't confirm, drop the hypothesis and diagnose from the error text itself. Storybook-specific:

| Tag | Symptom | Fix |
|---|---|---|
| `[SB_REFERENCE_MISSING]` | compare can't find `iframe.html` | Build the reference (§2.2); set `cfg.storybookStatic`. |
| `[SB_BUILD_FAIL]` | converter's own storybook build failed | You skipped §2.2 — build the reference yourself and set `cfg.storybookStatic` so the converter never needs to. |
| `[ZERO_MATCH]` (storybook flavor) | no story entries matched | Check the storybook config's `stories` glob; then `titleMap`. |
| `[TITLE_UNMAPPED]` | N titles don't match an export | `cfg.titleMap {<title-name>: <export-name>}`. |
| `(preview: <Name> — no story exports paired …)` | index story names couldn't be matched to module export keys (pairing tries the display name, then the story ID's tail) | the component shows the floor card; fix the pairing — usually an owned `.tsx` re-exporting the stories under matchable names. |
| a preview cell errors with `undefined`-component / wrong-context messages | a story import resolved the wrong way — relative, tsconfig-alias, and bare-workspace imports all go through the same policy (see `lib/story-imports.mjs`'s rules) | `cfg.storyImports.shim` / `cfg.storyImports.bundle` substring patterns force the resolution per resolved path — the cheap fix before forking the seam. |
| `! preview build failed: <Name>` | the story module didn't COMPILE (top-level await, an import of a package esbuild can't resolve, an asset extension with no loader) | read the esbuild error above the line. Unknown asset extension → `cfg.storyImports.loaders` (merged over the defaults, e.g. `{".yaml": "text"}`); unresolvable import → own the `.tsx` and drop it. The component shows the floor card until fixed. |
| a story's own stylesheet is missing from its cell | story-local `.css`/`.scss` side-effect imports compile as empty (component styles ship via the bundle css). Exception: `.module.css` IS compiled — classes resolve and `_preview/<Name>.css` is linked automatically | usually nothing — the styles are decoration the storybook page adds. If the story genuinely depends on them, inline the styles in an owned `.tsx`. |
| `[BUNDLE_EXPORT]` | components aren't functions on `window.<Global>` | `extraEntries` for subpath/icon exports; check the dist entry is the full build. |
| `[SCHEDULER_MISSING]` | dist imports `scheduler` | react-dom leaked into the DS dist — check its build's externals. |
| `! preview decorator bundle failed` | decorators couldn't be bundled | Set `cfg.provider` manually, or run `node .ds-sync/storybook/probe.mjs --storybook-static .design-sync/sb-reference` to infer the chain from the live storybook (replace each `$hint` with a real value). |
| previews error at `_vendor/preview-decorators.js` load (storybook-API `undefined` errors) | the `.storybook/preview` import graph reached a storybook-runtime module the stubs don't cover | `manager-api`/`preview-api` are stubbed with functional no-op hooks and every other `@storybook/*`/`msw` module with inert callables (`fn()`, `action()`, `setupWorker()` at module scope all evaluate harmlessly); if some other API still crashes, set `cfg.provider` explicitly — it skips decorator bundling entirely. |
| `[ASSETS_BLOCKED]` from compare | the capture browser inherited a network-sandboxed shell — story assets (CDN images/fonts) failed on **both** panels, so grades can falsely pass while end users see different output | re-run `package-validate.mjs` + `compare.mjs --force` from a shell with egress to the listed hosts: approve running the command without the sandbox when prompted, or add the hosts to the sandbox allowlist. Don't grade image-bearing components while this prints. |

**Incremental path (base SKILL.md §3) — this is the open-the-channel gate.** The first time build + validate both exit 0, open the upload channel before starting §4: the user approves once here, then watches components land as grading proceeds. Nothing uploads until the first graded batch — the shared base files ride with it — and the batch pushes come from §4b/§4c. (Atomic path: nothing uploads until §6.)

## 4. Match previews to storybook

`compare.mjs` is a **capture harness — it photographs, you grade.** It computes no similarity heuristics (pixel/text/font scores mislead whenever framing legitimately differs); the judgment is made from the two true screenshots. Compiled previews capture **per story** — each story renders alone via `?story=<Export>` at the full capture viewport, exactly as storybook frames the reference side — so sibling stories can't interfere (portal stacking, shared radio-group names, focus, container measurement). Two output tiers:
- **Transient** (under `ds-bundle/`, wiped by rebuilds): `_screenshots/compare/<group>__<Name>.png` — sheet with one row per story: the **true storybook render | the true preview render**, side by side. Sheet images are shrunk to fit; the full-resolution originals are in `…/compare/raw/` (`…__sb.png` / `…__ds.png`) — Read those when the sheet is too small to judge confidently.
- **Campaign state** (in `.design-sync/.cache/compare/`, gitignored): `<Name>.grade.json` — your verdicts — and `<Name>.json` — capture facts: story↔cell pairing, shot paths, `previewKind`, the component's `srcSha` (story-file fingerprint), spot-check anchors. Reconstructible — absence just means "capture again". The only verdicts the script emits are factual: `sb-error` (story doesn't render in storybook), `unpaired` (no preview cell for the story), `error` (cell threw); every rendered pair is `needs-grade`.

Compare captures at most 6 stories per component by default — `[STORY_CAP]` in the log names components with more, and `--max-stories <n>` raises the cap. The cap is NOT part of the grade contract: raising it just captures the tail stories for incremental grading, and existing verdicts survive. One consequence to know: a capped component that grades fully `match`/`close` is verified-by-upload in full on future syncs even though its tail stories were never individually graded — raise the cap when those tail stories carry distinct variants worth verifying. Fan-out subagents must not change it mid-wave (sheets would cover different story sets than the orchestrator's worklist assumed).

**State across runs** — the first run verifies everything once; after that, one rule: **grades follow your sources** — the story files, your owned previews, the story set, the preview-affecting config (`provider`/`storyImports`/`extraEntries`/`overrides`/`titleMap`), and committed `.design-sync/overrides/` forks. Pipeline churn (a skill or toolchain update re-rendering everything) is auto-verified by a sampled `[SPOT_CHECK]` with grades kept; your edits re-grade only what they touch. Pixel jitter can never churn grades.
- *Sources unchanged* + fully graded `match`/`close` → **skipped outright** (`carried forward`): no capture, no re-grade — even when the bundle, styling, storybook, or the converter itself were rebuilt. `--force` recaptures everything **and clears all grades** — systemic re-verification, not casual sheet regeneration.
- *Sources changed* (story edited, `.tsx` edited, config/fork edited) → recapture, grade cleared, re-grade from the fresh sheet. `[STORY_CHANGED]` marks stories whose code moved — those are the ones where an OWNED `.tsx` **must be updated** (generated previews re-derive automatically); a recapture *without* `[STORY_CHANGED]` usually just needs the re-grade.
- *`[SPOT_CHECK]`* → re-captures named components **without clearing their grades**; Read the fresh sheets and confirm they still match the recorded grades. It can arrive driver-triggered after pipeline churn — the normal verification of a skill/toolchain update, not a bug. Divergence remediation scales with the churned set: a couple of components → re-grade just those; widespread → stop, diagnose, then `--force` a full pass. `--spot-check N` tunes the full-run random sample (0 disables); `--spot-check-components A,B` names picks explicitly, honored on scoped runs too (the §7 step-4 audit).
- *`[REFERENCE_STALE?]`* → the bundle changed but the reference storybook didn't. If the DS source changed, rebuild `.design-sync/sb-reference` before grading — a stale reference makes every grade a comparison against the *old* design.
- *A story renders differently every capture* (`new Date()`/`Math.random()` content) → the fingerprint is the story FILE, so the contract is stable — but the pixels aren't, and grading judges pixels. The frozen capture clock stabilizes date renders; for truly random content, pin values in an owned `.tsx` or `cfg.overrides.<Name>.skip` the story with a NOTES.md line.

Captures are stabilized for grading comparability (animations fast-forwarded, reduced motion, frozen clock — both panels show the same settled frame, the same rendered date). This is verification-only: shipped previews are untouched and fully animated.

**Grading is done by whoever is working the component** — you in the solo phase, each subagent for its own components in fan-out. After each compare run: Read the sheet (and raw PNGs when in doubt), judge each story **from the images alone**, Write the verdicts to `.design-sync/.cache/compare/<Name>.grade.json` (campaign-local working state — what makes a verdict durable is the upload: the uploaded `_ds_sync.json` anchors verified-by-upload skips on every future sync, any machine):

```json
{"stories": {"Default": {"verdict": "match"}, "Compact": {"verdict": "match", "basis": "sibling-trusted"}}}
{"stories": {"Loading": {"verdict": "mismatch", "note": "spinner missing — story uses MSW mock"}}}
```

(Two components' files: a clean one graded under the sampling rule below — `Default` is the image-judged primary story, `match` on a warning-free component, which is what licenses the sibling-trusted entries — and a mismatching one, whose note drives the next fix.)

Rubric — grade what a designer would care about, looking at the two renders:
- `match` — same content, composition, and styling. Ignore antialiasing fuzz, scrollbar slivers, sub-5px offsets, and framing differences (the storybook canvas and the preview page frame differently — judge the component, not its surroundings).
- `close` — recognizably the same rendering with a minor delta (slightly different padding, focus ring, placeholder text). **`close` is still a fix target, not an exit:** if you can name the delta, you can usually name the knob — keep iterating. Accept `close` only after an iteration fails to improve it or no actionable cause remains, and the note must then say both *what's off* and *what you tried / why it's not fixable* (e.g. "focus ring color differs — storybook applies a global focus addon, not part of the DS").
- `mismatch` — wrong/missing content, unstyled output, wrong variant, missing icons/images, default fonts. The note must say *what* differs — it drives the next fix.

When the REFERENCE side is the artifact — storybook gates the story behind UI chrome (a theme/control toggle message) while the preview renders the real component — judge the component render on its own and note the gating; a preview that renders *more* than the gated reference is not `close`.

**Grade the primary story, trust the rest.** Sibling stories of one component run through the same pipeline — same imports, same provider chain, same CSS — so when one of them renders faithfully the rest almost always do too. On a first sync, judge from images the component's **primary story** only (`cfg.overrides.<Name>.primaryStory` when set — the same story the single-mode card renders — else the sheet's first story). If it grades `match` and the component is clean — no `sb-error`/`unpaired`/`error` cells, no `[PORTAL?]`, no `[RENDER_BLANK]`, no blank or size-anomalous shots — write `match` for the remaining stories with a basis marker, `{"verdict": "match", "basis": "sibling-trusted"}`, so the record says how each verdict was reached (compare reads only the `verdict` string). All of a component's verdicts — the image-judged primary plus every sibling-trusted entry — go in its one `grade.json` Write: trusted siblings cost no image opens and no per-story passes. Grade exhaustively, story by story, when the component has portals/overlays, theme or provider sensitivity, an owned preview, or any warning — and always for the §4b solo set, whose exhaustive grading is what earns the trust in the first place.

Capture photographs every story either way — sampling saves grading attention, not capture time, and the sheets stay available for any deliberate later look (the §7 step-4 carried-grade audit uses the same grades-kept spot-check path). This is the same trust class as `[STORY_CAP]`'s ungraded tail stories, applied deliberately. Sampling never relaxes `[FONT_MISSING]` (§4a) — that check is invisible to the compare images either way.

### 4a. Fix decision tree — global first

Work top-down; a global fix repairs every component at once, a per-component fix repairs one:

1. **Most/all components wrong the same way** → global, fix in config + full rebuild:
   - Context/provider errors in cells (`use<X> must be inside <Provider>`) → decorators didn't bundle (§3 `! preview decorator bundle failed` rows) → `cfg.provider`.
   - Everything unstyled / default fonts → `cfg.cssEntry` (check `[CSS_FROM_STORYBOOK]` in the build log), `cfg.tokensPkg`, `cfg.extraFonts`.
   - **`[FONT_MISSING]` — the compare loop cannot see this one.** When neither side ships the font, both panels render the same chromium fallback, so the sheets look "matching" while every claude.ai/design user gets the wrong font — never accept "both sides fall back the same way" as a pass. Resolve per the `[FONT_MISSING]` row in `../non-storybook/SKILL.md` §3; storybook-specific extras: `cfg.extraFonts` paths are bounded by the git repo enclosing `dirname(--node-modules)` — sibling typography packages in the monorepo work as-is; only with no `.git` ancestor does the bound narrow to `dirname(--node-modules)`, and if you add a font the reference lacks, inject the same `@font-face` into `.design-sync/sb-reference/iframe.html` so the oracle verifies with the real font on both sides.
   - Icons missing everywhere → `cfg.extraEntries` (check `[ICON_PKG]`).
2. **One component, `unpaired` or `fallback preview`** → its `.tsx` lacks a cell for that story. Previews compile the story MODULE whole (hooks, fixtures, local helpers all included — closures are not a failure mode), so the causes are: pairing failed (`storyName` override), the wrapper build failed (`! preview build failed` in the build log), or the module threw at load — check the sheet's `(page)` error row for the real exception (module-scope calls into a package the stubs don't cover). Open the wrapper (generated: `.design-sync/.cache/previews/<Name>.tsx`; owned: `.design-sync/previews/<Name>.tsx`), add/rename the export or drop the offending import — and if it's the generated one, save your fix as `.design-sync/previews/<Name>.tsx` WITHOUT the first-line marker (an in-place cache edit is preserved on this machine but gitignored — it vanishes on a fresh clone, and it recompiles without ever re-grading; only the owned copy moves the grade contract, and the rebuild warns about edited cache twins). Story imports use the location-independent `@ds-stories/<repo-relative path>` form, so the file works unchanged from either home.
3. **One component, you graded `mismatch`** → wrong props/composition. Read the story source; mirror it in an owned `.design-sync/previews/<Name>.tsx` (copy the cache wrapper there minus its marker line). That's the only lever for compiled story previews.
4. **`sb-error`** → the story doesn't render in storybook either (data-fetching, interaction-driven). Add its id to `cfg.overrides.<Name>.skip` and note why in NOTES.md.
5. **`[PORTAL?]` / overlay components** (Dialog/Tooltip/Toast) → grading is already isolated (per-story capture), but the PRODUCT card renders the whole grid html, so open-overlay stories paint over sibling cells there too. Set `cfg.overrides.<Name>.cardMode: "single"` — the card renders one story (`primaryStory` picks it; first export otherwise) full-bleed in a wrapper that contains `position:fixed` descendants, and declares the grading viewport on the card so the product renders at the size you verified. For stories that are merely too WIDE for a grid cell (data tables, full-width bars — validate flags these as `[GRID_OVERFLOW] … wide`), use `cardMode: "column"` instead: every story keeps full card width, nothing is dropped. Targeted-rebuild that component (`preview-rebuild.mjs --components <Name>`, seconds) — **grades carry** (`cardMode`/`primaryStory` aren't in the grade key or the stamped config slices); only a `viewport` change re-grades (it's the capture viewport) and needs the full build (it moves the slices).

**Rebuild rules — rebuild only what the change can reach.** Styling changes (css/fonts/tokens) re-render every preview without moving any grade contract — grades carry forward. Provider, `storyImports`, `extraEntries`, and fork edits are part of the grade contract (they change what the preview mounts) — affected grades clear and re-grade on the rebuild.

| You changed | Rebuild | Compare |
|---|---|---|
| a preview `.tsx` only | targeted loop below (seconds) | scoped `--components <Name>` — its grade cleared, re-grade |
| `overrides` (`skip`/`viewport`) / `titleMap` | full `package-build.mjs` + `package-validate.mjs` (re-stamps the config keys targeted rebuilds check) | full `compare.mjs` — the touched components re-grade; carried `match`/`close` components skip outright, and the still-pending set gets fresh sheets (the full build wiped them — the next wave reads those sheets) |
| `overrides` (`cardMode`/`primaryStory` only) | **targeted loop** (`preview-rebuild.mjs --components <Name>`, seconds) — presentation keys aren't in the stamped config slices, so `[CONFIG_STALE]` doesn't trip; the loop re-emits the card html and patches its renderHash | **no re-grade**: presentation-only keys aren't in the grade contract — grades carry; the changed card html re-ships and a re-sync may spot-check it |
| `provider` / `storyImports` / `.design-sync/overrides/` forks | full build + validate | full `compare.mjs` — affected grades re-grade per the rule above |
| css / fonts / tokens | `package-build.mjs --skip-dts` + validate | full `compare.mjs` — cheap: carried `match`/`close` components skip outright, so only the pending set recaptures against the new styling. Grades carry — zero-regrade, not zero-touch: the changed bytes still re-ship, and a re-sync may surface them as a `verification.canary` spot-check |
| `entry` / `extraEntries` | full build + validate — never `--skip-dts` (they change the bundle and export surface) | full `compare.mjs` — affected grades re-grade |

Mid-campaign — §4c waves still pending — read this table's "full `compare.mjs`" as *eventually, via the batches*: the rebuild clears the affected grades either way, the next wave's scoped runs recapture those components, and the §4d receipt is the roster-wide settlement (§4c between-waves step 2). Pay an immediate roster-wide compare only when no waves remain.

`--skip-dts` skips the per-component type extraction — the slow part of a large-DS build — and emits stub `.d.ts` bodies, so its validate fails `[DTS_STUBBED]` by design (the render checks still answer "did the fix work?"); the §4d/§6 gate's validate-exits-0 requirement forces the final build to run without it. Expect stub-build floor cards and README blurbs to look bare — the final build restores them. `--skip-dts` is for fix-loop iteration only: any build that an upload reads — an incremental batch push (base SKILL.md §3) as much as the §6 close-out — must be a real one, so if `.ds-build-meta.json` still carries `dtsStubbed`, rebuild without the flag before pushing (batch pushes upload the on-disk `.d.ts`).

**Batch config edits into one cycle.** Before paying a rebuild, sweep every pending sheet verdict and known issue for ALL the config edits they imply (`skip`s, `titleMap` entries, `cardMode`s) and apply them together — two edits discovered minutes apart must not cost two rebuild+validate+compare cycles.

**Compare run died partway** (browser crash, OOM): the sheets it captured are valid — grade them first, then re-run; carry-forward scopes the recapture to the gap. Never restart a crashed run with `--force` (it clears the grades you just earned).

**On a large DS, verify the fix is right BEFORE paying the full rebuild**: run the targeted loop below on one affected component (or probe its rendered page) first — a wrong guess validated by a full rebuild costs the whole cycle. **Intermediate validates can sample**: global breakage is systemic by nature, so `--render-sample 10` answers "did the fix work?" at a fraction of the cost; the FULL render-check is required at the §4d/§6 upload gate whenever anything render-affecting moved — on an anchored re-sync the §7 driver applies that rule automatically (the tier rule lives there).

The `.tsx`-only targeted loop:
  ```bash
  node .ds-sync/lib/preview-rebuild.mjs --config .design-sync/config.json --node-modules <nm> --out ./ds-bundle --components <Name>
  node .ds-sync/storybook/compare.mjs --out ./ds-bundle --storybook-static .design-sync/sb-reference --components <Name>
  ```

  The targeted loop recompiles previews but does not re-key grade contracts from source: a story-file edit followed by only this loop carries the old grade until the next full build or driver run re-keys it — route story edits through a full build (the driver does that automatically).

### 4b. Solo phase — one, then a few

Do NOT fan out immediately. Global issues must be flushed into config first, or every subagent rediscovers them.

1. **One component.** Pick a simple, well-storied one (Button-like: several stories, no portals). Run the §4a loop until you've graded every story `match` from its images — settle for `close` only when an iteration stops improving it (rubric above). **Every fix becomes a bullet in `.design-sync/NOTES.md`**: symptom → root cause → fix, marked `[GENERAL]` when it isn't component-specific.
2. **Three more, chosen for diversity:** one compound/overlay (Dialog/Tabs), one icon- or asset-heavy **whose stories load remote images** (this is the `[ASSETS_BLOCKED]` canary — §3's row: a network-sandboxed shell blanks assets on BOTH panels, so grades falsely pass; surfacing it here costs one component's recapture, surfacing it after a roster-wide pass costs the whole pass), one theme/provider-sensitive — and make sure the set spans one **text-heavy** component (font/typography bugs hide from button-only solos and then invalidate a whole grading wave). Same loop, solo. *Incremental path:* the solo set, once every story grades `match` (or `close` per the rubric's acceptance bar), is the first verified batch — push it (base SKILL.md §3).
3. **First roster-wide capture — size-gated on the storied-component count.**
   - **20 or fewer:** run one full `compare.mjs` over the roster. Background it through the shell tool's background mode and wait for the completion notification — §2.2's rule, restated here because this is where it gets violated: a foreground `sleep`-poll blocks the very notification that would wake you, and a `pgrep -f` loop matches its own command line and spins to timeout. (Headless / `-p` session: run it synchronously instead — there is no task-notification re-invocation in headless mode, so a backgrounded run is never resumed.) If ≥30% of components fail with the *same* reason, that's a global issue you missed — fix it in config and re-run before fanning out. **Batch every skip and pairing fix the listing shows before rebuilding** — each rebuild+compare cycle costs minutes; fixing them one at a time pays that cost per item.
   - **More than 20: do NOT run a monolithic full capture. Capture happens inside §4c's batches** — each subagent runs one scoped `compare.mjs --components <its batch>` and grades the sheets it just captured. This buys three things: scoped captures run concurrently (the roster renders in a fraction of a serial sweep's wall-clock); grading starts when the first batch's sheets exist instead of after the last component renders; and when a wave surfaces a `[GENERAL]` issue, the work at risk is the few batches graded so far, not the whole roster's captures and grades. The ≥30% same-reason check moves with the capture — it becomes the wave-1 learnings review (§4c between-waves). The roster-wide run you do NOT skip is the §4d receipt: by then everything is graded, so it carries components forward instead of recapturing them and costs seconds, not minutes.

### 4c. Fan-out — parallel subagents

Partition the components that still need work into batches of 5–8 — on a large DS (§4b step 3's >20 gate) that is every component outside the solo set, most with no sheet captured yet; after a small-DS full capture it is the non-matching set. Group related components together (shared providers, shared fixtures — one diagnosis then serves the whole batch). Launch up to 4 subagents per wave (Agent tool, in one message so they run concurrently). Four is also the browser-concurrency cap: each subagent's scoped compare runs its own chromium, and more than ~4 concurrent captures risks launch failures from machine-level contention. For each subagent, fill every `{…}` in this prompt and paste the **current** NOTES.md content in (subagents inherit the solo phase's learnings through it):

```text
Fix design-sync previews so they match the repo's own storybook render.
Repo: {REPO_ROOT}. Your components (yours alone): {COMPONENT_LIST}.

Why this matters: this design system is being synced to claude.ai/design, where
a design agent will build real UIs from this exact compiled bundle. The
storybook render is the proof of how each component is supposed to look; a
preview that matches it proves the component arrived intact, and one that
doesn't means every design the agent builds with it will be wrong the same way.

Artifacts per component (read these first):
- {OUT}/_screenshots/compare/<group>__<Name>.png — the true storybook render (left) vs the true preview render (right), per story. Full-res originals in {OUT}/_screenshots/compare/raw/.
- .design-sync/.cache/compare/<Name>.json — pairing facts + shot paths (no similarity scores — your eyes are the judge).
- The preview source (real JSX importing from '{PKG}'): .design-sync/previews/<Name>.tsx when owned, else the generated .design-sync/.cache/previews/<Name>.tsx. Your fixes are written to .design-sync/previews/<Name>.tsx (step 2).
- {OUT}/.stories-map.json — maps components to story ids; find each story's source file via its id in .design-sync/sb-reference/index.json (`importPath`). The story source is the authority on intended props/composition.
- .ds-sync/storybook/SKILL.md §4 — the grading rubric and fix decision tree.

First action, once for the whole batch: if any of your components has no compare sheet yet, run
  node .ds-sync/storybook/compare.mjs --out {OUT} --storybook-static {SB_REF} --components {COMPONENT_LIST}
One scoped run captures every missing sheet in your batch (one browser launch, not one per component); components already graded with unchanged sources skip automatically.

Per component (max 3 iterations):
1. Read the sheet; judge the primary story FROM THE TWO IMAGES (raw PNGs when the sheet is too small) per the §4 sampling rule — exhaustively when the component has portals, theme/provider sensitivity, an owned preview, or any warning; diagnose failures via the decision tree.
2. Copy .design-sync/.cache/previews/<Name>.tsx to .design-sync/previews/<Name>.tsx and DELETE its first-line `// @ds-preview generated …` marker (owned files live in previews/, win over the generated twin, and are durable + committed; an in-place cache edit survives rebuilds on this machine but is gitignored and vanishes on a fresh clone). The `@ds-stories/...` imports work unchanged from the new location. Mirror the story's JSX; inline story-local fixture data.
3. node .ds-sync/lib/preview-rebuild.mjs --config .design-sync/config.json --node-modules {NM} --out {OUT} --components <Name>
4. node .ds-sync/storybook/compare.mjs --out {OUT} --storybook-static {SB_REF} --components <Name>   (your edit changed the component's contract, so this clears its old grade — that's intended)
5. Re-Read the fresh sheet and Write your verdicts to .design-sync/.cache/compare/<Name>.grade.json ({"stories": {"<story>": {"verdict": "match|close|mismatch", "note": "…"}}}); siblings you trust under the §4 sampling rule get {"verdict": "match", "basis": "sibling-trusted"} — written in the same single grade.json Write, no image opens for them. Done when you grade every story match. A close story is still a fix target — if you can name the delta, try the knob for it; accept close only when an iteration didn't improve it or there's no actionable cause, and the note must say what's off AND what you tried. Blocked after 3 iterations → grade honestly (mismatch/close + note), record the exact blocker, move on.

HARD RULES — violating these corrupts other agents' work:
- Edit ONLY .design-sync/previews/{<your components>}.tsx, your components' .design-sync/.cache/compare/*.grade.json files, and .design-sync/learnings/{BATCH_ID}.md.
- NEVER edit .design-sync/config.json, .design-sync/NOTES.md, .ds-sync/, or any other component's files.
- NEVER run package-build.mjs or package-validate.mjs — they rewrite the shared bundle. preview-rebuild.mjs + compare.mjs scoped via --components are your only build commands.
- NEVER write an image-judged grade for images you haven't Read in this iteration. A sibling-trusted verdict must carry "basis": "sibling-trusted" and is allowed only when the image-judged primary story graded match and the component is warning-free (§4 sampling rule).
- A story that doesn't render in storybook either (sb-error) needs cfg.overrides.<Name>.skip; likewise [PORTAL?] needs cfg.overrides.<Name>.cardMode "single". Both are config edits you may NOT make — record them in your learnings file and final report; the orchestrator applies them. NEVER "fix" overlay bleed by neutralizing a story's open state in the .tsx — that destroys the fidelity being verified.
- If the SAME root cause appears in 2+ of your components — or even once when the cause is config-level (provider/css/font/token/import resolution) — STOP on those components: it's global. Write it to your learnings file `[GENERAL]`, report it, do not work around it per-component. Per-component fixes for a global cause are worse than waste: nothing ever machine-deletes `.design-sync/previews/`, so an owned preview you land for it persists and SHADOWS the corrected generated preview on every future build.

Learnings: append to .design-sync/learnings/{BATCH_ID}.md as you go — one bullet per discovery:
`<Component>: <symptom> → <root cause> → <fix>`, prefixed [GENERAL] if it applies beyond that component.

Known repo gotchas (read before starting):
{CURRENT_NOTES_MD_CONTENT}

Final report: per component — match/close/blocked + one-line reason; then any [GENERAL] learnings verbatim.
```

**Between waves (orchestrator) — the learnings fold is mandatory, not optional:**
1. Read every `.design-sync/learnings/*.md`. Promote `[GENERAL]` bullets into `.design-sync/NOTES.md` (dedup; keep them terse), then delete each learnings file you've folded. Full `compare.mjs` runs print `[LEARNINGS_UNMERGED]` while any learnings file exists, and the §4d driver receipt fails its verdict on the same condition — an overlooked fold can't silently ship.
2. **Act on every `[GENERAL]` learning NOW, before the next wave launches — however few components showed it.** A 2-of-24 incidence is still global; a wave dispatched past an un-actioned `[GENERAL]` re-pays it per component, and those grades wash out when the config fix finally lands. Apply the config fix, **delete any owned previews subagents authored to work around that same cause** (owned files are never machine-deleted — left in place they shadow the fix), then full rebuild (a real one — step 3's batch push uploads the on-disk files, so never a `--skip-dts` stub) + validate. Then prove the fix worked with a scoped `compare.mjs --components` on 1–2 components the issue actually hit — **do not run a roster-wide compare mid-campaign.** The rebuild already cleared whatever grades the fix's contract change touched; those components simply rejoin the queue, the next wave's scoped runs recapture them, and the §4d receipt settles the whole roster at the end. A roster-wide run mid-campaign that *captures* a large share of components is a symptom, not a routine step: either captured components were never graded (each batch must grade everything it captures) or a global-slice config edit cleared grades that were already earned — diagnose before paying for the render time.
3. *Incremental path:* push the wave's components that now meet the §4d grade bar (every story `match`, or `close` per the rubric) as a verified batch (base SKILL.md §3) — after steps 1–2, so a global fix from this wave rebuilds them first.
4. Next wave gets the updated NOTES.md content and the still-failing components. After the last wave, repeat step 1 for whatever remains and delete `.design-sync/learnings/`.

### 4d. Done criteria + report

- **One §7 driver run is the closing receipt — every path.** Make the session's FINAL build the driver (`resync.mjs`); omit `--remote` when no anchor exists (first syncs, recovered projects) — a full re-verify of an anchored project still passes it. The gate is the driver's verdict: `ok: true` with `verification.pendingGrade` empty. Its capture scope is the capturable subset of its worklist — every storied component on a first sync, the `changed`+`added` set on a re-sync — with carried-forward grades skipped, so the receipt costs a scoped pass, not a full re-capture (uncapturable members re-ship via the upload partition with nothing to grade; verified-by-upload components are outside the gate). The driver checks `.design-sync/learnings/` itself and fails the verdict with `[LEARNINGS_UNMERGED]` while any unfolded learnings file remains (`.compare-report.json` aggregation stays full-run-only). On this final run every in-scope component should print `carried forward` with zero `grade cleared` — that line IS the proof the next sync will be fast. A cleared grade on a no-change run means a nondeterministic source input (volatile story content) — chase it now; a driver-triggered `[SPOT_CHECK]` is not that (pipeline churn being auto-verified — confirm the sheets and move on).
- Every IN-SCOPE storied component has a current `.grade.json` with every story `match` — or `close` meeting the rubric's acceptance bar (§4) — or skipped via `cfg.overrides.<Name>.skip` with a NOTES.md justification. The mechanical check is the driver's `verification.pendingGrade`: a component listed there has stories without current verdicts and is not done (verified-by-upload components are exempt).
- `package-validate.mjs` still exits 0 after the final rebuild, with no unresolved `[FONT_MISSING]` (§4a — the one warning the compare oracle can't see).
- Call `DesignSync({method: 'report_validate', counts: {total, bad, thin, variantsIdentical, iterations}})` from the final `ds-bundle/.render-check.json` (written by `package-validate.mjs`; `iterations` = full rebuild passes). On a driver-scoped receipt (§7) that file is absent (skip tier) or covers only the sample — re-run the driver with `--render-sample 0` first when this call needs full counts; on a no-change re-sync that uploads nothing, skip the call.
- NOTES.md has a current **Re-sync risks** section, written now while you still know them: what can silently go stale (data inlined into config, neutralized story exports, owned previews tied to upstream APIs), what was verified only partially (story caps, accepted `close` rationales), and what the build assumed (toolchain version, CDN-fetched assets). Fixes record what you did; this section tells the next run what to watch.
- Tell the user: N/M components graded match, which are `close` (and why that's acceptable), which were skipped and why.

## 5. When the repo is strange — escape hatches

First runs against unusual repos WILL hit things the defaults don't cover. Every heuristic has a committed override — the rule is: **never hand-patch generated output; put the fix in the file the next run reads.** Map from failure class to knob:

| The repo's strangeness | Knob | Lives in |
|---|---|---|
| Nonstandard build/entry (`module` points at TS source, exotic dist layout) | `cfg.entry`, `cfg.buildCmd` | config |
| CSS built by a separate pipeline / no dist sidecar / CSS-in-JS | `cfg.cssEntry` if there's a file; otherwise rely on `[CSS_FROM_STORYBOOK]` — the converter scrapes the **compiled** CSS out of `sb-reference`, which is the universal catch-all: however weird the pipeline, its output is in the storybook build | config |
| Tokens shipped as a separate package | `cfg.tokensPkg` | config |
| Fonts from a runtime service / proprietary CDN | `cfg.extraFonts`, `cfg.runtimeFontPrefixes` | config |
| Icons or components on subpath exports | `cfg.extraEntries` | config |
| Naming conventions (story titles ≠ export names) | `cfg.titleMap`; story↔cell pairing also falls back to order | config |
| Decorators/providers that won't bundle (vite-only plugins, MDX, aliases) | `cfg.provider` — an explicit chain beats the decorator bundle; `probe.mjs` infers it from the live storybook; or compose providers **inline in the component's own `.tsx`** (an owned preview can import and wrap anything the package exports) | config / previews |
| Stories that can't render statically (MSW, data fetching, interaction tests) | `cfg.overrides.<Name>.skip` + a NOTES.md line saying why. Skip removes the story's cell, but the wrapper still imports the whole story MODULE — if the file crashes at import (module-scope fetch/worker), own the `.tsx` and drop the import instead | config |
| `[PORTAL?]` — overlay/portal stories paint outside their cells in the grid card | `cfg.overrides.<Name>.cardMode: "single"` (+ optional `primaryStory`, `viewport: "WxH"`) — single-story card, fixed-position containment, declared product viewport. Compare still grades every story via `?story=` | config |
| `[GRID_OVERFLOW]` — validate measured the grid card's geometry: `wide` = stories render wider than their cells (the cell clip crops them in the product); `escape` = fixed/portal content positions outside any cell | apply the override the warn names — `wide` → `cardMode: "column"` (one story per row, full card width, all stories kept); `escape` → `cardMode: "single"` + `primaryStory`. Structured copy in `.render-check.json` (`gridOverflow`, `gridOverflowCells`, `suggestedOverride`). Batch every flagged component into ONE targeted rebuild (`preview-rebuild.mjs --components A,B,C`) — presentation-only edits don't trip `[CONFIG_STALE]` and grades carry. Don't chase a clean re-validate to confirm: the applied remedy can't re-flag (single is fully exempt; column can't re-flag `wide` — escape stays monitored, so a portal story added later still surfaces); eyeball `.review.html` if you want visual confirmation | config |
| `[EXPORT_COLLISION]` — a sibling package (icons etc.) exports names the main package also exports | the main package wins the global merge, so stories importing the losing name from the sibling render the wrong thing | the log names the fix: `cfg.storyImports.bundle: ["<sibling>"]` |
| `[FILE_TOO_LARGE]` — a build output exceeds the upload's 12 MB per-file cap | usually a dev-only heavyweight bundled into a preview or the decorator bundle (syntax highlighters, icons-as-code) | slim it NOW, before grading — a post-grade slim of an owned preview re-grades that component |
| `[PROVIDER_UNEXPORTED]` — a `cfg.provider` component isn't a bundle export | the build exits 1 before emitting any component previews or docs — the output dir is left partial; rebuild after fixing | use the exact exported name, or re-export it via `cfg.extraEntries`. The check reads the bundle's own export list, so absence is reliable; names hidden behind bundled CommonJS re-exports can't be enumerated — those build with a `[PROVIDER_UNVERIFIED]` warning instead; if every preview then fails "Element type is invalid", the name is wrong |
| A story import resolves the wrong way (shimmed when it should bundle, or vice versa — any import style) | `cfg.storyImports.shim` / `cfg.storyImports.bundle` — substring patterns matched against resolved paths (bare package imports shim by **specifier**, without resolution — pattern-match the specifier for those). Unknown package subpaths (`<pkg>/utils`) bundle by default; if one should ride the global instead, add it to `cfg.extraEntries`. In the package's own source repo a bundled self-import has nothing to resolve to — symlink `node_modules/<pkg>` → the built `dist/` first | config |
| Story files import an asset type the defaults can't load (`.yaml`, `?raw`, svg-as-component) | `cfg.storyImports.loaders` — an esbuild loader map merged over the defaults (e.g. `{".yaml": "text"}`) | config |
| Generated preview has wrong props/composition | copy `.design-sync/.cache/previews/<Name>.tsx` to `.design-sync/previews/<Name>.tsx` minus its marker line (owned forever) | previews |
| Source/docs discovery misses (unusual repo layout) | `cfg.componentSrcMap`, `cfg.docsMap`, `cfg.dtsPropsFor`, `cfg.srcDir` | config |
| Anything deeper — custom story format, exotic args extraction, CSS transform | fork the adapter: copy the bundled lib module to `.design-sync/overrides/<name>.mjs` and declare it in `cfg.libOverrides` with a one-line reason (the build cross-checks both directions: `[OVERRIDE_UNDECLARED]` / `[OVERRIDE_MISSING]`). Forks are committed, so re-syncs use them automatically. **`emit.mjs` and `bundle.mjs` are app-contract surface — never fork them.** | `.design-sync/overrides/` |

For **story handling** specifically, the fork points by concern: `story-imports.mjs` (ALL import-resolution policy for preview compiles — the seam built for per-repo customization; honored by both the full build and `preview-rebuild.mjs`), `source-storybook.mjs` (index.json discovery, title→component mapping, story-source resolution + export pairing), `preview-gen-storybook.mjs` (the wrapper template / composeStories semantics), `css-fallback.mjs` (CSS/font scraping from the storybook build). Fork the *narrowest* module that owns the breakage, keep its export signature, and record what the repo does differently in NOTES.md — the next sync inherits all of it. A fork loads from `.design-sync/overrides/` while its siblings stay in the staged scripts — repoint the fork's relative imports (`./common.mjs` etc.) at `../../.ds-sync/lib/`. A fork that imports a bare converter dep (`esbuild`) also needs `ln -sfn ../.ds-sync/node_modules .design-sync/node_modules` so node can resolve it from the fork's location — once per clone, not once ever: the link is gitignored (`node_modules` rules) while the committed fork that needs it survives the clone, so recreating it is part of the fresh-clone setup.

The ladder's last rung, for repos genuinely outside the converter's envelope: **the upload format is the contract, not the converter** (see the base skill). Generate the layout however the repo allows — but `package-validate.mjs` and the compare/grading gate apply unchanged to whatever you produce. The oracle is never forked.

Everything in that table is a committed file, and §2.3 requires reading the existing config + NOTES.md before doing anything — so run N+1 replays every decision run N made. When you fix something on a strange repo, ask: "which committed file makes this automatic next time?" If the answer is none, that's a NOTES.md entry at minimum — and likely a missing row here worth reporting.

## Author the conventions header (before upload)

With previews verified — whether newly authored or carried forward by a re-sync — run the conventions-authoring step in the base SKILL.md ("Author the conventions header") — it distills what you just learned making the previews render into `.design-sync/conventions.md`, wired via the `readmeHeader` config key. Ordering matters: author the file and set the key FIRST, then rebuild per the base step's **rebuild rule** (a fresh DRIVER run on every path — first syncs omit `--remote`) so the generated README actually carries the header and the §4d receipt describes the build §6 uploads. Then proceed to Upload below.

## 6. Upload

Which of the two paths applies was decided by the base skill §1 router (pinned-at-run-start → atomic; otherwise empty → incremental, non-empty → atomic):

**Incremental path** (first sync into an empty project): the plan has been open since this file's §3 gate and verified batches have already landed. After §4d passes and the conventions-header step has run (base SKILL.md — it must precede the upload its rebuild feeds), run the close-out in base SKILL.md §3 — sentinel fence → full content writes → reconciliation deletes → sentinel re-arm → `_ds_sync.json` last. This section's chunking, hygiene, and stays-local rules apply to those writes; `projectId` was already recorded in §1; the handoff audit at the end of this section still applies. Skip the rest of this section's sequence — it is the atomic path.

**Atomic path** (re-sync, or any non-empty target — it may be in active use, so it updates in one pass after everything is verified): everything below. Only after §4d and the conventions-header step (base SKILL.md). `DesignSync(finalize_plan)` with `localDir: "./ds-bundle"`.

- **Writes — everything, always** (full re-verifies and re-syncs alike): `writes: ["components/**", "tokens/**", "fonts/**", "_vendor/**", "_preview/**", "guidelines/**", "_ds_bundle.js", "_ds_bundle.css", "styles.css", "README.md", "_ds_sync.json", "_ds_needs_recompile"]`. Re-uploading unchanged files is idempotent and cheap. An under-scoped writes list silently and permanently desyncs the project — full writes are the safe default.
- **Deletes.** Anchored re-syncs: verbatim from the diff — copy `.sync-diff.json`'s `upload.deletePaths` exactly; never hand-derive the list, never pass `[]` when the diff lists paths. No anchor (a re-adopted or recovered non-empty project being fully re-verified): the diff can't see the project's history, so review its `list_files` NOW — before `finalize_plan` — for files this build doesn't produce, and put those reviewed paths in the plan's `deletes` (a delete not named in the plan is rejected).
- **The §4d closing receipt doubles as the upload's source of truth.** The session's FINAL build is already a §7 driver run (§4d); bare `package-build.mjs` runs wipe `.sync-diff.json`, and the driver's diff stage regenerates it, so `deletePaths` and `upload.any` describe the exact bytes you upload — one run is both the verification receipt and the upload manifest, with no separate full compare after it.
- **`upload.any === false` → skip the upload entirely** — the project already matches this build. (The handoff audit below still applies.)
- **`_ds_sync.json` is the absolute final write** — after all content writes, all deletes, and the sentinel re-arm, in its own `write_files` call. Uploaded early, a mid-plan failure leaves the anchor vouching for files the project doesn't have, and deterministic rebuilds mean no later sync would repair them.
- **What stays local**: `_sb/**` (storybook-static is a reference, never uploaded), dot-prefixed entries (`.stories-map.json`, `.compare-report.json`, `.ds-build-meta.json`, `.sb-static/`, `.sync-diff.json`), and `_screenshots/`. `_vendor/` and `_preview/` DO upload — the preview cards load React and the compiled previews from them.

If `finalize_plan` is denied, **stop** — denial means the session can't approve, not that the arguments were wrong. Tell the user what was denied and ask how they'd like to proceed: try the approval again, or take the validated `ds-bundle/` and run the upload interactively themselves.

After plan approval, the upload is a fixed sequence:

1. **Sentinel first**: `DesignSync(write_files, [{path: "_ds_needs_recompile", localPath: "_ds_needs_recompile"}])` — it fences the app's manifest/copy machinery against a half-uploaded state.
2. **All content writes**, chunked into ≤256-file `write_files` calls under the same `planId`. The server also bounds payload BYTES, not just file count — batch binary-heavy dirs (fonts/, images) into smaller chunks, and on a 500 halve the chunk size and retry.
3. **All deletes**: `DesignSync(delete_files)` over every path in `upload.deletePaths`. (No anchor: the paths you reviewed into the plan's `deletes` at `finalize_plan` — the deletes bullet above.) If `delete_files` rejects paths that don't exist remotely (floor-card components have no `_preview/` files), retry without the rejected entries — that not-found rejection is the ONLY failure you may continue past.
4. **Sentinel re-arm, then `_ds_sync.json` last.** The anchor goes after deletes too — a failed delete would leave remote files the refreshed anchor can no longer see.

Any other write/delete failure that retries don't clear means **STOP** — no sentinel re-arm, no `_ds_sync.json`. An un-anchored project merely re-verifies next sync; a fresh anchor over a half-applied upload is permanent.

**Upload hygiene**: keep file lists and chunk manifests under `.design-sync/` — never bare `/tmp` paths, where a stale list from another repo's sync uploads the wrong design system. Regenerate the list from the live `ds-bundle/` immediately before upload, and sanity-check it: component names belong to THIS design system, and the bundle's `window.<globalName>` matches. Finish with `DesignSync(list_files)` to confirm the count.

Only after the post-upload `list_files` count verifies, **record `projectId` in `.design-sync/config.json`** if absent or different (this is a backstop — §1 records the id at target settlement for every route, so it's normally already present; what must never happen is recording an id here before the upload verifies, pinning a config to a project whose content isn't real yet) — it pins which project anchors future re-syncs. When done, tell the user: the project URL (`https://claude.ai/design/p/<projectId>`), component count, compare results summary, and that validate exited clean. The durable set (the rule in the handoff audit below: everything under `.design-sync/` not gitignored) must land in the repo for re-syncs to reuse every fix; verified-state lives with the uploaded `_ds_sync.json`, not in git. The handoff audit below covers the offer to commit.

**Last step — audit the handoff.** A future run is only as fast and correct as what this one leaves behind; verify it, don't assume it:

1. `git status` — the durable set (everything under `.design-sync/` that isn't gitignored — today config.json, NOTES.md, `conventions.md`, `previews/`, `overrides/`; the rule is the contract, so future durable files are in the set by construction) is the sync's repo footprint; `sb-reference/`, `learnings/`, `.cache/`, `.ds-sync/` are ignored. If this run created or changed any of the durable files, **offer to commit them and open a PR** (one commit, sync state only — no unrelated files). An uncommitted fix is a fix the next sync doesn't have.
2. Re-read NOTES.md as if you were the next agent, knowing nothing from this session: could you skip today's debugging with only what's written? Every owned preview, skip, config knob, and lib fork should trace to a bullet, and the Re-sync risks section should be current (§4d). Write whatever's missing now — it costs a minute today and a re-derivation later.
3. After a re-sync — however much it changed or re-graded — leave NOTES.md and the git state exactly as you found them unless the run produced something the next run needs to know; only hand the user something to commit when it adds value for a future sync.

## 7. Re-syncs — one command routes the work

The repo carries the sync's inputs (config, owned previews, NOTES.md); the uploaded project carries the anchor (`_ds_sync.json`). Read NOTES.md first (Re-sync risks is the watch-list), then:

1. **Refresh inputs.** Re-copy the staged scripts (§2.4's `cp -r` line — instant; a stale `.ds-sync/` runs an old converter against these instructions). Re-run `buildCmd` **and rebuild `.design-sync/sb-reference`** whenever the DS source may have changed — they must move together; when in doubt rebuild both (deterministic builds make an unnecessary rebuild a no-op; `[REFERENCE_STALE?]` in the capture log means you forgot). Fresh-clone extras: the §2.4 dep install + chromium, the §2.2 sb-reference build, and — if the repo carries `.design-sync/overrides/` forks with bare imports — `ln -sfn ../.ds-sync/node_modules .design-sync/node_modules`.
2. **Fetch the anchor**: `DesignSync(get_file, path: "_ds_sync.json")` → save to `.design-sync/.cache/remote-sync.json`. No sidecar in the project → first-sync scope (omit `--remote` below).
3. **Run the driver** from the repo root:

   ```sh
   node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules <nm> \
     [--entry <dist-entry>] --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json
   ```

   It chains build → diff → validate → capture (scoped to new + contract-changed components) and prints one verdict JSON (also written to `ds-bundle/.resync-verdict.json`). Stage logs stream to stderr. The driver is idempotent — re-run it after fixes. For per-component preview iteration use the §4a targeted loop instead (seconds, not a full build + render-check); the driver re-run is the closing receipt.

   The driver also scopes validate's render check by what the diff proved (explicit `--render-sample` / `--no-render-check` flags always win). With a healthy anchor and the bundle + styling unchanged, every unchanged preview's render inputs are byte-identical to what the last upload render-verified (or explicitly accepted) — the diff pins the anchor to the fresh sidecar, the `[SYNC_STALE]`/bundle-sha recompute pins the render surfaces to disk (styling is pinned by the build that just wrote both), and re-rendering identical bytes tests your chromium install, not the artifacts. So: nothing changed at all → the render check is **skipped** (the `[RENDER_SKIPPED]` warn on that run is driver-announced and expected — not a new warn to chase); something still ships but nothing that affects rendering moved (docs/guidelines edits, an anchor refresh) → **sampled** (`--render-sample 10`); anything that could change a render moved — components changed/added/churned, bundle or styling (a `.d.ts`/`.prompt.md` edit lands here: it re-ships the bundle, whose header embeds those files' hashes) — or no healthy anchor → **full**, as always. The file-shape checks (`[SYNC_STALE]`, bundle header, CSS/fonts, `.d.ts` parse) run in full on every tier; pass `--render-sample 0` to force the full render pass.
4. **Act on the verdict** — every field that needs you:

   | Field | Your work |
   |---|---|
   | `ok: false` | the failed stage (`stages.<name>`) logged its [TAG]s — fix per that stage's section above, re-run. Every stage green? Check `learningsUnmerged` |
   | `learningsUnmerged` non-empty | unfolded fan-out learnings — fold into NOTES.md, delete the files (§4c step 1), re-run; this alone fails `ok`, and the run preserves the reference-drift canary for the retry |
   | `verification.pendingGrade` | grade those fresh sheets (§4 rubric). In the capture log: `[STORY_CHANGED]` → mirror the story in the owned `.tsx` first; `unpaired` → add the export; `extraCells` naming an owned export → prune it |
   | `verification.canary` | pipeline churn (or a reference-storybook change) with your sources stable — grades kept; confirm the named `[SPOT_CHECK]` sheets against the recorded grades. A couple diverge → re-grade those components; widespread divergence → `--force` full pass |
   | warn lines in the validate log (`[RENDER_THIN]` etc.) | check NOTES.md's known list — a warn recorded there was triaged on a prior sync (legitimately-short components read as thin forever); a warn NOT recorded there is new — look at that component, then fix it or record it in NOTES.md |
   | `verification.removed` | components gone upstream — confirm the deletions are intentional |
   | `upload.styling: true` | styling re-ships automatically; grades stay |
   | `upload.any: false` | nothing to upload from THIS verdict — continue to step 5; you're done only after it (a header authored there re-runs the driver) |
   | `upload.any: true` | §6 upload — full writes by default, `deletes` verbatim from `upload.deletePaths` (never scope writes by the verification partition) |

   Grades follow your sources by design — DS source, CSS, and bundle changes carry, and pipeline churn arrives as `verification.canary` rather than re-grades. To deliberately audit carried-forward grades anyway (after a major DS version bump, or on suspicion), run `node .ds-sync/storybook/compare.mjs --out ./ds-bundle --components <A,B> --spot-check-components <A,B>` — fresh sheets, grades kept — and confirm the sheets still match the recorded grades.
5. **Run the conventions-header step** (base SKILL.md "Author the conventions header") — after acting on the verdict, before any upload, and regardless of what the verdict said. On a re-sync it validates an existing `.design-sync/conventions.md` against the fresh build and reports drift; for repos synced before the step existed it authors the file for the first time. If it authored or changed the header, rebuild per the base step's **rebuild rule** (driver run here) and act on the fresh verdict — the prior verdict predates the header.
6. Re-fetch the sidecar right before `finalize_plan`; if it moved (concurrent sync), re-run the driver and act on the fresh verdict.

