import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, FileArchive, X, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface UploadRepoResponse {
  repo: { name: string };
  fileCount: number;
}

export default function UploadProjectPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  const nameValid = !name || /^[a-zA-Z0-9._-]{1,100}$/.test(name);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith('.zip')) {
      setFile(dropped);
      if (!name) setName(dropped.name.replace(/\.zip$/, '').replace(/[^a-zA-Z0-9._-]/g, '-'));
    } else {
      setError('Only .zip files are supported.');
    }
  }, [name]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!name) setName(selected.name.replace(/\.zip$/, '').replace(/[^a-zA-Z0-9._-]/g, '-'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name || !nameValid) return;
    if (file.size > 50 * 1024 * 1024) { setError('File must be under 50MB.'); return; }

    setError('');
    setLoading(true);
    setProgress('Reading zip file…');

    try {
      const base64Zip = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setProgress('Uploading and initializing repository…');
      const data = await api.post<UploadRepoResponse>('/api/repos/upload', {
        name, description, visibility, base64Zip,
      });

      setProgress(`Created repository with ${data.fileCount} files!`);
      setTimeout(() => navigate(`/${profile?.username}/${data.repo.name}`), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <h1 className="text-white text-2xl font-bold">Upload an existing project</h1>
          <p className="text-gray-500 text-sm mt-1">
            Zip your project and upload it here. DTS Code Hub will initialize a git repository with all your files.
            Or <Link to="/new" className="text-accent-start hover:underline">create an empty repository</Link>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-accent-start bg-accent-start/5' : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => document.getElementById('zip-input')?.click()}
          >
            <input id="zip-input" type="file" accept=".zip" onChange={handleFileInput} className="hidden" />

            {file ? (
              <div className="flex flex-col items-center gap-3">
                <FileArchive className="w-10 h-10 text-accent-start" />
                <div>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-gray-500 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setFile(null); }}
                  className="flex items-center gap-1 text-gray-500 hover:text-red-400 text-sm transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-10 h-10 text-gray-600" />
                <div>
                  <p className="text-gray-300 font-medium">Drop your .zip file here</p>
                  <p className="text-gray-600 text-sm mt-1">or click to browse · Max 50MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Repo name */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Repository name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="my-project"
              className={`w-full bg-navy-900 border rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start ${
                name && !nameValid ? 'border-red-500' : 'border-gray-700'
              }`}
            />
            {name && !nameValid && <p className="text-red-400 text-xs mt-1">Only letters, numbers, hyphens, underscores, and dots.</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Description <span className="text-gray-600 font-normal">(optional)</span></label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this project do?"
              className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start"
            />
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center gap-4">
            {(['PUBLIC', 'PRIVATE'] as const).map(v => (
              <label key={v} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                visibility === v ? 'border-accent-start bg-accent-start/5 text-white' : 'border-gray-700 text-gray-500 hover:border-gray-600'
              }`}>
                <input type="radio" name="visibility" value={v} checked={visibility === v} onChange={() => setVisibility(v)} className="sr-only" />
                <span className="text-sm font-medium">{v === 'PUBLIC' ? '🌍 Public' : '🔒 Private'}</span>
              </label>
            ))}
          </div>

          {/* Progress */}
          {progress && (
            <div className="flex items-center gap-3 text-sm text-gray-400">
              {loading ? (
                <div className="w-4 h-4 border-2 border-accent-start border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
              )}
              {progress}
            </div>
          )}

          <div className="pt-2 border-t border-gray-800 flex items-center gap-4">
            <button
              type="submit"
              disabled={loading || !file || !name || !nameValid}
              className="py-2.5 px-6 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
            >
              {loading ? 'Creating repository…' : 'Upload & create repository'}
            </button>
            <Link to="/new" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
