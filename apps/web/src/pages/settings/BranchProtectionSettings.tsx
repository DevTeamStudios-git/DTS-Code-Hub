import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';

interface Protection {
  id: string;
  branch: string;
  requirePullRequest: boolean;
  requireStatusChecks: boolean;
  restrictPushes: boolean;
  allowedPushers: string[];
}

interface ProtectionsResponse {
  protections: Protection[];
}

const EMPTY: Omit<Protection, 'id'> = {
  branch: '',
  requirePullRequest: false,
  requireStatusChecks: false,
  restrictPushes: false,
  allowedPushers: [],
};

export default function BranchProtectionSettings() {
  const { username, repo: repoName } = useParams<{ username: string; repo: string }>();
  const [protections, setProtections] = useState<Protection[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState<Omit<Protection, 'id'>>(EMPTY);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState<string | null>(null);
  const [error, setError]             = useState('');
  const [expanded, setExpanded]       = useState<string | null>(null);

  const fetchProtections = () => {
    if (!username || !repoName) return;
    api.get<ProtectionsResponse>(`/api/repos/${username}/${repoName}/branches/protections`)
      .then(d => setProtections(d.protections))
      .catch(() => setProtections([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProtections(); }, [username, repoName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.branch.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/api/repos/${username}/${repoName}/branches/protections/${form.branch.trim()}`, form);
      setForm(EMPTY);
      setShowForm(false);
      fetchProtections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branch: string) => {
    if (!window.confirm(`Remove protection from "${branch}"?`)) return;
    setDeleting(branch);
    try {
      await api.delete(`/api/repos/${username}/${repoName}/branches/protections/${branch}`);
      fetchProtections();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-lg font-semibold">Branch Protection Rules</h2>
          <p className="text-gray-500 text-sm mt-0.5">Protect important branches from direct pushes and require reviews.</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 py-2 px-4 rounded-lg text-white text-sm font-medium hover:opacity-90"
          style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
        >
          <Plus className="w-4 h-4" />
          Add rule
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-navy-800 border border-gray-700 rounded-xl p-5 mb-6 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Branch name pattern</label>
            <input
              type="text"
              value={form.branch}
              onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
              required
              placeholder="main"
              className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start"
            />
          </div>

          <div className="space-y-3">
            {([
              { key: 'requirePullRequest',  label: 'Require pull request before merging',         desc: 'Direct pushes are rejected; changes must come through a PR.' },
              { key: 'requireStatusChecks', label: 'Require status checks to pass',               desc: 'CI/CD pipeline must succeed before merge (Phase 10).' },
              { key: 'restrictPushes',      label: 'Restrict who can push',                        desc: 'Only users in the allowed list can push directly.' },
            ] as const).map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-navy-900 text-accent-start"
                />
                <div>
                  <p className="text-white text-sm font-medium group-hover:text-accent-start transition-colors">{label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="py-2 px-5 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}>
              {saving ? 'Saving…' : 'Save rule'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY); }} className="text-gray-500 hover:text-gray-300 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 bg-navy-800 rounded-xl animate-pulse" />)}</div>
      ) : protections.length === 0 ? (
        <div className="text-center py-12">
          <ShieldCheck className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No branch protection rules yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {protections.map(p => (
            <div key={p.id} className="bg-navy-800 border border-gray-800 rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-white/[0.02]"
                onClick={() => setExpanded(e => e === p.branch ? null : p.branch)}
              >
                {expanded === p.branch
                  ? <ChevronDown className="w-4 h-4 text-gray-600" />
                  : <ChevronRight className="w-4 h-4 text-gray-600" />
                }
                <ShieldCheck className="w-4 h-4 text-yellow-500" />
                <code className="text-white text-sm font-mono flex-1">{p.branch}</code>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  {p.requirePullRequest  && <span className="text-blue-400">PR required</span>}
                  {p.requireStatusChecks && <span className="text-green-400">Status checks</span>}
                  {p.restrictPushes      && <span className="text-orange-400">Restricted push</span>}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(p.branch); }}
                  disabled={deleting === p.branch}
                  className="text-gray-600 hover:text-red-400 transition-colors ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {expanded === p.branch && (
                <div className="px-12 pb-4 text-sm space-y-2 border-t border-gray-800 pt-3">
                  <p className="text-gray-400">Require pull request: <span className={p.requirePullRequest ? 'text-green-400' : 'text-gray-600'}>{p.requirePullRequest ? 'Yes' : 'No'}</span></p>
                  <p className="text-gray-400">Require status checks: <span className={p.requireStatusChecks ? 'text-green-400' : 'text-gray-600'}>{p.requireStatusChecks ? 'Yes' : 'No'}</span></p>
                  <p className="text-gray-400">Restrict pushes: <span className={p.restrictPushes ? 'text-orange-400' : 'text-gray-600'}>{p.restrictPushes ? 'Yes' : 'No'}</span></p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
