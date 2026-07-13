import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Star, GitFork, Clock } from 'lucide-react';
import LanguageBar from '../../components/repo/LanguageBar';
import RepoTopics from '../../components/repo/RepoTopics';
import { api } from '../../lib/api';

interface Repo {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  healthScore: number;
  topics: { topic: string }[];
  owner: { username: string; avatarUrl: string | null };
  _count: { stars: number; forks: number };
}

const SORT_OPTIONS = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'stars',   label: 'Most starred' },
  { value: 'forks',   label: 'Most forked' },
];

const TRENDING_TOPICS = ['typescript', 'react', 'python', 'rust', 'go', 'javascript', 'vue', 'svelte', 'web', 'api'];

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);

  const q     = searchParams.get('q') ?? '';
  const topic = searchParams.get('topic') ?? '';
  const sort  = searchParams.get('sort') ?? 'updated';

  const [search, setSearch] = useState(q);

  const fetchRepos = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (topic) params.set('topic', topic);
    if (sort) params.set('sort', sort);
    api.get<{ repos: Repo[] }>(`/api/repos/explore?${params}`)
      .then(d => setRepos(d.repos))
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, [q, topic, sort]);

  useEffect(() => { fetchRepos(); }, [fetchRepos]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(p => { const np = new URLSearchParams(p); search ? np.set('q', search) : np.delete('q'); return np; });
  };

  const setSort = (s: string) => setSearchParams(p => { const np = new URLSearchParams(p); np.set('sort', s); return np; });
  const setTopic = (t: string) => setSearchParams(p => { const np = new URLSearchParams(p); t ? np.set('topic', t) : np.delete('topic'); return np; });

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-white text-2xl font-bold mb-1">Explore</h1>
          <p className="text-gray-500 text-sm">Discover repositories from the DTS Code Hub community.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* Sidebar filters */}
          <aside className="lg:w-56 shrink-0 space-y-4">
            {/* Sort */}
            <div className="bg-navy-800 border border-gray-800 rounded-xl p-4">
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Sort by</h3>
              <div className="space-y-1">
                {SORT_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSort(value)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                      sort === value ? 'bg-accent-start/10 text-white font-medium' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Trending topics */}
            <div className="bg-navy-800 border border-gray-800 rounded-xl p-4">
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Topics</h3>
              <div className="flex flex-wrap gap-1.5">
                {TRENDING_TOPICS.map(t => (
                  <button
                    key={t}
                    onClick={() => setTopic(topic === t ? '' : t)}
                    className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                      topic === t
                        ? 'bg-accent-start text-white'
                        : 'text-gray-500 border border-gray-700 hover:border-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Search + sort bar */}
            <div className="flex gap-3 mb-5">
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search repositories..."
                    className="w-full bg-navy-800 border border-gray-700 rounded-lg py-2.5 pl-9 pr-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start"
                  />
                </div>
              </form>
            </div>

            {/* Active filters */}
            {(q || topic) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {q && (
                  <span className="flex items-center gap-1.5 text-xs bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-gray-300">
                    Search: "{q}"
                    <button onClick={() => { setSearch(''); setSearchParams(p => { const np = new URLSearchParams(p); np.delete('q'); return np; }); }} className="text-gray-600 hover:text-gray-400">✕</button>
                  </span>
                )}
                {topic && (
                  <span className="flex items-center gap-1.5 text-xs bg-accent-start/10 border border-accent-start/30 rounded-full px-3 py-1 text-accent-start">
                    Topic: {topic}
                    <button onClick={() => setTopic('')} className="opacity-60 hover:opacity-100">✕</button>
                  </span>
                )}
              </div>
            )}

            {/* Repo list */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-36 bg-navy-800 rounded-xl animate-pulse" />)}
              </div>
            ) : repos.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-600 text-lg mb-2">No repositories found</p>
                <p className="text-gray-700 text-sm">Try a different search or topic.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {repos.map(repo => (
                  <div key={repo.id} className="bg-navy-800 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {repo.owner.avatarUrl
                          ? <img src={repo.owner.avatarUrl} alt="" className="w-5 h-5 rounded-full shrink-0" />
                          : <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent-start to-accent-end shrink-0" />
                        }
                        <Link
                          to={`/${repo.owner.username}/${repo.name}`}
                          className="text-accent-start hover:underline font-semibold truncate"
                        >
                          {repo.owner.username}/<span className="text-white">{repo.name}</span>
                        </Link>
                      </div>
                      <div className="flex items-center gap-3 text-gray-500 text-xs shrink-0">
                        <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{repo._count.stars}</span>
                        <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" />{repo._count.forks}</span>
                      </div>
                    </div>

                    {repo.description && (
                      <p className="text-gray-400 text-sm leading-relaxed mb-3">{repo.description}</p>
                    )}

                    {repo.topics.length > 0 && (
                      <div className="mb-3">
                        <RepoTopics topics={repo.topics.map(t => t.topic)} />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-gray-600 text-xs">
                        <Clock className="w-3 h-3" />
                        Updated {new Date(repo.updatedAt).toLocaleDateString()}
                      </span>
                      <LanguageBar languages={[]} showLabels={false} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
