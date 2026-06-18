import type { UIMessage } from 'ai';

export function getMessageText(message: UIMessage): string {
  return message.parts
    .map(part => (part.type === 'text' ? part.text : ''))
    .join('')
    .trim();
}

export function createChatTitle(messages: UIMessage[]): string {
  const firstUserMessage = messages.find(message => message.role === 'user');
  const text = firstUserMessage ? getMessageText(firstUserMessage) : '';
  if (!text) return '新会话';
  return text.length > 28 ? `${text.slice(0, 28)}…` : text;
}
