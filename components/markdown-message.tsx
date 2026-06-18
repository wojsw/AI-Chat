import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="prose max-w-none text-slate-700 prose-headings:text-slate-900 prose-p:my-2 prose-p:leading-7 prose-a:text-blue-600 prose-strong:text-slate-900 prose-code:text-blue-700 prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:p-4 prose-li:my-0.5 prose-ul:my-2 prose-ol:my-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
