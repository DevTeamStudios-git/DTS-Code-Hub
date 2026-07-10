-- Phase 1: Authentication & User Profiles
-- This migration creates the database schema for user profiles, SSH keys, GPG keys, 
-- OAuth apps, personal access tokens, 2FA secrets, achievements, and contributions.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table (extends Supabase auth.users)
-- Note: The auth.users table is managed by Supabase, not by this migration
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
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

-- SSH Keys table
CREATE TABLE IF NOT EXISTS public.ssh_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  key_text TEXT NOT NULL,
  fingerprint TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- GPG Keys table
CREATE TABLE IF NOT EXISTS public.gpg_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  key_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth Apps table
CREATE TABLE IF NOT EXISTS public.oauth_apps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  client_id TEXT UNIQUE NOT NULL,
  client_secret TEXT NOT NULL,
  redirect_uris TEXT[] NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Personal Access Tokens table
CREATE TABLE IF NOT EXISTS public.personal_access_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Two Factor Secrets table
CREATE TABLE IF NOT EXISTS public.two_factor_secrets (
  user_id UUID PRIMARY KEY,
  secret TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  backup_codes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Contributions table
CREATE TABLE IF NOT EXISTS public.contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  repository_id UUID,
  contribution_type TEXT NOT NULL, -- 'commit', 'pr', 'issue', 'review'
  contribution_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_ssh_keys_user_id ON public.ssh_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_ssh_keys_fingerprint ON public.ssh_keys(fingerprint);
CREATE INDEX IF NOT EXISTS idx_gpg_keys_user_id ON public.gpg_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_gpg_keys_key_id ON public.gpg_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_oauth_apps_user_id ON public.oauth_apps(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_apps_client_id ON public.oauth_apps(client_id);
CREATE INDEX IF NOT EXISTS idx_pat_user_id ON public.personal_access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_pat_token_hash ON public.personal_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_badge_type ON public.achievements(badge_type);
CREATE INDEX IF NOT EXISTS idx_contributions_user_id ON public.contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_date ON public.contributions(contribution_date);
CREATE INDEX IF NOT EXISTS idx_contributions_repo_id ON public.contributions(repository_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ssh_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpg_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.two_factor_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Profiles
CREATE POLICY "Profiles are publicly readable" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for SSH Keys
CREATE POLICY "Users can see own SSH keys" ON public.ssh_keys
  FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

CREATE POLICY "Users can insert own SSH keys" ON public.ssh_keys
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

CREATE POLICY "Users can update own SSH keys" ON public.ssh_keys
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

CREATE POLICY "Users can delete own SSH keys" ON public.ssh_keys
  FOR DELETE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

-- RLS Policies for GPG Keys
CREATE POLICY "Users can see own GPG keys" ON public.gpg_keys
  FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

CREATE POLICY "Users can insert own GPG keys" ON public.gpg_keys
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

CREATE POLICY "Users can update own GPG keys" ON public.gpg_keys
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

CREATE POLICY "Users can delete own GPG keys" ON public.gpg_keys
  FOR DELETE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

-- RLS Policies for OAuth Apps
CREATE POLICY "Users can see own OAuth apps" ON public.oauth_apps
  FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

CREATE POLICY "Users can insert own OAuth apps" ON public.oauth_apps
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

CREATE POLICY "Users can update own OAuth apps" ON public.oauth_apps
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

CREATE POLICY "Users can delete own OAuth apps" ON public.oauth_apps
  FOR DELETE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

-- RLS Policies for Personal Access Tokens
CREATE POLICY "Users can see own PATs" ON public.personal_access_tokens
  FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

CREATE POLICY "Users can insert own PATs" ON public.personal_access_tokens
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

CREATE POLICY "Users can update own PATs" ON public.personal_access_tokens
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

CREATE POLICY "Users can delete own PATs" ON public.personal_access_tokens
  FOR DELETE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

-- RLS Policies for Two Factor Secrets
CREATE POLICY "Users can see own 2FA secret" ON public.two_factor_secrets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 2FA secret" ON public.two_factor_secrets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own 2FA secret" ON public.two_factor_secrets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own 2FA secret" ON public.two_factor_secrets
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Achievements
CREATE POLICY "Achievements are publicly readable" ON public.achievements
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own achievements" ON public.achievements
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

-- RLS Policies for Contributions
CREATE POLICY "Contributions are publicly readable" ON public.contributions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own contributions" ON public.contributions
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

-- Function to automatically create profile on user signup
-- Note: This will be called by Supabase Auth hooks, not by a trigger
-- The trigger approach is removed since auth.users is managed by Supabase
CREATE OR REPLACE FUNCTION public.handle_new_user(user_id UUID, user_email TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    user_id,
    split_part(user_email, '@', 1),
    split_part(user_email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
