<!--
name: 'Data: Design sync Storybook 预览源生成器'
description: 捆绑的 Design sync 源模块，通过组合每个组件的 Storybook 故事模块来生成预览包装器文件
ccVersion: 2.1.169
-->
// generatePreviewSource（storybook 形状）—— 通过导入故事模块自身并将
// 每个故事暴露为组件，为单个组件生成预览包装器主体（写入生成缓存，
// .design-sync/.cache/previews/<Name>.tsx）。整个模块一并引入 —— hooks、
// fixtures、本地辅助组件 —— 因此闭合了故事本地引用的渲染可以原样工作。
// 组件标识符仍然解析到已发布包：
// lib/story-imports.mjs 在编译时将包导入和相对组件导入重定向到
// window.<GLOBAL>，因此预览验证的是真实产物。
//
// 一个组件的故事可能存在于一个模块中，也可能分散在多个模块中
// （每个文件一个故事的布局）—— 包装器导入所有有配对故事的模块；
// 每个故事从其自己的模块组合。
//
// 生成的文件带有标准的所有权标记；要手动编辑它（固定参数、删除故事、
// 内联 provider），将其复制到 .design-sync/previews/<Name>.tsx 并去掉第 1 行 ——
// 手动持有的副本优先，重新同步会保留它们。
// 复刻接缝：解析策略位于 lib/story-imports.mjs。

import { relative } from 'node:path';
import { exportName } from './common.mjs';

// 嵌入在每个包装器中的 composeStories 等价实现。Storybook 语义，最小化：
// 合并 args（meta ← story），渲染优先级
// （story.render → CSF2 函数式故事 → meta.render → meta.component），
// meta 和 story 的装饰器按 story-innermost 顺序应用，带有一个最小上下文，
// 携带标准字段名（读取 ctx.kind/globals 的装饰器获得空形状值而不是崩溃）。
// 需要真实 storybook 运行时状态的装饰器按故事降级为格子错误 ——
// 评分残留，而非构建失败。
const COMPOSE = `function compose(S: any, key: string) {
  const meta: any = S.default ?? {};
  const st: any = S[key];
  const args: any = { ...(meta.args ?? {}), ...(st && st.args ? st.args : {}) };
  // Storybook 在渲染前解析 argTypes.mapping（控件值 -> 真实参数）；
  // 镜像此行为，使映射后的参数不会渲染为原始值。
  const at: any = { ...(meta.argTypes ?? {}), ...(st && st.argTypes ? st.argTypes : {}) };
  for (const k of Object.keys(args)) {
    const m = at[k] && at[k].mapping;
    if (m && typeof m === 'object' && args[k] in m) args[k] = m[args[k]];
  }
  const title: string = typeof meta.title === 'string' ? meta.title : '';
  const ctx: any = {
    args, name: key, title, kind: title, id: '', componentId: '',
    globals: {}, viewMode: 'story',
    parameters: (st && st.parameters) ?? meta.parameters ?? {},
  };
  let render: (() => any) | null = null;
  if (st && typeof st.render === 'function') render = () => st.render(args, ctx);
  else if (typeof st === 'function') render = () => st(args, ctx);
  else if (typeof meta.render === 'function') render = () => meta.render(args, ctx);
  else {
    const C = (st && st.component) || meta.component;
    if (C) render = () => React.createElement(C, args);
  }
  if (!render) return () => null;
  // [].concat：单个函数是合法的 CSF 装饰器简写。装饰器返回 undefined
  //（被桩化的插件）时穿透到内部渲染 —— 否则一个无法识别的插件会
  // 静默清空格子。
  const decorators: any[] = ([] as any[]).concat((st && st.decorators) ?? []).concat(meta.decorators ?? []);
  return decorators.reduce((inner: any, dec: any) => () => {
    const out = dec(inner, ctx);
    return out === undefined ? inner() : out;
  }, render);
}`;

// 为单个组件生成预览 .tsx 主体 —— 当没有配对内容时返回 null，
// 此时不写入包装器，HTML 显示底板卡片（与编译失败的包装器相同的底板）。
// 配对失败是响亮的且可修复的，因此底板卡片是唯一的兜底。
export function generatePreviewSource(c, opts) {
  // 故事模块层：需要故事源路径和至少一个可见的故事
  // 配对到模块导出（配对发生在 source-storybook.mjs 中 ——
  // c.storyIds[].exportKey）。
  const skipSet = new Set(opts.skip ?? []);
  const visible = (c.storyIds ?? []).filter((s) => !skipSet.has(s.id));
  const paired = visible.filter((s) => s.exportKey);
  if (!c.storySrc || paired.length === 0) {
    if (c.storySrc && visible.length > 0) {
      console.error(`  (preview: ${c.name} — 没有故事导出配对（storyName 覆盖？）；显示底板卡片)`);
    }
    return null;
  }
  // 位置无关的导入：`@ds-stories/<仓库根相对路径>`（正斜杠以保证跨机器可移植），
  // 由故事导入插件集解析。相对路径说明符会绑定包装器的目录深度 ——
  // 而 promote 流程将包装器从生成缓存复制到 .design-sync/previews/
  //（浅一层），因此同一个文件必须能从两个位置编译。
  // 每个不同的故事模块一个导入，按首次配对顺序排列；S 是第一个
  //（对于单模块组件也是唯一的）。
  const toSpec = (p) => {
    const rel = relative(process.cwd(), p).replace(/\\/g, '/');
    return JSON.stringify(`@ds-stories/${rel}`.replace(/\.[cm]?[jt]sx?$/, ''));
  };
  const modVars = new Map(); // 故事源路径 -> 导入标识符
  const modVarFor = (p) => {
    if (!modVars.has(p)) modVars.set(p, modVars.size === 0 ? 'S' : `S${modVars.size + 1}`);
    return modVars.get(p);
  };
  // 生成的导出名通过 exportName 进行 PascalCase 转换（HTML 挂载循环
  // 只渲染 /^[A-Z]/ 的导出；CSF 允许 camelCase 键）—— compare 的
  // squash 配对不区分大小写，因此配对不受影响。compose() 仍然接收
  // 原始的模块键。Squash 冲突（两个 index 故事配对到同一模块的同一个导出，
  // 例如通过 storyName 覆盖）只生成一次。
  // 每个故事记录其格子生成时的精确导出名（s.emitted，传入故事映射）——
  // 当同一个键出现在多个模块中时标签会去重（"Default" + "Default2"），
  // 因此 compare 必须基于生成的标签配对，而不是原始键的模糊匹配。
  const seen = new Set();
  const used = new Set();
  const lines = [];
  for (const s of paired) {
    const mod = modVarFor(s.storySrc ?? c.storySrc);
    const dupKey = `${mod}:${s.exportKey}`;
    if (seen.has(dupKey)) {
      console.error(`  (preview: ${c.name} — 故事 "${s.name}" 配对到已生成的导出 ${s.exportKey}；跳过重复)`);
      continue;
    }
    seen.add(dupKey);
    const label = exportName(s.exportKey, used);
    s.emitted = label;
    lines.push(`export const ${label} = /* ${s.name} */ compose(${mod}, ${JSON.stringify(s.exportKey)});`);
  }
  const imports = [...modVars.entries()]
    .map(([p, v]) => `import * as ${v} from ${toSpec(p)};`)
    .join('\n');
  return `import * as React from 'react';
${imports}

${COMPOSE}

${lines.join('\n')}
`;
}