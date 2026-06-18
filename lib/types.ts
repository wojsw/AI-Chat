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
