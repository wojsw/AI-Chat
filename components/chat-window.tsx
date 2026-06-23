'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { Bot, Clock3, Loader2, Menu, Paperclip, RefreshCw, Send, Sparkles, Square, User, Wrench } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatSummary, StoredChat } from '@/lib/types';
import { getMessageText } from '@/lib/message-utils';
import { MarkdownMessage } from './markdown-message';
import { Sidebar } from './sidebar';

export function ChatWindow({ chat, chats, sidebarCollapsed = false }: { chat: StoredChat; chats: ChatSummary[]; sidebarCollapsed?: boolean }) {
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, stop, regenerate, error } = useChat({
    id: chat.id,
    messages: chat.messages,
    experimental_throttle: 50,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest({ id, messages, trigger, messageId }) {
        if (trigger === 'submit-message') {
          return {
            body: {
              trigger,
              id,
              message: messages[messages.length - 1],
            },
          };
        }

        if (trigger === 'regenerate-message') {
          return {
            body: {
              trigger,
              id,
              messageId,
            },
          };
        }

        throw new Error(`Unsupported trigger: ${trigger}`);
      },
    }),
  });

  const isBusy = status === 'submitted' || status === 'streaming';
  const canRegenerate = (status === 'ready' || status === 'error') && messages.some(message => message.role === 'assistant');
  const lastUpdated = useMemo(() => new Date(chat.updatedAt).toLocaleString('zh-CN'), [chat.updatedAt]);
  const statusLabel = status === 'streaming' ? '正在生成' : status === 'submitted' ? '正在思考' : status === 'error' ? '响应异常' : '随时可问';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, status]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim() || isBusy) return;
    sendMessage({ text: input.trim() });
    setInput('');
  }

  return (
    <section className={`relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f8f8f7] transition-[width] duration-300 ease-in-out md:flex-none ${sidebarCollapsed ? 'md:w-[calc(100%_-_76px)]' : 'md:w-[calc(100%_-_300px)]'}`}>
      {sidebarOpen && (
        <div className="absolute inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="关闭侧边栏"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm"
          />
          <div className="relative h-full w-[300px] max-w-[86vw] shadow-2xl shadow-slate-950/20">
            <Sidebar chats={chats} activeChatId={chat.id} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <header className="relative z-10 flex h-16 shrink-0 items-center border-b border-[#ececea] bg-[#f8f8f7]/95 px-4 md:px-6">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="打开侧边栏"
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-[#4d6bfe] md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#4d6bfe] shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                <Sparkles className="h-3 w-3" />
                AI Assistant
              </div>
              <h2 className="truncate text-base font-semibold tracking-tight text-slate-950 md:text-lg">{chat.title}</h2>
            </div>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="rounded-xl bg-white px-4 py-2 text-right shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Clock3 className="h-3.5 w-3.5 text-[#4d6bfe]" />
                最近更新
              </div>
              <p className="mt-0.5 text-xs text-slate-700">{lastUpdated}</p>
            </div>
            <div className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status === 'error' ? 'bg-rose-50 text-rose-600' : isBusy ? 'bg-[#eff3ff] text-[#4d6bfe]' : 'bg-emerald-50 text-emerald-600'}`}>
              {statusLabel}
            </div>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-7 pb-6">
            {messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {status === 'submitted' && (
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-[#4d6bfe]" />
                </span>
                正在整理上下文…
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="relative z-10 bg-[#f8f8f7] px-4 pb-5 pt-3 md:px-6">
        <div className="mx-auto max-w-3xl">
          {error && (
            <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              生成失败，请稍后重试或检查接口配置。
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ToolButton icon={Wrench} active />
              <ToolButton icon={Paperclip} />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => regenerate()}
                disabled={!canRegenerate || isBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:text-[#4d6bfe] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <RefreshCw className="h-4 w-4" />
                重新生成
              </button>
              {isBusy && (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
                >
                  <Square className="h-4 w-4" />
                  停止
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[1.5rem] border border-[#e6e6e3] bg-white p-2 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                placeholder="输入问题，Shift + Enter 换行…"
                className="max-h-36 min-h-12 flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isBusy}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#4d6bfe] text-white shadow-sm shadow-blue-500/20 transition hover:bg-[#3f5bef] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {isBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
          </form>
          <p className="mt-3 text-center text-xs text-slate-400">AI 可能会出错，请结合上下文核对重要信息。</p>
        </div>
      </footer>
    </section>
  );
}

function ToolButton({ icon: Icon, active = false }: { icon: typeof Wrench; active?: boolean }) {
  return (
    <button
      type="button"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition ${
        active ? 'bg-[#eff3ff] text-[#4d6bfe] hover:bg-[#e5ebff]' : 'bg-white text-slate-400 hover:text-slate-700'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
      <div className="mb-6 rounded-[2rem] bg-white p-5 text-[#4d6bfe] shadow-[0_18px_50px_rgba(77,107,254,0.14)]">
        <Bot className="h-10 w-10" />
      </div>
      <h2 className="text-3xl font-semibold tracking-tight text-slate-950">开始一个新的 AI 对话</h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        支持流式输出、中断生成、重新生成、Markdown 渲染、代码高亮，并会将会话保存在本地文件中。
      </p>
      <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
        {['解释一段代码逻辑', '生成一个实现方案', '整理会议纪要'].map(item => (
          <div key={item} className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';
  const content = getMessageText(message);

  return (
    <article className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mt-7 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#4d6bfe] shadow-sm">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div className={`flex max-w-[82%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`mb-2 flex items-center gap-2 text-[11px] text-slate-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="font-semibold text-slate-600">{isUser ? 'You' : 'Assistant'}</span>
          <span>{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div
          className={`rounded-3xl px-4 py-3 text-sm leading-7 shadow-sm ${
            isUser ? 'bg-[#4d6bfe] text-white shadow-blue-500/15' : 'bg-white text-slate-700 shadow-slate-200/70'
          }`}
        >
          {content ? isUser ? <p className="whitespace-pre-wrap text-white">{content}</p> : <MarkdownMessage content={content} /> : <span className="text-slate-400">正在生成…</span>}
        </div>
      </div>
      {isUser && (
        <div className="mt-7 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#4d6bfe] text-white shadow-sm shadow-blue-500/20">
          <User className="h-4 w-4" />
        </div>
      )}
    </article>
  );
}
