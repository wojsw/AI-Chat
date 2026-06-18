'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { Bot, Clock3, Loader2, Menu, Paperclip, RefreshCw, Send, Square, User, Wrench } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatSummary, StoredChat } from '@/lib/types';
import { getMessageText } from '@/lib/message-utils';
import { MarkdownMessage } from './markdown-message';
import { Sidebar } from './sidebar';

export function ChatWindow({ chat, chats }: { chat: StoredChat; chats: ChatSummary[] }) {
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
    <section className="relative flex min-w-0 flex-1 flex-col bg-white/35">
      {sidebarOpen && (
        <div className="absolute inset-0 z-30 flex bg-slate-900/20 backdrop-blur-sm md:hidden">
          <div className="w-80 max-w-[86vw]">
            <Sidebar chats={chats} activeChatId={chat.id} />
          </div>
          <button className="flex-1" aria-label="关闭会话列表" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      <header className="flex h-16 items-center justify-between gap-3 border-b border-white/70 bg-white/75 px-4 backdrop-blur-xl md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/80 bg-white/75 text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 md:hidden"
            onClick={() => setSidebarOpen(true)}
            type="button"
            aria-label="打开会话列表"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
            <span>AI Flow</span>
            <span className="text-slate-300">›</span>
            <span className="font-semibold text-slate-900">Chat</span>
          </div>
          <div className="min-w-0 sm:hidden">
            <h2 className="truncate text-sm font-semibold text-slate-950">{chat.title}</h2>
            <p className="text-[11px] text-slate-400">最近更新：{lastUpdated}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isBusy ? (
            <button
              type="button"
              onClick={stop}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-md"
            >
              <Square className="h-4 w-4" />
              中断
            </button>
          ) : (
            <button
              type="button"
              onClick={() => regenerate()}
              disabled={!canRegenerate}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/80 bg-white/75 px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              <RefreshCw className="h-4 w-4" />
              重新生成
            </button>
          )}
        </div>
      </header>

      <div className="border-b border-white/60 bg-white/45 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-9 min-w-36 rounded-xl border border-white/80 bg-white/75 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
            main
          </div>
          <div className="h-9 min-w-48 rounded-xl border border-white/80 bg-white/75 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
            qwen3.6-plus（高性价比）
          </div>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <ToolButton icon={Wrench} active />
            <ToolButton icon={Clock3} active />
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-8 md:px-10">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            {messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {status === 'submitted' && (
              <div className="flex items-center gap-2 pl-11 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> 正在请求模型…
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow-sm">
                生成失败：{error.message || '请稍后重试。'}
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-gradient-to-t from-white/75 to-white/10 px-4 pb-5 pt-2 backdrop-blur md:px-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/80 bg-white/85 shadow-[0_18px_50px_rgba(15,23,42,0.12)] transition focus-within:border-blue-200 focus-within:shadow-[0_22px_60px_rgba(37,99,235,0.16)]">
          <textarea
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            disabled={isBusy}
            placeholder="Message Assistant (Enter to send)"
            rows={1}
            className="max-h-40 min-h-12 w-full resize-none rounded-t-3xl bg-transparent px-5 py-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:opacity-50"
          />
          <div className="flex items-center justify-between border-t border-slate-100/80 px-4 py-3">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="添加附件"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isBusy}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
              aria-label="发送消息"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function ToolButton({ icon: Icon, active = false }: { icon: typeof Wrench; active?: boolean }) {
  return (
    <button
      type="button"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition hover:-translate-y-0.5 ${
        active
          ? 'border-blue-200/80 bg-white/80 text-blue-600 shadow-blue-500/10 hover:bg-blue-50'
          : 'border-white/80 bg-white/70 text-slate-400 hover:text-slate-700'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
      <div className="mb-6 rounded-[2rem] border border-white/80 bg-white/80 p-5 text-blue-600 shadow-[0_18px_50px_rgba(37,99,235,0.16)]">
        <Bot className="h-10 w-10" />
      </div>
      <h2 className="bg-gradient-to-r from-slate-950 via-blue-900 to-indigo-700 bg-clip-text text-3xl font-bold tracking-tight text-transparent">开始一个新的 AI 对话</h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        支持流式输出、中断生成、重新生成、Markdown 渲染、代码高亮，并会将会话保存在本地文件中。
      </p>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';
  const content = getMessageText(message);

  return (
    <article className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mt-12 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/80 text-slate-500 shadow-sm">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div className={`flex max-w-[78%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`mb-2 flex items-center gap-2 text-[11px] text-slate-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="font-medium text-slate-600">{isUser ? 'You' : 'Assistant'}</span>
          <span>{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div
          className={`rounded-3xl border px-4 py-3 text-sm leading-7 shadow-sm ${
            isUser
              ? 'border-blue-200/70 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/20'
              : 'border-white/80 bg-white/85 text-slate-700 shadow-slate-200/70'
          }`}
        >
          {isUser ? <p className="whitespace-pre-wrap text-white">{content}</p> : <MarkdownMessage content={content} />}
        </div>
      </div>
      {isUser && (
        <div className="mt-12 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
          <User className="h-4 w-4" />
        </div>
      )}
    </article>
  );
}
