import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GitCommit, GitBranch, Search, BookOpen } from 'lucide-react';
import FileTree, { type TreeEntry } from '../../components/repo/FileTree';
import FileRenderer, { type FileData } from '../../components/repo/FileRenderer';
import BranchSelector from '../../components/repo/BranchSelector';
import LanguageBar from '../../components/repo/LanguageBar';
import RepoTopics from '../../components/repo/RepoTopics';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface CommitMeta { sha: string; message: string; author: string; date: string }
interface TreeResponse {
  path: string;
  branch: string;
  entries: (TreeEntry & { lastCommit: CommitMeta | null })[];
  dirLastCommit: CommitMeta | null;
}
interface RepoMeta {
  repo: { name: string; description: string | null; defaultBranch: string; topics: { topic: string }[] };
  languages: { language: string; color: string; percentage: number; bytes: number }[];
  commitCount: number;
}

export default function FileTreePage() {
  const { profile } = useAuth();
  const { username, repo: repoName, branch = 'main', '*': wildcard = '' } = useParams<{
    username: string; repo: string; branch: string; '*': string;
  }>();

  const [treeData, setTreeData] = useState<TreeResponse | null>(null);
  const [readme,   setReadme]   = useState<FileData | null>(null);
  const [repoMeta, setRepoMeta] = useState<RepoMeta | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [searchQ,  setSearchQ]  = useState('');

  const API_BASE = import.meta.env.VITE_API_URL as string ?? 'http://localhost:3001';

  useEffect(() => {
    if (!username || !repoName) return;

    setLoading(true);
    const treePath = wildcard
      ? `/api/repos/${username}/${repoName}/tree/${branch}/${wildcard}`
      : `/api/repos/${username}/${repoName}/tree/${branch}`;

    Promise.all([
      api.get<TreeResponse>(treePath),
      api.get<RepoMeta>(`/api/repos/${username}/${repoName}`),
    ]).then(([tree, meta]) => {
      setTreeData(tree);
      setRepoMeta(meta);

      // Auto-load README if in root
      if (!wildcard) {
        const hasReadme = tree.entries.some(e =>
          e.type === 'blob' && e.name.toLowerCase().startsWith('readme')
        );
        if (hasReadme) {
          api.get<FileData>(`/api/repos/${username}/${repoName}/blob/${branch}/README.md`)
            .then(f => { if (f.type === 'markdown') setReadme(f); })
            .catch(() => null);
        }
      }
    }).catch(() => setTreeData(null))
      .finally(() => setLoading(false));
  }, [username, repoName, branch, wildcard]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-start border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const topics = repoMeta?.repo.topics.map(t => t.topic) ?? [];

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Main */}
          <main className="flex-1 min-w-0">

            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <BranchSelector
                username={username!}
                repoName={repoName!}
                currentBranch={branch}
                navigateTo={(b) => `/${username}/${repoName}/tree/${b}${wildcard ? `/${wildcard}` : ''}`}
              />
              <div className="flex items-center gap-3 ml-auto text-xs text-gray-600">
                {profile?.username === username && (
                  <>
                    <Link
                      to={`/${username}/${repoName}/edit/${branch}/${wildcard ? wildcard + '/' : ''}newfile.md`}
                      className="flex items-center gap-1 hover:text-gray-400 transition-colors"
                      title="Create new file"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add file
                    </Link>
                    <span className="text-gray-700">·</span>
                  </>
                )}
                <Link
                  to={`/${username}/${repoName}/commits/${branch}`}
                  className="flex items-center gap-1 hover:text-gray-400 transition-colors"
                >
                  <GitCommit className="w-3.5 h-3.5" />
                  {repoMeta?.commitCount ?? 0} commits
                </Link>
                <Link
                  to={`/${username}/${repoName}/branches`}
                  className="flex items-center gap-1 hover:text-gray-400 transition-colors"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  Branches
                </Link>
              </div>
            </div>

            {/* Search bar */}
            <form
              onSubmit={e => {
                e.preventDefault();
                if (searchQ.trim()) {
                  window.location.href = `/${username}/${repoName}/search?q=${encodeURIComponent(searchQ)}&branch=${branch}`;
                }
              }}
              className="mb-4"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                <input
                  type="text"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder={`Search in ${repoName}…`}
                  className="w-full bg-navy-800 border border-gray-700 rounded-lg py-2 pl-9 pr-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start"
                />
              </div>
            </form>

            {/* File tree */}
            <div className="bg-navy-800 border border-gray-800 rounded-xl overflow-hidden mb-6">
              {!treeData || treeData.entries.length === 0 ? (
                <div className="p-12 text-center">
                  <BookOpen className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <h3 className="text-white font-medium mb-2">This repository is empty</h3>
                  <p className="text-gray-500 text-sm mb-4">Push your first commit to get started.</p>
                  <div className="bg-navy-900 border border-gray-700 rounded-lg px-4 py-3 text-left max-w-sm mx-auto">
                    <code className="text-gray-400 text-sm font-mono leading-relaxed block whitespace-pre">
{`git clone ${API_BASE}/${username}/${repoName}.git
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
                  branch={branch}
                  subPath={wildcard}
                  entries={treeData.entries}
                  dirLastCommit={treeData.dirLastCommit}
                />
              )}
            </div>

            {/* README */}
            {readme && !wildcard && (
              <div className="bg-navy-800 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                  <BookOpen className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300 text-sm font-medium">README.md</span>
                </div>
                <FileRenderer
                  file={readme}
                  rawUrl={`${API_BASE}/api/repos/${username}/${repoName}/raw/${branch}/README.md`}
                />
              </div>
            )}
          </main>

          {/* Sidebar */}
          <aside className="lg:w-60 shrink-0 space-y-4">
            {repoMeta?.repo.description && (
              <div className="bg-navy-800 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm leading-relaxed">{repoMeta.repo.description}</p>
              </div>
            )}
            {topics.length > 0 && (
              <div className="bg-navy-800 border border-gray-800 rounded-xl p-4">
                <RepoTopics topics={topics} />
              </div>
            )}
            {(repoMeta?.languages?.length ?? 0) > 0 && (
              <div className="bg-navy-800 border border-gray-800 rounded-xl p-4">
                <h3 className="text-white text-sm font-semibold mb-3">Languages</h3>
                <LanguageBar languages={repoMeta!.languages} />
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
