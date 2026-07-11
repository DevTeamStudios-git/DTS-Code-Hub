import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function TwoFactorVerify() {
  const { t } = useLanguage();
  const { verify2FA } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;
    setError('');
    setLoading(true);
    try {
      await verify2FA(code);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setCode('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t('auth.twoFactor')} subtitle={t('auth.twoFactorDesc')}>
      <div className="flex justify-center mb-6">
        <ShieldCheck className="w-10 h-10 text-accent-start" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^0-9A-Z-]/g, ''))}
            placeholder="000000"
            className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-3 text-white text-center text-2xl font-mono tracking-widest placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-start focus:border-transparent transition-colors"
          />
          <p className="text-gray-600 text-xs text-center mt-2">Enter backup code for a dashed format: XXXX-XXXX</p>
        </div>

        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
        >
          {loading ? t('common.loading') : t('auth.verify')}
        </button>
      </form>
    </AuthLayout>
  );
}
