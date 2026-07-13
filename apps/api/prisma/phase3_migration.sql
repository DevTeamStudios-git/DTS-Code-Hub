-- ============================================================
-- DTS Code Hub — Phase 3 Migration
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- AFTER Phase 1 and Phase 2 migrations have been applied.
-- ============================================================

-- ── Branch Protection Rules ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public."BranchProtection" (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "repositoryId"        TEXT NOT NULL REFERENCES public."Repository"(id) ON DELETE CASCADE,
  branch                TEXT NOT NULL,
  "requirePullRequest"  BOOLEAN NOT NULL DEFAULT FALSE,
  "requireStatusChecks" BOOLEAN NOT NULL DEFAULT FALSE,
  "restrictPushes"      BOOLEAN NOT NULL DEFAULT FALSE,
  "allowedPushers"      TEXT[] NOT NULL DEFAULT '{}',
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("repositoryId", branch)
);

-- ── Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_branchprotection_repoid
  ON public."BranchProtection"("repositoryId");

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE public."BranchProtection" ENABLE ROW LEVEL SECURITY;

-- Owner can manage their branch protection rules
CREATE POLICY "Owner manages branch protections"
  ON public."BranchProtection"
  FOR ALL
  USING (
    auth.uid()::text = (
      SELECT "ownerId" FROM public."Repository" WHERE id = "repositoryId"
    )
  );

-- Anyone can read branch protections (needed for push checks)
CREATE POLICY "Branch protections readable"
  ON public."BranchProtection"
  FOR SELECT
  USING (true);

-- ── Auto-update updatedAt trigger ─────────────────────────────
CREATE OR REPLACE TRIGGER trg_branchprotection_updated_at
  BEFORE UPDATE ON public."BranchProtection"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Done ──────────────────────────────────────────────────────
-- Phase 3 migration complete.
-- After running this, regenerate Prisma client:
--   cd apps/api && npx prisma generate
--
-- Git Smart HTTP setup notes:
-- The API now serves git protocol at /:username/:repo.git/
-- Clients authenticate with: git clone https://<username>:<PAT>@your-api.com/<username>/<repo>.git
-- Make sure the API server has read/write access to the /repos directory.
-- PATs must have the 'repo' or 'repo:write' scope for push operations.
