import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, GitCompare, GitCommit } from 'lucide-react';
import DiffViewer from '../../components/repo/DiffViewer';
import { api } from '../../lib/api';

interface CompareResponse {
  base: string;
  head: string;
  commits: { sha: string; shortSha: string; author: string; date: string; message: string }[];
  files: import('../../components/repo/DiffViewer').DiffFile[];
  stat: string;
  totalAdditions: number;
  totalDeletions: number;
}

export default function ComparePage() {
  const { username, repo: repoName, '*': refs = '' } = useParams<{
    username: string; repo: string; '*': string;
  }>();
  const navigate = useNavigate();

  const [base,   setBase]   = useState('main');
  const [head,   setHead]   = useState('');
  const [data,   setData]   = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,  setError]  = useState('');

  // Parse refs from URL if present
  useEffect(() => {
    const threeMatch = refs.match(/^(.+?)\.{3}(.+)$/);
    const twoMatch   = refs.match(/^(.+?)\.{2}(.+)$/);
    const m = threeMatch ?? twoMatch;
    if (m) {
      setBase(m[1]);
      setHead(m[2]);
    }
  }, [refs]);

  // Auto-compare when refs come from URL
  useEffect(() => {
    const threeMatch = refs.match(/^(.+?)\.{3}(.+)$/);
    const twoMatch   = refs.match(/^(.+?)\.{2}(.+)$/);
    if ((threeMatch ?? twoMatch) && username && repoName) {
      doCompare(base, head);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doCompare = async (b: string, h: string) => {
    if (!b.trim() || !h.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.get<CompareResponse>(
        `/api/repos/${username}/${repoName}/compare/${b}...${h}`
      );
      setData(result);
      navigate(`/${username}/${repoName}/compare/${b}...${h}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compare failed');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link to={`/${username}/${repoName}`} className="flex items-center gap-1 text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {username}/{repoName}
          </Link>
          <span className="text-gray-700">·</span>
          <GitCompare className="w-4 h-4 text-gray-600" />
          <span className="text-gray-400">Compare</span>
        </div>

        {/* Compare controls */}
        <div className="bg-navy-800 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-white font-semibold mb-4">Compare branches or commits</h2>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={base}
              onChange={e => setBase(e.target.value)}
              placeholder="base (e.g. main)"
              className="bg-navy-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start w-48"
            />
            <span className="text-gray-600 text-sm font-mono">...</span>
            <input
              type="text"
              value={head}
              onChange={e => setHead(e.target.value)}
              placeholder="compare (e.g. feature/x)"
              className="bg-navy-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start w-48"
            />
            <button
              onClick={() => doCompare(base, head)}
              disabled={loading || !base.trim() || !head.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
            >
              <GitCompare className="w-4 h-4" />
              {loading ? 'Comparing…' : 'Compare'}
            </button>
          </div>
          {error && (
            <div className="mt-3 text-red-400 text-sm">{error}</div>
          )}
        </div>

        {data && (
          <>
            {/* Summary */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
              <span className="text-gray-400">
                <strong className="text-white">{data.commits.length}</strong> commit{data.commits.length !== 1 ? 's' : ''}
              </span>
              <span className="text-gray-400">
                <strong className="text-white">{data.files.length}</strong> file{data.files.length !== 1 ? 's' : ''} changed
              </span>
              {data.totalAdditions > 0 && (
                <span className="text-green-400 font-medium">+{data.totalAdditions}</span>
              )}
              {data.totalDeletions > 0 && (
                <span className="text-red-400 font-medium">-{data.totalDeletions}</span>
              )}
            </div>

            {/* Commits */}
            {data.commits.length > 0 && (
              <div className="bg-navy-800 border border-gray-800 rounded-xl overflow-hidden mb-6">
                <div className="px-4 py-3 border-b border-gray-800">
                  <h3 className="text-white text-sm font-semibold">Commits</h3>
                </div>
                <div className="divide-y divide-gray-800/50">
                  {data.commits.map(c => (
                    <div key={c.sha} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02]">
                      <GitCommit className="w-4 h-4 text-gray-600 shrink-0" />
                      <Link
                        to={`/${username}/${repoName}/commit/${c.sha}`}
                        className="text-white text-sm hover:text-accent-start transition-colors flex-1 truncate"
                      >
                        {c.message}
                      </Link>
                      <span className="text-gray-600 text-xs shrink-0">{c.author}</span>
                      <Link
                        to={`/${username}/${repoName}/commit/${c.sha}`}
                        className="font-mono text-xs text-gray-600 hover:text-accent-start transition-colors shrink-0"
                      >
                        {c.shortSha}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diff */}
            <DiffViewer files={data.files} />
          </>
        )}
      </div>
    </div>
  );
}
