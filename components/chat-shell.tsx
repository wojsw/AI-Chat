import type { ChatSummary, StoredChat } from '@/lib/types';
import { ChatWindow } from './chat-window';
import { Sidebar } from './sidebar';

export function ChatShell({ chat, chats }: { chat: StoredChat; chats: ChatSummary[] }) {
  return (
    <main className="h-screen overflow-hidden bg-transparent p-2 text-slate-900 md:p-4">
      <div className="flex h-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/50 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="hidden md:block">
          <Sidebar chats={chats} activeChatId={chat.id} />
        </div>
        <ChatWindow chat={chat} chats={chats} />
      </div>
    </main>
  );
}
