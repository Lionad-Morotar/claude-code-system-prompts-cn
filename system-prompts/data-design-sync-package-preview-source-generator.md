<!--
name: 'Data: Design sync 包形状预览源生成器'
description: 捆绑的 Design sync 源模块，用于根据已编写的预览参数生成包形状的预览包装文件，或在无内容可组合时返回底板卡片兜底
ccVersion: 2.1.169
-->
// generatePreviewSource（包形状）—— 为单个组件生成预览包装器主体
// （写入生成缓存，.design-sync/.cache/previews/<Name>.tsx），
// 当没有真实内容可组合时返回 null。
// 此形状中不存在故事（stories），因此预览质量来自已编写（AUTHORED）的源，
// 优先级依次为：
//   1. 用户编写的 .design-sync/previews/<Name>.tsx —— 由位置持有，
//      始终胜出，且本生成器永远不会被咨询
//   2. cfg.previewArgs.<Name> —— 通过配置提供的 props；像任何已编写文件一样
//      编译为真正的预览模块
//   3. null —— HTML 输出底板卡片（一次渲染尝试，带排版兜底），
//      诚实地表示该组件未经人工编写
// 不生成猜测性的变体网格或命名空间桩：没有参考渲染可供验证时，
// 复杂的猜测和简单的猜测同样无法验证，而看起来像真实预览的猜测
// 会比实际情况显得更加"完成"。

import { exportName } from './common.mjs';

// smartDefaultProps $raw 值 —— 一个小型封闭的文字表达式集合。
// 白名单门控，防止配置来源的 previewArgs 注入任意 JS。
const RAW_OK = /^(?:\(\)\s*=>\s*(?:null|undefined|\{\})|new Date\(\))$/;

// JSON props → JSX 属性字符串。函数 / React 元素会被丢弃。
// `$raw` 值（smartDefaultProps 的防崩溃桩）以裸表达式容器形式输出；
// 其他值以 `{JSON.stringify(v)}` 形式输出。
export function propsToJsx(args) {
  const out = [];
  for (const [k, v] of Object.entries(args)) {
    if (typeof v === 'function' || (v && typeof v === 'object' && v.$$typeof)) continue;
    // 点分隔的 argType 键（`Title.as`）是子组件寻址 —— 不是根组件上
    // 合法的 JSX 属性名。
    if (k === 'children' || k.includes('.')) continue;
    if (v && typeof v === 'object' && typeof v.$raw === 'string') {
      if (RAW_OK.test(v.$raw)) out.push(` ${k}={${v.$raw}}`);
    } else if (v && typeof v === 'object' && v.$jsx) {
      // 底板卡片专用标记 —— 此处无法作为 JSX 属性表达
    } else if (v === true) out.push(` ${k}`);
    else {
      try { out.push(` ${k}={${JSON.stringify(v)}}`); } catch { /* 跳过不可序列化的值 */ }
    }
  }
  return out.join('');
}

// `>` 和 `<` 之间的子元素 —— 包裹在 `{JSON.stringify(...)}` 中，
// 这样包含 `{ } < >` 的值不会重新打开解析器。`{"plain"}` 的渲染效果
// 与 `plain` 相同，因此始终包裹是正确的做法。
const jsxChildren = (s) => `{${JSON.stringify(s)}}`;

// 为单个组件生成预览 .tsx 主体（标记由 writePreviewFiles 前置，
// 因此其哈希仅覆盖此主体），或返回 null → 底板卡片。
export function generatePreviewSource(c, { smart, exported, pkg, previewArgs }) {
  if (!previewArgs) return null;
  // smart.props 携带来自 .d.ts 的防崩溃桩（必需的
  // 回调 → {$raw:'()=>null'}，数组 → []，open/visible → true）。
  // 在显式参数下展开，使桩填充空缺而不覆盖真实值。
  const stubs = smart?.props ?? {};
  const stubKids = typeof stubs.children === 'string' ? stubs.children : null;
  const used = new Set(exported);
  const kids = (typeof previewArgs.children === 'string' ? previewArgs.children : null) ?? stubKids;
  const attrs = propsToJsx({ ...stubs, ...previewArgs });
  const jsx = kids
    ? `<${c.name}${attrs}>${jsxChildren(kids)}</${c.name}>`
    : `<${c.name}${attrs} />`;
  return `import { ${c.name} } from '${pkg}';\n\nexport const ${exportName('Preview', used)} = () => ${jsx};\n`;
}