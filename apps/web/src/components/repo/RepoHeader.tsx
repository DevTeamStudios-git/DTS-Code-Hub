import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, GitFork, Eye, Lock, Archive, Copy, Check, BookTemplate } from 'lucide-react';
import RepoHealthBadge from './RepoHealthBadge';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface Repo {
  id: string;
  name: string;
  description: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  isArchived: boolean;
  isFork: boolean;
  isTemplate: boolean;
  defaultBranch: string;
  healthScore: number;
  diskPath: string | null;
  owner: { username: string; avatarUrl: string | null };
  _count: { stars: number; forks: number };
}

interface Props {
  repo: Repo;
  isStarred: boolean;
  commitCount: number;
  onStarChange?: (starred: boolean, newCount: number) => void;
}

export default function RepoHeader({ repo, isStarred, commitCount, onStarChange }: Props) {
  const { session } = useAuth();
  const [starred, setStarred] = useState(isStarred);
  const [starCount, setStarCount] = useState(repo._count.stars);
  const [starLoading, setStarLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const cloneUrl = `${window.location.origin}/${repo.owner.username}/${repo.name}.git`;

  const handleStar = async () => {
    if (!session) return;
    setStarLoading(true);
    try {
      if (starred) {
        await api.delete(`/api/repos/${repo.owner.username}/${repo.name}/star`);
        setStarred(false);
        setStarCount(c => c - 1);
        onStarChange?.(false, starCount - 1);
      } else {
        await api.post(`/api/repos/${repo.owner.username}/${repo.name}/star`);
        setStarred(true);
        setStarCount(c => c + 1);
        onStarChange?.(true, starCount + 1);
      }
    } finally {
      setStarLoading(false);
    }
  };

  const copyCloneUrl = () => {
    navigator.clipboard.writeText(cloneUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-b border-gray-800 pb-4 mb-6">
      {/* Breadcrumb + badges */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Link to={`/${repo.owner.username}`} className="text-accent-start hover:underline font-semibold text-lg">
          {repo.owner.username}
        </Link>
        <span className="text-gray-600 text-lg">/</span>
        <span className="text-white font-bold text-lg">{repo.name}</span>

        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${
          repo.visibility === 'PRIVATE' ? 'border-yellow-700 text-yellow-500' : 'border-gray-700 text-gray-500'
        }`}>
          {repo.visibility === 'PRIVATE' && <Lock className="w-2.5 h-2.5" />}
          {repo.visibility === 'PUBLIC' ? 'Public' : 'Private'}
        </span>

        {repo.isArchived && (
          <span className="text-xs px-2 py-0.5 rounded-full border border-yellow-700 text-yellow-500 flex items-center gap-1">
            <Archive className="w-2.5 h-2.5" />
            Archived
          </span>
        )}

        {repo.isFork && (
          <span className="text-xs px-2 py-0.5 rounded-full border border-gray-700 text-gray-500 flex items-center gap-1">
            <GitFork className="w-2.5 h-2.5" />
            Fork
          </span>
        )}

        {repo.isTemplate && (
          <span className="text-xs px-2 py-0.5 rounded-full border border-purple-700 text-purple-400 flex items-center gap-1">
            <BookTemplate className="w-2.5 h-2.5" />
            Template
          </span>
        )}

        <RepoHealthBadge score={repo.healthScore} />
      </div>

      {repo.description && (
        <p className="text-gray-400 text-sm mb-4 leading-relaxed">{repo.description}</p>
      )}

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Star */}
        <button
          onClick={handleStar}
          disabled={starLoading || !session}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
            starred
              ? 'border-yellow-600 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20'
              : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
          } disabled:opacity-50`}
        >
          <Star className={`w-4 h-4 ${starred ? 'fill-yellow-400' : ''}`} />
          {starred ? 'Starred' : 'Star'}
          <span className="bg-gray-800 text-xs px-1.5 py-0.5 rounded-full">{starCount}</span>
        </button>

        {/* Fork */}
        {session && (
          <Link
            to={`/${repo.owner.username}/${repo.name}/fork`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white text-sm transition-colors"
          >
            <GitFork className="w-4 h-4" />
            Fork
            <span className="bg-gray-800 text-xs px-1.5 py-0.5 rounded-full">{repo._count.forks}</span>
          </Link>
        )}

        {/* Watch */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white text-sm transition-colors">
          <Eye className="w-4 h-4" />
          Watch
        </button>

        {/* Clone URL */}
        <div className="flex items-center gap-0 ml-auto">
          <div className="flex items-center bg-navy-800 border border-gray-700 rounded-lg overflow-hidden">
            <span className="text-gray-600 text-xs px-2 border-r border-gray-700">HTTPS</span>
            <code className="text-gray-400 text-xs px-2 py-1.5 font-mono max-w-48 truncate">{cloneUrl}</code>
            <button
              onClick={copyCloneUrl}
              className="px-2 py-1.5 border-l border-gray-700 text-gray-500 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-stats bar */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
        <span>{commitCount} commit{commitCount !== 1 ? 's' : ''}</span>
        <span>Branch: <code className="text-gray-500">{repo.defaultBranch}</code></span>
      </div>
    </div>
  );
}
