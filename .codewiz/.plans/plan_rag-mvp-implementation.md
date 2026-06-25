# AI-Flow RAG MVP 实现方案

## 概述

为现有的 Next.js 聊天应用集成最小可运行的 RAG（检索增强生成）能力。采用**本地知识库 + 内存向量存储**的方案，通过文档切分、Embedding 生成、TopK 检索和 Prompt 注入，让模型基于知识库内容回答问题。目标是**最小化改动**，保持现有架构完整性。

---

## 架构分析

### 现有系统特点
- **聊天接口**：`app/api/chat/route.ts` 使用 Vercel AI SDK 的 `ToolLoopAgent`，支持流式响应
- **前端交互**：`components/chat-window.tsx` 通过 `useChat` hook 与后端通信
- **消息存储**：`lib/chat-store.ts` 本地文件系统存储（`.chats/` 目录）
- **类型系统**：`lib/types.ts` 定义 `StoredChat` 和 `ChatSummary`
- **模型配置**：使用 DeepSeek API（可选 OpenAI），支持工具调用

### RAG 集成关键点
1. **知识库来源**：固定本地 Markdown/文本文件（`knowledge/` 目录）
2. **向量化方案**：使用轻量级库（`@xenova/transformers` 或 `js-tiktoken` + 简单相似度）
3. **检索策略**：内存向量存储（初期无需数据库），TopK=3-5
4. **Prompt 注入**：在聊天接口中拼接检索结果到系统提示词
5. **最小改动**：仅修改 `route.ts` 和新增 RAG 相关模块，不触及 UI 层

---

## 推荐技术方案

### 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **方案A：Embedding + 内存向量存储** | 无外部依赖，快速启动，适合 MVP | 不支持持久化，重启丢失 | ⭐⭐⭐⭐⭐ |
| **方案B：Pinecone/Weaviate** | 生产级，支持持久化 | 需要外部服务，增加复杂度 | ⭐⭐⭐ |
| **方案C：LangChain + SQLite** | 功能完整，易扩展 | 依赖重，学习曲线陡 | ⭐⭐⭐ |

**选择方案A**：内存向量存储 + 本地知识库文件

### 技术栈
- **文档加载**：原生 Node.js `fs` 模块读取 Markdown
- **文本切分**：自实现简单的递归切分（按段落/句子）
- **Embedding**：
  - 选项1：`@xenova/transformers`（本地模型，无网络依赖）
  - 选项2：调用 OpenAI/DeepSeek Embedding API（更准确，需付费）
  - **推荐**：选项1（MVP 阶段）
- **相似度计算**：余弦相似度（自实现或 `ml-distance`）
- **向量存储**：内存数组 + 简单索引
- **Prompt 注入**：在 `assistantAgent.instructions` 中动态拼接上下文

---

## 需要新增/修改的文件

### 新增文件

1. **`lib/rag/knowledge-loader.ts`** - 知识库加载器
   - 读取 `knowledge/` 目录下的 Markdown 文件
   - 返回文档列表

2. **`lib/rag/text-splitter.ts`** - 文本切分器
   - 递归切分文本为 chunk（500-1000 字符）
   - 保留上下文重叠

3. **`lib/rag/embeddings.ts`** - Embedding 生成
   - 初始化本地 Embedding 模型（`@xenova/transformers`）
   - 生成向量

4. **`lib/rag/vector-store.ts`** - 向量存储与检索
   - 内存存储 chunk + 向量
   - 实现 TopK 检索（余弦相似度）
   - 初始化时加载知识库

5. **`lib/rag/index.ts`** - RAG 模块导出
   - 统一导出 RAG 功能
   - 初始化向量存储单例

6. **`knowledge/sample.md`** - 示例知识库文件
   - 包含示例内容（如产品文档、FAQ 等）

### 修改文件

1. **`app/api/chat/route.ts`** - 聊天接口
   - 导入 RAG 模块
   - 在处理消息前调用 `retrieveContext(userMessage)`
   - 将检索结果注入 `assistantAgent.instructions` 或消息历史

