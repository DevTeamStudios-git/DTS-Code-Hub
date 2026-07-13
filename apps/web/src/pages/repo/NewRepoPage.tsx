import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Globe, Plus, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface CreateRepoResponse {
  repo: { name: string; owner?: { username: string } };
}

const GITIGNORE_OPTIONS = ['None', 'Node', 'Python', 'Java', 'Go', 'Rust', 'React', 'Vue'];
const LICENSE_OPTIONS = ['None', 'MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-2-Clause', 'ISC'];

export default function NewRepoPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [isTemplate, setIsTemplate] = useState(false);
  const [initReadme, setInitReadme] = useState(true);
  const [topicInput, setTopicInput] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nameValid = !name || /^[a-zA-Z0-9._-]{1,100}$/.test(name);
  const nameError = name && !nameValid ? 'Only letters, numbers, hyphens, underscores, and dots allowed.' : '';

  const addTopic = () => {
    const clean = topicInput.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    if (clean && !topics.includes(clean) && topics.length < 20) {
      setTopics(t => [...t, clean]);
    }
    setTopicInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !nameValid) return;
    setError('');
    setLoading(true);
    try {
      const data = await api.post<CreateRepoResponse>('/api/repos', {
        name, description, visibility, isTemplate, initReadme, topics,
      });
      navigate(`/${profile?.username}/${data.repo.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create repository');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <h1 className="text-white text-2xl font-bold">Create a new repository</h1>
          <p className="text-gray-500 text-sm mt-1">
            A repository contains all your project's files, revision history, and collaborator discussion.
            Or <Link to="/new/upload" className="text-accent-start hover:underline">upload an existing project</Link>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          {/* Owner / Name */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Repository name</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-navy-800 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-400 text-sm shrink-0">
                {profile?.avatarUrl
                  ? <img src={profile.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                  : <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent-start to-accent-end" />
                }
                {profile?.username}
              </div>
              <span className="text-gray-600">/</span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="my-awesome-project"
                className={`flex-1 bg-navy-900 border rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start transition-colors ${
                  nameError ? 'border-red-500' : 'border-gray-700'
                }`}
              />
            </div>
            {nameError && <p className="text-red-400 text-xs mt-1">{nameError}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Description <span className="text-gray-600 font-normal">(optional)</span></label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A short description of your project"
              className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Visibility</label>
            <div className="space-y-2">
              {([
                { value: 'PUBLIC', icon: Globe, title: 'Public', desc: 'Anyone can see this repository.' },
                { value: 'PRIVATE', icon: Lock, title: 'Private', desc: 'Only you and collaborators can see this repository.' },
              ] as const).map(({ value, icon: Icon, title, desc }) => (
                <label key={value} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                  visibility === value ? 'border-accent-start bg-accent-start/5' : 'border-gray-700 hover:border-gray-600'
                }`}>
                  <input type="radio" name="visibility" value={value} checked={visibility === value} onChange={() => setVisibility(value)} className="sr-only" />
                  <Icon className={`w-5 h-5 shrink-0 ${visibility === value ? 'text-accent-start' : 'text-gray-500'}`} />
                  <div>
                    <p className="text-white text-sm font-medium">{title}</p>
                    <p className="text-gray-500 text-xs">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Topics */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Topics <span className="text-gray-600 font-normal">(optional)</span></label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }}
                placeholder="Add topic..."
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

          {/* Init options */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={initReadme} onChange={e => setInitReadme(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-navy-900 text-accent-start" />
              <div>
                <p className="text-white text-sm font-medium">Initialize with a README</p>
                <p className="text-gray-500 text-xs">Adds a README.md file so you can immediately clone the repository.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={isTemplate} onChange={e => setIsTemplate(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-navy-900 text-accent-start" />
              <div>
                <p className="text-white text-sm font-medium">Make this a template repository</p>
                <p className="text-gray-500 text-xs">Others can use this repo as a starting point for new projects.</p>
              </div>
            </label>
          </div>

          {/* Stubs for gitignore/license */}
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: 'Add .gitignore', options: GITIGNORE_OPTIONS },
              { label: 'Choose a license', options: LICENSE_OPTIONS },
            ].map(({ label, options }) => (
              <div key={label}>
                <label className="block text-gray-300 text-sm font-medium mb-2">{label} <span className="text-gray-600 font-normal">(Phase 4)</span></label>
                <select disabled className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-600 text-sm cursor-not-allowed opacity-50">
                  {options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-800 flex items-center gap-4">
            <button
              type="submit"
              disabled={loading || !name || !!nameError}
              className="py-2.5 px-6 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
            >
              {loading ? 'Creating…' : 'Create repository'}
            </button>
            <Link to="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
