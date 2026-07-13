import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, ChevronDown, Search, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';

interface Branch {
  name: string;
  isCurrent: boolean;
  isDefault: boolean;
  isProtected: boolean;
}

interface Props {
  username: string;
  repoName: string;
  currentBranch: string;
  /** Callback when a different branch is selected, or pass navigateTo pattern */
  navigateTo?: (branch: string) => string;
  onChange?: (branch: string) => void;
}

export default function BranchSelector({ username, repoName, currentBranch, navigateTo, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchBranches = () => {
    if (branches.length > 0) return;
    setLoading(true);
    api.get<{ branches: Branch[] }>(`/api/repos/${username}/${repoName}/branches`)
      .then(d => setBranches(d.branches))
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  };

  const handleSelect = (branchName: string) => {
    setOpen(false);
    setSearch('');
    if (branchName === currentBranch) return;
    if (onChange) onChange(branchName);
    if (navigateTo) navigate(navigateTo(branchName));
  };

  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); fetchBranches(); }}
        className="flex items-center gap-2 bg-navy-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
      >
        <GitBranch className="w-3.5 h-3.5 text-gray-500" />
        <span className="font-mono">{currentBranch}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-navy-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Find a branch..."
                className="w-full bg-navy-900 border border-gray-700 rounded-md py-1.5 pl-8 pr-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-accent-start"
              />
            </div>
          </div>

          {/* Branch list */}
          <div className="max-h-60 overflow-y-auto py-1">
            {loading ? (
              <div className="text-center py-4">
                <div className="w-4 h-4 border-2 border-accent-start border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">No branches found</p>
            ) : (
              filtered.map(b => (
                <button
                  key={b.name}
                  onClick={() => handleSelect(b.name)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors ${
                    b.name === currentBranch
                      ? 'bg-accent-start/10 text-white'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <GitBranch className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                    <span className="font-mono text-xs truncate">{b.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {b.isDefault && (
                      <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">default</span>
                    )}
                    {b.isProtected && (
                      <ShieldCheck className="w-3 h-3 text-yellow-500" title="Protected branch" />
                    )}
                    {b.name === currentBranch && (
                      <span className="text-[10px] text-accent-start">✓</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
