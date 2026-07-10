# Phase 1: Authentication & User Profiles - Implementation Plan

## Overview
Phase 1 implements the core authentication system and user profile functionality for DTS Code Hub. This phase establishes user identity management, secure authentication flows, and the foundation for all user-centric features.

## Scope
- Email/password authentication via Supabase Auth
- OAuth providers (GitHub, Google)
- User profile database schema
- Auth API endpoints
- Auth UI components
- Protected routes and auth context
- User profile pages
- Profile README rendering
- Contribution heatmap
- Streaks and achievement badges
- 2FA support
- SSH/GPG key management
- OAuth apps management
- Personal Access Tokens (PATs)

---

## Database Schema

### Supabase Auth Tables (Built-in)
- `auth.users` - User accounts managed by Supabase
- `auth.sessions` - User sessions
- `auth.identities` - OAuth identities

### Custom Tables

#### `profiles`
```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  website TEXT,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `ssh_keys`
```sql
CREATE TABLE public.ssh_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  key_text TEXT NOT NULL,
  fingerprint TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);
```

#### `gpg_keys`
```sql
CREATE TABLE public.gpg_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  key_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `oauth_apps`
```sql
CREATE TABLE public.oauth_apps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  client_id TEXT UNIQUE NOT NULL,
  client_secret TEXT NOT NULL,
  redirect_uris TEXT[] NOT NULL,
  scopes TEXT[] DEFAULT [],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `personal_access_tokens`
```sql
CREATE TABLE public.personal_access_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] DEFAULT [],
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `two_factor_secrets`
```sql
CREATE TABLE public.two_factor_secrets (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  secret TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  backup_codes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `achievements`
```sql
CREATE TABLE public.achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);
```

#### `contributions`
```sql
CREATE TABLE public.contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  repository_id UUID,
  contribution_type TEXT NOT NULL, -- 'commit', 'pr', 'issue', 'review'
  contribution_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## API Endpoints

### Authentication (`/api/auth`)
- `POST /signup` - Register new user with email/password
- `POST /login` - Login with email/password
- `POST /logout` - Logout current session
- `GET /session` - Get current session
- `POST /oauth/github` - Initiate GitHub OAuth
- `POST /oauth/google` - Initiate Google OAuth
- `GET /oauth/callback` - OAuth callback handler
- `POST /reset-password` - Request password reset
- `POST /confirm-reset` - Confirm password reset with token

### User Profile (`/api/users`)
- `GET /users/:username` - Get public profile
- `GET /users/:username/repos` - Get user's repositories
- `PUT /users/me` - Update current user profile
- `POST /users/me/avatar` - Upload avatar
- `GET /users/me/readme` - Get profile README
- `PUT /users/me/readme` - Update profile README

### 2FA (`/api/2fa`)
- `POST /2fa/setup` - Generate TOTP secret
- `POST /2fa/verify` - Verify TOTP code
- `POST /2fa/disable` - Disable 2FA
- `GET /2fa/backup-codes` - Get backup codes

### SSH Keys (`/api/ssh-keys`)
- `GET /ssh-keys` - List user's SSH keys
- `POST /ssh-keys` - Add new SSH key
- `DELETE /ssh-keys/:id` - Delete SSH key

### GPG Keys (`/api/gpg-keys`)
- `GET /gpg-keys` - List user's GPG keys
- `POST /gpg-keys` - Add new GPG key
- `DELETE /gpg-keys/:id` - Delete GPG key

### OAuth Apps (`/api/oauth-apps`)
- `GET /oauth-apps` - List user's OAuth apps
- `POST /oauth-apps` - Create new OAuth app
- `PUT /oauth-apps/:id` - Update OAuth app
- `DELETE /oauth-apps/:id` - Delete OAuth app

### Personal Access Tokens (`/api/pat`)
- `GET /pat` - List user's PATs
- `POST /pat` - Create new PAT
- `DELETE /pat/:id` - Delete PAT

### Achievements (`/api/achievements`)
- `GET /achievements/:username` - Get user's achievements
- `POST /achievements/:username/:badge` - Award achievement (admin)

### Contributions (`/api/contributions`)
- `GET /contributions/:username` - Get user's contribution history
- `POST /contributions` - Record a contribution (internal)

