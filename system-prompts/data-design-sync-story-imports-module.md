<!--
name: 'Data: Design sync 故事导入模块'
description: 捆绑的 Design sync 故事导入模块，控制预览编译时在已发布包全局变量、故事源码和配置的垫片（shim）之间的解析策略
ccVersion: 2.1.169
-->
// 故事模块在预览编译时的解析方式。刻意保持精简且可复刻（FORKABLE）：
// 当仓库布局需要不同规则时，复制到 .design-sync/overrides/story-imports.mjs
// （在 cfg.libOverrides 中声明）—— 此接缝拥有全部解析策略，
// 因此复刻版本永远不会触及生成或构建编排逻辑。
// 更轻量的调整无需复刻：cfg.storyImports.shim / cfg.storyImports.bundle
// 是针对已解析路径匹配的子串模式（支持任意导入风格 —— 相对路径、
// tsconfig 别名、裸工作区名称），用于强制将模块路由到包全局变量 / 源码打包；
// cfg.storyImports.loaders 则合并覆盖 STORY_LOADERS。
//
// 规则：
// 1. Package + extraEntries 的导入 → `window.<GLOBAL>`（已发布包）。
//    子路径的末段如果是已导出的组件（`<pkg>/Button`），则以该导出作为
//    default 进行垫片处理；其他所有子路径（`<pkg>/locales/en.json`、
//    `<pkg>/utils`）正常打包 —— 错误的垫片是静默的，缺失的模块是
//    响亮的（修复路径是明确的：cfg.extraEntries 将子路径的导出合并到全局变量上）。
// 2. 任何解析到已导出组件模块的导入 → 同样路由到 `window.<GLOBAL>`，
//    无论其拼写方式如何（相对路径 `../Button` —— 主流故事写法约定 ——
//    tsconfig 别名或 monorepo 路径）。这确保预览渲染的是已发布包而非
//    重复的源码副本 —— 重复副本会破坏 React 上下文身份（消费者抛出
//    missing-provider 错误）并丢失同位样式。故事文件本身和 node_modules
//    下的任何内容永远不会被重定向。默认导入会将匹配到的导出作为
//    `default`（default-import 组件是常见的故事写法约定；裸命名空间垫片
//    会在每个此类格子中渲染"Element type is invalid"）。
// 3. 其他所有导入（fixtures、helpers、内部上下文）从源码打包；
//    这些模块内部的组件导入通过规则 2 递归处理。
//    诚实的残留：一个需要组件私有上下文的故事（该上下文必须与全局组件
//    共享身份）会渲染格子错误并进入评分/手动修复 —— 从设计上，没有
//    垫片能修复这种情况。
// 4. @storybook/* 运行时 → 功能性桩。manager/preview/client-api 获得
//    真正的空操作钩子（useGlobals/useArgs/addons —— 模块级别的
//    `addons.register()` 或装饰器在空桩上调用 `useGlobals()` 会导致
//    整个模块崩溃）；其他所有模块获得惰性可调用代理，使得标准 CSF 惯用写法
//    —— `args: { onClick: fn() }`、模块级别的 `action('click')` ——
//    能够求值而不是抛出异常。
// 5. 样式/资源 → 下方的 LOADERS（样式通过 _ds_bundle.css/styles.css 发布；
//    图片内联为 data URL 以便 fixtures 离线工作）。例外：
//    `.module.css` 走 esbuild 默认的 local-css —— 类名正常解析，
//    编译后的样式表落在 _preview/<Name>.css，生成的 HTML 在存在时链接它。

import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

// Storybook 的 preview-api 也会重新导出 React 兼容的 hooks 供渲染函数使用 ——
// 这些委托给页面的 React（那里的惰性桩会导致必然的渲染崩溃：
// 对不可迭代对象进行解构）。
const MANAGER_API_STUB =
  'const noopChannel={on(){},off(){},once(){},emit(){},removeListener(){}};' +
  'const addons={register(){},add(){},getChannel(){return noopChannel},setConfig(){},getConfig(){return{}}};' +
  'const R=function(){return window.React||{}};' +
  'module.exports={addons,types:{},useGlobals(){return[{},function(){}]},useArgs(){return[{},function(){},function(){}]},useParameter(){},useStorybookApi(){return{}},' +
  'useState(){return R().useState.apply(null,arguments)},useCallback(){return R().useCallback.apply(null,arguments)},useRef(){return R().useRef.apply(null,arguments)},' +
  'useMemo(){return R().useMemo.apply(null,arguments)},useEffect(){return R().useEffect.apply(null,arguments)},useReducer(){return R().useReducer.apply(null,arguments)},' +
  'useChannel(){return function(){}}};';

