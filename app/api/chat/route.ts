import { openai } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  createIdGenerator,
  streamText,
  type UIMessage,
} from 'ai';
import { loadChat, saveChat } from '@/lib/chat-store';

export const maxDuration = 30;

type ChatRequest =
  | {
      trigger: 'submit-message';
      id: string;
      message: UIMessage;
    }
  | {
      trigger: 'regenerate-message';
      id: string;
      messageId?: string;
    };

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequest;
  const chat = await loadChat(body.id);

  let messages = chat.messages;
  if (body.trigger === 'submit-message') {
    messages = [...messages, body.message];
  }

  if (body.trigger === 'regenerate-message') {
    const messageIndex = body.messageId
      ? messages.findIndex(message => message.id === body.messageId)
      : -1;

    if (messageIndex >= 0) {
      messages = messages.slice(0, messageIndex);
    } else if (messages.at(-1)?.role === 'assistant') {
      messages = messages.slice(0, -1);
    }
  }

  const result = streamText({
    model: openai(process.env.OPENAI_MODEL ?? 'gpt-4o-mini'),
    system: '你是一个友好、严谨且擅长编程的 AI 助手。请使用中文简体回答，必要时使用 Markdown 和代码块。',
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
    onFinish: ({ messages: finishedMessages }) => {
      saveChat({ chatId: body.id, messages: finishedMessages });
    },
    onError: error => {
      if (error instanceof Error) return error.message;
      if (typeof error === 'string') return error;
      return '生成回复时发生未知错误。';
    },
  });
}
