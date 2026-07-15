import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Settings, GitFork, BookOpen, Clock, FileCode2, GitBranch, GitCommit } from 'lucide-react';
import RepoHeader from '../../components/repo/RepoHeader';
import LanguageBar from '../../components/repo/LanguageBar';
import RepoTopics from '../../components/repo/RepoTopics';
import BranchSelector from '../../components/repo/BranchSelector';
import FileTree, { type TreeEntry } from '../../components/repo/FileTree';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface Language { language: string; color: string; percentage: number; bytes: number }
interface Topic    { topic: string }
interface RepoOwner { id: string; username: string; displayName: string | null; avatarUrl: string | null }

interface Repo {
  id: string;
  name: string;
  description: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  isArchived: boolean;
  isFork: boolean;
  isTemplate: boolean;
  defaultBranch: string;
  diskPath: string | null;
  healthScore: number;
  createdAt: string;
  updatedAt: string;
  forkOfId: string | null;
  owner: RepoOwner;
  topics: Topic[];
  _count: { stars: number; forks: number; issues: number; pullRequests: number };
}

interface RepoData {
  repo: Repo;
  languages: Language[];
  commitCount: number;
  isStarred: boolean;
}

const TABS = [
  { label: 'Code',         path: ''            },
  { label: 'Issues',       path: '/issues'     },
  { label: 'Pull Requests',path: '/pulls'      },
  { label: 'Branches',     path: '/branches'   },
  { label: 'Wiki',         path: '/wiki'       },
  { label: 'Discussions',  path: '/discussions'},
  { label: 'Releases',     path: '/releases'   },
];

