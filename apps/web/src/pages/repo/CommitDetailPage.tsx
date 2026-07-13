import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GitCommit, ArrowLeft, User, Calendar, Copy, Check, GitMerge } from 'lucide-react';
import DiffViewer, { type DiffFile } from '../../components/repo/DiffViewer';
import { api } from '../../lib/api';

interface CommitDetail {
  sha: string;
  shortSha: string;
  author: string;
  email: string;
  date: string;
  message: string;
  body: string | null;
  parents: string[];
  isMerge: boolean;
  stat: string;
}

interface CommitResponse {
  commit: CommitDetail;
  files: DiffFile[];
}

export default function CommitDetailPage() {
  const { username, repo: repoName, sha } = useParams<{ username: string; repo: string; sha: string }>();
  const [data, setData]     = useState<CommitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    if (!username || !repoName || !sha) return;
    setLoading(true);
    api.get<CommitResponse>(`/api/repos/${username}/${repoName}/commits/commit/${sha}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [username, repoName, sha]);

  const copySHA = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.commit.sha);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-start border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Commit not found</p>
        <Link to={`/${username}/${repoName}`} className="text-accent-start hover:underline text-sm">Back to repo</Link>
      </div>
    );
  }

  const { commit, files } = data;

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link
            to={`/${username}/${repoName}/commits/main`}
            className="flex items-center gap-1 text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {username}/{repoName}
          </Link>
          <span className="text-gray-700">·</span>
          <span className="text-gray-400 font-mono text-xs">{commit.shortSha}</span>
        </div>

        {/* Commit header card */}
        <div className="bg-navy-800 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            {commit.isMerge
              ? <GitMerge className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />
              : <GitCommit className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
            }
            <div>
              <h1 className="text-white text-lg font-semibold leading-snug">{commit.message}</h1>
              {commit.body && (
                <pre className="text-gray-400 text-sm mt-3 whitespace-pre-wrap font-sans leading-relaxed border-l-2 border-gray-700 pl-4">
                  {commit.body}
                </pre>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span className="text-gray-300 font-medium">{commit.author}</span>
              <span className="text-gray-600 text-xs">{commit.email}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{new Date(commit.date).toLocaleString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}</span>
            </div>

            {/* SHA */}
            <div className="flex items-center gap-2 ml-auto">
              {commit.parents.length > 0 && (
                <div className="text-xs text-gray-600">
                  Parent{commit.parents.length > 1 ? 's' : ''}:{' '}
                  {commit.parents.map(p => (
                    <Link
                      key={p}
                      to={`/${username}/${repoName}/commit/${p}`}
                      className="font-mono text-gray-500 hover:text-accent-start transition-colors ml-1"
                    >
                      {p.slice(0, 7)}
                    </Link>
                  ))}
                </div>
              )}
              <button
                onClick={copySHA}
                className="flex items-center gap-1.5 font-mono text-xs bg-navy-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
              >
                {commit.sha}
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Diff */}
        <DiffViewer files={files} />
      </div>
    </div>
  );
}
