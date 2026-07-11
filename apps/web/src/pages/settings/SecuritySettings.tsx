import { useState, useEffect } from 'react';
import { ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { api } from '../../lib/api';

interface TwoFAStatus { enabled: boolean; backupCodesRemaining: number }
interface SetupData { secret: string; qrCodeUrl: string }

export default function SecuritySettings() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<TwoFAStatus | null>(null);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'idle' | 'setup' | 'codes' | 'disable'>('idle');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get<TwoFAStatus>('/api/2fa/status').then(setStatus).catch(() => null);
  }, []);

  const startSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.post<SetupData>('/api/2fa/setup');
      setSetupData(data);
      setStep('setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async () => {
    setLoading(true);
    setError('');
    try {
      const { backupCodes: codes } = await api.post<{ backupCodes: string[] }>('/api/2fa/verify', { code });
      setBackupCodes(codes);
      setStatus({ enabled: true, backupCodesRemaining: codes.length });
      setStep('codes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/api/2fa/disable', { code: disableCode });
      setStatus({ enabled: false, backupCodesRemaining: 0 });
      setStep('idle');
      setDisableCode('');
      setSetupData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-6">{t('settings.security')}</h2>

      <div className="bg-navy-800 border border-gray-800 rounded-xl p-6 max-w-lg">
        <div className="flex items-start gap-4 mb-6">
          {status?.enabled
            ? <ShieldCheck className="w-8 h-8 text-green-400 shrink-0 mt-0.5" />
            : <ShieldOff className="w-8 h-8 text-gray-600 shrink-0 mt-0.5" />
          }
          <div>
            <h3 className="text-white font-medium">{t('settings.twoFactor')}</h3>
            <p className={`text-sm mt-0.5 ${status?.enabled ? 'text-green-400' : 'text-gray-500'}`}>
              {status?.enabled ? t('settings.twoFactorEnabled') : t('settings.twoFactorDisabled')}
            </p>
            {status?.enabled && (
              <p className="text-gray-600 text-xs mt-1">{status.backupCodesRemaining} backup codes remaining</p>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* Idle state */}
        {step === 'idle' && !status?.enabled && (
          <button
            onClick={startSetup}
            disabled={loading}
            className="py-2 px-5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
          >
            {loading ? t('common.loading') : t('settings.enable2FA')}
          </button>
        )}

        {step === 'idle' && status?.enabled && (
          <button
            onClick={() => setStep('disable')}
            className="py-2 px-5 rounded-lg text-red-400 border border-red-500/30 text-sm hover:bg-red-500/10 transition-colors"
          >
            {t('settings.disable2FA')}
          </button>
        )}

        {/* Setup: QR + code entry */}
        {step === 'setup' && setupData && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):</p>
            <div className="bg-white p-3 rounded-lg inline-block">
              <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="w-40 h-40" />
            </div>
            <p className="text-gray-500 text-xs">Manual key: <code className="text-purple-300 bg-gray-900 px-1 py-0.5 rounded text-xs">{setupData.secret}</code></p>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Enter the 6-digit code from your app</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-40 bg-navy-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-accent-start"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={verifySetup}
                disabled={loading || code.length < 6}
                className="py-2 px-5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
              >
                {loading ? t('common.loading') : t('auth.verify')}
              </button>
              <button onClick={() => { setStep('idle'); setSetupData(null); setCode(''); }} className="text-gray-500 hover:text-gray-300 text-sm">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Backup codes */}
        {step === 'codes' && (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-lg px-4 py-3">
              Save these backup codes in a safe place. Each can only be used once.
            </div>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((c, i) => (
                <code key={i} className="bg-navy-900 border border-gray-800 rounded px-3 py-1.5 text-gray-200 text-sm font-mono text-center">{c}</code>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={copyBackupCodes} className="flex items-center gap-2 py-2 px-4 border border-gray-700 rounded-lg text-gray-300 hover:text-white text-sm transition-colors">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? t('common.copied') : 'Copy codes'}
              </button>
              <button onClick={() => setStep('idle')} className="py-2 px-4 text-white text-sm font-medium rounded-lg" style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}>
                Done
              </button>
            </div>
          </div>
        )}

        {/* Disable */}
        {step === 'disable' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Enter your current 2FA code to confirm disabling:</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={disableCode}
              onChange={e => setDisableCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-40 bg-navy-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-3">
              <button
                onClick={disable2FA}
                disabled={loading || disableCode.length < 6}
                className="py-2 px-5 rounded-lg text-white bg-red-600 hover:bg-red-700 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? t('common.loading') : t('settings.disable2FA')}
              </button>
              <button onClick={() => { setStep('idle'); setDisableCode(''); }} className="text-gray-500 hover:text-gray-300 text-sm">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
