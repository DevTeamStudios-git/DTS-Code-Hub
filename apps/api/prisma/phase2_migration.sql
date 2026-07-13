-- ============================================================
-- DTS Code Hub — Phase 2 Migration
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- AFTER Phase 1 migration has already been applied.
-- ============================================================

-- ── Repository — add Phase 2 columns ─────────────────────────
ALTER TABLE public."Repository"
  ADD COLUMN IF NOT EXISTS "isArchived"    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "isFork"        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "forkOfId"      TEXT REFERENCES public."Repository"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "defaultBranch" TEXT NOT NULL DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS "diskPath"      TEXT;

-- ── Repository Topics ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public."RepositoryTopic" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "repositoryId" TEXT NOT NULL REFERENCES public."Repository"(id) ON DELETE CASCADE,
  topic          TEXT NOT NULL,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("repositoryId", topic)
);

-- ── Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_repo_archived   ON public."Repository"("isArchived");
CREATE INDEX IF NOT EXISTS idx_repo_forkof     ON public."Repository"("forkOfId");
CREATE INDEX IF NOT EXISTS idx_repotopic_repoid ON public."RepositoryTopic"("repositoryId");
CREATE INDEX IF NOT EXISTS idx_repotopic_topic  ON public."RepositoryTopic"(topic);

-- ── RLS for RepositoryTopic ────────────────────────────────────
ALTER TABLE public."RepositoryTopic" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Topics readable" ON public."RepositoryTopic"
  FOR SELECT USING (true);

CREATE POLICY "Owner manages topics" ON public."RepositoryTopic"
  FOR ALL USING (
    auth.uid()::text = (
      SELECT "ownerId" FROM public."Repository" WHERE id = "repositoryId"
    )
  );

-- ── Done ─────────────────────────────────────────────────────
-- Phase 2 migration complete.
-- Next: run `npx prisma generate` in apps/api to regenerate the client.
-- Make sure /repos directory exists and is writable by the API process:
--   mkdir -p /repos && chown <api-user> /repos
