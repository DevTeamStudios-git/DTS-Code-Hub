import { Search, Globe } from 'lucide-react';
import Logo from './Logo';
import { useLanguage } from '../contexts/LanguageContext';

export default function Navigation() {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fr' : 'en');
  };

  return (
    <nav className="bg-navy-800 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center space-x-3">
            <Logo className="w-8 h-8" />
            <span className="text-white font-semibold text-lg">DTS Code Hub</span>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={t('nav.search')}
                className="w-full bg-navy-900 border border-gray-700 rounded-md py-1.5 pl-10 pr-4 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-start focus:border-transparent"
              />
            </div>
          </div>

          {/* Navigation links */}
          <div className="flex items-center space-x-6">
            <a href="/" className="text-gray-300 hover:text-white text-sm transition-colors">
              {t('nav.home')}
            </a>
            <a href="/explore" className="text-gray-300 hover:text-white text-sm transition-colors">
              {t('nav.explore')}
            </a>
            <a href="/repositories" className="text-gray-300 hover:text-white text-sm transition-colors">
              {t('nav.repositories')}
            </a>
            <a href="/issues" className="text-gray-300 hover:text-white text-sm transition-colors">
              {t('nav.issues')}
            </a>

            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors"
              title={language === 'en' ? 'Switch to French' : 'Switch to English'}
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{language.toUpperCase()}</span>
            </button>

            {/* Auth buttons */}
            <div className="flex items-center space-x-3">
              <a href="/signin" className="text-gray-300 hover:text-white text-sm transition-colors">
                {t('nav.signIn')}
              </a>
              <a
                href="/signup"
                className="bg-gradient-to-r from-accent-start to-accent-end text-white px-4 py-1.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {t('nav.signUp')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
