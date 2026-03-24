import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const SYSTEM_PROMPTS_DIR = join(ROOT_DIR, 'system-prompts');
const README_PATH = join(ROOT_DIR, 'README.md');

// 确保 system-prompts 目录存在
if (!existsSync(SYSTEM_PROMPTS_DIR)) {
  mkdirSync(SYSTEM_PROMPTS_DIR, { recursive: true });
}

// 从环境变量获取 API 密钥
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is required');
  console.error('Set it with: export ANTHROPIC_API_KEY=your-api-key');
  process.exit(1);
}

/**
 * 使用 Anthropic 的 token 计数 API 统计 token 数量
 */
async function countTokens(text) {
  const response = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': ANTHROPIC_API_KEY
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      messages: [
        {
          role: 'user',
          content: text
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token counting API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.input_tokens;
}

/**
 * 从 npm 获取指定版本的发布日期
 */
async function getNpmReleaseDate(version) {
  try {
    const response = await fetch('https://registry.npmjs.org/@anthropic-ai/claude-code');
    if (!response.ok) {
      console.warn(`Warning: Could not fetch npm package data`);
      return null;
    }
    const data = await response.json();
    const timestamp = data.time && data.time[version];
    if (!timestamp) {
      console.warn(`Warning: No release date found for v${version}`);
      return null;
    }
    // 解析日期并格式化
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).replace(/(\d+)/, (match) => {
      // 添加序数后缀（1st, 2nd, 3rd 等）
      const n = parseInt(match);
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    });
  } catch (err) {
    console.warn(`Warning: Error fetching npm release date: ${err.message}`);
    return null;
  }
}

/**
 * 批量统计多个提示词的 token 数量，带速率限制
 */
async function countTokensBatch(prompts, batchSize = 5, delayMs = 100) {
  const results = new Map();

  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);
    const promises = batch.map(async ({ filename, content }) => {
      try {
        const tokens = await countTokens(content);
        return { filename, tokens };
      } catch (err) {
        console.error(`Error counting tokens for ${filename}: ${err.message}`);
        return { filename, tokens: 0 };
      }
    });

    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ filename, tokens }) => {
      results.set(filename, tokens);
    });

    // 批次之间的速率限制延迟
    if (i + batchSize < prompts.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * 将提示词名称转换为文件名
 * 示例：
 *   "Agent Prompt: Explore" → "agent-prompt-explore.md"
 *   "System Prompt: Main system prompt" → "system-prompt-main-system-prompt.md"
 *   "Tool Description: Bash" → "tool-description-bash.md"
 */
function nameToFilename(name) {
  // 根据名称前缀确定前缀
  let prefix = '';
  let namePart = name;

  if (name.startsWith('Agent Prompt: ')) {
    prefix = 'agent-prompt-';
    namePart = name.substring('Agent Prompt: '.length);
  } else if (name.startsWith('System Prompt: ')) {
    prefix = 'system-prompt-';
    namePart = name.substring('System Prompt: '.length);
  } else if (name.startsWith('System Reminder: ')) {
    prefix = 'system-reminder-';
    namePart = name.substring('System Reminder: '.length);
  } else if (name.startsWith('Tool Description: ')) {
    prefix = 'tool-description-';
    namePart = name.substring('Tool Description: '.length);
  } else if (name.startsWith('Data: ')) {
    prefix = 'data-';
    namePart = name.substring('Data: '.length);
  }

  // 转换为小写并替换特殊字符
  const filename = namePart
    .toLowerCase()
    .replace(/\s+/g, '-') // 空格转连字符
    .replace(/[^a-z0-9_-]/g, '') // 移除非 a-z、0-9、_、- 的字符
    .replace(/-+/g, '-') // 合并多个连字符
    .replace(/^-|-$/g, ''); // 去除首尾连字符

  return prefix + filename + '.md';
}

/**
 * 从片段和标识符重建完整的提示词内容
 */
function reconstructPrompt(prompt) {
  if (prompt.pieces.length === 0) return '';
  if (prompt.pieces.length === 1) return prompt.pieces[0];

  let result = '';
  let identifierIndex = 0;

  for (let i = 0; i < prompt.pieces.length; i++) {
    result += prompt.pieces[i];

    // 添加变量名（片段已包含 ${ 和 } 分隔符）
    if (i < prompt.pieces.length - 1 && identifierIndex < prompt.identifiers.length) {
      const identifierId = prompt.identifiers[identifierIndex].toString();
      const variableName = prompt.identifierMap[identifierId];
      if (variableName) {
        result += variableName;
      }
      identifierIndex++;
    }
  }

  return result;
}

/**
 * 创建带 HTML 注释元数据的 Markdown 文件内容
 */
function createMarkdownContent(prompt, reconstructedContent) {
  const variables = Object.values(prompt.identifierMap || {});

  let content = '<!--\n';
  content += `name: '${prompt.name}'\n`;
  content += `description: ${prompt.description.includes('\n') ? '>\n  ' + prompt.description.replace(/\n/g, '\n  ') : prompt.description}\n`;
  content += `ccVersion: ${prompt.version}\n`;

  if (variables.length > 0) {
    content += 'variables:\n';
    variables.forEach(varName => {
      content += `  - ${varName}\n`;
    });
  }

  content += '-->\n';
  content += reconstructedContent;

  // 确保文件以换行符结尾
  if (!content.endsWith('\n')) {
    content += '\n';
  }

  return content;
}

/**
 * 解析现有的 Markdown 文件以提取元数据
 */
function parseMarkdownFile(filepath) {
  try {
    const content = readFileSync(filepath, 'utf-8');
    const commentMatch = content.match(/<!--\n([\s\S]*?)\n-->/);
    if (!commentMatch) return null;

    const metadataSection = commentMatch[1];
    const nameMatch = metadataSection.match(/name: '(.+)'/);
    const descMatch = metadataSection.match(/description: (.+?)(?=\nccVersion:)/s);

    return {
      name: nameMatch ? nameMatch[1] : null,
      description: descMatch ? descMatch[1].replace(/>\n\s+/g, '').trim() : null,
      fullContent: content
    };
  } catch (err) {
    return null;
  }
}

/**
 * 根据名称对提示词进行分类
 */
function categorizePrompt(name) {
  if (name.startsWith('Agent Prompt: ')) {
    const namePart = name.substring('Agent Prompt: '.length);
    // 子分类智能体提示词
    if (['Explore', 'Plan mode (enhanced)', 'Task tool'].some(sub => namePart.startsWith(sub))) {
      return { category: 'Agent Prompts', subcategory: 'Sub-agents' };
    } else if (['Agent creation architect', 'CLAUDE.md creation', 'Status line setup'].some(sub => namePart.includes(sub))) {
      return { category: 'Agent Prompts', subcategory: 'Creation Assistants' };
    } else if (namePart.includes('slash command') || namePart.startsWith('/')) {
      return { category: 'Agent Prompts', subcategory: 'Slash commands' };
    } else {
      return { category: 'Agent Prompts', subcategory: 'Utilities' };
    }
  } else if (name.startsWith('System Prompt: ')) {
    return { category: 'System Prompt', subcategory: null };
  } else if (name.startsWith('System Reminder: ')) {
    return { category: 'System Reminders', subcategory: null };
  } else if (name.startsWith('Tool Description: ')) {
    // 检查 "additional notes" 子类别
    if (name.includes('(') && name.includes(')')) {
      return { category: 'Builtin Tool Descriptions', subcategory: 'Additional notes for some Tool Descriptions' };
    }
    return { category: 'Builtin Tool Descriptions', subcategory: null };
  } else if (name.startsWith('Data: ')) {
    return { category: 'Data', subcategory: null };
  }

  return { category: 'Other', subcategory: null };
}

/**
 * 为提示词创建 README 条目
 */
function createReadmeEntry(prompt, filename, tokens, isBold = false) {
  const link = isBold ? `[**${prompt.name}**]` : `[${prompt.name}]`;
  const path = `./system-prompts/${filename}`;
  const tokenCount = `(**${tokens}** tks)`;
  const description = prompt.description.replace(/\n\s+/g, ' ').trim();

  return `- ${link}(${path}) ${tokenCount} - ${description}.`;
}

/**
 * 从 README 解析现有的 token 数量
 */
function parseReadmeTokenCounts() {
  const tokenCounts = new Map();
  try {
    const readme = readFileSync(README_PATH, 'utf-8');
    // 匹配类似：(./system-prompts/filename.md) (**123** tks) 的模式
    const regex = /\(\.\/system-prompts\/([^)]+\.md)\)\s*\(\*\*(\d+)\*\*\s*tks\)/g;
    let match;
    while ((match = regex.exec(readme)) !== null) {
      tokenCounts.set(match[1], parseInt(match[2], 10));
    }
  } catch (err) {
    // README 尚不存在，没关系
  }
  return tokenCounts;
}

