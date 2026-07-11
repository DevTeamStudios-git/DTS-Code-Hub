import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ResetPassword() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Supabase injects access_token into the URL hash after clicking the reset link
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) {
      setError('Invalid or expired reset link. Please request a new one.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      setDone(true);
      setTimeout(() => navigate('/auth/signin'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthLayout title={t('auth.updatePassword')}>
        <div className="text-center py-4">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-gray-300 text-sm">Password updated! Redirecting to sign in…</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('auth.updatePassword')} subtitle="Choose a strong new password">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-gray-400 text-sm mb-1.5">{t('auth.newPassword')}</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2.5 pr-10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start focus:border-transparent transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 8 ? 'bg-green-500' : 'bg-red-500/50'}`} />
              <span className={`text-xs ${password.length >= 8 ? 'text-green-400' : 'text-gray-500'}`}>
                {password.length >= 8 ? 'Strong' : 'Min 8 characters'}
              </span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !!error}
          className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
        >
          {loading ? t('common.loading') : t('auth.updatePassword')}
        </button>
      </form>
    </AuthLayout>
  );
}
