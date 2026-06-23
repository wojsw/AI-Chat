import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="markdown-message prose max-w-none text-slate-700 prose-headings:mb-3 prose-headings:mt-5 prose-headings:text-slate-950 prose-p:my-2 prose-p:leading-7 prose-a:font-semibold prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-950 prose-code:rounded prose-code:bg-blue-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-blue-700 prose-code:before:content-none prose-code:after:content-none prose-pre:my-3 prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:border prose-pre:border-slate-800 prose-pre:bg-slate-950 prose-pre:p-4 prose-pre:text-sm prose-pre:leading-6 prose-pre:text-slate-100 prose-li:my-0.5 prose-ul:my-2 prose-ol:my-2 prose-blockquote:my-3 prose-blockquote:rounded-r-xl prose-blockquote:border-blue-300 prose-blockquote:bg-blue-50/60 prose-blockquote:py-1 prose-blockquote:pr-3 prose-table:my-3 prose-table:text-sm prose-th:bg-slate-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
          table: ({ children, ...props }) => (
            <div className="my-3 overflow-x-auto rounded-2xl border border-slate-200">
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
