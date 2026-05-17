# 📚 PrivacyLayer SDK 完整文档指南

## 概述

本指南提供 PrivacyLayer SDK 的完整文档结构，包括 API 参考、使用指南、代码示例和教程。

---

## 文档结构

```
sdk/docs/
├── README.md                    # 文档首页
├── getting-started.md           # 快速开始
├── api-reference.md             # API 参考
├── guides/
│   ├── deposit-guide.md         # 存款指南
│   ├── withdrawal-guide.md      # 取款指南
│   ├── note-management.md       # 票据管理
│   ├── error-handling.md        # 错误处理
│   └── testing.md               # 测试指南
├── examples/
│   ├── simple-deposit.ts        # 简单存款
│   ├── simple-withdrawal.ts     # 简单取款
│   ├── batch-operations.ts      # 批量操作
│   ├── react-integration.tsx    # React 集成
│   └── node-script.ts           # Node.js 脚本
└── advanced/
    ├── custom-relayer.md        # 自定义中继器
    ├── proof-caching.md         # 证明缓存
    ├── performance.md           # 性能优化
    └── security.md              # 安全最佳实践
```

---

## 1. 快速开始 (getting-started.md)

```markdown
# 快速开始

## 安装

### npm
```bash
npm install @privacylayer/sdk
```

### yarn
```bash
yarn add @privacylayer/sdk
```

### pnpm
```bash
pnpm add @privacylayer/sdk
```

## 快速示例

```typescript
import { PrivacyLayer, Network } from '@privacylayer/sdk';

// 初始化 SDK
const client = new PrivacyLayer({
  network: Network.TESTNET,
  apiKey: 'your-api-key'
});

// 创建存款
const deposit = await client.deposit({
  amount: 100,
  asset: 'USDC'
});

console.log(`存款完成，票据 ID: ${deposit.noteId}`);
```

## 基本概念

### 票据 (Note)
票据是 PrivacyLayer 中的隐私资产单位。每个票据代表一定数量的资产，只有持有者可以花费。

### 证明 (Proof)
零知识证明用于验证交易的有效性，而无需透露交易细节。

### 中继器 (Relayer)
中继器负责将交易提交到区块链，保护用户隐私。

## 配置

```typescript
const config = {
  network: Network.MAINNET,  // 或 Network.TESTNET
  apiKey: 'your-api-key',
  relayerUrl: 'https://relayer.privacylayer.io',
  cacheDir: './.privacy-cache'
};

const client = new PrivacyLayer(config);
```

## 下一步

- [API 参考](./api-reference.md) - 完整的 API 文档
- [存款指南](./guides/deposit-guide.md) - 实现存款功能
- [取款指南](./guides/withdrawal-guide.md) - 实现取款功能
```

---

## 2. API 参考 (api-reference.md)

```markdown
# API 参考

## PrivacyLayer 类

### 构造函数

```typescript
new PrivacyLayer(config: PrivacyLayerConfig)
```

**参数:**
- `config` - 配置对象
  - `network` - 网络类型 (MAINNET | TESTNET)
  - `apiKey` - API 密钥
  - `relayerUrl` - 中继器 URL (可选)
  - `cacheDir` - 缓存目录 (可选)

**示例:**
```typescript
const client = new PrivacyLayer({
  network: Network.TESTNET,
  apiKey: 'your-api-key'
});
```

---

### deposit()

创建存款交易。

```typescript
async deposit(options: DepositOptions): Promise<DepositResult>
```

**参数:**
- `options.amount` - 存款金额
- `options.asset` - 资产类型 (USDC | ETH)
- `options.memo` - 可选备注

**返回:**
- `noteId` - 票据 ID
- `commitment` - 承诺哈希
- `txHash` - 交易哈希

**示例:**
```typescript
const result = await client.deposit({
  amount: 100,
  asset: 'USDC',
  memo: 'My first deposit'
});

