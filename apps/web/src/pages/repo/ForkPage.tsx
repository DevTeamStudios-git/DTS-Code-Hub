import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { GitFork, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface RepoStub {
  name: string;
  description: string | null;
  _count: { stars: number; forks: number };
  owner: { username: string; avatarUrl: string | null };
}

interface ForkResponse {
  repo: { name: string };
}

export default function ForkPage() {
  const { username, repo: repoName } = useParams<{ username: string; repo: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [repo, setRepo] = useState<RepoStub | null>(null);
  const [loading, setLoading] = useState(true);
  const [forking, setForking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!username || !repoName) return;
    api.get<{ repo: RepoStub }>(`/api/repos/${username}/${repoName}`)
      .then(d => setRepo(d.repo))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [username, repoName, navigate]);

  const handleFork = async () => {
    setForking(true);
    setError('');
    try {
      const data = await api.post<ForkResponse>(`/api/repos/${username}/${repoName}/fork`);
      navigate(`/${profile?.username}/${data.repo.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fork failed');
      setForking(false);
    }
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
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-accent-start/10 border border-accent-start/30 flex items-center justify-center mx-auto mb-4">
            <GitFork className="w-6 h-6 text-accent-start" />
          </div>
          <h1 className="text-white text-xl font-bold">Fork this repository</h1>
          <p className="text-gray-500 text-sm mt-2">
            Create your own copy of <strong className="text-gray-300">{username}/{repoName}</strong>
          </p>
        </div>

        <div className="bg-navy-800 border border-gray-800 rounded-xl p-6 mb-6">
          {/* Source */}
          <div className="flex items-center gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-0.5">
                <span>Source</span>
              </div>
              <div className="flex items-center gap-2">
                {repo.owner.avatarUrl
                  ? <img src={repo.owner.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                  : <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-start to-accent-end" />
                }
                <span className="text-gray-300 text-sm font-mono">{username}/{repoName}</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-600 mx-auto" />
            <div>
              <div className="text-gray-500 text-xs mb-0.5">Your fork</div>
              <div className="flex items-center gap-2">
                {profile?.avatarUrl
                  ? <img src={profile.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                  : <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-start to-accent-end" />
                }
                <span className="text-white text-sm font-mono">{profile?.username}/{repoName}</span>
              </div>
            </div>
          </div>

          {repo.description && (
            <p className="text-gray-500 text-sm border-t border-gray-800 pt-4">{repo.description}</p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleFork}
            disabled={forking}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-6 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
          >
            <GitFork className="w-4 h-4" />
            {forking ? 'Forking…' : 'Fork repository'}
          </button>
          <Link
            to={`/${username}/${repoName}`}
            className="py-2.5 px-5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 text-sm transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