// 惰性可调用代理：每次成员访问都返回另一个惰性可调用对象，因此
// `fn()`、`action("x")`、`expect.anything()`、`userEvent.click(...)` 全部
// 在模块作用域求值为无害值。具名导入由 esbuild 的 CJS 互操作从自身可枚举
// 属性复制，因此常用 API 表面被显式具体化（Object.assign 使它们保持为
// 可调用 default 的自有属性 —— 不要改变代理目标的自有属性形状）；
// 其他所有属性通过 get 陷阱解析。DEFAULT 导出是一个子元素透传组件：
// 故事将插件默认值渲染为 JSX（@storybook/addon-links 的 `<LinkTo>…</LinkTo>`），
// 而对象 default 在 React 挂载的瞬间就会抛出"Element type is invalid"。
// 两个陷阱都返回真实的 `prototype` —— React 的 shouldConstruct() 探测
// `.prototype.isReactComponent`，代理返回真值会将桩分类为 CLASS 组件，
// 从而静默吞掉子元素。
const INERT_STUB =
  'var inert=new Proxy(function(){},{' +
  'get:function(t,k){if(k==="then")return void 0;if(k==="prototype")return t.prototype;if(k==="valueOf"||k==="toString"||k===Symbol.toPrimitive)return function(){return""};return inert},' +
  'apply:function(){return inert},construct:function(){return{}}});' +
  'var m={};"fn action actions expect userEvent within waitFor screen fireEvent spyOn mocked jest vi configureActions decorateAction setupWorker http HttpResponse graphql rest".split(" ").forEach(function(k){m[k]=inert});' +
  'var def=function(p){return p&&p.children!==void 0?p.children:null};Object.assign(def,m);' +
  'module.exports=new Proxy(def,{get:function(t,k){if(k==="then")return void 0;if(k==="prototype")return t.prototype;return k in m?m[k]:k==="__esModule"?void 0:inert}});';

export const STORY_FILE_RE = /\.stor(?:y|ies)\.[cm]?[jt]sx?$/;

export const STORY_LOADERS = {
  // jsx 是 js 的严格语法超集 —— .js 中的 JSX 故事文件是常见约定，
  // 普通 .js 解析行为完全相同。
  '.js': 'jsx',
  '.css': 'empty', '.scss': 'empty', '.sass': 'empty', '.less': 'empty', '.styl': 'empty',
  '.png': 'dataurl', '.jpg': 'dataurl', '.jpeg': 'dataurl', '.gif': 'dataurl',
  '.webp': 'dataurl', '.avif': 'dataurl', '.svg': 'dataurl', '.ico': 'dataurl',
  '.woff': 'dataurl', '.woff2': 'dataurl', '.ttf': 'dataurl', '.eot': 'empty',
  '.md': 'text', '.mdx': 'empty', '.mp4': 'empty', '.webm': 'empty', '.mov': 'empty',
};

// 已解析的文件路径看起来像是哪个已导出组件的源码模块？
// 匹配 `<...>/Button/Button.tsx`、`<...>/Button/index.ts` 和裸的
// `<...>/Button.tsx`；返回导出名或 null。一个碰巧与导出同名的辅助函数
// （`utils/Text.ts`）会误判 —— 这正是 cfg.storyImports.bundle 的用途；
// 过度垫片会立即表现为 undefined-component 格子错误，而不会是静默的错误渲染。
function exportedComponentFor(p, exported) {
  const segs = p.replace(/\\/g, '/').split('/');
  const file = (segs[segs.length - 1] ?? '').replace(/\.[cm]?[jt]sx?$/, '');
  const dir = segs[segs.length - 2] ?? '';
  if (exported.has(file)) return file;
  if ((file === 'index' || file === dir) && exported.has(dir)) return dir;
  return null;
}

