import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/auth/ProtectedRoute';
// Pages
import Home from './pages/Home';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import TwoFactorVerify from './pages/auth/TwoFactorVerify';
import ResetPassword from './pages/auth/ResetPassword';
import ProfilePage from './pages/profile/ProfilePage';
import SettingsLayout from './pages/settings/SettingsLayout';
import ProfileSettings from './pages/settings/ProfileSettings';
import SecuritySettings from './pages/settings/SecuritySettings';
import SSHKeySettings from './pages/settings/SSHKeySettings';
import GPGKeySettings from './pages/settings/GPGKeySettings';
import PATSettings from './pages/settings/PATSettings';

function AppShell() {
  return (
    <div className="min-h-screen bg-navy-900">
      <Navigation />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/auth/signin" element={<SignIn />} />
        <Route path="/auth/signup" element={<SignUp />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/2fa" element={<TwoFactorVerify />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />

        {/* Profile — public */}
        <Route path="/:username" element={<ProfilePage />} />

        {/* Settings — protected */}
        <Route path="/settings" element={<ProtectedRoute><SettingsLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/settings/profile" replace />} />
          <Route path="profile"   element={<ProfileSettings />} />
          <Route path="security"  element={<SecuritySettings />} />
          <Route path="ssh-keys"  element={<SSHKeySettings />} />
          <Route path="gpg-keys"  element={<GPGKeySettings />} />
          <Route path="tokens"    element={<PATSettings />} />
          <Route path="oauth-apps" element={<div className="text-gray-500 text-sm py-12 text-center">OAuth Apps — Phase 14</div>} />
        </Route>

        {/* Placeholders for later phases */}
        <Route path="/explore"       element={<div className="min-h-screen bg-navy-900 flex items-center justify-center text-gray-600">Explore — Phase 5</div>} />
        <Route path="/repositories"  element={<div className="min-h-screen bg-navy-900 flex items-center justify-center text-gray-600">Repositories — Phase 2</div>} />
        <Route path="/new"           element={<div className="min-h-screen bg-navy-900 flex items-center justify-center text-gray-600">New Repository — Phase 2</div>} />
        <Route path="/search"        element={<div className="min-h-screen bg-navy-900 flex items-center justify-center text-gray-600">Search — Phase 8</div>} />
        <Route path="/:username/:repo" element={<div className="min-h-screen bg-navy-900 flex items-center justify-center text-gray-600">Repository — Phase 2–4</div>} />

        {/* 404 */}
        <Route path="*" element={<div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center gap-4"><p className="text-gray-400 text-xl">404 — Page not found</p><a href="/" className="text-accent-start hover:underline text-sm">Go home</a></div>} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