export default function RepoHomePage() {
  const { username, repo: repoName } = useParams<{ username: string; repo: string }>();
  const { profile } = useAuth();
  const navigate    = useNavigate();

  const [data,     setData]     = useState<RepoData | null>(null);
  const [treeData, setTreeData] = useState<{ entries: (TreeEntry & { lastCommit: CommitMeta | null })[]; dirLastCommit: CommitMeta | null } | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [branch,   setBranch]   = useState<string | null>(null);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const isOwner = profile?.username === username;

  interface CommitMeta { sha: string; message: string; author: string; date: string }

  useEffect(() => {
    if (!username || !repoName) return;
    setLoading(true);
    setNotFound(false);
    api.get<RepoData>(`/api/repos/${username}/${repoName}`)
      .then(d => {
        setData(d);
        setBranch(d.repo.defaultBranch);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username, repoName]);

  // Fetch tree data when branch is known
  useEffect(() => {
    if (!username || !repoName || !branch) return;
    api.get<{ entries: (TreeEntry & { lastCommit: CommitMeta | null })[]; dirLastCommit: CommitMeta | null }>(`/api/repos/${username}/${repoName}/tree/${branch}`)
      .then(setTreeData)
      .catch(() => setTreeData(null));
  }, [username, repoName, branch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-start border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center gap-4">
        <FileCode2 className="w-12 h-12 text-gray-700" />
        <p className="text-gray-400 text-lg">Repository not found</p>
        <Link to="/" className="text-accent-start hover:underline text-sm">Go home</Link>
      </div>
    );
  }

  const { repo, languages, commitCount, isStarred } = data;
  const topics       = repo.topics.map(t => t.topic);
  const activeBranch = branch ?? repo.defaultBranch;

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* Archived banner */}
        {repo.isArchived && (
          <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 mb-6">
            <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
            <p className="text-yellow-300 text-sm">This repository has been archived and is now read-only.</p>
          </div>
        )}

        {/* Fork notice */}
        {repo.isFork && (
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
            <GitFork className="w-3.5 h-3.5" />
            <span>Forked from another repository</span>
          </div>
        )}

        {/* Repo header */}
        <RepoHeader
          repo={repo}
          isStarred={isStarred}
          commitCount={commitCount}
          onStarChange={(starred, count) =>
            setData(d => d ? {
              ...d,
              isStarred: starred,
              repo: { ...d.repo, _count: { ...d.repo._count, stars: count } },
            } : d)
          }
        />

        {/* Nav tabs */}
        <div className="flex border-b border-gray-800 mb-6 -mt-2 overflow-x-auto">
          {TABS.map(({ label, path }) => {
            const to   = `/${username}/${repoName}${path}`;
            const isActive = path === '' ? true : false; // Code tab active on this page
            const count =
              label === 'Issues'        ? repo._count.issues       :
              label === 'Pull Requests' ? repo._count.pullRequests  : undefined;
            return (
              <Link
                key={label}
                to={to}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                  isActive && label === 'Code'
                    ? 'border-accent-start text-white font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                {label}
                {count !== undefined && count > 0 && (
                  <span className="bg-gray-800 text-gray-400 text-xs px-1.5 py-0.5 rounded-full">{count}</span>
                )}
              </Link>
            );
          })}
          {isOwner && (
            <Link
              to={`/${username}/${repoName}/settings`}
              className="flex items-center gap-1.5 px-4 py-3 text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors ml-auto"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </Link>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* Main */}
          <main className="flex-1 min-w-0">

            {/* File tree area */}
            <div className="bg-navy-800 border border-gray-800 rounded-xl overflow-hidden mb-6">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 gap-3">
                {/* Branch selector */}
                <BranchSelector
                  username={username!}
                  repoName={repoName!}
                  currentBranch={activeBranch}
                  onChange={setBranch}
                />
                <div className="flex items-center gap-3">
                  {isOwner && (
                    <>
                      <button
                        onClick={() => setShowNewFile(true)}
                        className="flex items-center gap-1 text-gray-500 hover:text-white text-xs transition-colors"
                        title="Create new file"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add file
                      </button>
                      <label className="flex items-center gap-1 text-gray-500 hover:text-white text-xs transition-colors cursor-pointer" title="Upload files">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a3 3 0 003 3h10a3 3 0 003-3v-2" />
                        </svg>
                        Upload files
                        <input type="file" multiple className="hidden" onChange={() => {}} />
                      </label>
                      <span className="text-gray-700">·</span>
                    </>
                  )}
                  <Link
                    to={`/${username}/${repoName}/commits/${activeBranch}`}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-white text-xs transition-colors"
                  >
                    <GitCommit className="w-3.5 h-3.5" />
                    {commitCount} commit{commitCount !== 1 ? 's' : ''}
                  </Link>
                  <Link
                    to={`/${username}/${repoName}/branches`}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-white text-xs transition-colors"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    Branches
                  </Link>
                </div>
              </div>

              {commitCount === 0 ? (
                <div className="p-12 text-center">
                  <BookOpen className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <h3 className="text-white font-medium mb-2">This repository is empty</h3>
                  <p className="text-gray-500 text-sm mb-4">Push your first commit using the commands below.</p>
                  <div className="bg-navy-900 border border-gray-700 rounded-lg px-4 py-3 text-left max-w-sm mx-auto">
                    <code className="text-gray-400 text-sm font-mono leading-relaxed block whitespace-pre">
{`git clone ${window.location.origin.replace('5173','3001')}/${username}/${repoName}.git
cd ${repoName}
git add .
git commit -m "Initial commit"
git push origin main`}
                    </code>
                  </div>
                </div>
              ) : (
                <FileTree
                  username={username!}
                  repoName={repoName!}
                  branch={activeBranch}
                  subPath=""
                  entries={treeData?.entries ?? []}
                  dirLastCommit={treeData?.dirLastCommit ?? null}
                />
              )}
            </div>

            {/* README stub */}
            {commitCount > 0 && (
              <div className="bg-navy-800 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                  <BookOpen className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300 text-sm font-medium">README.md</span>
                </div>
                <div className="p-6">
                  <h1 className="text-white text-2xl font-bold mb-3">{repo.name}</h1>
                  {repo.description && (
                    <p className="text-gray-400 leading-relaxed">{repo.description}</p>
                  )}
                  <p className="text-gray-700 text-xs mt-4">
                    Full README / Markdown rendering — Phase 4
                  </p>
                </div>
              </div>
            )}
          </main>

          {/* Sidebar */}
          <aside className="lg:w-64 shrink-0 space-y-5">

            {/* About */}
            <div className="bg-navy-800 border border-gray-800 rounded-xl p-4">
              <h3 className="text-white text-sm font-semibold mb-3">About</h3>
              {repo.description ? (
                <p className="text-gray-400 text-sm leading-relaxed mb-3">{repo.description}</p>
              ) : isOwner ? (
                <button
                  onClick={() => navigate(`/${username}/${repoName}/settings`)}
                  className="text-gray-600 hover:text-gray-400 text-sm transition-colors mb-3 text-left"
                >
                  Add a description
                </button>
              ) : null}

              {topics.length > 0 && (
                <div className="mb-3">
                  <RepoTopics topics={topics} />
                </div>
              )}

              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span>⭐</span>
                  <span><strong className="text-gray-300">{repo._count.stars}</strong> stars</span>
                </div>
                <div className="flex items-center gap-2">
                  <GitFork className="w-4 h-4" />
                  <span><strong className="text-gray-300">{repo._count.forks}</strong> forks</span>
                </div>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  <Link
                    to={`/${username}/${repoName}/branches`}
                    className="hover:text-white transition-colors"
                  >
                    View branches
                  </Link>
                </div>
              </div>
            </div>

            {/* Languages */}
            {languages.length > 0 && (
              <div className="bg-navy-800 border border-gray-800 rounded-xl p-4">
                <h3 className="text-white text-sm font-semibold mb-3">Languages</h3>
                <LanguageBar languages={languages} />
              </div>
            )}

            {/* Releases stub */}
            <div className="bg-navy-800 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white text-sm font-semibold">Releases</h3>
                <Link
                  to={`/${username}/${repoName}/releases`}
                  className="text-accent-start text-xs hover:underline"
                >
                  View all
                </Link>
              </div>
              <p className="text-gray-600 text-xs">No releases yet. Phase 8.</p>
            </div>

            {/* Template badge */}
            {repo.isTemplate && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-sm">
                <p className="text-purple-400 font-medium mb-1">Template repository</p>
                <p className="text-gray-500 text-xs">Others can use this as a starting point.</p>
                <Link
                  to={`/new?template=${username}/${repoName}`}
                  className="mt-2 inline-block text-purple-400 hover:text-purple-300 text-xs hover:underline"
                >
                  Use this template →
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* New file dialog */}
      {showNewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowNewFile(false); setNewFileName(''); }}>
          <div className="bg-navy-800 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white text-lg font-semibold mb-4">Create new file</h3>
            <input
              type="text"
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newFileName.trim()) {
                  navigate(`/${username}/${repoName}/edit/${activeBranch}/${newFileName.trim()}`);
                  setShowNewFile(false);
                  setNewFileName('');
                }
                if (e.key === 'Escape') {
                  setShowNewFile(false);
                  setNewFileName('');
                }
              }}
              placeholder="filename.md"
              className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start mb-4"
              autoFocus
            />
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => { setShowNewFile(false); setNewFileName(''); }}
                className="px-4 py-2 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newFileName.trim()) {
                    navigate(`/${username}/${repoName}/edit/${activeBranch}/${newFileName.trim()}`);
                    setShowNewFile(false);
                    setNewFileName('');
                  }
                }}
                disabled={!newFileName.trim()}
                className="px-5 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
