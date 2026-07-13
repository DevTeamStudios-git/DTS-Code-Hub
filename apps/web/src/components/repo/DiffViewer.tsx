import { useState } from 'react';
import { ChevronDown, ChevronRight, FilePlus, FileMinus, FileEdit, FileSymlink } from 'lucide-react';

interface DiffLine {
  type: 'context' | 'add' | 'del';
  content: string;
  oldLineNo: number | null;
  newLineNo: number | null;
}

interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  oldPath: string;
  newPath: string;
  status: 'added' | 'deleted' | 'modified' | 'renamed' | 'unknown';
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

interface Props {
  files: DiffFile[];
}

function FileStatusIcon({ status }: { status: DiffFile['status'] }) {
  switch (status) {
    case 'added':    return <FilePlus    className="w-4 h-4 text-green-400" />;
    case 'deleted':  return <FileMinus   className="w-4 h-4 text-red-400" />;
    case 'renamed':  return <FileSymlink className="w-4 h-4 text-blue-400" />;
    default:         return <FileEdit    className="w-4 h-4 text-yellow-400" />;
  }
}

function FileDiff({ file }: { file: DiffFile }) {
  const [collapsed, setCollapsed] = useState(false);

  const displayPath = file.status === 'renamed'
    ? `${file.oldPath} → ${file.newPath}`
    : file.newPath;

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden mb-3">
      {/* File header */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 bg-navy-800 cursor-pointer hover:bg-white/[0.02] select-none"
        onClick={() => setCollapsed(c => !c)}
      >
        {collapsed
          ? <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
          : <ChevronDown  className="w-4 h-4 text-gray-600 shrink-0" />
        }
        <FileStatusIcon status={file.status} />
        <span className="text-gray-300 text-sm font-mono flex-1 truncate">{displayPath}</span>
        <div className="flex items-center gap-2 text-xs font-medium shrink-0">
          {file.additions > 0 && <span className="text-green-400">+{file.additions}</span>}
          {file.deletions > 0 && <span className="text-red-400">-{file.deletions}</span>}
        </div>
      </div>

      {/* Hunks */}
      {!collapsed && (
        <div className="overflow-x-auto">
          {file.hunks.length === 0 ? (
            <div className="px-4 py-3 text-gray-600 text-sm">Binary file or no textual diff available</div>
          ) : (
            <table className="w-full text-xs font-mono border-collapse">
              <tbody>
                {file.hunks.map((hunk, hi) => (
                  <>
                    {/* Hunk header */}
                    <tr key={`hunk-${hi}`} className="bg-blue-950/30">
                      <td colSpan={3} className="px-4 py-1 text-blue-400 select-none text-[11px]">
                        {hunk.header}
                      </td>
                    </tr>
                    {hunk.lines.map((line, li) => (
                      <tr
                        key={`${hi}-${li}`}
                        className={
                          line.type === 'add' ? 'bg-green-950/40 hover:bg-green-950/60' :
                          line.type === 'del' ? 'bg-red-950/40 hover:bg-red-950/60' :
                          'hover:bg-white/[0.02]'
                        }
                      >
                        {/* Old line number */}
                        <td className="w-10 px-2 py-0.5 text-right text-gray-700 border-r border-gray-800 select-none">
                          {line.oldLineNo ?? ''}
                        </td>
                        {/* New line number */}
                        <td className="w-10 px-2 py-0.5 text-right text-gray-700 border-r border-gray-800 select-none">
                          {line.newLineNo ?? ''}
                        </td>
                        {/* Content */}
                        <td className="px-3 py-0.5 whitespace-pre">
                          <span className={
                            line.type === 'add' ? 'text-green-300' :
                            line.type === 'del' ? 'text-red-300' :
                            'text-gray-300'
                          }>
                            {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
                            {line.content}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function DiffViewer({ files }: Props) {
  if (!files || files.length === 0) {
    return <p className="text-gray-600 text-sm py-4">No changes in this commit.</p>;
  }

  const totalAdditions = files.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = files.reduce((s, f) => s + f.deletions, 0);

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm mb-4 text-gray-500">
        <span>{files.length} file{files.length !== 1 ? 's' : ''} changed</span>
        {totalAdditions > 0 && <span className="text-green-400 font-medium">+{totalAdditions}</span>}
        {totalDeletions > 0 && <span className="text-red-400 font-medium">-{totalDeletions}</span>}
      </div>

      {files.map((file, i) => (
        <FileDiff key={i} file={file} />
      ))}
    </div>
  );
}
