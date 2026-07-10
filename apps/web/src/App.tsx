import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import { useLanguage } from './contexts/LanguageContext';

function AppContent() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0B0E14' }}>
      <Navigation />
      
      {/* Hero section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-[#3B5BFE] to-[#8B3BFE] bg-clip-text text-transparent">
            {t('hero.title')}
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            {t('hero.subtitle')}
          </p>
          <div className="flex justify-center space-x-4">
            <a
              href="/signup"
              className="bg-gradient-to-r from-[#3B5BFE] to-[#8B3BFE] text-white px-8 py-3 rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              {t('nav.signUp')}
            </a>
            <a
              href="/explore"
              className="border border-gray-600 text-gray-300 px-8 py-3 rounded-md font-medium hover:border-gray-500 hover:text-white transition-colors"
            >
              {t('nav.explore')}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
