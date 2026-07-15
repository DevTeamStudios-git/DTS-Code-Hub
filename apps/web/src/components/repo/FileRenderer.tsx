import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import CodeViewer from './CodeViewer';
import { Download, FileWarning } from 'lucide-react';
import { formatBytes } from '../../lib/fileUtils';

export interface FileData {
  path: string;
  branch: string;
  type: 'markdown' | 'text' | 'image' | 'binary';
  content?: string;
  base64?: string;
  mimeType?: string;
  size: number;
  sha: string;
  ext?: string;
  lines?: number;
}

interface Props {
  file: FileData;
  rawUrl: string;
}

export default function FileRenderer({ file, rawUrl }: Props) {
  if (file.type === 'image' && file.base64 && file.mimeType) {
    return (
      <div className="p-6 flex flex-col items-center gap-4">
        <img
          src={`data:${file.mimeType};base64,${file.base64}`}
          alt={file.path.split('/').pop()}
          className="max-w-full max-h-[600px] object-contain rounded-lg border border-gray-800"
        />
        <div className="flex items-center gap-3">
          <span className="text-gray-600 text-xs">{formatBytes(file.size)}</span>
          <a
            href={rawUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-accent-start hover:underline text-xs"
          >
            <Download className="w-3 h-3" />
            Download original
          </a>
        </div>
      </div>
    );
  }

  if (file.type === 'binary') {
    return (
      <div className="p-10 flex flex-col items-center gap-4 text-center">
        <FileWarning className="w-10 h-10 text-gray-600" />
        <p className="text-gray-400 text-sm">This file is binary and cannot be displayed.</p>
        <p className="text-gray-600 text-xs">{formatBytes(file.size)}</p>
        <a
          href={rawUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-500 text-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          Download file
        </a>
      </div>
    );
  }

  if (file.type === 'markdown' && file.content) {
    return (
      <div className="p-6 prose prose-invert prose-sm max-w-none
        prose-headings:text-white prose-headings:font-semibold prose-headings:border-b prose-headings:border-gray-800 prose-headings:pb-2
        prose-p:text-gray-300 prose-p:leading-relaxed
        prose-a:text-accent-start prose-a:no-underline hover:prose-a:underline
        prose-code:bg-gray-900 prose-code:text-purple-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800 prose-pre:p-0 prose-pre:overflow-hidden
        prose-blockquote:border-l-accent-start prose-blockquote:text-gray-400 prose-blockquote:not-italic
        prose-strong:text-white prose-li:text-gray-300
        prose-hr:border-gray-800
        prose-table:text-gray-300 prose-th:text-gray-200 prose-th:border-gray-700 prose-td:border-gray-800
        prose-img:rounded-lg prose-img:border prose-img:border-gray-800"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {file.content}
        </ReactMarkdown>
      </div>
    );
  }

  if (file.content !== undefined) {
    const filename = file.path.split('/').pop() ?? file.path;
    return <CodeViewer content={file.content} filename={filename} />;
  }

  return null;
}
