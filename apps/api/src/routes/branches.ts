import { Router } from 'express';
import simpleGit from 'simple-git';
import { existsSync } from 'fs';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { getRepoDiskPath } from '../lib/gitEngine.js';

const router = Router({ mergeParams: true });

async function getDiskPath(username: string, repoName: string, requesterId?: string): Promise<string | null> {
  const owner = await prisma.user.findUnique({ where: { username } });
  if (!owner) return null;
  const repo = await prisma.repository.findUnique({
    where: { ownerId_name: { ownerId: owner.id, name: repoName } },
  });
  if (!repo) return null;
  if (repo.visibility === 'PRIVATE' && repo.ownerId !== requesterId) return null;
  return repo.diskPath ?? getRepoDiskPath(username, repoName);
}

// GET /api/repos/:username/:repo/branches
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName } = req.params;
    const diskPath = await getDiskPath(username, repoName, req.user?.userId);
    if (!diskPath || !existsSync(diskPath)) { res.status(404).json({ error: 'Repository not found' }); return; }

    const git = simpleGit(diskPath);
    const summary = await git.branch(['-a']).catch(() => null);

    if (!summary) { res.json({ branches: [], defaultBranch: 'main' }); return; }

    const owner = await prisma.user.findUnique({ where: { username } });
    const repo = owner ? await prisma.repository.findUnique({
      where: { ownerId_name: { ownerId: owner.id, name: repoName } },
      include: { branchProtections: true },
    }) : null;

    const protectedBranches = new Set(repo?.branchProtections.map((b: { branch: string }) => b.branch) ?? []);

    const branches = summary.all
      .filter(b => !b.startsWith('remotes/'))
      .map(name => ({
        name,
        isCurrent: name === summary.current,
        isProtected: protectedBranches.has(name),
        isDefault: name === (repo?.defaultBranch ?? 'main'),
      }));

    res.json({ branches, defaultBranch: repo?.defaultBranch ?? 'main' });
  } catch (err) {
    console.error('List branches error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/repos/:username/:repo/branches
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName } = req.params;
    const { name, from } = req.body as { name: string; from?: string };

    if (!name || !/^[a-zA-Z0-9._/-]{1,200}$/.test(name)) {
      res.status(400).json({ error: 'Invalid branch name' }); return;
    }

    const owner = await prisma.user.findUnique({ where: { username } });
    if (!owner || owner.id !== req.user!.userId) { res.status(403).json({ error: 'Forbidden' }); return; }

    const repo = await prisma.repository.findUnique({ where: { ownerId_name: { ownerId: owner.id, name: repoName } } });
    if (!repo) { res.status(404).json({ error: 'Repository not found' }); return; }
    if (repo.isArchived) { res.status(400).json({ error: 'Repository is archived' }); return; }

    // Check branch protection on source
    const protection = await prisma.branchProtection.findUnique({
      where: { repositoryId_branch: { repositoryId: repo.id, branch: from ?? repo.defaultBranch } },
    });
    if (protection?.restrictPushes) { res.status(403).json({ error: 'Source branch is protected' }); return; }

    const diskPath = repo.diskPath ?? getRepoDiskPath(username, repoName);
    if (!existsSync(diskPath)) { res.status(400).json({ error: 'Repository has no commits yet' }); return; }

    const git = simpleGit(diskPath);
    await git.branch([name, from ?? repo.defaultBranch]);

    res.status(201).json({ branch: name, from: from ?? repo.defaultBranch });
  } catch (err) {
    console.error('Create branch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/repos/:username/:repo/branches/:branch
router.delete('/:branch', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName, branch } = req.params;

    const owner = await prisma.user.findUnique({ where: { username } });
    if (!owner || owner.id !== req.user!.userId) { res.status(403).json({ error: 'Forbidden' }); return; }

    const repo = await prisma.repository.findUnique({ where: { ownerId_name: { ownerId: owner.id, name: repoName } } });
    if (!repo) { res.status(404).json({ error: 'Repository not found' }); return; }
    if (branch === repo.defaultBranch) { res.status(400).json({ error: 'Cannot delete the default branch' }); return; }

    const protection = await prisma.branchProtection.findUnique({
      where: { repositoryId_branch: { repositoryId: repo.id, branch } },
    });
    if (protection) { res.status(403).json({ error: 'Branch is protected and cannot be deleted' }); return; }

    const diskPath = repo.diskPath ?? getRepoDiskPath(username, repoName);
    const git = simpleGit(diskPath);
    await git.branch(['-D', branch]);

    res.json({ message: `Branch "${branch}" deleted` });
  } catch (err) {
    console.error('Delete branch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/repos/:username/:repo/branch-protections
router.get('/protections', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName } = req.params;

    const owner = await prisma.user.findUnique({ where: { username } });
    if (!owner || owner.id !== req.user!.userId) { res.status(403).json({ error: 'Forbidden' }); return; }

    const repo = await prisma.repository.findUnique({ where: { ownerId_name: { ownerId: owner.id, name: repoName } } });
    if (!repo) { res.status(404).json({ error: 'Repository not found' }); return; }

    const protections = await prisma.branchProtection.findMany({ where: { repositoryId: repo.id } });
    res.json({ protections });
  } catch (err) {
    console.error('Get protections error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/repos/:username/:repo/branch-protections/:branch
router.put('/protections/:branch', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName, branch } = req.params;
    const { requirePullRequest, requireStatusChecks, restrictPushes, allowedPushers } = req.body as {
      requirePullRequest?: boolean;
      requireStatusChecks?: boolean;
      restrictPushes?: boolean;
      allowedPushers?: string[];
    };

    const owner = await prisma.user.findUnique({ where: { username } });
    if (!owner || owner.id !== req.user!.userId) { res.status(403).json({ error: 'Forbidden' }); return; }

    const repo = await prisma.repository.findUnique({ where: { ownerId_name: { ownerId: owner.id, name: repoName } } });
    if (!repo) { res.status(404).json({ error: 'Repository not found' }); return; }

    const protection = await prisma.branchProtection.upsert({
      where: { repositoryId_branch: { repositoryId: repo.id, branch } },
      create: {
        repositoryId: repo.id,
        branch,
        requirePullRequest: requirePullRequest ?? false,
        requireStatusChecks: requireStatusChecks ?? false,
        restrictPushes: restrictPushes ?? false,
        allowedPushers: allowedPushers ?? [],
      },
      update: {
        ...(requirePullRequest !== undefined && { requirePullRequest }),
        ...(requireStatusChecks !== undefined && { requireStatusChecks }),
        ...(restrictPushes !== undefined && { restrictPushes }),
        ...(allowedPushers !== undefined && { allowedPushers }),
      },
    });

    res.json({ protection });
  } catch (err) {
    console.error('Set protection error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/repos/:username/:repo/branch-protections/:branch
router.delete('/protections/:branch', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName, branch } = req.params;

    const owner = await prisma.user.findUnique({ where: { username } });
    if (!owner || owner.id !== req.user!.userId) { res.status(403).json({ error: 'Forbidden' }); return; }

    const repo = await prisma.repository.findUnique({ where: { ownerId_name: { ownerId: owner.id, name: repoName } } });
    if (!repo) { res.status(404).json({ error: 'Repository not found' }); return; }

    await prisma.branchProtection.deleteMany({ where: { repositoryId: repo.id, branch } });
    res.json({ message: 'Branch protection removed' });
  } catch (err) {
    console.error('Delete protection error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