---

## UI Components

### Auth Components
- `LoginForm` - Email/password login form
- `SignupForm` - Registration form with validation
- `OAuthButtons` - GitHub and Google OAuth buttons
- `ForgotPasswordForm` - Password reset request
- `ResetPasswordForm` - New password entry
- `AuthLayout` - Auth page wrapper with branding

### Profile Components
- `ProfileHeader` - User avatar, name, bio, stats
- `ProfileTabs` - Repositories, Stars, Followers, Following tabs
- `ProfileReadme` - Rendered profile README.md
- `ContributionHeatmap` - GitHub-style contribution graph
- `AchievementBadges` - Display earned badges
- `StreakCounter` - Current contribution streak

### Settings Components
- `ProfileSettingsForm` - Edit profile information
- `AvatarUpload` - Avatar upload with preview
- `2FASetup` - TOTP setup wizard
- `SSHKeyManager` - List, add, delete SSH keys
- `GPGKeyManager` - List, add, delete GPG keys
- `OAuthAppManager` - Manage OAuth applications
- `PATManager` - Create and manage PATs

### Navigation Components
- `AuthButton` - Login/Logout button in nav
- `UserMenu` - Dropdown with profile, settings, logout
- `ProtectedRoute` - Route wrapper requiring auth

---

## Implementation Order

### 1. Database Schema & Prisma (High Priority)
- Create all custom tables in Supabase
- Update Prisma schema
- Run migrations
- Set up RLS policies

### 2. Auth API Endpoints (High Priority)
- Implement Supabase Auth integration
- Create signup/login/logout endpoints
- Add OAuth callback handlers
- Implement session management
- Add password Reset flow

### 3. Auth UI Components (High Priority)
- Create login and signup forms
- Add OAuth buttons
- Implement auth layout
- Add form validation
- Handle auth errors

### 4. Protected Routes & Auth Context (High Priority)
- Create AuthContext for session state
- Implement ProtectedRoute component
- Add auth state persistence
- Handle session refresh

### 5. User Profile Schema & API (High Priority)
- Create profiles table
- Implement profile CRUD endpoints
- Add avatar upload
- Implement profile README

### 6. Profile UI (Medium Priority)
- Build profile page layout
- Create profile header component
- Add profile tabs
- Implement profile settings form

### 7. Contribution Tracking (Medium Priority)
- Create contributions table
- Implement contribution recording API
- Build contribution heatmap component
- Add streak calculation logic

### 8. Achievements System (Medium Priority)
- Create achievements table
- Define badge types and criteria
- Implement achievement awarding logic
- Build badge display component

### 9. Profile README (Medium Priority)
- Set up profile README storage
- Implement markdown rendering
- Add README editing UI

### 10. 2FA Support (Low Priority)
- Create 2FA secrets table
- Implement TOTP setup endpoint
- Add 2FA verification
- Build 2FA setup UI

### 11. SSH Key Management (Low Priority)
- Create SSH keys table
- Implement key fingerprinting
- Build SSH key CRUD API
- Create SSH key management UI

### 12. GPG Key Management (Low Priority)
- Create GPG keys table
- Implement key parsing
- Build GPG key CRUD API
- Create GPG key management UI

### 13. OAuth Apps Management (Low Priority)
- Create OAuth apps table
- Implement app CRUD API
- Add client ID/secret generation
- Build OAuth apps management UI

### 14. Personal Access Tokens (Low Priority)
- Create PAT table
- Implement token generation and hashing
- Build PAT CRUD API
- Create PAT management UI

---

## Technical Details

### Supabase Auth Integration
- Use Supabase Auth for user management
- Leverage built-in OAuth providers
- Implement custom JWT claims for roles
- Use Supabase session management

### Password Security
- Supabase handles password hashing
- Implement rate limiting on auth endpoints
- Add CAPTCHA for signup (optional)
- Implement password strength validation

### Session Management
- Store session in localStorage
- Implement auto-refresh tokens
- Handle session expiration gracefully
- Add session persistence across tabs

### Avatar Storage
- Store avatars in Supabase Storage
- Use public URLs for display
- Implement image optimization
- Support avatar deletion

