import { Link } from 'react-router-dom';
import { Folder, ArrowUp, Clock } from 'lucide-react';
import { fileIcon, formatBytes } from '../../lib/fileUtils';

interface CommitMeta {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface TreeEntry {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  size: number | null;
  lastCommit: CommitMeta | null;
}

interface Props {
  username: string;
  repoName: string;
  branch: string;
  subPath: string;
  entries: TreeEntry[];
  dirLastCommit: CommitMeta | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  const months= Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (years  > 0) return `${years}y ago`;
  if (months > 0) return `${months}mo ago`;
  if (days   > 0) return `${days}d ago`;
  if (hours  > 0) return `${hours}h ago`;
  if (mins   > 0) return `${mins}m ago`;
  return 'just now';
}

export default function FileTree({ username, repoName, branch, subPath, entries, dirLastCommit }: Props) {
  const parts   = subPath ? subPath.split('/') : [];
  const repoBase = `/${username}/${repoName}`;

  // Parent directory path
  const parentPath = parts.slice(0, -1).join('/');
  const hasParent  = parts.length > 0;

  return (
    <div>
      {/* Breadcrumb */}
      {parts.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-2.5 text-sm border-b border-gray-800 overflow-x-auto">
          <Link to={`${repoBase}/tree/${branch}`} className="text-accent-start hover:underline font-medium shrink-0">
            {repoName}
          </Link>
          {parts.map((part, i) => {
            const partPath = parts.slice(0, i + 1).join('/');
            const isLast   = i === parts.length - 1;
            return (
              <span key={partPath} className="flex items-center gap-1.5 shrink-0">
                <span className="text-gray-700">/</span>
                {isLast ? (
                  <span className="text-white font-medium">{part}</span>
                ) : (
                  <Link to={`${repoBase}/tree/${branch}/${partPath}`} className="text-accent-start hover:underline">
                    {part}
                  </Link>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Last commit banner */}
      {dirLastCommit && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 text-xs text-gray-500 bg-white/[0.01]">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <Link
            to={`${repoBase}/commit/${dirLastCommit.sha}`}
            className="text-gray-300 hover:text-accent-start transition-colors truncate"
          >
            {dirLastCommit.message}
          </Link>
          <span className="shrink-0 ml-auto">{timeAgo(dirLastCommit.date)}</span>
        </div>
      )}

      {/* Entries */}
      <div className="divide-y divide-gray-800/50">
        {/* Parent directory link */}
        {hasParent && (
          <Link
            to={parentPath
              ? `${repoBase}/tree/${branch}/${parentPath}`
              : `${repoBase}/tree/${branch}`
            }
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors group"
          >
            <ArrowUp className="w-4 h-4 text-gray-600 shrink-0" />
            <span className="text-gray-400 text-sm group-hover:text-white transition-colors">..</span>
          </Link>
        )}

        {entries.map(entry => {
          const isDir  = entry.type === 'tree';
          const href   = isDir
            ? `${repoBase}/tree/${branch}/${entry.path}`
            : `${repoBase}/blob/${branch}/${entry.path}`;
          const icon   = fileIcon(entry.name, isDir);

          return (
            <div
              key={entry.path}
              className="flex items-center gap-0 hover:bg-white/[0.02] transition-colors"
            >
              {/* Name + icon */}
              <div className="flex items-center gap-2.5 px-4 py-2 w-[40%] min-w-0">
                {isDir
                  ? <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                  : <span className="w-4 text-center text-xs shrink-0 text-gray-500">{icon}</span>
                }
                <Link
                  to={href}
                  className={`text-sm truncate transition-colors ${
                    isDir ? 'text-blue-400 hover:text-blue-300' : 'text-gray-200 hover:text-accent-start'
                  }`}
                >
                  {entry.name}
                </Link>
              </div>

              {/* Last commit message */}
              <div className="flex-1 min-w-0 px-4 py-2 hidden sm:block">
                {entry.lastCommit ? (
                  <Link
                    to={`${repoBase}/commit/${entry.lastCommit.sha}`}
                    className="text-gray-600 hover:text-gray-400 text-xs truncate block transition-colors"
                  >
                    {entry.lastCommit.message}
                  </Link>
                ) : (
                  <span className="text-gray-800 text-xs">—</span>
                )}
              </div>

              {/* Size (files only) */}
              <div className="w-20 px-4 py-2 text-right hidden md:block">
                {entry.size != null && (
                  <span className="text-gray-700 text-xs">{formatBytes(entry.size)}</span>
                )}
              </div>

              {/* Time ago */}
              <div className="w-24 px-4 py-2 text-right hidden lg:block">
                {entry.lastCommit && (
                  <span className="text-gray-600 text-xs">{timeAgo(entry.lastCommit.date)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
