import { notFound } from 'next/navigation';
import { ChatShell } from '@/components/chat-shell';
import { listChats, loadChat } from '@/lib/chat-store';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  try {
    const [chat, chats] = await Promise.all([loadChat(id), listChats()]);
    return <ChatShell chat={chat} chats={chats} />;
  } catch {
    notFound();
  }
}