/**
 * 主更新函数
 */
async function updateFromJSON(jsonPath) {
  console.log(`Reading JSON from: ${jsonPath}`);
  const jsonData = JSON.parse(readFileSync(jsonPath, 'utf-8'));

  console.log(`Version: ${jsonData.version}`);
  console.log(`Prompts count: ${jsonData.prompts.length}`);

  // 统计输入 JSON 同一目录中的版本文件数量
  const jsonDir = dirname(jsonPath);
  const versionFiles = readdirSync(jsonDir).filter(f => f.match(/^prompts-[\d.]+\.json$/));
  const versionCount = versionFiles.length;

  // 从 README 获取现有的 token 数量
  const existingTokenCounts = parseReadmeTokenCounts();

  // 按文件名跟踪所有提示词
  const promptsByFilename = new Map();
  const changedPrompts = new Set();
  const newPrompts = new Set();
  const promptsToCount = [];
  const unchangedPrompts = [];

  // 第一遍：处理文件并确定需要统计 token 的内容
  for (const prompt of jsonData.prompts) {
    const filename = nameToFilename(prompt.name);
    const filepath = join(SYSTEM_PROMPTS_DIR, filename);
    const reconstructedContent = reconstructPrompt(prompt);
    const newMarkdownContent = createMarkdownContent(prompt, reconstructedContent);

    // 检查文件是否存在并进行比较
    const existingFile = parseMarkdownFile(filepath);

    if (existingFile) {
      // 比较内容
      if (existingFile.fullContent.trim() !== newMarkdownContent.trim()) {
        console.log(`\x1b[33mChanged: ${filename}\x1b[0m`);
        unlinkSync(filepath); // 删除旧文件
        writeFileSync(filepath, newMarkdownContent);
        changedPrompts.add(filename);
        // 需要重新统计已更改提示词的 token
        promptsToCount.push({ filename, content: reconstructedContent, prompt });
      } else {
        // 未更改 - 使用 README 中的现有 token 数量
        unchangedPrompts.push({ filename, prompt });
      }
    } else {
      console.log(`\x1b[32mNew: ${filename}\x1b[0m`);
      writeFileSync(filepath, newMarkdownContent);
      newPrompts.add(filename);
      // 需要统计新提示词的 token
      promptsToCount.push({ filename, content: reconstructedContent, prompt });
    }
  }

  // 仅统计新增/已更改提示词的 token
  const tokenCounts = new Map();
  if (promptsToCount.length > 0) {
    console.log(`\x1b[34mCounting tokens for ${promptsToCount.length} new/changed prompts...\x1b[0m`);
    const newCounts = await countTokensBatch(promptsToCount);
    newCounts.forEach((tokens, filename) => tokenCounts.set(filename, tokens));
  }

  // 存储用于 README 更新的提示词信息
  for (const { filename, prompt } of promptsToCount) {
    const tokens = tokenCounts.get(filename) || 0;
    promptsByFilename.set(filename, { prompt, tokens });
  }

  // 对未更改的提示词使用现有的 token 数量
  for (const { filename, prompt } of unchangedPrompts) {
    const tokens = existingTokenCounts.get(filename) || 0;
    promptsByFilename.set(filename, { prompt, tokens });
  }

  // 查找已删除的提示词
  const allMdFiles = readdirSync(SYSTEM_PROMPTS_DIR).filter(f => f.endsWith('.md'));
  const deletedFiles = allMdFiles.filter(f => !promptsByFilename.has(f));

  if (deletedFiles.length > 0) {
    console.log('\n🗑️  Deleting removed prompts:');
    deletedFiles.forEach(f => {
      console.log(`   - ${f}`);
      unlinkSync(join(SYSTEM_PROMPTS_DIR, f));
    });
  }

  // 获取 npm 发布日期
  console.log('\x1b[34mFetching npm release date...\x1b[0m');
  const releaseDate = await getNpmReleaseDate(jsonData.version);

  // 更新 README
  console.log('\x1b[34mUpdating README.md...\x1b[0m');
  updateReadme(promptsByFilename, jsonData.version, releaseDate, versionCount);

  console.log('\x1b[32;1mUpdate complete!\x1b[0m');
  console.log(`   New: \x1b[1m${newPrompts.size}\x1b[0m`);
  console.log(`   Changed: \x1b[1m${changedPrompts.size}\x1b[0m`);
  console.log(`   Deleted: \x1b[1m${deletedFiles.length}\x1b[0m`);
}

