import { useEffect, useRef, useState } from 'react';
import hljs from 'highlight.js';
import { Copy, Check } from 'lucide-react';
import { getLanguage } from '../../lib/fileUtils';

// Import a dark theme that works without CSS bundling
const THEME_STYLE = `
.hljs { background: transparent; color: #abb2bf; }
.hljs-comment, .hljs-quote { color: #5c6370; font-style: italic; }
.hljs-doctag, .hljs-keyword, .hljs-formula { color: #c678dd; }
.hljs-section, .hljs-name, .hljs-selector-tag, .hljs-deletion, .hljs-subst { color: #e06c75; }
.hljs-literal { color: #56b6c2; }
.hljs-string, .hljs-regexp, .hljs-addition, .hljs-attribute, .hljs-meta .hljs-string { color: #98c379; }
.hljs-attr, .hljs-variable, .hljs-template-variable, .hljs-type, .hljs-selector-class,
.hljs-selector-attr, .hljs-selector-pseudo, .hljs-number { color: #d19a66; }
.hljs-symbol, .hljs-bullet, .hljs-link, .hljs-meta, .hljs-selector-id, .hljs-title { color: #61aeee; }
.hljs-built_in, .hljs-title.class_, .hljs-class .hljs-title { color: #e6c07b; }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: bold; }
.hljs-link { text-decoration: underline; }
`;

interface Props {
  content: string;
  filename: string;
  startLine?: number;
  highlightLines?: number[];
}

export default function CodeViewer({ content, filename, startLine = 1, highlightLines = [] }: Props) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const lang = getLanguage(filename);

  let highlighted = content;
  try {
    if (lang !== 'plaintext') {
      highlighted = hljs.highlight(content, { language: lang, ignoreIllegals: true }).value;
    } else {
      highlighted = hljs.highlightAuto(content).value;
    }
  } catch {
    // fall back to plain text
  }

  const lines = highlighted.split('\n');
  const rawLines = content.split('\n');

  useEffect(() => {
    // Inject hljs theme styles once
    if (!document.getElementById('hljs-theme')) {
      const style = document.createElement('style');
      style.id = 'hljs-theme';
      style.textContent = THEME_STYLE;
      document.head.appendChild(style);
    }
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const highlightSet = new Set(highlightLines);

  return (
    <div className="relative group">
      {/* Copy button */}
      <button
        onClick={copy}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 bg-navy-900/80 border border-gray-700 rounded-md text-gray-400 hover:text-white text-xs opacity-0 group-hover:opacity-100 transition-all"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono border-collapse" ref={preRef as unknown as React.RefObject<HTMLTableElement>}>
          <tbody>
            {lines.map((line, i) => {
              const lineNo = startLine + i;
              const isHighlighted = highlightSet.has(lineNo);
              return (
                <tr
                  key={i}
                  id={`L${lineNo}`}
                  className={`${isHighlighted ? 'bg-yellow-500/10' : 'hover:bg-white/[0.03]'} transition-colors`}
                >
                  {/* Line number */}
                  <td className="select-none w-12 min-w-[3rem] px-3 py-0 text-right text-gray-600 border-r border-gray-800 align-top leading-6">
                    <a href={`#L${lineNo}`} className="hover:text-gray-400 transition-colors">
                      {lineNo}
                    </a>
                  </td>
                  {/* Code */}
                  <td className="px-4 py-0 leading-6 whitespace-pre text-gray-300 align-top">
                    {/* We use dangerouslySetInnerHTML only for syntax-highlighted output from hljs */}
                    <span dangerouslySetInnerHTML={{ __html: line || ' ' }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Line count footer */}
      <div className="px-4 py-1.5 border-t border-gray-800 text-gray-700 text-xs flex items-center justify-between">
        <span>{rawLines.length} lines</span>
        <span className="font-mono">{lang}</span>
      </div>
    </div>
  );
}