### Contribution Heatmap
- Store daily contribution counts
- Calculate using date ranges
- Render as SVG grid
- Support year selection

### Achievement Badges
- Define badge criteria in config
- Check criteria on relevant events
- Award badges asynchronously
- Display in profile header

### 2FA Implementation
- Use `otplib` for TOTP
- Generate QR codes for setup
- Store encrypted secrets
- Implement backup codes

### SSH Key Security
- Validate SSH key format
- Extract fingerprint using `ssh-keygen`
- Store only public keys
- Implement key usage tracking

### GPG Key Security
- Validate GPG key format
- Extract key ID
- Store only public keys
- Implement key verification

### OAuth Apps
- Generate secure client IDs/secrets
- Validate redirect URIs
- Implement scope management
- Add app revocation

### PAT Security
- Hash tokens using bcrypt
- Implement token expiration
- Track last used timestamp
- Support token revocation

---

## Dependencies to Add

### Backend
```json
{
  "dependencies": {
    "otplib": "^12.0.1",
    "qrcode": "^1.5.3",
    "bcrypt": "^5.1.1",
    "node-sshkey-parser": "^1.0.0",
    "openpgp": "^5.11.0"
  }
}
```

### Frontend
```json
{
  "dependencies": {
    "@supabase/auth-ui-react": "^0.4.7",
    "@supabase/auth-helpers-react": "^0.5.0",
    "react-hot-toast": "^2.4.1",
    "qrcode.react": "^3.1.0",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "rehype-highlight": "^7.0.0"
  }
}
```

---

## RLS Policies

### Profiles
```sql
-- Public read access
CREATE POLICY "Profiles are public" ON profiles FOR SELECT USING (true);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE 
USING (auth.uid() = id);
```

### SSH Keys
```sql
-- Users can only see their own keys
CREATE POLICY "Users can see own SSH keys" ON ssh_keys FOR SELECT 
USING (auth.uid() IN (SELECT id FROM profiles WHERE id = user_id));

-- Users can manage their own keys
CREATE POLICY "Users can manage own SSH keys" ON ssh_keys FOR ALL 
USING (auth.uid() IN (SELECT id FROM profiles WHERE id = user_id));
```

### PAT
```sql
-- Users can only see their own tokens
CREATE POLICY "Users can see own PATs" ON personal_access_tokens FOR SELECT 
USING (auth.uid() IN (SELECT id FROM profiles WHERE id = user_id));

-- Users can manage their own tokens
CREATE POLICY "Users can manage own PATs" ON personal_access_tokens FOR ALL 
USING (auth.uid() IN (SELECT id FROM profiles WHERE id = user_id));
```

---

## Testing Strategy

### Unit Tests
- Auth endpoint logic
- Profile CRUD operations
- 2FA TOTP generation/verification
- SSH/GPG key parsing
- Token hashing/validation

### Integration Tests
- Full auth flow (signup → login → logout)
- OAuth flow (redirect → callback → session)
- Profile creation and updates
- Contribution recording
- Achievement awarding

### E2E Tests
- User registration flow
- Profile page rendering
- Settings navigation
- SSH key addition
- PAT creation

---

## Success Criteria

- Users can sign up with email/password
- Users can log in with email/password
- Users can authenticate via GitHub OAuth
- Users can authenticate via Google OAuth
- Users can view and edit their profile
- Users can upload an avatar
- Users can view their contribution heatmap
- Users can see their achievement badges
- Users can enable/disable 2FA
- Users can manage SSH keys
- Users can manage GPG keys
- Users can create OAuth apps
- Users can create and revoke PATs
- All auth flows are secure and validated
- RLS policies properly restrict access
- UI is dark-themed with SVG icons
- Bilingual support (EN/FR) for auth pages

---

## Dependencies on Previous Phases
- Phase 0: Monorepo structure, Supabase setup, base UI shell, bilingual toggle

## What Will Be Stubbed/Mocked
- Actual repository contributions (will be populated in Phase 2-4)
- Some achievement criteria (will be implemented in later phases)
- OAuth app authorization flow (basic CRUD only)

## Next Phase Dependencies
- Phase 2 will use user profiles for repository ownership
- Phase 3 will use SSH keys for git authentication
- Phase 6 will use contribution tracking for issues