2. **`lib/types.ts`** - 类型定义
   - 新增 `RAGContext` 类型（检索结果）
   - 新增 `KnowledgeChunk` 类型

3. **`.env`** - 环境变量
   - 新增 `RAG_ENABLED=true`
   - 新增 `RAG_TOP_K=5`
   - 新增 `EMBEDDING_MODEL=xenova/all-MiniLM-L6-v2`（可选）

4. **`package.json`** - 依赖
   - 新增 `@xenova/transformers`（Embedding）
   - 新增 `ml-distance`（相似度计算，可选）

---

## 实施步骤

### 第一阶段：基础设施（1-2 小时）

#### 步骤 1：安装依赖
```bash
npm install @xenova/transformers
npm install --save-dev @types/node
```

#### 步骤 2：创建知识库目录和示例文件
```
knowledge/
├── sample.md          # 示例文档
└── faq.md            # FAQ 文档（可选）
```

示例 `knowledge/sample.md`：
```markdown
# 产品文档

## 功能特性
- 支持流式输出
- 支持代码高亮
- 本地消息存储

## 常见问题
Q: 如何导出聊天记录？
A: 聊天记录自动保存在本地 .chats 目录。

## 使用指南
1. 输入问题
2. 等待 AI 回复
3. 可重新生成或继续对话
```

#### 步骤 3：实现文本切分器 (`lib/rag/text-splitter.ts`)
- 按段落切分（`\n\n` 分隔）
- 如果段落过长，按句子切分（`。！？` 分隔）
- 保留 100 字符重叠

#### 步骤 4：实现 Embedding 模块 (`lib/rag/embeddings.ts`)
- 初始化 `@xenova/transformers` 的 `feature-extraction` 管道
- 实现 `generateEmbedding(text: string): Promise<number[]>`
- 缓存模型实例（避免重复加载）

#### 步骤 5：实现向量存储 (`lib/rag/vector-store.ts`)
- 定义 `VectorStore` 类
- 实现 `addChunk(text: string, metadata: any): Promise<void>`
- 实现 `retrieve(query: string, topK: number): Promise<RetrievedChunk[]>`
- 余弦相似度计算

#### 步骤 6：实现知识库加载器 (`lib/rag/knowledge-loader.ts`)
- 读取 `knowledge/` 目录
- 解析 Markdown 文件
- 返回文档列表

#### 步骤 7：创建 RAG 初始化模块 (`lib/rag/index.ts`)
```typescript
// 单例模式初始化向量存储
let vectorStore: VectorStore | null = null;

export async function initializeRAG(): Promise<VectorStore> {
  if (vectorStore) return vectorStore;
  
  vectorStore = new VectorStore();
  const documents = await loadKnowledgeBase();
  const chunks = splitDocuments(documents);
  
  for (const chunk of chunks) {
    await vectorStore.addChunk(chunk.text, chunk.metadata);
  }
  
  return vectorStore;
}

export async function retrieveContext(query: string): Promise<string> {
  const store = await initializeRAG();
  const results = await store.retrieve(query, 5);
  return results.map(r => r.text).join('\n\n---\n\n');
}
```

### 第二阶段：聊天接口集成（1 小时）

#### 步骤 8：修改 `app/api/chat/route.ts`
```typescript
import { retrieveContext } from '@/lib/rag';

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequest;
  const chat = await loadChat(body.id);

  let messages = chat.messages;
  
  // 新增：获取用户最后一条消息
  let userQuery = '';
  if (body.trigger === 'submit-message') {
    userQuery = body.message.content as string;
    messages = [...messages, body.message];
  }

  // 新增：检索相关知识库内容
  let ragContext = '';
  if (userQuery && process.env.RAG_ENABLED === 'true') {
    try {
      ragContext = await retrieveContext(userQuery);
    } catch (error) {
      console.error('RAG retrieval failed:', error);
      // 降级处理：继续聊天，不中断
    }
  }

  // 新增：注入 RAG 上下文到系统提示词
  const systemPrompt = ragContext 
    ? `${assistantAgent.instructions}\n\n【知识库参考】\n${ragContext}`
    : assistantAgent.instructions;

  // 修改：使用注入上下文的 agent
  const agentWithContext = new ToolLoopAgent({
    ...assistantAgent,
    instructions: systemPrompt,
  });

  // 后续逻辑保持不变...
}
```

