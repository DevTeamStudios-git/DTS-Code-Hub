import { useState, useRef } from 'react';
import { Camera, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { api } from '../../lib/api';

export default function ProfileSettings() {
  const { t } = useLanguage();
  const { profile, updateProfile, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [website, setWebsite] = useState(profile?.website ?? '');
  const [company, setCompany] = useState(profile?.company ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateProfile({ displayName, bio, location, website, company });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Avatar must be under 2MB');
      return;
    }

    setAvatarLoading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await api.post('/api/users/me/avatar', { base64, contentType: file.type });
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Avatar upload failed');
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-6">{t('settings.profile')}</h2>

      {/* Avatar */}
      <div className="mb-8 flex items-center gap-5">
        <div className="relative">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.username} className="w-20 h-20 rounded-full object-cover border-2 border-gray-800" />
          ) : (
            <div
              className="w-20 h-20 rounded-full border-2 border-gray-800 flex items-center justify-center text-3xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #3B5BFE, #8B3BFE)' }}
            >
              {profile?.username?.[0]?.toUpperCase()}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarLoading}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
          >
            <Camera className="w-3.5 h-3.5 text-gray-300" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
        </div>
        <div>
          <p className="text-white text-sm font-medium">@{profile?.username}</p>
          <p className="text-gray-500 text-xs mt-0.5">{t('settings.uploadAvatar')}</p>
          {avatarLoading && <p className="text-accent-start text-xs mt-1">{t('common.loading')}</p>}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5 max-w-lg">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {[
          { label: t('settings.displayName'), value: displayName, setter: setDisplayName, placeholder: 'Your full name' },
          { label: t('settings.location'), value: location, setter: setLocation, placeholder: 'City, Country' },
          { label: t('settings.website'), value: website, setter: setWebsite, placeholder: 'https://yoursite.com' },
          { label: t('settings.company'), value: company, setter: setCompany, placeholder: '@company or Company Name' },
        ].map(({ label, value, setter, placeholder }) => (
          <div key={label}>
            <label className="block text-gray-400 text-sm mb-1.5">{label}</label>
            <input
              type="text"
              value={value}
              onChange={e => setter(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start focus:border-transparent transition-colors"
            />
          </div>
        ))}

        <div>
          <label className="block text-gray-400 text-sm mb-1.5">{t('settings.bio')}</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="A short bio about yourself..."
            className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start focus:border-transparent transition-colors resize-none"
          />
          <p className="text-gray-600 text-xs mt-1 text-right">{bio.length}/280</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 py-2.5 px-6 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
        >
          {saved && <Check className="w-4 h-4" />}
          {saved ? t('common.success') : saving ? t('common.loading') : t('settings.saveChanges')}
        </button>
      </form>
    </div>
  );
}
