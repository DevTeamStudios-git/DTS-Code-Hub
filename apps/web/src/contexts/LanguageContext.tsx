import { createContext, useContext, useState, type ReactNode } from 'react';

type Language = 'en' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    'nav.home': 'Home',
    'nav.explore': 'Explore',
    'nav.repositories': 'Repositories',
    'nav.issues': 'Issues',
    'nav.pullRequests': 'Pull Requests',
    'nav.wiki': 'Wiki',
    'nav.signIn': 'Sign In',
    'nav.signUp': 'Sign Up',
    'nav.search': 'Search...',
    'hero.title': 'Build • Collaborate • Innovate',
    'hero.subtitle': 'A self-hosted GitHub clone by Development Team Studios',
  },
  fr: {
    'nav.home': 'Accueil',
    'nav.explore': 'Explorer',
    'nav.repositories': 'Dépôts',
    'nav.issues': 'Tickets',
    'nav.pullRequests': 'Pull Requests',
    'nav.wiki': 'Wiki',
    'nav.signIn': 'Connexion',
    'nav.signUp': 'Inscription',
    'nav.search': 'Rechercher...',
    'hero.title': 'Construire • Collaborer • Innover',
    'hero.subtitle': 'Un clone GitHub auto-hébergé par Development Team Studios',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