#### 步骤 9：更新环境变量 (`.env`)
```
DEEPSEEK_API_KEY=sk-88a6d0d8718e4cc69c15fed9e25c018d
RAG_ENABLED=true
RAG_TOP_K=5
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=100
```

#### 步骤 10：更新类型定义 (`lib/types.ts`)
```typescript
export type KnowledgeChunk = {
  id: string;
  text: string;
  source: string;
  metadata?: Record<string, any>;
};

export type RAGContext = {
  chunks: KnowledgeChunk[];
  query: string;
  retrievedAt: string;
};
```

### 第三阶段：测试与优化（1 小时）

#### 步骤 11：本地测试
1. 启动开发服务器：`npm run dev`
2. 创建新聊天
3. 提问与知识库相关的问题（如"产品有什么功能？"）
4. 验证回复是否引用了知识库内容

#### 步骤 12：调试与日志
- 在 `retrieveContext` 中添加日志，输出检索结果
- 验证 Embedding 模型是否正确加载
- 检查相似度分数是否合理（>0.5）

#### 步骤 13：性能优化
- 缓存 Embedding 结果（避免重复计算）
- 异步初始化向量存储（不阻塞首次请求）
- 考虑预加载知识库（应用启动时）

---

## 关键文件实现细节

### 1. `lib/rag/text-splitter.ts`
```typescript
export interface TextChunk {
  text: string;
  startIndex: number;
  endIndex: number;
}

export function splitText(
  text: string,
  chunkSize: number = 800,
  overlap: number = 100
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let startIndex = 0;

  // 按段落分割
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + para).length > chunkSize && currentChunk) {
      chunks.push({
        text: currentChunk.trim(),
        startIndex,
        endIndex: startIndex + currentChunk.length,
      });
      startIndex += currentChunk.length - overlap;
      currentChunk = currentChunk.slice(-overlap) + para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      startIndex,
      endIndex: startIndex + currentChunk.length,
    });
  }

  return chunks;
}
```

### 2. `lib/rag/embeddings.ts`
```typescript
import { pipeline } from '@xenova/transformers';

let embeddingPipeline: any = null;

export async function initEmbeddings() {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }
  return embeddingPipeline;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const pipe = await initEmbeddings();
  const result = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data);
}
```

### 3. `lib/rag/vector-store.ts`
```typescript
import { generateEmbedding } from './embeddings';

export interface StoredChunk {
  id: string;
  text: string;
  embedding: number[];
  metadata: Record<string, any>;
}

export interface RetrievedChunk extends StoredChunk {
  score: number;
}

export class VectorStore {
  private chunks: StoredChunk[] = [];
  private idCounter = 0;

  async addChunk(text: string, metadata: Record<string, any> = {}): Promise<void> {
    const embedding = await generateEmbedding(text);
    this.chunks.push({
      id: `chunk_${this.idCounter++}`,
      text,
      embedding,
      metadata,
    });
  }

  async retrieve(query: string, topK: number = 5): Promise<RetrievedChunk[]> {
    const queryEmbedding = await generateEmbedding(query);
    
    const scored = this.chunks.map(chunk => ({
      ...chunk,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
```

### 4. `lib/rag/knowledge-loader.ts`
```typescript
import { readdir, readFile } from 'fs/promises';
import path from 'path';

export interface Document {
  content: string;
  source: string;
  title: string;
}

export async function loadKnowledgeBase(): Promise<Document[]> {
  const knowledgeDir = path.join(process.cwd(), 'knowledge');
  const files = await readdir(knowledgeDir);
  const documents: Document[] = [];

  for (const file of files) {
    if (file.endsWith('.md') || file.endsWith('.txt')) {
      const filePath = path.join(knowledgeDir, file);
      const content = await readFile(filePath, 'utf-8');
      documents.push({
        content,
        source: file,
        title: file.replace(/\.(md|txt)$/, ''),
      });
    }
  }

  return documents;
}
```

