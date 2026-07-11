import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Globe, Plus, ChevronDown, User, Settings, LogOut, GitBranch } from 'lucide-react';
import Logo from './Logo';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export default function Navigation() {
  const { language, setLanguage, t } = useLanguage();
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <nav className="bg-navy-800 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* Left: Logo + search */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <Logo className="w-7 h-7" />
              <span className="hidden sm:block text-white font-semibold text-base">DTS Code Hub</span>
            </Link>

            <form onSubmit={handleSearch} className="flex-1 max-w-sm hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('nav.search')}
                  className="w-full bg-navy-900 border border-gray-700 rounded-md py-1.5 pl-9 pr-3 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-accent-start focus:border-accent-start transition-colors"
                />
              </div>
            </form>
          </div>

          {/* Right: nav links + actions */}
          <div className="flex items-center gap-1 sm:gap-2">

            {session ? (
              <>
                <Link to="/explore" className="hidden lg:block text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors">
                  {t('nav.explore')}
                </Link>

                {/* New repo button */}
                <Link
                  to="/new"
                  className="hidden sm:flex items-center gap-1 text-gray-400 hover:text-white text-sm px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </Link>

                {/* Language toggle */}
                <button
                  onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white text-sm px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors"
                  title={language === 'en' ? 'Switch to French' : 'Switch to English'}
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-medium">{language.toUpperCase()}</span>
                </button>

                {/* User menu */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setUserMenuOpen(o => !o)}
                    className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-md hover:bg-white/5 transition-colors"
                  >
                    {profile?.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.username} className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-start to-accent-end flex items-center justify-center text-white text-xs font-bold">
                        {profile?.username?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-navy-800 border border-gray-700 rounded-lg shadow-xl py-1 z-50">
                      <div className="px-3 py-2 border-b border-gray-700">
                        <p className="text-white text-sm font-medium">{profile?.displayName ?? profile?.username}</p>
                        <p className="text-gray-500 text-xs">@{profile?.username}</p>
                      </div>

                      <Link
                        to={`/${profile?.username}`}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 text-sm transition-colors"
                      >
                        <User className="w-4 h-4" />
                        {t('nav.yourProfile')}
                      </Link>
                      <Link
                        to="/settings/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 text-sm transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        {t('nav.settings')}
                      </Link>
                      <Link
                        to="/repositories"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 text-sm transition-colors"
                      >
                        <GitBranch className="w-4 h-4" />
                        {t('nav.repositories')}
                      </Link>

                      <div className="border-t border-gray-700 mt-1 pt-1">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 text-sm transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          {t('nav.signOut')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white text-sm px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-medium">{language.toUpperCase()}</span>
                </button>
                <Link to="/explore" className="hidden sm:block text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors">
                  {t('nav.explore')}
                </Link>
                <Link to="/auth/signin" className="text-gray-300 hover:text-white text-sm px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors">
                  {t('nav.signIn')}
                </Link>
                <Link
                  to="/auth/signup"
                  className="text-white text-sm px-4 py-1.5 rounded-md font-medium transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
                >
                  {t('nav.signUp')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
