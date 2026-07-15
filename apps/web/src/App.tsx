import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }     from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Navigation           from './components/Navigation';
import ProtectedRoute       from './components/auth/ProtectedRoute';

// Auth
import SignIn          from './pages/auth/SignIn';
import SignUp          from './pages/auth/SignUp';
import ForgotPassword  from './pages/auth/ForgotPassword';
import ResetPassword   from './pages/auth/ResetPassword';
import TwoFactorVerify from './pages/auth/TwoFactorVerify';
import Callback         from './pages/auth/Callback';

// Profile
import ProfilePage from './pages/profile/ProfilePage';

// Settings
import SettingsLayout           from './pages/settings/SettingsLayout';
import ProfileSettings          from './pages/settings/ProfileSettings';
import SecuritySettings         from './pages/settings/SecuritySettings';
import SSHKeySettings           from './pages/settings/SSHKeySettings';
import GPGKeySettings           from './pages/settings/GPGKeySettings';
import PATSettings              from './pages/settings/PATSettings';
import BranchProtectionSettings from './pages/settings/BranchProtectionSettings';

// Repo — Phase 2
import NewRepoPage       from './pages/repo/NewRepoPage';
import UploadProjectPage from './pages/repo/UploadProjectPage';
import RepoHomePage      from './pages/repo/RepoHomePage';
import RepoSettingsPage  from './pages/repo/RepoSettingsPage';
import ForkPage          from './pages/repo/ForkPage';
import ExplorePage       from './pages/repo/ExplorePage';

// Repo — Phase 3
import CommitsPage      from './pages/repo/CommitsPage';
import CommitDetailPage from './pages/repo/CommitDetailPage';
import BranchesPage     from './pages/repo/BranchesPage';

// Repo — Phase 4
import FileTreePage    from './pages/repo/FileTreePage';
import FileBlobPage    from './pages/repo/FileBlobPage';
import FileEditPage    from './pages/repo/FileEditPage';
import ComparePage     from './pages/repo/ComparePage';
import RepoSearchPage  from './pages/repo/RepoSearchPage';

// Landing
import Home from './pages/Home';

const P = ({ label }: { label: string }) => (
  <div className="min-h-screen bg-navy-900 flex items-center justify-center">
    <p className="text-gray-600">{label}</p>
  </div>
);

function AppShell() {
  return (
    <div className="min-h-screen bg-navy-900">
      <Navigation />
      <Routes>
        {/* ── Public ──────────────────────────────────────────── */}
        <Route path="/"                     element={<Home />} />
        <Route path="/explore"              element={<ExplorePage />} />
        <Route path="/auth/signin"          element={<SignIn />} />
        <Route path="/auth/signup"          element={<SignUp />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password"  element={<ResetPassword />} />
        <Route path="/auth/2fa"             element={<TwoFactorVerify />} />
        <Route path="/auth/callback"        element={<Callback />} />

        {/* ── New repo ────────────────────────────────────────── */}
        <Route path="/new"        element={<ProtectedRoute><NewRepoPage /></ProtectedRoute>} />
        <Route path="/new/upload" element={<ProtectedRoute><UploadProjectPage /></ProtectedRoute>} />

        {/* ── Global settings ─────────────────────────────────── */}
        <Route path="/settings" element={<ProtectedRoute><SettingsLayout /></ProtectedRoute>}>
          <Route index           element={<Navigate to="/settings/profile" replace />} />
          <Route path="profile"  element={<ProfileSettings />} />
          <Route path="security" element={<SecuritySettings />} />
          <Route path="ssh-keys" element={<SSHKeySettings />} />
          <Route path="gpg-keys" element={<GPGKeySettings />} />
          <Route path="tokens"   element={<PATSettings />} />
          <Route path="oauth-apps" element={<P label="OAuth Apps — Phase 14" />} />
        </Route>

        {/* ── Repo settings ───────────────────────────────────── */}
        <Route path="/:username/:repo/settings"          element={<ProtectedRoute><RepoSettingsPage /></ProtectedRoute>} />
        <Route path="/:username/:repo/settings/branches" element={<ProtectedRoute><BranchProtectionSettings /></ProtectedRoute>} />

        {/* ── Repo actions ────────────────────────────────────── */}
        <Route path="/:username/:repo/fork"    element={<ProtectedRoute><ForkPage /></ProtectedRoute>} />

        {/* ── Phase 3 — git history & branches ────────────────── */}
        <Route path="/:username/:repo/commits/:branch" element={<CommitsPage />} />
        <Route path="/:username/:repo/commit/:sha"     element={<CommitDetailPage />} />
        <Route path="/:username/:repo/branches"        element={<BranchesPage />} />

        {/* ── Phase 4 — file browser ──────────────────────────── */}
        {/* Tree (directory listing) */}
        <Route path="/:username/:repo/tree/:branch"    element={<FileTreePage />} />
        <Route path="/:username/:repo/tree/:branch/*"  element={<FileTreePage />} />

        {/* Blob (file view) */}
        <Route path="/:username/:repo/blob/:branch/*"  element={<FileBlobPage />} />

        {/* Edit (in-browser editor) — owner only */}
        <Route path="/:username/:repo/edit/:branch/*"  element={<ProtectedRoute><FileEditPage /></ProtectedRoute>} />

        {/* Compare */}
        <Route path="/:username/:repo/compare"         element={<ComparePage />} />
        <Route path="/:username/:repo/compare/*"       element={<ComparePage />} />

        {/* In-repo search */}
        <Route path="/:username/:repo/search"          element={<RepoSearchPage />} />

        {/* ── Phase 5+ stubs ──────────────────────────────────── */}
        <Route path="/:username/:repo/issues"            element={<P label="Issues — Phase 6" />} />
        <Route path="/:username/:repo/issues/:number"    element={<P label="Issue detail — Phase 6" />} />
        <Route path="/:username/:repo/pulls"             element={<P label="Pull Requests — Phase 7" />} />
        <Route path="/:username/:repo/pull/:number"      element={<P label="PR detail — Phase 7" />} />
        <Route path="/:username/:repo/wiki"              element={<P label="Wiki — Phase 9" />} />
        <Route path="/:username/:repo/discussions"       element={<P label="Discussions — Phase 8" />} />
        <Route path="/:username/:repo/releases"          element={<P label="Releases — Phase 8" />} />

        {/* ── Repo home ───────────────────────────────────────── */}
        <Route path="/:username/:repo" element={<RepoHomePage />} />

        {/* ── User profile ────────────────────────────────────── */}
        <Route path="/:username" element={<ProfilePage />} />

        {/* ── 404 ─────────────────────────────────────────────── */}
        <Route path="*" element={
          <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center gap-4">
            <p className="text-white text-4xl font-bold">404</p>
            <p className="text-gray-500">Page not found</p>
            <a href="/" className="text-accent-start hover:underline text-sm">Go home</a>
          </div>
        } />
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