---

## 环境变量配置

```env
# 现有配置
DEEPSEEK_API_KEY=sk-88a6d0d8718e4cc69c15fed9e25c018d

# RAG 配置
RAG_ENABLED=true                          # 启用 RAG
RAG_TOP_K=5                               # 检索 TopK 数量
RAG_CHUNK_SIZE=800                        # 文本块大小（字符）
RAG_CHUNK_OVERLAP=100                     # 块重叠大小
RAG_SIMILARITY_THRESHOLD=0.3              # 相似度阈值（可选）

# Embedding 配置（可选，如使用 API）
# OPENAI_API_KEY=sk-...
# EMBEDDING_MODEL=text-embedding-3-small
```

---

## 关键代码结构

### 聊天流程改造

```
用户输入
  ↓
[新增] 提取用户查询
  ↓
[新增] 调用 retrieveContext(query)
  ↓
[新增] 向量存储检索 TopK 相关文档
  ↓
[新增] 拼接检索结果到系统提示词
  ↓
[现有] 调用 DeepSeek/OpenAI API
  ↓
[现有] 流式返回回复
  ↓
[现有] 保存聊天记录
```

### 模块依赖关系

```
app/api/chat/route.ts
  ├── lib/rag/index.ts (retrieveContext)
  │   ├── lib/rag/vector-store.ts
  │   │   ├── lib/rag/embeddings.ts
  │   │   └── lib/rag/text-splitter.ts
  │   └── lib/rag/knowledge-loader.ts
  └── lib/chat-store.ts (现有)
```

---

## 依赖包详解

### 必需包

| 包名 | 版本 | 用途 | 大小 |
|------|------|------|------|
| `@xenova/transformers` | ^2.6.0 | 本地 Embedding 模型 | ~200MB（首次下载） |

### 可选包

| 包名 | 版本 | 用途 | 备注 |
|------|------|------|------|
| `ml-distance` | ^2.0.0 | 相似度计算 | 可自实现 |
| `js-tiktoken` | ^1.0.0 | Token 计数 | 用于精确切分 |

---

## 风险与缓解策略

### 风险 1：Embedding 模型首次加载缓慢
- **表现**：首次请求延迟 10-30 秒
- **缓解**：
  - 应用启动时预加载模型
  - 使用 `initializeRAG()` 在后台初始化
  - 前端显示"正在加载知识库"提示

### 风险 2：内存占用过高
- **表现**：向量存储占用大量内存（每个 chunk ~400 字节）
- **缓解**：
  - 限制知识库大小（初期 <10MB）
  - 定期清理过期 chunk
  - 后期迁移到向量数据库（Pinecone/Weaviate）

### 风险 3：检索质量不佳
- **表现**：返回不相关的文档
- **缓解**：
  - 调整 `RAG_CHUNK_SIZE` 和 `RAG_CHUNK_OVERLAP`
  - 提高 `RAG_SIMILARITY_THRESHOLD`
  - 优化知识库文档结构（添加标题、摘要）

### 风险 4：API 成本增加
- **表现**：如果使用 OpenAI Embedding API，成本增加
- **缓解**：
  - MVP 阶段使用本地 Embedding（`@xenova/transformers`）
  - 缓存 Embedding 结果
  - 后期评估成本再决定是否迁移

### 风险 5：知识库更新不及时
- **表现**：修改 `knowledge/` 文件后，需重启应用
- **缓解**：
  - 实现热重载机制（监听文件变化）
  - 提供管理界面更新知识库
  - 后期集成数据库管理

---

## 验证方式

### 单元测试

#### 1. 文本切分测试
```typescript
// lib/rag/__tests__/text-splitter.test.ts
import { splitText } from '../text-splitter';

describe('Text Splitter', () => {
  it('should split text into chunks', () => {
    const text = '段落1\n\n段落2\n\n段落3';
    const chunks = splitText(text, 100, 20);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].text).toBeTruthy();
  });
});
```

