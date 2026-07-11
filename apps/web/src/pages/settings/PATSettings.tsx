import { useState, useEffect } from 'react';
import { Plus, Trash2, Lock, Copy, Check, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { api } from '../../lib/api';

interface PAT { id: string; name: string; scopes: string[]; expiresAt: string | null; lastUsedAt: string | null; createdAt: string; rawToken?: string }

const ALL_SCOPES = ['repo', 'repo:read', 'repo:write', 'user', 'user:read', 'issues', 'pull_requests'];
const EXPIRY_OPTIONS = [
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'No expiration', days: undefined },
];

export default function PATSettings() {
  const { t } = useLanguage();
  const [tokens, setTokens] = useState<PAT[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiry, setExpiry] = useState<number | undefined>(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newToken, setNewToken] = useState<PAT | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchTokens = () => {
    api.get<{ tokens: PAT[] }>('/api/pat').then(d => setTokens(d.tokens)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchTokens(); }, []);

  const toggleScope = (s: string) => setSelectedScopes(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const result = await api.post<{ token: PAT }>('/api/pat', { name, scopes: selectedScopes, expiresInDays: expiry });
      setNewToken(result.token);
      setName('');
      setSelectedScopes([]);
      setExpiry(30);
      setShowForm(false);
      fetchTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create token');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setDeleting(id);
    try {
      await api.delete(`/api/pat/${id}`);
      setTokens(t => t.filter(x => x.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const copyToken = () => {
    if (!newToken?.rawToken) return;
    navigator.clipboard.writeText(newToken.rawToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-lg font-semibold">{t('settings.tokens')}</h2>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 py-2 px-4 rounded-lg text-white text-sm font-medium hover:opacity-90" style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}>
          <Plus className="w-4 h-4" />
          {t('settings.newToken')}
        </button>
      </div>

      {/* New token banner */}
      {newToken?.rawToken && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <p className="text-green-300 text-sm">{t('settings.tokenWarning')}</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-navy-900 border border-gray-800 rounded-lg px-3 py-2 text-green-300 text-sm font-mono truncate">{newToken.rawToken}</code>
            <button onClick={copyToken} className="shrink-0 flex items-center gap-1.5 py-2 px-3 border border-gray-700 rounded-lg text-gray-300 hover:text-white text-sm transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? t('common.copied') : t('common.copy')}
            </button>
          </div>
          <button onClick={() => setNewToken(null)} className="text-gray-600 hover:text-gray-400 text-xs mt-3">Dismiss</button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-navy-800 border border-gray-800 rounded-xl p-5 mb-6 space-y-5 max-w-2xl">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}

          <div>
            <label className="block text-gray-400 text-sm mb-1.5">{t('settings.tokenName')}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="My CI token" className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start" />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">{t('settings.expiration')}</label>
            <div className="flex flex-wrap gap-2">
              {EXPIRY_OPTIONS.map(o => (
                <button key={o.label} type="button" onClick={() => setExpiry(o.days)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${expiry === o.days ? 'bg-accent-start text-white' : 'border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">{t('settings.scopes')}</label>
            <div className="space-y-2">
              {ALL_SCOPES.map(s => (
                <label key={s} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={selectedScopes.includes(s)} onChange={() => toggleScope(s)} className="w-4 h-4 rounded border-gray-600 bg-navy-900 text-accent-start focus:ring-accent-start" />
                  <span className="text-gray-300 text-sm font-mono group-hover:text-white transition-colors">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="py-2 px-5 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}>
              {saving ? t('common.loading') : t('settings.generate')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300 text-sm">{t('common.cancel')}</button>
          </div>
        </form>
      )}

      {/* Token list */}
      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 bg-navy-800 rounded-xl animate-pulse" />)}</div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-12"><Lock className="w-10 h-10 text-gray-700 mx-auto mb-3" /><p className="text-gray-600 text-sm">{t('settings.noTokens')}</p></div>
      ) : (
        <div className="space-y-3">
          {tokens.map(token => (
            <div key={token.id} className="bg-navy-800 border border-gray-800 rounded-xl p-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-accent-start mt-0.5 shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">{token.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {token.scopes.map(s => (
                      <span key={s} className="text-xs bg-accent-start/10 text-accent-start border border-accent-start/20 rounded px-1.5 py-0.5">{s}</span>
                    ))}
                    {token.scopes.length === 0 && <span className="text-xs text-gray-600">No scopes</span>}
                  </div>
                  <p className="text-gray-600 text-xs mt-1.5">
                    Created {new Date(token.createdAt).toLocaleDateString()}
                    {token.expiresAt ? ` · Expires ${new Date(token.expiresAt).toLocaleDateString()}` : ` · ${t('settings.never')}`}
                    {token.lastUsedAt ? ` · ${t('settings.lastUsed')} ${new Date(token.lastUsedAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => handleRevoke(token.id)} disabled={deleting === token.id} className="text-gray-600 hover:text-red-400 transition-colors text-sm disabled:opacity-50 shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
