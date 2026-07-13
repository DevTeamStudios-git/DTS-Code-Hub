import { useState } from 'react';
import { AlertTriangle, Archive, Trash2, ArrowRightLeft, RotateCcw } from 'lucide-react';

interface DangerAction {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  buttonClass: string;
  onConfirm: (input?: string) => Promise<void>;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  confirmPhrase?: string;
}

interface Props {
  repoName: string;
  isArchived: boolean;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
  onTransfer: (newOwner: string) => Promise<void>;
}

function DangerItem({ action, repoName }: { action: DangerAction; repoName: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const confirmPhrase = action.confirmPhrase ?? repoName;
  const canConfirm = !action.confirmPhrase || input === confirmPhrase;

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      await action.onConfirm(action.requiresInput ? input : undefined);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-800/50 last:border-0">
      <div className="flex items-start gap-3">
        <div className="text-red-400 mt-0.5">{action.icon}</div>
        <div>
          <p className="text-white text-sm font-medium">{action.title}</p>
          <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{action.description}</p>
        </div>
      </div>
      <button
        onClick={() => setOpen(true)}
        className={`shrink-0 text-sm px-4 py-1.5 rounded-lg border font-medium transition-colors ${action.buttonClass}`}
      >
        {action.buttonLabel}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-navy-800 border border-red-900/50 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-white font-semibold">{action.title}</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">{action.description}</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-4">
                {error}
              </div>
            )}

            {action.requiresInput && (
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-1.5">{action.inputLabel}</label>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={action.inputPlaceholder}
                  className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}

            {action.confirmPhrase && !action.requiresInput && (
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-1.5">
                  Type <code className="text-white bg-gray-900 px-1 rounded">{confirmPhrase}</code> to confirm:
                </p>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  className="w-full bg-navy-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={() => { setOpen(false); setInput(''); setError(''); }} className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || !canConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors"
              >
                {loading ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DangerZone({ repoName, isArchived, onArchive, onDelete, onTransfer }: Props) {
  const actions: DangerAction[] = [
    {
      icon: isArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />,
      title: isArchived ? 'Unarchive this repository' : 'Archive this repository',
      description: isArchived
        ? 'Unarchiving will allow pushes and changes to this repository again.'
        : 'Mark this repository as archived and read-only. It will be hidden from active searches.',
      buttonLabel: isArchived ? 'Unarchive' : 'Archive',
      buttonClass: 'border-yellow-700 text-yellow-500 hover:bg-yellow-500/10',
      onConfirm: async () => onArchive(),
    },
    {
      icon: <ArrowRightLeft className="w-4 h-4" />,
      title: 'Transfer ownership',
      description: 'Transfer this repository to another DTS Code Hub user. The new owner will have full control.',
      buttonLabel: 'Transfer',
      buttonClass: 'border-orange-700 text-orange-500 hover:bg-orange-500/10',
      requiresInput: true,
      inputLabel: 'Enter new owner username',
      inputPlaceholder: 'username',
      onConfirm: async (input) => onTransfer(input ?? ''),
    },
    {
      icon: <Trash2 className="w-4 h-4" />,
      title: 'Delete this repository',
      description: 'This action cannot be undone. All code, issues, pull requests, and settings will be permanently deleted.',
      buttonLabel: 'Delete',
      buttonClass: 'border-red-700 text-red-500 hover:bg-red-500/10',
      confirmPhrase: repoName,
      onConfirm: async () => onDelete(),
    },
  ];

  return (
    <div className="border border-red-900/40 rounded-xl overflow-hidden">
      <div className="bg-red-950/20 px-5 py-3 flex items-center gap-2 border-b border-red-900/40">
        <AlertTriangle className="w-4 h-4 text-red-400" />
        <h3 className="text-red-400 font-semibold text-sm">Danger Zone</h3>
      </div>
      <div className="px-5">
        {actions.map((action) => (
          <DangerItem key={action.title} action={action} repoName={repoName} />
        ))}
      </div>
    </div>
  );
}