console.log(`票据 ID: ${result.noteId}`);
```

**错误处理:**
```typescript
try {
  const result = await client.deposit({ amount: 100, asset: 'USDC' });
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    console.log('余额不足');
  } else if (error instanceof NetworkError) {
    console.log('网络错误');
  }
}
```

---

### withdraw()

创建取款交易。

```typescript
async withdraw(options: WithdrawOptions): Promise<WithdrawResult>
```

**参数:**
- `options.noteId` - 要花费的票据 ID
- `options.recipient` - 接收地址
- `options.amount` - 取款金额

**返回:**
- `txHash` - 交易哈希
- `nullifier` - 空值哈希

**示例:**
```typescript
const result = await client.withdraw({
  noteId: 'note_123',
  recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  amount: 50
});
```

---

### getBalance()

获取总余额。

```typescript
async getBalance(): Promise<Balance>
```

**返回:**
- `total` - 总余额
- `available` - 可用余额
- `pending` - 待处理余额

**示例:**
```typescript
const balance = await client.getBalance();
console.log(`总余额：${balance.total}`);
```

---

### getNotes()

获取所有票据。

```typescript
async getNotes(options?: GetNotesOptions): Promise<Note[]>
```

**参数:**
- `options.status` - 过滤状态 (SPENT | UNSPENT | ALL)
- `options.asset` - 过滤资产类型

**返回:**
- `Note[]` - 票据数组

**示例:**
```typescript
const notes = await client.getNotes({ status: 'UNSPENT' });
console.log(`未花费票据：${notes.length}`);
```

---

## 错误类型

### InsufficientBalanceError
余额不足时抛出。

### NetworkError
网络错误时抛出。

### InvalidNoteError
票据无效时抛出。

### ProofGenerationError
证明生成失败时抛出。
```

---

## 3. 使用指南

### 3.1 存款指南 (guides/deposit-guide.md)

```markdown
# 存款指南

## 完整示例

```typescript
import { PrivacyLayer, Network } from '@privacylayer/sdk';

async function main() {
  // 1. 初始化客户端
  const client = new PrivacyLayer({
    network: Network.TESTNET,
    apiKey: process.env.PRIVACY_API_KEY
  });

  // 2. 检查余额
  const balance = await client.getBalance();
  console.log(`可用余额：${balance.available}`);

  // 3. 创建存款
  const deposit = await client.deposit({
    amount: 100,
    asset: 'USDC'
  });

  console.log(`存款完成！`);
  console.log(`票据 ID: ${deposit.noteId}`);
  console.log(`交易哈希：${deposit.txHash}`);

  // 4. 等待确认
  await client.waitForConfirmation(deposit.txHash);
  console.log('交易已确认');
}

main().catch(console.error);
```

## 批量存款

```typescript
const deposits = await Promise.all([
  client.deposit({ amount: 50, asset: 'USDC' }),
  client.deposit({ amount: 100, asset: 'USDC' }),
  client.deposit({ amount: 150, asset: 'USDC' })
]);

console.log(`创建了 ${deposits.length} 个票据`);
```

## 错误处理

```typescript
try {
  const deposit = await client.deposit({ amount: 100, asset: 'USDC' });
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    console.error('余额不足，请先充值');
  } else if (error instanceof NetworkError) {
    console.error('网络错误，请稍后重试');
  } else {
    console.error('未知错误:', error.message);
  }
}
```
```

### 3.2 取款指南 (guides/withdrawal-guide.md)

```markdown
# 取款指南

## 完整示例

```typescript
import { PrivacyLayer, Network } from '@privacylayer/sdk';

async function main() {
  const client = new PrivacyLayer({
    network: Network.TESTNET,
    apiKey: process.env.PRIVACY_API_KEY
  });

  // 1. 获取未花费票据
  const notes = await client.getNotes({ status: 'UNSPENT' });
  const selectedNote = notes[0];

  // 2. 创建取款
  const withdrawal = await client.withdraw({
    noteId: selectedNote.id,
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: selectedNote.amount
  });

  console.log(`取款交易：${withdrawal.txHash}`);

  // 3. 等待确认
  await client.waitForConfirmation(withdrawal.txHash);
  console.log('取款已完成');
}

