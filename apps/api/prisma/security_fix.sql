-- ============================================================
-- DTS Code Hub — SECURITY FIX Migration
-- Run this IMMEDIATELY in: Supabase Dashboard > SQL Editor
-- Fixes: rls_disabled_in_public + sensitive_columns_exposed
--
-- WHY this is safe:
--   Our Express API uses the SERVICE_ROLE key which bypasses
--   RLS entirely. The frontend only uses Supabase for AUTH
--   (signIn/signUp/signOut) — all data queries go through our
--   API. So removing anon/public read policies doesn't break
--   anything.
-- ============================================================

-- ── Step 1: Enable RLS on every table (idempotent) ───────────
ALTER TABLE IF EXISTS public."User"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Repository"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."RepositoryTopic"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."BranchProtection"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."SSHKey"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."GPGKey"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."OAuthApp"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."PersonalAccessToken"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."TwoFactorSecret"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Achievement"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Contribution"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Star"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Follow"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Issue"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."PullRequest"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Comment"               ENABLE ROW LEVEL SECURITY;

-- ── Step 2: Drop ALL existing policies (clean slate) ─────────

-- User
DROP POLICY IF EXISTS "Public profiles are viewable"    ON public."User";
DROP POLICY IF EXISTS "Public profiles limited"         ON public."User";
DROP POLICY IF EXISTS "Users update own profile"        ON public."User";

-- Repository
DROP POLICY IF EXISTS "Public repos viewable"           ON public."Repository";
DROP POLICY IF EXISTS "Owners manage repos"             ON public."Repository";

-- RepositoryTopic
DROP POLICY IF EXISTS "Topics readable"                 ON public."RepositoryTopic";
DROP POLICY IF EXISTS "Owner manages topics"            ON public."RepositoryTopic";

-- BranchProtection
DROP POLICY IF EXISTS "Branch protections readable"     ON public."BranchProtection";
DROP POLICY IF EXISTS "Owner manages branch protections" ON public."BranchProtection";

-- SSHKey
DROP POLICY IF EXISTS "Own SSH keys"                    ON public."SSHKey";

-- GPGKey
DROP POLICY IF EXISTS "Own GPG keys"                    ON public."GPGKey";

-- PAT
DROP POLICY IF EXISTS "Own PATs"                        ON public."PersonalAccessToken";

-- TwoFactor
DROP POLICY IF EXISTS "Own 2FA"                         ON public."TwoFactorSecret";

-- OAuthApp
DROP POLICY IF EXISTS "Own OAuth"                       ON public."OAuthApp";

-- Achievement
DROP POLICY IF EXISTS "Achievements readable"           ON public."Achievement";

-- Contribution
DROP POLICY IF EXISTS "Contributions readable"          ON public."Contribution";
DROP POLICY IF EXISTS "Own contributions"               ON public."Contribution";

-- Star
DROP POLICY IF EXISTS "Stars readable"                  ON public."Star";
DROP POLICY IF EXISTS "Own stars"                       ON public."Star";

-- Follow
DROP POLICY IF EXISTS "Follows readable"                ON public."Follow";
DROP POLICY IF EXISTS "Own follows"                     ON public."Follow";

-- Issues / PRs / Comments
DROP POLICY IF EXISTS "Issues readable"                 ON public."Issue";
DROP POLICY IF EXISTS "PRs readable"                    ON public."PullRequest";
DROP POLICY IF EXISTS "Comments readable"               ON public."Comment";

-- ── Step 3: Deny all direct anon/authenticated access ────────
-- With RLS enabled and NO policies, every role is denied by default.
-- The service_role key (used by our Express API) bypasses RLS,
-- so our API still has full access.
--
-- We only add policies back for tables where the Supabase
-- Realtime or Auth system needs direct access.

-- Auth trigger: allow the auth system to create user records
-- (Supabase calls this after signup via trigger, if you set one up)
-- No policy needed — service_role handles user creation.

-- ── Step 4: Revoke dangerous API permissions from anon role ──
-- This prevents the auto-generated Supabase REST API from
-- exposing our tables to unauthenticated requests at all.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Re-grant only to service_role (our Express API uses this)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- ── Step 5: Verify ───────────────────────────────────────────
-- After running this, go to:
--   Supabase Dashboard > Advisors > Security
-- and click "Refresh". The two critical issues should be gone.
--
-- Also verify your API still works by testing:
--   GET /health  →  should return { status: 'ok' }
--   POST /api/auth/register  →  should still work
--   GET /api/repos/...  →  should still work
--
-- If anything breaks, the fix is always: our API uses service_role
-- which has full unrestricted access regardless of these policies.

-- ── Done ─────────────────────────────────────────────────────
SELECT 'Security fix applied successfully.' AS result;
