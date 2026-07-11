-- ============================================================
-- DTS Code Hub — Phase 1 Migration
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- Enable UUID extension (usually already enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users (profiles linked to Supabase Auth) ─────────────────
CREATE TABLE IF NOT EXISTS public."User" (
  id              TEXT PRIMARY KEY,   -- Supabase auth user UUID
  username        TEXT UNIQUE NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  "displayName"   TEXT,
  bio             TEXT,
  "avatarUrl"     TEXT,
  location        TEXT,
  website         TEXT,
  company         TEXT,
  language        TEXT NOT NULL DEFAULT 'en',
  "profileReadme" TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SSH Keys ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public."SSHKey" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  "keyText"   TEXT NOT NULL,
  fingerprint TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastUsedAt" TIMESTAMPTZ
);

-- ── GPG Keys ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public."GPGKey" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "keyId"     TEXT NOT NULL,
  "publicKey" TEXT NOT NULL,
  "keyName"   TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── OAuth Apps ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public."OAuthApp" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"      TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  "clientId"    TEXT UNIQUE NOT NULL,
  "clientSecret" TEXT NOT NULL,
  "redirectUris" TEXT[] NOT NULL DEFAULT '{}',
  scopes        TEXT[] NOT NULL DEFAULT '{}',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Personal Access Tokens ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public."PersonalAccessToken" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  "tokenHash" TEXT UNIQUE NOT NULL,
  scopes      TEXT[] NOT NULL DEFAULT '{}',
  "expiresAt" TIMESTAMPTZ,
  "lastUsedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Two-Factor Auth ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public."TwoFactorSecret" (
  "userId"      TEXT PRIMARY KEY REFERENCES public."User"(id) ON DELETE CASCADE,
  secret        TEXT NOT NULL,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  "backupCodes" TEXT[] NOT NULL DEFAULT '{}',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Achievements ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public."Achievement" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "badgeType" TEXT NOT NULL,
  "earnedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata    JSONB,
  UNIQUE("userId", "badgeType")
);

-- ── Contributions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public."Contribution" (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"           TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "repositoryId"     TEXT,
  "contributionType" TEXT NOT NULL,
  "contributionDate" DATE NOT NULL,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Repositories (stub for Phase 2) ──────────────────────────
CREATE TABLE IF NOT EXISTS public."Repository" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  description TEXT,
  visibility  TEXT NOT NULL DEFAULT 'PUBLIC',
  "isTemplate" BOOLEAN NOT NULL DEFAULT FALSE,
  "healthScore" INTEGER,
  "ownerId"   TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("ownerId", name)
);

-- ── Stars (stub) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public."Star" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"       TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "repositoryId" TEXT NOT NULL REFERENCES public."Repository"(id) ON DELETE CASCADE,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("userId", "repositoryId")
);

-- ── Follows ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public."Follow" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "followerId"  TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "followingId" TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("followerId", "followingId")
);

-- ── Issues (stub) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public."Issue" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  number         INTEGER NOT NULL,
  title          TEXT NOT NULL,
  body           TEXT,
  state          TEXT NOT NULL DEFAULT 'OPEN',
  "repositoryId" TEXT NOT NULL REFERENCES public."Repository"(id) ON DELETE CASCADE,
  "authorId"     TEXT NOT NULL REFERENCES public."User"(id),
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "closedAt"     TIMESTAMPTZ,
  UNIQUE("repositoryId", number)
);

-- ── Pull Requests (stub) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public."PullRequest" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  number         INTEGER NOT NULL,
  title          TEXT NOT NULL,
  body           TEXT,
  state          TEXT NOT NULL DEFAULT 'OPEN',
  "baseBranch"   TEXT NOT NULL,
  "headBranch"   TEXT NOT NULL,
  "repositoryId" TEXT NOT NULL REFERENCES public."Repository"(id) ON DELETE CASCADE,
  "authorId"     TEXT NOT NULL REFERENCES public."User"(id),
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "mergedAt"     TIMESTAMPTZ,
  "closedAt"     TIMESTAMPTZ,
  UNIQUE("repositoryId", number)
);

-- ── Comments (stub) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public."Comment" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  body            TEXT NOT NULL,
  "authorId"      TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "issueId"       TEXT REFERENCES public."Issue"(id) ON DELETE CASCADE,
  "pullRequestId" TEXT REFERENCES public."PullRequest"(id) ON DELETE CASCADE,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_username    ON public."User"(username);