#### 2. Embedding 测试
```typescript
// lib/rag/__tests__/embeddings.test.ts
import { generateEmbedding } from '../embeddings';

describe('Embeddings', () => {
  it('should generate embedding vector', async () => {
    const embedding = await generateEmbedding('测试文本');
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBeGreaterThan(0);
  });
});
```

#### 3. 向量存储测试
```typescript
// lib/rag/__tests__/vector-store.test.ts
import { VectorStore } from '../vector-store';

describe('Vector Store', () => {
  it('should retrieve similar chunks', async () => {
    const store = new VectorStore();
    await store.addChunk('产品功能包括流式输出');
    const results = await store.retrieve('功能', 1);
    expect(results.length).toBe(1);
    expect(results[0].score).toBeGreaterThan(0);
  });
});
```

### 集成测试

#### 1. 知识库加载测试
```bash
# 验证 knowledge/ 目录存在且包含文件
ls -la knowledge/
```

#### 2. RAG 端到端测试
```typescript
// 在 app/api/chat/route.ts 中添加测试端点
export async function GET() {
  const context = await retrieveContext('产品功能');
  return Response.json({ context });
}
```

#### 3. 聊天集成测试
```bash
# 启动开发服务器
npm run dev

# 发送测试请求
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "trigger": "submit-message",
    "id": "test-chat",
    "message": {
      "id": "msg-1",
      "role": "user",
      "content": "产品有什么功能？"
    }
  }'
```

### 手动验证清单

- [ ] 知识库文件正确加载（检查日志）
- [ ] Embedding 模型成功初始化（首次请求延迟 10-30 秒）
- [ ] 检索结果相关性高（相似度 >0.5）
- [ ] 模型回复引用了知识库内容
- [ ] 无知识库相关问题仍能正常回答
- [ ] 聊天记录正常保存
- [ ] 内存占用在可接受范围（<500MB）

---

## 后续扩展方向

### 短期（1-2 周）
1. **知识库管理界面**：上传/删除文档
2. **检索结果展示**：在聊天中显示引用来源
3. **缓存优化**：Redis 缓存 Embedding 结果
4. **性能监控**：记录检索耗时和相似度分数

### 中期（1-2 月）
1. **向量数据库迁移**：Pinecone/Weaviate/Milvus
2. **混合检索**：BM25 + 向量检索
3. **多模态支持**：图片、PDF 文档
4. **知识库版本管理**：追踪文档更新历史

### 长期（3-6 月）
1. **微调模型**：针对特定领域优化 Embedding
2. **多语言支持**：跨语言检索
3. **实时更新**：流式知识库同步
4. **成本优化**：本地模型 vs API 成本分析

---

## 总结

| 项目 | 说明 |
|------|------|
| **实现周期** | 3-4 小时（包括测试） |
| **代码改动** | ~500 行新增代码，~50 行修改 |
| **依赖增加** | 1 个主要包（`@xenova/transformers`） |
| **性能影响** | 首次请求 +10-30 秒（模型加载），后续 +200-500ms（检索） |
| **内存占用** | +50-200MB（向量存储） |
| **知识库容量** | 初期支持 <10MB（~10000 chunks） |
| **可维护性** | 高（模块化设计，易于扩展） |
| **生产就绪** | MVP 级别，需后续优化 |

---

## 快速开始命令

```bash
# 1. 安装依赖
npm install @xenova/transformers

# 2. 创建知识库目录
mkdir -p knowledge

# 3. 添加示例文档
cat > knowledge/sample.md << 'EOF'
# 产品文档

## 功能特性
- 支持流式输出
- 支持代码高亮
- 本地消息存储
EOF

# 4. 更新 .env
echo "RAG_ENABLED=true" >> .env

# 5. 启动开发服务器
npm run dev

# 6. 测试 RAG
# 在聊天中提问："产品有什么功能？"
```

---

**方案制定完成**。建议按照"第一阶段 → 第二阶段 → 第三阶段"的顺序实施，每个阶段完成后进行验证。如有疑问，可参考"关键代码结构"和"代码片段"部分。