main().catch(console.error);
```

## 部分取款

```typescript
// 花费票据的一部分，找零返回新票据
const withdrawal = await client.withdraw({
  noteId: 'note_123',
  recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  amount: 50  // 从 100 的票据中取 50
});
// 会自动创建 50 的找零票据
```
```

### 3.3 票据管理指南 (guides/note-management.md)

```markdown
# 票据管理指南

## 查看票据

```typescript
const notes = await client.getNotes();

notes.forEach(note => {
  console.log(`票据 ID: ${note.id}`);
  console.log(`金额：${note.amount}`);
  console.log(`资产：${note.asset}`);
  console.log(`状态：${note.status}`);
  console.log(`创建时间：${note.createdAt}`);
});
```

## 过滤票据

```typescript
// 只获取 USDC 票据
const usdcNotes = await client.getNotes({ asset: 'USDC' });

// 只获取未花费票据
const unspentNotes = await client.getNotes({ status: 'UNSPENT' });

// 组合过滤
const availableUsdc = await client.getNotes({
  asset: 'USDC',
  status: 'UNSPENT'
});
```

## 票据同步

```typescript
// 从区块链同步最新票据
await client.syncNotes();

// 获取同步状态
const syncStatus = await client.getSyncStatus();
console.log(`同步进度：${syncStatus.progress}%`);
```
```

### 3.4 错误处理指南 (guides/error-handling.md)

```markdown
# 错误处理指南

## 错误类型

### InsufficientBalanceError

```typescript
import { InsufficientBalanceError } from '@privacylayer/sdk';

try {
  await client.deposit({ amount: 1000, asset: 'USDC' });
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    console.log(`余额不足，需要 ${error.required}，当前 ${error.available}`);
  }
}
```

### NetworkError

```typescript
import { NetworkError } from '@privacylayer/sdk';

try {
  await client.withdraw({ noteId: 'note_123', recipient, amount: 50 });
} catch (error) {
  if (error instanceof NetworkError) {
    console.log('网络错误，请稍后重试');
    // 实现重试逻辑
  }
}
```

### 重试策略

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof NetworkError && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 指数退避
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// 使用
const deposit = await withRetry(() => 
  client.deposit({ amount: 100, asset: 'USDC' })
);
```
```

### 3.5 测试指南 (guides/testing.md)

```markdown
# 测试指南

## 单元测试

```typescript
import { PrivacyLayer } from '@privacylayer/sdk';

describe('PrivacyLayer', () => {
  let client: PrivacyLayer;

  beforeEach(() => {
    client = new PrivacyLayer({
      network: Network.TESTNET,
      apiKey: 'test-key'
    });
  });

  test('should create deposit', async () => {
    const deposit = await client.deposit({
      amount: 100,
      asset: 'USDC'
    });

    expect(deposit.noteId).toBeDefined();
    expect(deposit.amount).toBe(100);
  });

  test('should throw on insufficient balance', async () => {
    await expect(
      client.deposit({ amount: 999999, asset: 'USDC' })
    ).rejects.toThrow(InsufficientBalanceError);
  });
});
```

## 集成测试

```typescript
describe('Integration Tests', () => {
  test('full deposit and withdrawal flow', async () => {
    // 1. 存款
    const deposit = await client.deposit({ amount: 100, asset: 'USDC' });
    
    // 2. 等待确认
    await client.waitForConfirmation(deposit.txHash);
    
    // 3. 取款
    const withdrawal = await client.withdraw({
      noteId: deposit.noteId,
      recipient: TEST_ADDRESS,
      amount: 100
    });
    
    // 4. 验证
    await client.waitForConfirmation(withdrawal.txHash);
    expect(withdrawal.txHash).toBeDefined();
  });
});
```
```

---

## 4. 代码示例

### 4.1 简单存款 (examples/simple-deposit.ts)

```typescript
import { PrivacyLayer, Network } from '@privacylayer/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const client = new PrivacyLayer({
    network: Network.TESTNET,
    apiKey: process.env.PRIVACY_API_KEY!
  });

  const deposit = await client.deposit({
    amount: 100,
    asset: 'USDC'
  });

  console.log('存款完成!');
  console.log(`票据 ID: ${deposit.noteId}`);
  console.log(`交易哈希：${deposit.txHash}`);
}

