import { Link } from 'react-router-dom';
import { GitBranch, Users, Star, Shield, Zap, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';

const FEATURES = [
  { icon: GitBranch, title: 'Version Control',       desc: 'Full git support — push, pull, clone, merge from your terminal.' },
  { icon: Users,     title: 'Collaboration',          desc: 'Issues, pull requests, code reviews, and team discussions.' },
  { icon: Star,      title: 'Discover',               desc: 'Explore trending repositories and connect with developers.' },
  { icon: Shield,    title: 'Secure',                 desc: 'SSH/GPG keys, 2FA, branch protection, and secret scanning.' },
  { icon: Zap,       title: 'CI/CD Pipelines',        desc: 'Automate builds, tests, and deployments with workflow files.' },
  { icon: Globe,     title: 'Bilingual',              desc: 'Full English and French support site-wide.' },
];

export default function Home() {
  const { t } = useLanguage();
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(ellipse at center, #3B5BFE 0%, transparent 70%)' }} />
        </div>

        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-24 text-center relative">
          <div className="flex justify-center mb-8">
            <Logo className="w-24 h-24" />
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4 leading-tight">
            <span className="bg-gradient-to-r from-accent-start to-accent-end bg-clip-text text-transparent">
              DTS
            </span>{' '}
            Code Hub
          </h1>

          <p className="text-xl text-gray-400 mb-3 font-medium tracking-wide">
            {t('hero.title')}
          </p>

          <p className="text-gray-500 text-base mb-10 max-w-xl mx-auto">
            {t('hero.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {session ? (
              <Link
                to="/explore"
                className="px-8 py-3 rounded-xl text-white font-semibold text-base transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
              >
                {t('hero.explore')}
              </Link>
            ) : (
              <>
                <Link
                  to="/auth/signup"
                  className="px-8 py-3 rounded-xl text-white font-semibold text-base transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
                >
                  {t('hero.getStarted')}
                </Link>
                <Link
                  to="/explore"
                  className="px-8 py-3 rounded-xl border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white font-semibold text-base transition-colors"
                >
                  {t('hero.explore')}
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-white text-3xl font-bold text-center mb-12">Everything you need to build great software</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-navy-800 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors group">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors"
                style={{ background: 'linear-gradient(135deg, #3B5BFE22, #8B3BFE22)', border: '1px solid #3B5BFE33' }}>
                <Icon className="w-5 h-5 text-accent-start" />
              </div>
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!session && (
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-12 pb-20">
          <div className="bg-navy-800 border border-gray-800 rounded-2xl p-10 text-center"
            style={{ background: 'linear-gradient(135deg, #0f1320, #131828)' }}>
            <h2 className="text-white text-3xl font-bold mb-3">Ready to start building?</h2>
            <p className="text-gray-500 mb-8">Join DTS Code Hub and start collaborating today.</p>
            <Link
              to="/auth/signup"
              className="inline-block px-8 py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' }}
            >
              Create free account
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
