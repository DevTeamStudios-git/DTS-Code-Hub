import { NavLink, Outlet } from 'react-router-dom';
import { User, Shield, Key, FileKey, Cpu, Lock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const NAV_ITEMS = [
  { to: '/settings/profile',    icon: User,    labelKey: 'settings.profile' },
  { to: '/settings/security',   icon: Shield,  labelKey: 'settings.security' },
  { to: '/settings/ssh-keys',   icon: Key,     labelKey: 'settings.sshKeys' },
  { to: '/settings/gpg-keys',   icon: FileKey, labelKey: 'settings.gpgKeys' },
  { to: '/settings/tokens',     icon: Lock,    labelKey: 'settings.tokens' },
  { to: '/settings/oauth-apps', icon: Cpu,     labelKey: 'settings.oauthApps' },
];

export default function SettingsLayout() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-white text-2xl font-bold mb-8">Settings</h1>
        <div className="flex flex-col sm:flex-row gap-8">

          {/* Sidebar */}
          <nav className="sm:w-52 shrink-0">
            <ul className="space-y-0.5">
              {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-accent-start/10 text-white font-medium'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {t(labelKey)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
