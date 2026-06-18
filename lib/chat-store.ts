import { createIdGenerator, type UIMessage } from 'ai';
import { existsSync, mkdirSync } from 'fs';
import { readFile, readdir, writeFile } from 'fs/promises';
import path from 'path';
import type { ChatSummary, StoredChat } from './types';
import { createChatTitle } from './message-utils';

const chatIdRegex = /^[A-Za-z0-9_-]+$/;
const createChatId = createIdGenerator({ prefix: 'chat', size: 16 });

export async function createChat(): Promise<string> {
  const id = createChatId();
  const now = new Date().toISOString();
  const chat: StoredChat = {
    id,
    title: '新会话',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  await writeFile(getChatFile(id), JSON.stringify(chat, null, 2));
  return id;
}

export async function loadChat(id: string): Promise<StoredChat> {
  const raw = await readFile(getChatFile(id), 'utf8');
  const parsed = JSON.parse(raw) as Partial<StoredChat> | UIMessage[];

  if (Array.isArray(parsed)) {
    const now = new Date().toISOString();
    return {
      id,
      title: createChatTitle(parsed),
      createdAt: now,
      updatedAt: now,
      messages: parsed,
    };
  }

  return {
    id,
    title: parsed.title ?? createChatTitle(parsed.messages ?? []),
    createdAt: parsed.createdAt ?? new Date().toISOString(),
    updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    messages: parsed.messages ?? [],
  };
}

export async function listChats(): Promise<ChatSummary[]> {
  const chatDir = getChatDir();
  if (!existsSync(chatDir)) return [];

  const files = await readdir(chatDir);
  const chats = await Promise.all(
    files
      .filter(file => file.endsWith('.json'))
      .map(async file => {
        const id = file.replace(/\.json$/, '');
        try {
          const chat = await loadChat(id);
          return {
            id: chat.id,
            title: chat.title,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
          } satisfies ChatSummary;
        } catch {
          return null;
        }
      }),
  );

  return chats
    .filter((chat): chat is ChatSummary => chat !== null)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function saveChat({ chatId, messages }: { chatId: string; messages: UIMessage[] }): Promise<void> {
  let existing: StoredChat | null = null;
  try {
    existing = await loadChat(chatId);
  } catch {
    existing = null;
  }

  const now = new Date().toISOString();
  const chat: StoredChat = {
    id: chatId,
    title: createChatTitle(messages),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    messages,
  };

  await writeFile(getChatFile(chatId), JSON.stringify(chat, null, 2));
}

function getChatDir(): string {
  const chatDir = path.resolve(process.cwd(), '.chats');
  if (!existsSync(chatDir)) mkdirSync(chatDir, { recursive: true });
  return chatDir;
}

function getChatFile(id: string): string {
  if (!chatIdRegex.test(id)) {
    throw new Error('Invalid chat ID');
  }

  const chatDir = getChatDir();
  const chatFile = path.resolve(chatDir, `${id}.json`);

  if (!chatFile.startsWith(`${chatDir}${path.sep}`)) {
    throw new Error('Invalid chat ID');
  }

  return chatFile;
}
