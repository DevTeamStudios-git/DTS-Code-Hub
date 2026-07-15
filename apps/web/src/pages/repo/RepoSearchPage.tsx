import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Search, ArrowLeft, FileCode2 } from 'lucide-react';
import BranchSelector from '../../components/repo/BranchSelector';
import { api } from '../../lib/api';

interface SearchMatch {
  file: string;
  line: number;
  content: string;
  match: string;
}

interface SearchResponse {
  query: string;
  branch: string;
  matches: SearchMatch[];
}

// Group matches by file
function groupByFile(matches: SearchMatch[]): Record<string, SearchMatch[]> {
  const groups: Record<string, SearchMatch[]> = {};
  for (const m of matches) {
    if (!groups[m.file]) groups[m.file] = [];
    groups[m.file].push(m);
  }
  return groups;
}

function highlight(content: string, query: string): React.ReactNode {
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{content}</span>;
  return (
    <>
      {content.slice(0, idx)}
      <mark className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">{content.slice(idx, idx + query.length)}</mark>
      {content.slice(idx + query.length)}
    </>
  );
}

export default function RepoSearchPage() {
  const { username, repo: repoName } = useParams<{ username: string; repo: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ      = searchParams.get('q') ?? '';
  const initialBranch = searchParams.get('branch') ?? 'main';

  const [query,   setQuery]   = useState(initialQ);
  const [branch,  setBranch]  = useState(initialBranch);
  const [data,    setData]    = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const doSearch = async (q: string, b: string) => {
    if (q.trim().length < 2) return;
    setLoading(true);
    setError('');
    setSearchParams({ q: q.trim(), branch: b });
    try {
      const result = await api.get<SearchResponse>(
        `/api/repos/${username}/${repoName}/search?q=${encodeURIComponent(q.trim())}&branch=${b}`
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Auto-search from URL params on mount
  useEffect(() => {
    if (initialQ.length >= 2) doSearch(initialQ, initialBranch);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query, branch);
  };

  const grouped = data ? groupByFile(data.matches) : {};
  const fileCount = Object.keys(grouped).length;

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link
            to={`/${username}/${repoName}/tree/${branch}`}
            className="flex items-center gap-1 text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {username}/{repoName}
          </Link>
          <span className="text-gray-700">·</span>
          <Search className="w-4 h-4 text-gray-600" />
          <span className="text-gray-400">Search</span>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search in code…"
              autoFocus
              className="w-full bg-navy-800 border border-gray-700 rounded-lg py-2.5 pl-9 pr-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start"
            />
          </div>
          <BranchSelector
            username={username!}
            repoName={repoName!}
            currentBranch={branch}
            onChange={b => setBranch(b)}
          />
          <button
            type="submit"
            disabled={loading || query.trim().length < 2}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* Results */}
        {data && (
          <div>
            <p className="text-gray-500 text-sm mb-4">
              {data.matches.length === 0
                ? `No results for "${data.query}"`
                : `${data.matches.length} result${data.matches.length !== 1 ? 's' : ''} across ${fileCount} file${fileCount !== 1 ? 's' : ''} in "${data.query}"`
              }
            </p>

            <div className="space-y-4">
              {Object.entries(grouped).map(([file, matches]) => (
                <div key={file} className="bg-navy-800 border border-gray-800 rounded-xl overflow-hidden">
                  {/* File header */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800 bg-white/[0.02]">
                    <FileCode2 className="w-4 h-4 text-gray-500 shrink-0" />
                    <Link
                      to={`/${username}/${repoName}/blob/${branch}/${file}`}
                      className="text-accent-start hover:underline text-sm font-mono"
                    >
                      {file}
                    </Link>
                    <span className="ml-auto text-gray-600 text-xs">{matches.length} match{matches.length !== 1 ? 'es' : ''}</span>
                  </div>

                  {/* Match lines */}
                  <div className="divide-y divide-gray-800/50">
                    {matches.map((m, i) => (
                      <Link
                        key={i}
                        to={`/${username}/${repoName}/blob/${branch}/${file}#L${m.line}`}
                        className="flex items-start gap-0 hover:bg-white/[0.02] transition-colors block"
                      >
                        <span className="w-12 text-right px-3 py-2 text-gray-700 text-xs font-mono select-none shrink-0 border-r border-gray-800">
                          {m.line}
                        </span>
                        <span className="px-4 py-2 text-xs font-mono text-gray-400 whitespace-pre flex-1 overflow-x-auto">
                          {highlight(m.content, data.query)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