// 独立的 @storybook/* 桩插件 —— 装饰器打包器也会使用。
export function storybookStubPlugin() {
  return {
    name: 'sb-stub',
    setup(b) {
      b.onResolve({ filter: /^(@storybook\/|storybook(\/|$)|msw(\/|$)|@mswjs\/)/ }, (a) => ({ path: a.path, namespace: 'sb-stub' }));
      b.onLoad({ filter: /.*/, namespace: 'sb-stub' }, (a) => ({
        contents: /(^|\/)(manager|preview|client)-api$/.test(a.path) ? MANAGER_API_STUB : INERT_STUB,
        loader: 'js',
      }));
    },
  };
}

// 构建用于编译预览 .tsx 文件的 esbuild 插件集（生成的
// 故事模块包装器 AND 手写的预览 —— 两者使用相同的规则）。
// 对调用方的重要提示：任何 tsconfig-paths 插件必须注册在这些插件之后
// （buildPreviews 就是这样做的）—— 策略插件通过 b.resolve 解析别名，
// 因此先注册 paths 插件会绕过规则 2。
export function storyImportPlugins({ PKG, GLOBAL, extraEntries = [], exported, cfg, pkgDir }) {
  const escRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pkgRx = new RegExp(`^(?:${[PKG, ...extraEntries].map(escRx).join('|')})(?:/.*)?$`);
  const force = cfg?.storyImports ?? {};
  const matches = (p, pats) => Array.isArray(pats) && pats.some((s) => typeof s === 'string' && p.includes(s));
  // ESM facade 垫片，而非 CJS：在 `"type":"module"` 仓库中，esbuild 对导入文件
  // 应用 Node 的 ESM-CJS 互操作 —— `default` 变成整个 exports 对象且
  // `__esModule` 被忽略 —— 这会破坏所有 `import Button from '<pkg>/Button'`
  // （大多数文档示例使用的风格）。ESM 模块在两种互操作模式下都显式绑定
  // `default`；对原始 CJS 全局变量的星号重导出保持动态具名访问正常工作
  // （hooks、常量 —— 全局变量上超出组件列表的任何内容）。
  const shimFor = (name) =>
    `export * from "__ds_raw__";var g=window.${GLOBAL};export default ${
      name ? `g[${JSON.stringify(name)}]!==void 0?g[${JSON.stringify(name)}]:g` : `"default" in g?g.default:g`
    };`;
  const shimResult = (name) => ({ path: name ? `ds:${name}` : 'ds', namespace: 'ds-shim' });

  const dsShim = {
    name: 'ds-global',
    setup(b) {
      const entryNames = new Set([PKG, ...extraEntries]);
      b.onResolve({ filter: pkgRx }, (a) => {
        if (matches(a.path, force.bundle)) return null; // 显式打包优先
        if (!entryNames.has(a.path)) {
          // 子路径导入：具名组件以感知 default 的方式垫片处理；其他任何内容
          // 正常打包 —— 错误的根命名空间垫片是静默的（undefined 成员），
          // 缺失的模块是响亮的，而响亮路径的修复是明确的（cfg.extraEntries /
          // 包自身源码仓库中的 node_modules 符号链接）。
          const name = (a.path.split('/').pop() ?? '').replace(/\.[cm]?[jt]sx?$/, '');
          return exported.has(name) ? shimResult(name) : null;
        }
        return shimResult(null);
      });
      b.onLoad({ filter: /.*/, namespace: 'ds-shim' }, (a) => ({
        contents: shimFor(a.path.startsWith('ds:') ? a.path.slice(3) : null),
        loader: 'js',
      }));
      // 预览生成器发出的位置无关的故事导入：
      // `@ds-stories/<仓库根相对路径>` 相对于 cwd 解析，因此
      // 同一个包装器可以从生成缓存或 promote 后从
      // .design-sync/previews/ 编译。无扩展名 —— esbuild
      // 会追加其解析扩展名。
      b.onResolve({ filter: /^@ds-stories\// }, (a) => {
        const base = resolve(process.cwd(), a.path.slice('@ds-stories/'.length));
        for (const ext of ['', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', '.mdx']) {
          if (existsSync(base + ext)) return { path: base + ext };
        }
        return { errors: [{ text: `@ds-stories path not found: ${a.path} (resolved against ${process.cwd()})` }] };
      });
      // ESM facade 星号重导出的原始 CJS 模块 —— 动态名称
      // （全局变量上的所有内容）无需静态导出列表。
      b.onResolve({ filter: /^__ds_raw__$/ }, () => ({ path: '__ds_raw__', namespace: 'ds-raw' }));
      b.onLoad({ filter: /.*/, namespace: 'ds-raw' }, () => ({
        contents: `module.exports=window.${GLOBAL};`,
        loader: 'js',
      }));
    },
  };

  // 规则 2：解析所有剩余导入，并将落在已导出组件模块上的导入
  // 进行垫片处理 —— 无论导入的拼写方式如何。
  // 返回 b.resolve 结果（而非 null）保持解析为单次遍历。
  // 包自身的源码 BARREL（构建 cwd 下或包目录下的 src/index.* ——
  // monorepo 从仓库根构建，而 barrel 位于 packages/<x>/src/）
  // 垫片到根命名空间：`import { X } from "../src"` 否则会打包整个库的
  // 第二份副本及其独立的 React 上下文。
  const CWD = process.cwd().replace(/\\/g, '/');
  // 对两个根路径做 realpath —— esbuild 的解析器返回符号链接解析后的路径，
  // 仅 resolve() 得到的根路径（符号链接的 tmpdir、符号链接的包目录）
  // 永远无法前缀匹配它们。
  const real = (p) => { try { return realpathSync(p).replace(/\\/g, '/'); } catch { return null; } };
  const barrelRoots = [...new Set([CWD, real(process.cwd()), pkgDir && resolve(pkgDir).replace(/\\/g, '/'), pkgDir && real(pkgDir)].filter(Boolean))];
  const policyRedirect = {
    name: 'ds-import-policy',
    setup(b) {
      b.onResolve({ filter: /.*/ }, async (a) => {
        if (a.pluginData === 'ds-resolving') return null; // 自身的重入
        if (a.kind === 'entry-point' || (a.namespace && a.namespace !== 'file')) return null;
        const r = await b.resolve(a.path, {
          kind: a.kind, resolveDir: a.resolveDir, importer: a.importer,
          pluginData: 'ds-resolving',
        });
        if (r.errors.length > 0 || !r.path) return null;
        if (r.namespace && r.namespace !== 'file') return r;  // 被其他插件认领
        const p = r.path.replace(/\\/g, '/');
        if (STORY_FILE_RE.test(p)) return r;                  // 永远不是故事自身
        if (matches(p, force.bundle)) return r;               // 显式打包优先
        if (matches(p, force.shim)) return shimResult(exportedComponentFor(p, exported));
        if (p.includes('/node_modules/')) return r;           // 第三方库保持原样
        if (barrelRoots.some((root) => p.startsWith(`${root}/`) && /^src\/index\.[cm]?[jt]sx?$/.test(p.slice(root.length + 1)))) {
          return shimResult(null);                            // 包源码 barrel
        }
        const name = exportedComponentFor(p, exported);
        return name ? shimResult(name) : r;
      });
    },
  };

  // 裸的 `import console from "console"`（以及 node:console）出现在真实
  // 故事文件中；Node 内置模块无法为浏览器打包，但这个有精确的页面全局等价物。
  const consoleStub = {
    name: 'node-console-stub',
    setup(b) {
      b.onResolve({ filter: /^(node:)?console$/ }, () => ({ path: 'console', namespace: 'node-console' }));
      b.onLoad({ filter: /.*/, namespace: 'node-console' }, () => ({ contents: 'module.exports=console;', loader: 'js' }));
    },
  };

  return {
    plugins: [dsShim, storybookStubPlugin(), consoleStub, policyRedirect],
    loaders: { ...STORY_LOADERS, ...(force.loaders ?? {}) },
  };
}