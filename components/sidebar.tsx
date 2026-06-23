'use client';

import Link from 'next/link';
import { Clock3, MessageSquare, MessageSquarePlus, PanelLeft, Sparkles, X } from 'lucide-react';
import type { ChatSummary } from '@/lib/types';

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

type SidebarProps = {
  chats: ChatSummary[];
  activeChatId: string;
  collapsed?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
};

export function Sidebar({ chats, activeChatId, collapsed = false, onClose, onToggle }: SidebarProps) {
  return (
    <aside className="flex h-full w-full shrink-0 flex-col overflow-hidden border-r border-[#ececea] bg-[#f3f3f1] text-slate-900">
      <div className={collapsed ? 'flex h-20 shrink-0 flex-col items-center justify-center gap-2 px-2' : 'flex h-16 shrink-0 items-center justify-between px-4'}>
        <div className={collapsed ? 'flex items-center justify-center' : 'flex items-center gap-2'}>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4d6bfe] text-white shadow-sm shadow-blue-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">AI Flow</p>
              <h1 className="text-sm font-semibold tracking-tight text-slate-900">智能对话</h1>
            </div>
          )}
        </div>

        <div className={collapsed ? 'flex items-center justify-center' : 'flex items-center gap-2'}>
          {onToggle && (
            <button
              type="button"
              aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
              onClick={onToggle}
              className="hidden h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-slate-500 shadow-sm transition hover:text-[#4d6bfe] md:flex"
            >
              <PanelLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          )}
          {onClose && !collapsed && (
            <button
              type="button"
              aria-label="关闭侧边栏"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-slate-500 shadow-sm transition hover:text-slate-950 md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className={collapsed ? 'flex justify-center px-2 pb-3' : 'px-3 pb-3'}>
        <Link
          href="/"
          title="开启新对话"
          className={
            collapsed
              ? 'flex h-11 w-11 items-center justify-center rounded-xl bg-[#4d6bfe] text-white shadow-sm shadow-blue-500/20 transition hover:bg-[#3f5bef]'
              : 'flex h-11 items-center justify-center gap-2 rounded-xl bg-[#4d6bfe] px-4 text-sm font-medium text-white shadow-sm shadow-blue-500/20 transition hover:bg-[#3f5bef]'
          }
        >
          <MessageSquarePlus className="h-4 w-4" />
          {!collapsed && '开启新对话'}
        </Link>
      </div>

      {collapsed ? (
        <div className="mx-auto mb-2 h-px w-8 bg-slate-200" />
      ) : (
        <div className="flex items-center justify-between px-4 pb-2 pt-2">
          <div className="text-xs font-medium text-slate-500">历史记录</div>
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-400">{chats.length}条</span>
        </div>
      )}

      <div className={collapsed ? 'min-h-0 flex-1 overflow-y-auto px-2 pb-4' : 'min-h-0 flex-1 overflow-y-auto px-2 pb-4'}>
        {chats.length === 0 ? (
          collapsed ? (
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 text-slate-400" title="暂无历史会话">
              <MessageSquare className="h-4 w-4" />
            </div>
          ) : (
            <div className="mx-2 rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-center text-sm text-slate-500">暂无历史会话</div>
          )
        ) : (
          <div className={collapsed ? 'flex flex-col items-center gap-1' : 'space-y-1'}>
            {chats.map(chat => {
              const active = chat.id === activeChatId;
              return collapsed ? (
                <Link
                  key={chat.id}
                  href={`/chat/${chat.id}`}
                  title={chat.title}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                    active ? 'bg-white text-[#4d6bfe] shadow-sm' : 'text-slate-400 hover:bg-white/70 hover:text-[#4d6bfe]'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  key={chat.id}
                  href={`/chat/${chat.id}`}
                  className={`group block rounded-xl px-3 py-2.5 transition ${
                    active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-white/70 hover:text-slate-950'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-[#eff3ff] text-[#4d6bfe]' : 'bg-white/70 text-slate-400 group-hover:text-[#4d6bfe]'}`}>
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{chat.title}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Clock3 className="h-3 w-3" />
                        {dateFormatter.format(new Date(chat.updatedAt))}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
