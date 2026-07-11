import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
}

export default function ProfileReadme({ content }: Props) {
  if (!content) return null;

  return (
    <div className="bg-navy-800 border border-gray-800 rounded-xl p-6">
      <div className="prose prose-invert prose-sm max-w-none
        prose-headings:text-white prose-headings:font-semibold
        prose-p:text-gray-300 prose-p:leading-relaxed
        prose-a:text-accent-start prose-a:no-underline hover:prose-a:underline
        prose-code:bg-gray-900 prose-code:text-purple-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
        prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800
        prose-blockquote:border-l-accent-start prose-blockquote:text-gray-400
        prose-strong:text-white
        prose-li:text-gray-300
        prose-hr:border-gray-800
        prose-table:text-gray-300
        prose-th:text-gray-200 prose-th:border-gray-700
        prose-td:border-gray-800"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
