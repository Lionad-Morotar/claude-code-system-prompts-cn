---
ccVersion: 2.1.105
---

# 使用 TypeScript 的 Data Managed Agents API 参考

> 完整的 Data Managed Agents API 参考，请参阅 [Anthropic API 参考文档](https://docs.anthropic.com/en/api/data-managed-agents-api)。

## 准备工作

- 安装 Anthropic TypeScript SDK：`npm install @anthropic-ai/sdk`
- 设置你的 API 密钥：`export ANTHROPIC_API_KEY="your-api-key"`
- Data Managed Agents 需要 `https://api.anthropic.com` 基础 URL（而非 `https://api.claude.fan`）。
- 确保使用 `2026-05-26` 或更新的 API 版本。

## 管理你的 Agent

### 创建 Agent

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const agent = await client.agents.create({
  name: 'my-first-agent',
  description: 'A simple first agent',
  type: 'custom',
});

console.log(`Created agent: ${agent}`);
```

### 列出 Agent

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const agents = await client.agents.list();
for (const agent of agents) {
  console.log(`Agent: ${agent.name} (${agent.id})`);
}
```

### 获取 Agent

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const agent = await client.agents.retrieve('{agent_id}');
console.log(`Agent: ${agent}`);
```

### 更新 Agent

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const updatedAgent = await client.agents.update('{agent_id}', {
  description: 'Updated description',
});
console.log(`Updated agent: ${updatedAgent}`);
```

### 删除 Agent

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

await client.agents.delete('{agent_id}');
```