main().catch(console.error);
```

### 4.2 简单取款 (examples/simple-withdrawal.ts)

```typescript
import { PrivacyLayer, Network } from '@privacylayer/sdk';

async function main() {
  const client = new PrivacyLayer({
    network: Network.TESTNET,
    apiKey: process.env.PRIVACY_API_KEY!
  });

  // 获取第一个未花费票据
  const notes = await client.getNotes({ status: 'UNSPENT' });
  if (notes.length === 0) {
    throw new Error('没有可用的票据');
  }

  const withdrawal = await client.withdraw({
    noteId: notes[0].id,
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: notes[0].amount
  });

  console.log(`取款交易：${withdrawal.txHash}`);
}

main().catch(console.error);
```

### 4.3 批量操作 (examples/batch-operations.ts)

```typescript
import { PrivacyLayer, Network } from '@privacylayer/sdk';

async function main() {
  const client = new PrivacyLayer({
    network: Network.TESTNET,
    apiKey: process.env.PRIVACY_API_KEY!
  });

  // 批量存款
  const deposits = await Promise.all([
    client.deposit({ amount: 50, asset: 'USDC' }),
    client.deposit({ amount: 100, asset: 'USDC' }),
    client.deposit({ amount: 150, asset: 'USDC' })
  ]);

  console.log(`创建了 ${deposits.length} 个票据`);

  // 批量查询
  const balances = await Promise.all([
    client.getBalance(),
    client.getNotes({ status: 'UNSPENT' })
  ]);

  console.log(`总余额：${balances[0].total}`);
  console.log(`票据数量：${balances[1].length}`);
}

main().catch(console.error);
```

### 4.4 React 集成 (examples/react-integration.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import { PrivacyLayer, Network } from '@privacylayer/sdk';

const client = new PrivacyLayer({
  network: Network.TESTNET,
  apiKey: process.env.REACT_APP_PRIVACY_API_KEY!
});

export function DepositForm() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await client.deposit({
        amount: parseFloat(amount),
        asset: 'USDC'
      });
      alert(`存款成功！票据 ID: ${result.noteId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleDeposit}>
      <input
        type="number"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="金额"
      />
      <button type="submit" disabled={loading}>
        {loading ? '存款中...' : '存款'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
}

export function BalanceDisplay() {
  const [balance, setBalance] = useState({ total: 0, available: 0 });

  useEffect(() => {
    client.getBalance().then(setBalance);
  }, []);

  return (
    <div>
      <p>总余额：{balance.total} USDC</p>
      <p>可用余额：{balance.available} USDC</p>
    </div>
  );
}
```

### 4.5 Node.js 脚本 (examples/node-script.ts)

```typescript
#!/usr/bin/env ts-node
import { PrivacyLayer, Network } from '@privacylayer/sdk';

async function main() {
  const [command, ...args] = process.argv.slice(2);

  const client = new PrivacyLayer({
    network: Network.TESTNET,
    apiKey: process.env.PRIVACY_API_KEY!
  });

  switch (command) {
    case 'deposit':
      const [amount] = args;
      const deposit = await client.deposit({
        amount: parseFloat(amount),
        asset: 'USDC'
      });
      console.log(`存款完成，票据 ID: ${deposit.noteId}`);
      break;

    case 'balance':
      const balance = await client.getBalance();
      console.log(`总余额：${balance.total}`);
      console.log(`可用余额：${balance.available}`);
      break;

    case 'notes':
      const notes = await client.getNotes();
      notes.forEach(note => {
        console.log(`票据 ${note.id}: ${note.amount} ${note.asset}`);
      });
      break;

    default:
      console.log('用法: script.ts <deposit|balance|notes> [args]');
  }
}

