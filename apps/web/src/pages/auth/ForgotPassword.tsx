import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { api } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ForgotPassword() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title={t('auth.resetPassword')}>
        <div className="text-center py-4">
          <Mail className="w-12 h-12 text-accent-start mx-auto mb-4" />
          <p className="text-gray-300 text-sm mb-6">
            If an account exists for <strong className="text-white">{email}</strong>, a reset link has been sent.
          </p>
          <Link
            to="/auth/signin"
            className="text-accent-start hover:text-accent-end text-sm transition-colors"
          >
            {t('auth.backToSignIn')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('auth.resetPassword')} subtitle={t('auth.resetPasswordDesc')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-gray-400 text-sm mb-1.5">{t('auth.email')}</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-start focus:border-transparent transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
        >
          {loading ? t('common.loading') : t('auth.sendResetLink')}
        </button>

        <p className="text-center">
          <Link to="/auth/signin" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            {t('auth.backToSignIn')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