CREATE INDEX IF NOT EXISTS idx_user_email       ON public."User"(email);
CREATE INDEX IF NOT EXISTS idx_sshkey_userid    ON public."SSHKey"("userId");
CREATE INDEX IF NOT EXISTS idx_gpgkey_userid    ON public."GPGKey"("userId");
CREATE INDEX IF NOT EXISTS idx_pat_userid       ON public."PersonalAccessToken"("userId");
CREATE INDEX IF NOT EXISTS idx_achievement_uid  ON public."Achievement"("userId");
CREATE INDEX IF NOT EXISTS idx_contribution_uid ON public."Contribution"("userId");
CREATE INDEX IF NOT EXISTS idx_contribution_date ON public."Contribution"("contributionDate");
CREATE INDEX IF NOT EXISTS idx_repo_ownerid     ON public."Repository"("ownerId");
CREATE INDEX IF NOT EXISTS idx_follow_follower  ON public."Follow"("followerId");
CREATE INDEX IF NOT EXISTS idx_follow_following ON public."Follow"("followingId");
CREATE INDEX IF NOT EXISTS idx_star_userid      ON public."Star"("userId");
CREATE INDEX IF NOT EXISTS idx_star_repoid      ON public."Star"("repositoryId");

-- ── Row-Level Security ─────────────────────────────────────────
ALTER TABLE public."User"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SSHKey"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."GPGKey"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PersonalAccessToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TwoFactorSecret"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Achievement"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Contribution"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OAuthApp"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Repository"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Star"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Follow"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Issue"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PullRequest"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Comment"            ENABLE ROW LEVEL SECURITY;

-- Public profiles are readable by everyone
CREATE POLICY "Public profiles are viewable" ON public."User"
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users update own profile" ON public."User"
  FOR UPDATE USING (auth.uid()::text = id);

-- Repos: public ones readable by all, private only by owner
CREATE POLICY "Public repos viewable" ON public."Repository"
  FOR SELECT USING (visibility = 'PUBLIC' OR auth.uid()::text = "ownerId");

CREATE POLICY "Owners manage repos" ON public."Repository"
  FOR ALL USING (auth.uid()::text = "ownerId");

-- SSH/GPG/PAT/2FA/OAuthApps: only owner can see/manage
CREATE POLICY "Own SSH keys" ON public."SSHKey"          FOR ALL USING (auth.uid()::text = "userId");
CREATE POLICY "Own GPG keys" ON public."GPGKey"          FOR ALL USING (auth.uid()::text = "userId");
CREATE POLICY "Own PATs"     ON public."PersonalAccessToken" FOR ALL USING (auth.uid()::text = "userId");
CREATE POLICY "Own 2FA"      ON public."TwoFactorSecret" FOR ALL USING (auth.uid()::text = "userId");
CREATE POLICY "Own OAuth"    ON public."OAuthApp"        FOR ALL USING (auth.uid()::text = "userId");

-- Contributions and achievements: publicly readable, owner can insert
CREATE POLICY "Contributions readable" ON public."Contribution" FOR SELECT USING (true);
CREATE POLICY "Own contributions"      ON public."Contribution" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Achievements readable"  ON public."Achievement"  FOR SELECT USING (true);

-- Stars and follows: publicly readable
CREATE POLICY "Stars readable"   ON public."Star"   FOR SELECT USING (true);
CREATE POLICY "Own stars"        ON public."Star"   FOR ALL USING (auth.uid()::text = "userId");
CREATE POLICY "Follows readable" ON public."Follow" FOR SELECT USING (true);
CREATE POLICY "Own follows"      ON public."Follow" FOR ALL USING (auth.uid()::text = "followerId");

-- Issues and PRs: public repos public, private repos owner-only
CREATE POLICY "Issues readable"  ON public."Issue"       FOR SELECT USING (true);
CREATE POLICY "PRs readable"     ON public."PullRequest" FOR SELECT USING (true);
CREATE POLICY "Comments readable" ON public."Comment"    FOR SELECT USING (true);

-- ── Service Role bypass (for our Express API) ─────────────────
-- The service role key bypasses RLS automatically — no extra policy needed.

-- ── Auto-update updatedAt trigger ────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_user_updated_at
  BEFORE UPDATE ON public."User"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_repo_updated_at
  BEFORE UPDATE ON public."Repository"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Done ─────────────────────────────────────────────────────
-- Phase 1 migration complete.
-- Next: run `npx prisma generate` in apps/api to regenerate the client.
