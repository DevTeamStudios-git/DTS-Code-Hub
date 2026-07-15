import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Eye, AlignLeft, Download, History, GitCommitVertical, Pencil } from 'lucide-react';
import FileRenderer, { type FileData } from '../../components/repo/FileRenderer';
import CodeViewer from '../../components/repo/CodeViewer';
import BranchSelector from '../../components/repo/BranchSelector';
import { api } from '../../lib/api';
import { formatBytes } from '../../lib/fileUtils';
import { useAuth } from '../../contexts/AuthContext';

interface BlameEntry {
  sha: string;
  author: string;
  date: string;
  line: number;
  content: string;
}

export default function FileBlobPage() {
  const { profile } = useAuth();
  const {
    username, repo: repoName, branch = 'main', '*': filePath = '',
  } = useParams<{ username: string; repo: string; branch: string; '*': string }>();

  const [file,  setFile]  = useState<FileData | null>(null);
  const [blame, setBlame] = useState<BlameEntry[]>([]);
  const [mode,  setMode]  = useState<'file' | 'blame'>('file');
  const [loading, setLoading] = useState(true);
  const [blameLoading, setBlameLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL as string ?? 'http://localhost:3001';
  const rawUrl   = `${API_BASE}/api/repos/${username}/${repoName}/raw/${branch}/${filePath}`;

  useEffect(() => {
    if (!username || !repoName || !filePath) return;
    setLoading(true);
    setFile(null);
    setBlame([]);
    setMode('file');
    api.get<FileData>(`/api/repos/${username}/${repoName}/blob/${branch}/${filePath}`)
      .then(setFile)
      .catch(() => setFile(null))
      .finally(() => setLoading(false));
  }, [username, repoName, branch, filePath]);

  const loadBlame = async () => {
    if (blame.length > 0) { setMode('blame'); return; }
    setBlameLoading(true);
    try {
      const { blame: data } = await api.get<{ blame: BlameEntry[] }>(
        `/api/repos/${username}/${repoName}/blame/${branch}/${filePath}`
      );
      setBlame(data);
      setMode('blame');
    } finally {
      setBlameLoading(false);
    }
  };

  const fileName  = filePath.split('/').pop() ?? filePath;
  const parentDir = filePath.includes('/')
    ? filePath.split('/').slice(0, -1).join('/')
    : '';

  // Breadcrumb parts
  const pathParts = filePath.split('/');

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-start border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!file) {
    return (
      <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">File not found</p>
        <Link to={`/${username}/${repoName}`} className="text-accent-start hover:underline text-sm">
          Back to repository
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm mb-4 overflow-x-auto">
          <Link
            to={`/${username}/${repoName}/tree/${branch}`}
            className="flex items-center gap-1 text-gray-500 hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            {repoName}
          </Link>
          {pathParts.map((part, i) => {
            const partPath = pathParts.slice(0, i + 1).join('/');
            const isLast   = i === pathParts.length - 1;
            return (
              <span key={partPath} className="flex items-center gap-1.5 shrink-0">
                <span className="text-gray-700">/</span>
                {isLast ? (
                  <span className="text-white font-medium">{part}</span>
                ) : (
                  <Link
                    to={`/${username}/${repoName}/tree/${branch}/${partPath}`}
                    className="text-accent-start hover:underline"
                  >
                    {part}
                  </Link>
                )}
              </span>
            );
          })}
        </div>

        {/* File card */}
        <div className="bg-navy-800 border border-gray-800 rounded-xl overflow-hidden">

          {/* File header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 flex-wrap gap-y-2">
            {/* Branch selector */}
            <BranchSelector
              username={username!}
              repoName={repoName!}
              currentBranch={branch}
              navigateTo={(b) => `/${username}/${repoName}/blob/${b}/${filePath}`}
            />

            <span className="text-gray-700 text-sm hidden sm:block">/</span>
            <span className="text-white text-sm font-medium">{fileName}</span>

            {/* Meta */}
            <div className="ml-auto flex items-center gap-3 text-xs text-gray-600">
              {file.lines != null && <span>{file.lines} lines</span>}
              <span>{formatBytes(file.size)}</span>
              {file.sha && (
                <Link
                  to={`/${username}/${repoName}/commit/${file.sha}`}
                  className="font-mono hover:text-gray-400 transition-colors"
                >
                  {file.sha.slice(0, 7)}
                </Link>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Edit button — owner only, text files only */}
              {profile?.username === username && (file.type === 'text' || file.type === 'markdown') && (
                <Link
                  to={`/${username}/${repoName}/edit/${branch}/${filePath}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-gray-500 hover:text-white hover:bg-accent-start/10 transition-colors"
                  title="Edit this file"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Link>
              )}
              <button
                onClick={() => setMode('file')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
                  mode === 'file' ? 'bg-accent-start/10 text-accent-start' : 'text-gray-500 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
              {file.type === 'text' && (
                <button
                  onClick={loadBlame}
                  disabled={blameLoading}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors disabled:opacity-50 ${
                    mode === 'blame' ? 'bg-accent-start/10 text-accent-start' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  <GitCommitVertical className="w-3.5 h-3.5" />
                  {blameLoading ? 'Loading…' : 'Blame'}
                </button>
              )}
              <Link
                to={`/${username}/${repoName}/commits/${branch}?path=${filePath}`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-gray-500 hover:text-white transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                History
              </Link>
              <a
                href={rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-gray-500 hover:text-white transition-colors"
              >
                <AlignLeft className="w-3.5 h-3.5" />
                Raw
              </a>
              <a
                href={rawUrl}
                download={fileName}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-gray-500 hover:text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Content */}
          {mode === 'file' && <FileRenderer file={file} rawUrl={rawUrl} />}

          {mode === 'blame' && blame.length > 0 && (
            <BlameView blame={blame} filename={fileName} username={username!} repoName={repoName!} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Inline blame view ─────────────────────────────────────────────────────

function BlameView({ blame, filename, username, repoName }: {
  blame: BlameEntry[];
  filename: string;
  username: string;
  repoName: string;
}) {
  // Group consecutive lines with the same SHA
  const groups: { sha: string; author: string; date: string; lines: BlameEntry[] }[] = [];
  let currentSha = '';
  for (const entry of blame) {
    if (entry.sha !== currentSha) {
      groups.push({ sha: entry.sha, author: entry.author, date: entry.date, lines: [entry] });
      currentSha = entry.sha;
    } else {
      groups[groups.length - 1].lines.push(entry);
    }
  }

  const content = blame.map(l => l.content).join('\n');

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <tbody>
          {blame.map((line, i) => {
            const isFirst = i === 0 || blame[i - 1].sha !== line.sha;
            return (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                {/* Blame annotation */}
                <td className={`w-40 min-w-[160px] px-3 py-0.5 align-top border-r border-gray-800 leading-6 ${
                  isFirst ? 'border-t border-t-gray-800/50' : ''
                }`}>
                  {isFirst && (
                    <div className="text-[10px] leading-4">
                      <Link
                        to={`/${username}/${repoName}/commit/${line.sha}`}
                        className="text-accent-start hover:underline font-mono"
                      >
                        {line.sha.slice(0, 7)}
                      </Link>
                      <div className="text-gray-600 truncate max-w-[130px]">{line.author}</div>
                    </div>
                  )}
                </td>
                {/* Line number */}
                <td className="w-10 px-2 py-0.5 text-right text-gray-700 border-r border-gray-800 select-none leading-6">
                  {line.line}
                </td>
                {/* Code */}
                <td className="px-4 py-0 leading-6 whitespace-pre text-gray-300">
                  {line.content || ' '}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
