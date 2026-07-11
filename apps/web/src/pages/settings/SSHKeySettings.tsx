import { useState, useEffect } from 'react';
import { Plus, Trash2, Key } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { api } from '../../lib/api';

interface SSHKey { id: string; title: string; fingerprint: string; createdAt: string; lastUsedAt: string | null }

export default function SSHKeySettings() {
  const { t } = useLanguage();
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [keyText, setKeyText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchKeys = () => {
    api.get<{ keys: SSHKey[] }>('/api/ssh-keys').then(d => setKeys(d.keys)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/ssh-keys', { title, keyText });
      setTitle('');
      setKeyText('');
      setShowForm(false);
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add key');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.delete(`/api/ssh-keys/${id}`);
      setKeys(k => k.filter(x => x.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-lg font-semibold">{t('settings.sshKeys')}</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 py-2 px-4 rounded-lg text-white text-sm font-medium hover:opacity-90"
          style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
        >
          <Plus className="w-4 h-4" />
          {t('settings.addSSHKey')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-navy-800 border border-gray-800 rounded-xl p-5 mb-6 space-y-4 max-w-2xl">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">{t('settings.title')}</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="My laptop key"
              className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">{t('settings.key')}</label>
            <textarea
              value={keyText}
              onChange={e => setKeyText(e.target.value)}
              required
              rows={4}
              placeholder="ssh-ed25519 AAAA... user@host"
              className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="py-2 px-5 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50" style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}>
              {saving ? t('common.loading') : t('common.add')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300 text-sm">{t('common.cancel')}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-20 bg-navy-800 rounded-xl animate-pulse" />)}
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12">
          <Key className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">{t('settings.noKeys')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(key => (
            <div key={key.id} className="bg-navy-800 border border-gray-800 rounded-xl p-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <Key className="w-5 h-5 text-accent-start mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">{key.title}</p>
                  <p className="text-gray-500 text-xs font-mono truncate mt-0.5">{key.fingerprint}</p>
                  <p className="text-gray-600 text-xs mt-1">
                    {t('settings.addedOn')} {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && ` · ${t('settings.lastUsed')} ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(key.id)}
                disabled={deleting === key.id}
                className="text-gray-600 hover:text-red-400 transition-colors shrink-0 disabled:opacity-50"
                title={t('settings.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
