import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, Plus, X } from 'lucide-react';
import DangerZone from '../../components/repo/DangerZone';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface Repo {
  id: string;
  name: string;
  description: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  isTemplate: boolean;
  isArchived: boolean;
  defaultBranch: string;
  topics: { topic: string }[];
}

export default function RepoSettingsPage() {
  const { username, repo: repoName } = useParams<{ username: string; repo: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [repo, setRepo] = useState<Repo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [isTemplate, setIsTemplate] = useState(false);
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [topicInput, setTopicInput] = useState('');
  const [topics, setTopics] = useState<string[]>([]);

  // Guard: only owner
  useEffect(() => {
    if (profile && profile.username !== username) navigate('/');
  }, [profile, username, navigate]);

  useEffect(() => {
    if (!username || !repoName) return;
    api.get<{ repo: Repo }>(`/api/repos/${username}/${repoName}`)
      .then(d => {
        setRepo(d.repo);
        setName(d.repo.name);
        setDescription(d.repo.description ?? '');
        setVisibility(d.repo.visibility);
        setIsTemplate(d.repo.isTemplate);
        setDefaultBranch(d.repo.defaultBranch);
        setTopics(d.repo.topics.map(t => t.topic));
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [username, repoName, navigate]);

  const addTopic = () => {
    const clean = topicInput.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    if (clean && !topics.includes(clean) && topics.length < 20) {
      setTopics(t => [...t, clean]);
    }
    setTopicInput('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await api.put<{ repo: Repo }>(`/api/repos/${username}/${repoName}`, {
        name, description, visibility, isTemplate, defaultBranch, topics,
      });
      setRepo(updated.repo);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // If renamed, navigate to new URL
      if (name !== repoName) {
        navigate(`/${username}/${name}/settings`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    await api.post(`/api/repos/${username}/${repo?.name}/archive`);
    navigate(`/${username}/${repo?.name}`);
  };

  const handleDelete = async () => {
    await api.delete(`/api/repos/${username}/${repo?.name}`);
    navigate(`/${username}`);
  };

  const handleTransfer = async (newOwner: string) => {
    if (!newOwner.trim()) throw new Error('New owner username is required');
    const data = await api.post<{ repo: { owner?: { username: string }; name: string } }>(
      `/api/repos/${username}/${repo?.name}/transfer`,
      { newOwnerUsername: newOwner.trim() }
    );
    navigate(`/${data.repo.owner?.username ?? newOwner}/${data.repo.name}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-start border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!repo) return null;

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        {/* Back nav */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            to={`/${username}/${repoName}`}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to repository
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-400 text-sm">Settings</span>
        </div>

        {/* Settings sub-nav */}
        <div className="flex gap-1 mb-8 border-b border-gray-800 pb-0">
          <Link
            to={`/${username}/${repoName}/settings`}
            className="px-4 py-2.5 text-sm border-b-2 border-accent-start text-white font-medium -mb-px"
          >
            General
          </Link>
          <Link
            to={`/${username}/${repoName}/settings/branches`}
            className="px-4 py-2.5 text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600 -mb-px transition-colors"
          >
            Branches
          </Link>
        </div>

        <h1 className="text-white text-xl font-bold mb-8">Repository Settings</h1>

        <form onSubmit={handleSave} className="space-y-6 mb-10">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          {/* Name */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Repository name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-start"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A short description..."
              className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start"
            />
          </div>

          {/* Default branch */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Default branch</label>
            <input
              type="text"
              value={defaultBranch}
              onChange={e => setDefaultBranch(e.target.value)}
              className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-start"
            />
          </div>

          {/* Topics */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Topics</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }}
                placeholder="Add a topic..."
                className="flex-1 bg-navy-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start"
              />
              <button type="button" onClick={addTopic} className="px-3 py-2 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {topics.map(t => (
                  <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs" style={{ background: '#3B5BFE18', color: '#7b9cff', border: '1px solid #3B5BFE33' }}>
                    {t}
                    <button type="button" onClick={() => setTopics(ts => ts.filter(x => x !== t))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Visibility</label>
            <div className="space-y-2">
              {([
                { value: 'PUBLIC', label: 'Public', desc: 'Anyone can see this repository.' },
                { value: 'PRIVATE', label: 'Private', desc: 'Only you and collaborators can see this repository.' },
              ] as const).map(({ value, label, desc }) => (
                <label key={value} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                  visibility === value ? 'border-accent-start bg-accent-start/5' : 'border-gray-700 hover:border-gray-600'
                }`}>
                  <input type="radio" name="visibility" value={value} checked={visibility === value} onChange={() => setVisibility(value)} className="sr-only" />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${visibility === value ? 'border-accent-start' : 'border-gray-600'}`}>
                    {visibility === value && <div className="w-2 h-2 rounded-full bg-accent-start" />}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{label}</p>
                    <p className="text-gray-500 text-xs">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Template toggle */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isTemplate}
              onChange={e => setIsTemplate(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-navy-900 text-accent-start"
            />
            <div>
              <p className="text-white text-sm font-medium">Template repository</p>
              <p className="text-gray-500 text-xs">Allow others to use this repository as a template.</p>
            </div>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 py-2.5 px-6 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
          >
            {saved && <Check className="w-4 h-4" />}
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        {/* Danger zone */}
        <DangerZone
          repoName={repo.name}
          isArchived={repo.isArchived}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onTransfer={handleTransfer}
        />
      </div>
    </div>
  );
}
