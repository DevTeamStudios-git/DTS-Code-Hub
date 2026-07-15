import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X, AlertTriangle, Eye } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { getLanguage } from '../../lib/fileUtils';
import hljs from 'highlight.js';

const THEME_STYLE = `
.hljs { background: transparent; color: #abb2bf; }
.hljs-comment,.hljs-quote{color:#5c6370;font-style:italic}
.hljs-doctag,.hljs-keyword,.hljs-formula{color:#c678dd}
.hljs-section,.hljs-name,.hljs-selector-tag,.hljs-deletion,.hljs-subst{color:#e06c75}
.hljs-literal{color:#56b6c2}
.hljs-string,.hljs-regexp,.hljs-addition,.hljs-attribute{color:#98c379}
.hljs-attr,.hljs-variable,.hljs-template-variable,.hljs-type,.hljs-number{color:#d19a66}
.hljs-symbol,.hljs-bullet,.hljs-link,.hljs-meta,.hljs-title{color:#61aeee}
.hljs-built_in,.hljs-title.class_{color:#e6c07b}
.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:bold}
`;

interface FileData { content?: string; type: string; sha: string }
interface EditResponse { commitSha: string }

export default function FileEditPage() {
  const {
    username, repo: repoName, branch = 'main', '*': filePath = '',
  } = useParams<{ username: string; repo: string; branch: string; '*': string }>();

  const { profile } = useAuth();
  const navigate     = useNavigate();

  const [content,    setContent]    = useState('');
  const [original,   setOriginal]   = useState('');
  const [message,    setMessage]    = useState('');
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [preview,    setPreview]    = useState(false);
  const [lineCount,  setLineCount]  = useState(1);

  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const lineNumRef   = useRef<HTMLDivElement>(null);
  const fileName     = filePath.split('/').pop() ?? filePath;
  const lang         = getLanguage(fileName);
  const isDirty      = content !== original;

  // Inject hljs theme once
  useEffect(() => {
    if (!document.getElementById('hljs-theme')) {
      const s = document.createElement('style');
      s.id = 'hljs-theme';
      s.textContent = THEME_STYLE;
      document.head.appendChild(s);
    }
  }, []);

  // Load file (or start empty for new files)
  useEffect(() => {
    if (!username || !repoName) return;

    // Guard: only owner can edit
    if (profile && profile.username !== username) {
      navigate(`/${username}/${repoName}`, { replace: true });
      return;
    }

    if (!filePath) {
      setLoading(false);
      return;
    }

    setLoading(true);
    api.get<FileData>(`/api/repos/${username}/${repoName}/blob/${branch}/${filePath}`)
      .then(f => {
        if (f.type === 'binary' || f.type === 'image') {
          navigate(`/${username}/${repoName}/blob/${branch}/${filePath}`, { replace: true });
          return;
        }
        const c = f.content ?? '';
        setContent(c);
        setOriginal(c);
        setLineCount(c.split('\n').length);
        setMessage(`Update ${fileName}`);
      })
      .catch(() => {
        // New file — start empty
        setContent('');
        setOriginal('');
        setLineCount(1);
        setMessage(`Create ${fileName}`);
      })
      .finally(() => setLoading(false));
  }, [username, repoName, branch, filePath, profile, navigate, fileName]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setContent(v);
    setLineCount(v.split('\n').length);
    // Sync scroll with line numbers
    if (lineNumRef.current && textareaRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleScroll = () => {
    if (lineNumRef.current && textareaRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleSave = async () => {
    if (!message.trim()) { setError('Commit message is required'); return; }
    if (!isDirty)         { setError('No changes to commit'); return; }
    setSaving(true);
    setError('');
    try {
      await api.put<EditResponse>(
        `/api/repos/${username}/${repoName}/edit/${branch}/${filePath}`,
        { content, message: message.trim() },
      );
      navigate(`/${username}/${repoName}/blob/${branch}/${filePath}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Tab key inserts spaces instead of focusing next element
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el  = e.currentTarget;
      const start = el.selectionStart;
      const end   = el.selectionEnd;
      const next  = content.slice(0, start) + '  ' + content.slice(end);
      setContent(next);
      // Restore cursor after React re-render
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
    // Ctrl/Cmd + S → save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  // Syntax-highlighted preview
  let highlighted = content;
  try {
    highlighted = lang !== 'plaintext'
      ? hljs.highlight(content, { language: lang, ignoreIllegals: true }).value
      : hljs.highlightAuto(content).value;
  } catch { /* plain text fallback */ }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-start border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">

      {/* Top bar */}
      <div className="border-b border-gray-800 bg-navy-800 px-4 sm:px-6 py-3 flex items-center gap-4 flex-wrap">
        <Link
          to={`/${username}/${repoName}/blob/${branch}/${filePath}`}
          className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </Link>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm overflow-x-auto flex-1 min-w-0">
          <Link to={`/${username}/${repoName}/tree/${branch}`} className="text-accent-start hover:underline shrink-0">
            {repoName}
          </Link>
          {filePath.split('/').map((part, i, arr) => {
            const partPath = arr.slice(0, i + 1).join('/');
            const isLast   = i === arr.length - 1;
            return (
              <span key={partPath} className="flex items-center gap-1.5 shrink-0">
                <span className="text-gray-700">/</span>
                {isLast
                  ? <span className="text-white font-medium">{part}</span>
                  : <Link to={`/${username}/${repoName}/tree/${branch}/${partPath}`} className="text-accent-start hover:underline">{part}</Link>
                }
              </span>
            );
          })}
        </div>

        {/* Preview toggle */}
        <button
          onClick={() => setPreview(p => !p)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            preview ? 'bg-accent-start/10 text-accent-start border border-accent-start/30' : 'text-gray-400 hover:text-white border border-gray-700'
          }`}
        >
          <Eye className="w-4 h-4" />
          {preview ? 'Edit' : 'Preview'}
        </button>

        <div className="text-gray-600 text-xs shrink-0">
          {lineCount} lines · <span className="font-mono">{lang}</span>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-hidden">
        {preview ? (
          /* Syntax-highlighted read preview */
          <div className="h-full overflow-auto">
            <table className="w-full text-xs font-mono border-collapse">
              <tbody>
                {highlighted.split('\n').map((line, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="select-none w-12 px-3 py-0 text-right text-gray-700 border-r border-gray-800 leading-6">{i + 1}</td>
                    <td className="px-4 py-0 leading-6 whitespace-pre text-gray-300">
                      <span dangerouslySetInnerHTML={{ __html: line || ' ' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Editable textarea with line numbers */
          <div className="flex h-full overflow-hidden text-xs font-mono">
            {/* Line numbers */}
            <div
              ref={lineNumRef}
              className="select-none overflow-hidden bg-navy-900/50 border-r border-gray-800 text-gray-700 text-right leading-6 py-2"
              style={{ minWidth: '3rem', paddingRight: '0.75rem', paddingLeft: '0.5rem' }}
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} className="leading-6">{i + 1}</div>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoComplete="off"
              className="flex-1 bg-transparent text-gray-200 resize-none focus:outline-none p-2 leading-6 overflow-auto"
              style={{ tabSize: 2 }}
            />
          </div>
        )}
      </div>

      {/* Commit footer */}
      <div className="border-t border-gray-800 bg-navy-800 px-4 sm:px-6 py-4">
        <div className="max-w-2xl">
          <h3 className="text-white text-sm font-medium mb-3">Commit changes</h3>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {!isDirty && !saving && (
            <div className="text-gray-600 text-xs mb-3">No changes yet — edit the file above to commit.</div>
          )}

          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Commit message"
            className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start mb-2"
          />

          <textarea
            placeholder="Extended description (optional)"
            rows={2}
            className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start mb-3 resize-none"
          />

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !isDirty || !message.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Committing…' : 'Commit changes'}
            </button>
            <Link
              to={`/${username}/${repoName}/blob/${branch}/${filePath}`}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 text-sm transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </Link>
            <span className="text-gray-600 text-xs ml-auto hidden sm:block">
              Ctrl+S to save
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
