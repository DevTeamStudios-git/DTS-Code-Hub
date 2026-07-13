import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { GitCommit, ArrowLeft, ArrowRight, Copy, Check, GitMerge, RotateCcw, GitBranch as CherryIcon } from 'lucide-react';
import BranchSelector from '../../components/repo/BranchSelector';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface Commit {
  sha: string;
  shortSha: string;
  author: string;
  email: string;
  date: string;
  message: string;
  parents: string[];
  isMerge: boolean;
}

interface CommitsResponse {
  commits: Commit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function CopySHA({ sha }: { sha: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(sha);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="text-gray-600 hover:text-gray-400 transition-colors" title="Copy SHA">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function CommitsPage() {
  const { username, repo: repoName, branch = 'main' } = useParams<{ username: string; repo: string; branch: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<CommitsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const isOwner = profile?.username === username;

  const fetchCommits = useCallback(() => {
    if (!username || !repoName) return;
    setLoading(true);
    api.get<CommitsResponse>(`/api/repos/${username}/${repoName}/commits/${branch}?page=${page}&limit=30`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [username, repoName, branch, page]);

  useEffect(() => { fetchCommits(); }, [fetchCommits]);

  const handleCherryPick = async (sha: string) => {
    const target = window.prompt('Cherry-pick onto which branch?', branch);
    if (!target) return;
    setActionLoading(sha);
    setActionError('');
    try {
      await api.post(`/api/repos/${username}/${repoName}/commits/cherry-pick`, { sha, targetBranch: target });
      navigate(`/${username}/${repoName}/commits/${target}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cherry-pick failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevert = async (sha: string) => {
    if (!window.confirm(`Revert commit ${sha.slice(0, 7)} on branch "${branch}"?`)) return;
    setActionLoading(sha);
    setActionError('');
    try {
      await api.post(`/api/repos/${username}/${repoName}/commits/revert`, { sha, targetBranch: branch });
      fetchCommits();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Revert failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link to={`/${username}/${repoName}`} className="flex items-center gap-1 text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {username}/{repoName}
          </Link>
          <span className="text-gray-700">·</span>
          <GitCommit className="w-4 h-4 text-gray-600" />
          <span className="text-gray-400">Commits</span>
        </div>

        {/* Branch selector + stats */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <BranchSelector
            username={username!}
            repoName={repoName!}
            currentBranch={branch}
            navigateTo={(b) => `/${username}/${repoName}/commits/${b}`}
          />
          {data && (
            <span className="text-gray-600 text-sm">{data.total} commit{data.total !== 1 ? 's' : ''}</span>
          )}
        </div>

        {actionError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">{actionError}</div>
        )}

        {/* Commit list */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-navy-800 rounded-xl animate-pulse" />)}
          </div>
        ) : !data || data.commits.length === 0 ? (
          <div className="text-center py-16">
            <GitCommit className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-600">No commits on this branch yet</p>
          </div>
        ) : (
          <>
            <div className="space-y-px">
              {data.commits.map((commit, i) => (
                <div
                  key={commit.sha}
                  className={`flex items-start gap-4 p-4 bg-navy-800 hover:bg-navy-700/50 transition-colors ${
                    i === 0 ? 'rounded-t-xl' : ''
                  } ${i === data.commits.length - 1 ? 'rounded-b-xl' : ''} border-x border-t border-gray-800 ${
                    i === data.commits.length - 1 ? 'border-b' : ''
                  }`}
                >
                  {/* Merge indicator */}
                  <div className="mt-0.5 shrink-0">
                    {commit.isMerge
                      ? <GitMerge className="w-4 h-4 text-purple-400" />
                      : <GitCommit className="w-4 h-4 text-gray-600" />
                    }
                  </div>

                  {/* Commit info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/${username}/${repoName}/commit/${commit.sha}`}
                      className="text-white text-sm font-medium hover:text-accent-start transition-colors line-clamp-1"
                    >
                      {commit.message}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                      <span className="text-gray-400">{commit.author}</span>
                      <span>committed</span>
                      <span title={commit.date}>
                        {new Date(commit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* SHA + actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/${username}/${repoName}/commit/${commit.sha}`}
                      className="font-mono text-xs text-gray-500 hover:text-accent-start transition-colors bg-navy-900 border border-gray-700 px-2 py-1 rounded"
                    >
                      {commit.shortSha}
                    </Link>
                    <CopySHA sha={commit.sha} />

                    {isOwner && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCherryPick(commit.sha)}
                          disabled={actionLoading === commit.sha}
                          className="text-gray-600 hover:text-green-400 transition-colors disabled:opacity-50"
                          title="Cherry-pick this commit"
                        >
                          <CherryIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRevert(commit.sha)}
                          disabled={actionLoading === commit.sha}
                          className="text-gray-600 hover:text-orange-400 transition-colors disabled:opacity-50"
                          title="Revert this commit"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 1}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-gray-600 text-sm">Page {page} of {data.totalPages}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page === data.totalPages}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
