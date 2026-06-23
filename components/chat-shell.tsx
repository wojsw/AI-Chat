'use client';

import { useState } from 'react';
import type { ChatSummary, StoredChat } from '@/lib/types';
import { ChatWindow } from './chat-window';
import { Sidebar } from './sidebar';

export function ChatShell({ chat, chats }: { chat: StoredChat; chats: ChatSummary[] }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <main className="h-screen overflow-hidden bg-[#f8f8f7] text-slate-900">
      <div className="flex h-full overflow-hidden">
        <div className={`hidden h-full shrink-0 transition-[width] duration-300 ease-in-out md:block ${sidebarCollapsed ? 'w-[76px]' : 'w-[300px]'}`}>
          <Sidebar
            chats={chats}
            activeChatId={chat.id}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(collapsed => !collapsed)}
          />
        </div>
        <ChatWindow chat={chat} chats={chats} sidebarCollapsed={sidebarCollapsed} />
      </div>
    </main>
  );
}
