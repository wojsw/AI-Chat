import type { RAGContext } from '@/lib/types';
import { embedText, embedTexts } from './embeddings';
import { loadKnowledgeChunks } from './knowledge-loader';
import { InMemoryVectorStore } from './vector-store';

const vectorStore = new InMemoryVectorStore();
let initializationPromise: Promise<void> | null = null;

function getNumberEnv(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isRAGEnabled() {
  return process.env.RAG_ENABLED !== 'false';
}

async function initializeRAGStore() {
  if (!isRAGEnabled()) return;
  if (vectorStore.size > 0) return;

  const chunks = await loadKnowledgeChunks({
    chunkSize: getNumberEnv('RAG_CHUNK_SIZE', 800),
    chunkOverlap: getNumberEnv('RAG_CHUNK_OVERLAP', 120),
  });

  if (chunks.length === 0) return;

  const embeddings = await embedTexts(chunks.map(chunk => chunk.content));

  vectorStore.addMany(
    chunks.map((chunk, index) => ({
      chunk,
      embedding: embeddings[index],
    })),
  );
}

export async function retrieveRAGContext(query: string): Promise<RAGContext> {
  if (!isRAGEnabled() || !query.trim()) {
    return { query, chunks: [] };
  }

  if (!initializationPromise) {
    initializationPromise = initializeRAGStore().catch(error => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;

  if (vectorStore.size === 0) {
    return { query, chunks: [] };
  }

  const queryEmbedding = await embedText(query);
  const chunks = vectorStore.search(queryEmbedding, {
    topK: getNumberEnv('RAG_TOP_K', 5),
    scoreThreshold: getNumberEnv('RAG_SCORE_THRESHOLD', 0.25),
  });

  return { query, chunks };
}

export function formatRAGContext(context: RAGContext) {
  if (context.chunks.length === 0) {
    return '未检索到与当前问题足够相关的知识库资料。';
  }

  return context.chunks
    .map(
      (chunk, index) =>
        `资料 ${index + 1}\n来源：${chunk.source}\n相关度：${chunk.score.toFixed(3)}\n内容：\n${chunk.content}`,
    )
    .join('\n\n---\n\n');
}
