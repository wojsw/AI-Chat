import type { UIMessage } from 'ai';

export type ChatSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredChat = ChatSummary & {
  messages: UIMessage[];
};

export type KnowledgeChunk = {
  id: string;
  content: string;
  source: string;
  metadata?: Record<string, unknown>;
};

export type RetrievedChunk = KnowledgeChunk & {
  score: number;
};

export type RAGContext = {
  query: string;
  chunks: RetrievedChunk[];
};
