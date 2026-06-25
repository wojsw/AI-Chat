import type { KnowledgeChunk, RetrievedChunk } from '@/lib/types';

export type VectorStoreItem = {
  chunk: KnowledgeChunk;
  embedding: number[];
};

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dotProduct += a[index] * b[index];
    magnitudeA += a[index] * a[index];
    magnitudeB += b[index] * b[index];
  }

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

export class InMemoryVectorStore {
  private items: VectorStoreItem[] = [];

  add(item: VectorStoreItem) {
    this.items.push(item);
  }

  addMany(items: VectorStoreItem[]) {
    this.items.push(...items);
  }

  clear() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  search(queryEmbedding: number[], options?: { topK?: number; scoreThreshold?: number }): RetrievedChunk[] {
    const topK = options?.topK ?? 5;
    const scoreThreshold = options?.scoreThreshold ?? 0;

    return this.items
      .map(item => ({
        ...item.chunk,
        score: cosineSimilarity(queryEmbedding, item.embedding),
      }))
      .filter(item => item.score >= scoreThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
