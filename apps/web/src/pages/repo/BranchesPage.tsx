import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GitBranch, ShieldCheck, Trash2, Plus, ArrowLeft, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface Branch {
  name: string;
  isCurrent: boolean;
  isDefault: boolean;
  isProtected: boolean;
}

interface BranchesResponse {
  branches: Branch[];
  defaultBranch: string;
}

export default function BranchesPage() {
  const { username, repo: repoName } = useParams<{ username: string; repo: string }>();
  const { profile } = useAuth();
  const isOwner = profile?.username === username;

  const [data, setData]         = useState<BranchesResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [newBranch, setNewBranch] = useState('');
  const [fromBranch, setFromBranch] = useState('');
  const [creating, setCreating]   = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [error, setError]         = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const fetchBranches = () => {
    if (!username || !repoName) return;
    setLoading(true);
    api.get<BranchesResponse>(`/api/repos/${username}/${repoName}/branches`)
      .then(d => { setData(d); setFromBranch(d.defaultBranch); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBranches(); }, [username, repoName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.trim()) return;
    setCreating(true);
    setError('');
    try {
      await api.post(`/api/repos/${username}/${repoName}/branches`, { name: newBranch.trim(), from: fromBranch });
      setNewBranch('');
      setShowCreate(false);
      fetchBranches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Delete branch "${name}"? This cannot be undone.`)) return;
    setDeleting(name);
    setError('');
    try {
      await api.delete(`/api/repos/${username}/${repoName}/branches/${name}`);
      fetchBranches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete branch');
    } finally {
      setDeleting(null);
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
          <GitBranch className="w-4 h-4 text-gray-600" />
          <span className="text-gray-400">Branches</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-xl font-bold">
            Branches {data && <span className="text-gray-600 font-normal text-base ml-1">({data.branches.length})</span>}
          </h1>
          {isOwner && (
            <button
              onClick={() => setShowCreate(v => !v)}
              className="flex items-center gap-2 py-2 px-4 rounded-lg text-white text-sm font-medium hover:opacity-90"
              style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
            >
              <Plus className="w-4 h-4" />
              New branch
            </button>
          )}
        </div>

        {/* Create form */}
        {showCreate && (
          <form onSubmit={handleCreate} className="bg-navy-800 border border-gray-700 rounded-xl p-5 mb-6 space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-gray-400 text-sm mb-1.5">New branch name</label>
                <input
                  type="text"
                  value={newBranch}
                  onChange={e => setNewBranch(e.target.value)}
                  required
                  placeholder="feature/my-new-feature"
                  className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">From branch</label>
                <select
                  value={fromBranch}
                  onChange={e => setFromBranch(e.target.value)}
                  className="bg-navy-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-start"
                >
                  {data?.branches.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={creating} className="py-2 px-5 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}>
                {creating ? 'Creating…' : 'Create branch'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-gray-300 text-sm">Cancel</button>
            </div>
          </form>
        )}

        {error && !showCreate && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        {/* Branch list */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-navy-800 rounded-xl animate-pulse" />)}
          </div>
        ) : !data || data.branches.length === 0 ? (
          <div className="text-center py-16">
            <GitBranch className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-600">No branches yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.branches.map(branch => (
              <div
                key={branch.name}
                className="flex items-center gap-3 p-4 bg-navy-800 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
              >
                <GitBranch className="w-4 h-4 text-gray-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/${username}/${repoName}/commits/${branch.name}`}
                      className="text-white text-sm font-mono hover:text-accent-start transition-colors truncate"
                    >
                      {branch.name}
                    </Link>
                    {branch.isDefault && (
                      <span className="text-xs bg-accent-start/10 text-accent-start border border-accent-start/20 rounded-full px-2 py-0.5 flex items-center gap-1 shrink-0">
                        <Check className="w-2.5 h-2.5" /> default
                      </span>
                    )}
                    {branch.isProtected && (
                      <span className="flex items-center gap-1 text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2 py-0.5 shrink-0">
                        <ShieldCheck className="w-2.5 h-2.5" /> protected
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/${username}/${repoName}/commits/${branch.name}`}
                    className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
                  >
                    History
                  </Link>
                  {isOwner && !branch.isDefault && (
                    <button
                      onClick={() => handleDelete(branch.name)}
                      disabled={deleting === branch.name || branch.isProtected}
                      className="text-gray-700 hover:text-red-400 transition-colors disabled:opacity-30"
                      title={branch.isProtected ? 'Cannot delete a protected branch' : 'Delete branch'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
