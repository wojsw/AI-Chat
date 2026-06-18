import Link from 'next/link';
import { ChevronDown, FileText, History, MessageSquare, MessageSquarePlus, Sparkles } from 'lucide-react';
import type { ChatSummary } from '@/lib/types';

const navSections = [
  {
    title: 'CHAT',
    items: [{ label: 'Chat', icon: MessageSquare, href: '/' }],
  },
  {
    title: 'CONTROL',
    items: [{ label: 'Chat History', icon: History, href: '/' }],
  },
  {
    title: 'AGENT',
    items: [{ label: 'Skills', icon: Sparkles, href: '/' }],
  },
];

export function Sidebar({ chats, activeChatId }: { chats: ChatSummary[]; activeChatId: string }) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-white/70 bg-white/75 text-slate-700 shadow-[inset_-1px_0_0_rgba(255,255,255,0.55)] backdrop-blur-xl md:w-72">
      <div className="flex h-16 items-center justify-between border-b border-white/70 px-4">
        <Link href="/" className="flex items-center gap-3" title="新建会话">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-blue-500/25">
            <MessageSquarePlus className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-950">AI Flow</h1>
            <p className="text-[11px] text-slate-400">Local Chat Workspace</p>
          </div>
        </Link>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/80 bg-white/75 text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
          aria-label="收起侧边栏"
        >
          <ChevronDown className="h-4 w-4 rotate-90" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-5">
          {navSections.map(section => (
            <div key={section.title}>
              <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{section.title}</span>
                <ChevronDown className="h-3 w-3 text-slate-300" />
              </div>
              <div className="space-y-1.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const active = item.label === 'Chat';
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                        active
                          ? 'border border-blue-200/80 bg-gradient-to-r from-blue-50 to-indigo-50 text-slate-900 shadow-sm shadow-blue-500/10'
                          : 'text-slate-500 hover:bg-white/75 hover:text-slate-900 hover:shadow-sm'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <span>RECENT</span>
            <ChevronDown className="h-3 w-3 text-slate-300" />
          </div>
          <div className="space-y-1.5">
            {chats.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/75 p-3 text-xs text-slate-400 shadow-sm">
                暂无历史会话
              </div>
            ) : (
              chats.map(chat => {
                const active = chat.id === activeChatId;
                return (
                  <Link
                    key={chat.id}
                    href={`/chat/${chat.id}`}
                    className={`block rounded-xl border px-3 py-2.5 transition ${
                      active
                        ? 'border-blue-200/80 bg-white text-slate-950 shadow-sm shadow-blue-500/10'
                        : 'border-transparent text-slate-500 hover:border-white/80 hover:bg-white/75 hover:text-slate-900 hover:shadow-sm'
                    }`}
                  >
                    <div className="line-clamp-2 text-sm font-medium">{chat.title}</div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {new Intl.DateTimeFormat('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(chat.updatedAt))}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/70 p-3">
        <Link href="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-white/75 hover:text-slate-900 hover:shadow-sm">
          <FileText className="h-4 w-4 text-slate-400" />
          Docs
        </Link>
        <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/80 bg-white/75 px-3 py-2 text-[11px] font-semibold text-slate-500 shadow-sm">
          <span>VERSION</span>
          <span className="text-slate-700">v1.0.0</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
        </div>
      </div>
    </aside>
  );
}