/**
 * 使用新的提示词信息更新 README.md
 */
function updateReadme(promptsByFilename, version, releaseDate, versionCount) {
  let readme = readFileSync(README_PATH, 'utf-8');
  const lines = readme.split('\n');

  // 使用 npm 链接和日期更新标题中的版本
  const npmUrl = `https://www.npmjs.com/package/@anthropic-ai/claude-code/v/${version}`;
  const dateStr = releaseDate ? ` (${releaseDate})` : '';

  // 动态查找介绍行（以 "This repository contains" 开头）
  const introLineIndex = lines.findIndex(line => line.startsWith('This repository contains'));
  if (introLineIndex !== -1) {
    lines[introLineIndex] = `This repository contains an up-to-date list of all Claude Code's various system prompts and their associated token counts as of **[Claude Code v${version}](${npmUrl})${dateStr}.**  It also contains a [**CHANGELOG.md**](./CHANGELOG.md) for the system prompts across ${versionCount} versions since v2.0.14.  From the team behind [<img src="https://github.com/Piebald-AI/piebald/raw/main/assets/logo.svg" width="15"> **Piebald.**](https://piebald.ai/)`;
  } else {
    console.warn('Warning: Could not find intro line starting with "This repository contains"');
  }
  // 按类别组织提示词
  const categories = {
    'Agent Prompts': {
      'Sub-agents': [],
      'Creation Assistants': [],
      'Slash commands': [],
      'Utilities': []
    },
    'System Prompt': { 'main': [] },
    'System Reminders': { 'main': [] },
    'Builtin Tool Descriptions': {
      'main': [],
      'Additional notes for some Tool Descriptions': []
    },
    'Data': { 'main': [] }
  };

  // 对所有提示词进行分类
  for (const [filename, { prompt, tokens }] of promptsByFilename) {
    const { category, subcategory } = categorizePrompt(prompt.name);

    // 对主系统提示词进行特殊加粗处理
    const isBold = prompt.name === 'System Prompt: Main system prompt';
    const entry = createReadmeEntry(prompt, filename, tokens, isBold);

    if (category === 'Agent Prompts') {
      categories['Agent Prompts'][subcategory].push(entry);
    } else if (category === 'System Prompt') {
      categories['System Prompt']['main'].push(entry);
    } else if (category === 'System Reminders') {
      categories['System Reminders']['main'].push(entry);
    } else if (category === 'Builtin Tool Descriptions') {
      const subcat = subcategory || 'main';
      categories['Builtin Tool Descriptions'][subcat].push(entry);
    } else if (category === 'Data') {
      categories['Data']['main'].push(entry);
    }
  }

  // 对每个类别中的条目按字母顺序排序
  for (const category of Object.values(categories)) {
    for (const subcategory of Object.values(category)) {
      if (Array.isArray(subcategory)) {
        subcategory.sort();
      }
    }
  }

  // 重建 README 章节
  const newLines = [];
  let i = 0;

  // 复制 "### Agent Prompts" 之前的所有内容
  while (i < lines.length && !lines[i].startsWith('### Agent Prompts')) {
    newLines.push(lines[i]);
    i++;
  }

  // Agent Prompts 章节
  newLines.push('### Agent Prompts');
  newLines.push('');
  newLines.push('Sub-agents and utilities.');
  newLines.push('');
  newLines.push('#### Sub-agents');
  newLines.push('');
  newLines.push(...categories['Agent Prompts']['Sub-agents']);
  newLines.push('');
  newLines.push('### Creation Assistants');
  newLines.push('');
  newLines.push(...categories['Agent Prompts']['Creation Assistants']);
  newLines.push('');
  newLines.push('### Slash commands');
  newLines.push('');
  newLines.push(...categories['Agent Prompts']['Slash commands']);
  newLines.push('');
  newLines.push('### Utilities');
  newLines.push('');
  newLines.push(...categories['Agent Prompts']['Utilities']);
  newLines.push('');

  // Data 章节（如果有条目则注释掉）
  if (categories['Data']['main'].length > 0) {
    newLines.push('<!--');
    newLines.push('### Data');
    newLines.push('');
    newLines.push('Misc large strings.');
    newLines.push('');
    newLines.push(...categories['Data']['main']);
    newLines.push('-->');
    newLines.push('');
  }

  // System Prompt 章节
  newLines.push('### System Prompt');
  newLines.push('');
  newLines.push('Parts of the main system prompt.');
  newLines.push('');
  newLines.push(...categories['System Prompt']['main']);
  newLines.push('');

  // System Reminders 章节
  newLines.push('### System Reminders');
  newLines.push('');
  newLines.push('Text for large system reminders.');
  newLines.push('');
  newLines.push('> [!NOTE]');
  newLines.push('> Note that we\'re planning to add a **system reminder creator/editor** to [tweakcc](https://github.com/Piebald-AI/tweakcc); :+1: [this issue](https://github.com/Piebald-AI/tweakcc/issues/113) if you\'re interested in that idea.');
  newLines.push('');
  newLines.push(...categories['System Reminders']['main']);
  newLines.push('');

  // Builtin Tool Descriptions 章节
  newLines.push('### Builtin Tool Descriptions');
  newLines.push('');
  newLines.push(...categories['Builtin Tool Descriptions']['main']);
  newLines.push('');
  newLines.push('**Additional notes for some Tool Desscriptions**');
  newLines.push('');
  newLines.push(...categories['Builtin Tool Descriptions']['Additional notes for some Tool Descriptions']);
  newLines.push('');

  // 写入更新后的 README
  writeFileSync(README_PATH, newLines.join('\n'));
}

// 主执行入口
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node updatePrompts.js <path-to-prompts.json>');
  console.error('Example: node updatePrompts.js /path/to/tweakcc/data/prompts/prompts-2.0.44.json');
  process.exit(1);
}

const jsonPath = args[0];
await updateFromJSON(jsonPath);