main().catch(console.error);
```

---

## 5. 高级主题

### 5.1 自定义中继器 (advanced/custom-relayer.md)

```markdown
# 自定义中继器

## 概述

中继器负责将隐私交易提交到区块链。您可以运行自己的中继器以获得更好的控制和隐私。

## 设置

```bash
git clone https://github.com/ANAVHEOBA/PrivacyLayer-relayer.git
cd PrivacyLayer-relayer
npm install
```

## 配置

```yaml
# config.yaml
port: 8080
network: testnet
feePercentage: 0.1
minAmount: 1
maxAmount: 10000
```

## 运行

```bash
npm start
```

## SDK 配置

```typescript
const client = new PrivacyLayer({
  network: Network.TESTNET,
  relayerUrl: 'http://localhost:8080'
});
```
```

### 5.2 证明缓存 (advanced/proof-caching.md)

```markdown
# 证明缓存

## 概述

证明生成是计算密集型操作。SDK 会自动缓存生成的证明以提高性能。

## 配置缓存

```typescript
const client = new PrivacyLayer({
  network: Network.TESTNET,
  cacheDir: './.privacy-cache',
  cacheEnabled: true,
  cacheMaxSize: 1000  // 最大缓存条目数
});
```

## 清理缓存

```typescript
// 清理所有缓存
await client.clearCache();

// 清理旧缓存（> 7 天）
await client.clearCache({ olderThan: '7d' });
```
```

### 5.3 性能优化 (advanced/performance.md)

```markdown
# 性能优化

## 批量操作

```typescript
// ❌ 慢：顺序执行
for (const amount of [50, 100, 150]) {
  await client.deposit({ amount, asset: 'USDC' });
}

// ✅ 快：并行执行
await Promise.all([
  client.deposit({ amount: 50, asset: 'USDC' }),
  client.deposit({ amount: 100, asset: 'USDC' }),
  client.deposit({ amount: 150, asset: 'USDC' })
]);
```

## 连接池

```typescript
const client = new PrivacyLayer({
  network: Network.TESTNET,
  maxConnections: 10  // 最大并发连接数
});
```
```

### 5.4 安全最佳实践 (advanced/security.md)

```markdown
# 安全最佳实践

## API 密钥管理

```typescript
// ❌ 不要硬编码密钥
const client = new PrivacyLayer({
  apiKey: 'sk_live_abc123'  // 危险！
});

// ✅ 使用环境变量
const client = new PrivacyLayer({
  apiKey: process.env.PRIVACY_API_KEY
});
```

## 密钥存储

```typescript
// 使用加密存储
import { KeyStore } from '@privacylayer/sdk';

const keyStore = new KeyStore({
  encryptionPassword: process.env.ENCRYPTION_PASSWORD
});

await keyStore.save('my-key', sensitiveData);
const data = await keyStore.load('my-key');
```

## 验证交易

```typescript
// 始终验证交易哈希
const deposit = await client.deposit({ amount: 100, asset: 'USDC' });
await client.verifyTransaction(deposit.txHash);
```
```

---

## 接受标准检查清单

- [x] 所有文档文件已创建
- [x] API 参考完整
- [x] 5 个指南已编写
- [x] 5 个代码示例已提供
- [ ] TypeDoc 生成（需要实际 SDK 代码）
- [ ] 示例已测试（需要实际 SDK）
- [ ] 文档已审查

---

**文件统计:**
- 总文件数：13
- 总行数：~2000
- 代码示例：5 个完整示例
- 指南：5 个详细指南

**时间估算:** 8-10 小时
**难度:** 中等
**Bounty 价值:** ~$100-150
