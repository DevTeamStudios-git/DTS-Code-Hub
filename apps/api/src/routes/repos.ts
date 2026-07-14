import { Router } from 'express';
import { randomBytes } from 'crypto';
import unzipper from 'unzipper';
import { Readable } from 'stream';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import {
  initBareRepo,
  initRepoFromFiles,
  deleteRepoDisk,
  forkRepoDisk,
  renameRepoDisk,
  getRepoDiskPath,
  getRepoFileListing,
  getRepoCommitCount,
} from '../lib/gitEngine.js';
import { detectLanguages, computeHealthScore } from '../lib/languageDetector.js';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function validateRepoName(name: string): boolean {
  return /^[a-zA-Z0-9._-]{1,100}$/.test(name) && !name.startsWith('.');
}

async function getRepoOrFail(
  res: Parameters<Router>[1],
  username: string,
  repoName: string,
  requesterId?: string,
): Promise<Record<string, unknown> | null> {
  const owner = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!owner) { res.status(404).json({ error: 'User not found' }); return null as never; }

  const repo = await prisma.repository.findUnique({
    where: { ownerId_name: { ownerId: owner.id, name: repoName } },
    include: {
      owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      topics: { select: { topic: true } },
      _count: { select: { stars: true, forks: true, issues: true, pullRequests: true } },
    },
  });

  if (!repo) { res.status(404).json({ error: 'Repository not found' }); return null as never; }
  if (repo.visibility === 'PRIVATE' && repo.ownerId !== requesterId) {
    res.status(404).json({ error: 'Repository not found' }); return null as never;
  }

  return repo as never;
}

async function recalculateHealth(repoId: string): Promise<void> {
  const repo = await prisma.repository.findUnique({
    where: { id: repoId },
    include: { topics: true, _count: { select: { stars: true } }, owner: { select: { username: true } } },
  });
  if (!repo) return;

  const diskPath = repo.diskPath ?? getRepoDiskPath(repo.owner.username, repo.name);
  const files = await getRepoFileListing(diskPath);
  const languages = detectLanguages(files);

  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(repo.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
  );

  const score = computeHealthScore({
    hasDescription: !!repo.description?.trim(),
    hasTopics: repo.topics.length > 0,
    daysSinceUpdate,
    isArchived: repo.isArchived,
    starCount: repo._count.stars,
    hasLanguages: languages.length > 0,
  });

  await prisma.repository.update({ where: { id: repoId }, data: { healthScore: score } });
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// POST /api/repos — Create repo
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description, visibility, isTemplate, defaultBranch, topics, initReadme } = req.body as {
      name: string;
      description?: string;
      visibility?: 'PUBLIC' | 'PRIVATE';
      isTemplate?: boolean;
      defaultBranch?: string;
      topics?: string[];
      initReadme?: boolean;
    };

    if (!name || !validateRepoName(name)) {
      res.status(400).json({ error: 'Invalid repository name. Use letters, numbers, hyphens, underscores, and dots only.' });
      return;
    }

    const owner = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { username: true } });
    if (!owner) { res.status(404).json({ error: 'User not found' }); return; }

    const existing = await prisma.repository.findUnique({
      where: { ownerId_name: { ownerId: req.user!.userId, name } },
    });
    if (existing) { res.status(400).json({ error: 'A repository with this name already exists.' }); return; }

    // Create DB record first
    const repo = await prisma.repository.create({
      data: {
        name,
        description: description ?? null,
        visibility: visibility ?? 'PUBLIC',
        isTemplate: isTemplate ?? false,
        defaultBranch: defaultBranch ?? 'main',
        ownerId: req.user!.userId,
        ...(topics?.length ? { topics: { create: topics.map(t => ({ topic: t.toLowerCase() })) } } : {}),
      },
    });

    // Init git repo on disk
    let diskPath: string;
    if (initReadme) {
      const readmeContent = `# ${name}\n\n${description ?? ''}\n`;
      diskPath = await initRepoFromFiles(
        owner.username, name,
        [{ path: 'README.md', content: Buffer.from(readmeContent) }],
        'Initial commit',
      );
    } else {
      diskPath = await initBareRepo(owner.username, name);
    }

    await prisma.repository.update({ where: { id: repo.id }, data: { diskPath } });
    await recalculateHealth(repo.id);

    // Award open_sourcerer achievement for first public repo
    if ((visibility ?? 'PUBLIC') === 'PUBLIC') {
      await prisma.achievement.upsert({
        where: { userId_badgeType: { userId: req.user!.userId, badgeType: 'open_sourcerer' } },
        create: { userId: req.user!.userId, badgeType: 'open_sourcerer' },
        update: {},
      });
    }

    res.status(201).json({ repo: { ...repo, diskPath } });
  } catch (err) {
    console.error('Create repo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/repos/upload — Upload zip project → init repo
router.post('/upload', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description, visibility, base64Zip } = req.body as {
      name: string;
      description?: string;
      visibility?: 'PUBLIC' | 'PRIVATE';
      base64Zip: string;
    };

    if (!name || !validateRepoName(name)) {
      res.status(400).json({ error: 'Invalid repository name.' });
      return;
    }
    if (!base64Zip) { res.status(400).json({ error: 'No zip file provided.' }); return; }

    const owner = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { username: true } });
    if (!owner) { res.status(404).json({ error: 'User not found' }); return; }

    const existing = await prisma.repository.findUnique({
      where: { ownerId_name: { ownerId: req.user!.userId, name } },
    });
    if (existing) { res.status(400).json({ error: 'A repository with this name already exists.' }); return; }

    // Decode zip
    const zipBuffer = Buffer.from(base64Zip, 'base64');
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (zipBuffer.length > maxSize) { res.status(400).json({ error: 'Zip file too large (max 50MB).' }); return; }

    // Extract files from zip
    const files: Array<{ path: string; content: Buffer }> = [];
    const zipStream = Readable.from(zipBuffer);
    const directory = zipStream.pipe(unzipper.Parse({ forceStream: true }));

    for await (const entry of directory) {
      const fileName = (entry as unzipper.Entry).path;
      const type = (entry as unzipper.Entry).type;
      if (type === 'File') {
        const chunks: Buffer[] = [];
        for await (const chunk of entry as AsyncIterable<Buffer>) {
          chunks.push(chunk);
        }
        // Strip leading directory (e.g. project-main/) from zip paths
        const cleanPath = fileName.replace(/^[^/]+\//, '');
        if (cleanPath && !cleanPath.includes('..')) {
          files.push({ path: cleanPath, content: Buffer.concat(chunks) });
        }
      } else {
        (entry as unzipper.Entry).autodrain();
      }
    }

    if (files.length === 0) { res.status(400).json({ error: 'Zip file is empty or contains no valid files.' }); return; }

    // Create DB record
    const repo = await prisma.repository.create({
      data: {
        name,
        description: description ?? null,
        visibility: visibility ?? 'PUBLIC',
        ownerId: req.user!.userId,
      },
    });

    // Init repo from extracted files
    const diskPath = await initRepoFromFiles(
      owner.username, name, files,
      `Initial commit — uploaded project`,
    );

    await prisma.repository.update({ where: { id: repo.id }, data: { diskPath } });

    // Compute languages from uploaded files
    const langFiles = files.map(f => ({ path: f.path, size: f.content.length }));
    const languages = detectLanguages(langFiles);

    await recalculateHealth(repo.id);

    // Record contribution
    await prisma.contribution.create({
      data: {
        userId: req.user!.userId,
        repositoryId: repo.id,
        contributionType: 'commit',
        contributionDate: new Date(),
      },
    });

    res.status(201).json({ repo, languages, fileCount: files.length });
  } catch (err) {
    console.error('Upload repo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/repos/:username/:repo — Get repo details
router.get('/:username/:repo', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName } = req.params;
    const repo = await getRepoOrFail(res, username, repoName, req.user?.userId);
    if (!repo) return;

    const diskPath = (repo as { diskPath?: string }).diskPath ?? getRepoDiskPath(username, repoName);
    const files = await getRepoFileListing(diskPath);
    const languages = detectLanguages(files);
    const commitCount = await getRepoCommitCount(diskPath);

    const isStarred = req.user
      ? !!(await prisma.star.findUnique({ where: { userId_repositoryId: { userId: req.user.userId, repositoryId: (repo as { id: string }).id } } }))
      : false;

    res.json({ repo, languages, commitCount, isStarred });
  } catch (err) {
    console.error('Get repo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/repos/:username/:repo — Update repo
router.put('/:username/:repo', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName } = req.params;
    const owner = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!owner || owner.id !== req.user!.userId) { res.status(403).json({ error: 'Forbidden' }); return; }

    const repo = await prisma.repository.findUnique({ where: { ownerId_name: { ownerId: owner.id, name: repoName } } });
    if (!repo) { res.status(404).json({ error: 'Repository not found' }); return; }
    if (repo.isArchived) { res.status(400).json({ error: 'Archived repositories cannot be modified.' }); return; }

    const { name, description, visibility, defaultBranch, topics } = req.body as {
      name?: string;
      description?: string;
      visibility?: 'PUBLIC' | 'PRIVATE';
      defaultBranch?: string;
      topics?: string[];
    };

    let newDiskPath = repo.diskPath;
    if (name && name !== repo.name) {
      if (!validateRepoName(name)) { res.status(400).json({ error: 'Invalid repository name.' }); return; }
      const conflict = await prisma.repository.findUnique({ where: { ownerId_name: { ownerId: owner.id, name } } });
      if (conflict) { res.status(400).json({ error: 'A repository with this name already exists.' }); return; }
      newDiskPath = await renameRepoDisk(username, repo.name, name);
    }

    if (topics !== undefined) {
      await prisma.repositoryTopic.deleteMany({ where: { repositoryId: repo.id } });
      if (topics.length > 0) {
        await prisma.repositoryTopic.createMany({
          data: topics.map(t => ({ repositoryId: repo.id, topic: t.toLowerCase() })),
        });
      }
    }

    const updated = await prisma.repository.update({
      where: { id: repo.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(visibility !== undefined && { visibility }),
        ...(defaultBranch !== undefined && { defaultBranch }),
        diskPath: newDiskPath ?? undefined,
      },
      include: { topics: { select: { topic: true } } },
    });

    await recalculateHealth(repo.id);
    res.json({ repo: updated });
  } catch (err) {
    console.error('Update repo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/repos/:username/:repo — Delete repo
router.delete('/:username/:repo', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName } = req.params;
    const owner = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!owner || owner.id !== req.user!.userId) { res.status(403).json({ error: 'Forbidden' }); return; }

    const repo = await prisma.repository.findUnique({ where: { ownerId_name: { ownerId: owner.id, name: repoName } } });
    if (!repo) { res.status(404).json({ error: 'Repository not found' }); return; }

    await prisma.repository.delete({ where: { id: repo.id } });
    if (repo.diskPath) await deleteRepoDisk(repo.diskPath);

    res.json({ message: 'Repository deleted.' });
  } catch (err) {
    console.error('Delete repo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/repos/:username/:repo/fork — Fork repo
router.post('/:username/:repo/fork', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName } = req.params;
    const sourceOwner = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!sourceOwner) { res.status(404).json({ error: 'User not found' }); return; }

    const sourceRepo = await prisma.repository.findUnique({ where: { ownerId_name: { ownerId: sourceOwner.id, name: repoName } } });
    if (!sourceRepo || (sourceRepo.visibility === 'PRIVATE' && sourceOwner.id !== req.user!.userId)) {
      res.status(404).json({ error: 'Repository not found' }); return;
    }

    if (sourceRepo.ownerId === req.user!.userId) { res.status(400).json({ error: 'Cannot fork your own repository.' }); return; }

    const forkOwner = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { username: true } });
    if (!forkOwner) { res.status(404).json({ error: 'User not found' }); return; }

    const existing = await prisma.repository.findUnique({ where: { ownerId_name: { ownerId: req.user!.userId, name: repoName } } });
    const forkName = existing ? `${repoName}-fork-${randomBytes(3).toString('hex')}` : repoName;

    const diskPath = await forkRepoDisk(sourceRepo.diskPath ?? '', forkOwner.username, forkName);

    const fork = await prisma.repository.create({
      data: {
        name: forkName,
        description: sourceRepo.description,
        visibility: 'PUBLIC',
        isFork: true,
        forkOfId: sourceRepo.id,
        defaultBranch: sourceRepo.defaultBranch,
        ownerId: req.user!.userId,
        diskPath,
      },
    });

    await recalculateHealth(fork.id);
    res.status(201).json({ repo: fork });
  } catch (err) {
    console.error('Fork repo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/repos/:username/:repo/archive — Toggle archive
router.post('/:username/:repo/archive', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName } = req.params;
    const owner = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!owner || owner.id !== req.user!.userId) { res.status(403).json({ error: 'Forbidden' }); return; }

    const repo = await prisma.repository.findUnique({ where: { ownerId_name: { ownerId: owner.id, name: repoName } } });
    if (!repo) { res.status(404).json({ error: 'Repository not found' }); return; }

    const updated = await prisma.repository.update({
      where: { id: repo.id },
      data: { isArchived: !repo.isArchived },
    });

    await recalculateHealth(repo.id);
    res.json({ repo: updated, archived: updated.isArchived });
  } catch (err) {
    console.error('Archive repo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/repos/:username/:repo/transfer — Transfer ownership
router.post('/:username/:repo/transfer', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName } = req.params;
    const { newOwnerUsername } = req.body as { newOwnerUsername: string };

    const owner = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!owner || owner.id !== req.user!.userId) { res.status(403).json({ error: 'Forbidden' }); return; }

    const newOwner = await prisma.user.findUnique({ where: { username: newOwnerUsername }, select: { id: true, username: true } });
    if (!newOwner) { res.status(404).json({ error: 'New owner not found.' }); return; }
    if (newOwner.id === req.user!.userId) { res.status(400).json({ error: 'Cannot transfer to yourself.' }); return; }

    const repo = await prisma.repository.findUnique({ where: { ownerId_name: { ownerId: owner.id, name: repoName } } });
    if (!repo) { res.status(404).json({ error: 'Repository not found' }); return; }

    // Check for name conflict at destination
    const conflict = await prisma.repository.findUnique({ where: { ownerId_name: { ownerId: newOwner.id, name: repoName } } });
    if (conflict) { res.status(400).json({ error: `${newOwnerUsername} already has a repository named "${repoName}".` }); return; }

    // Move disk files
    const newDiskPath = await renameRepoDisk(username, repoName, repoName).then(() =>
      // Re-path under new owner
      forkRepoDisk(repo.diskPath ?? '', newOwner.username, repoName)
    );
    if (repo.diskPath) await deleteRepoDisk(repo.diskPath);

    const updated = await prisma.repository.update({
      where: { id: repo.id },
      data: { ownerId: newOwner.id, diskPath: newDiskPath },
    });

    res.json({ repo: updated });
  } catch (err) {
    console.error('Transfer repo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/repos/:username/:repo/template — Create repo from template
router.post('/:username/:repo/template', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName } = req.params;
    const { name, description, visibility } = req.body as { name: string; description?: string; visibility?: 'PUBLIC' | 'PRIVATE' };

    const templateOwner = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!templateOwner) { res.status(404).json({ error: 'User not found' }); return; }

    const template = await prisma.repository.findUnique({ where: { ownerId_name: { ownerId: templateOwner.id, name: repoName } } });
    if (!template || !template.isTemplate) { res.status(404).json({ error: 'Template repository not found' }); return; }

    if (!name || !validateRepoName(name)) { res.status(400).json({ error: 'Invalid repository name.' }); return; }

    const newOwner = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { username: true } });
    if (!newOwner) { res.status(404).json({ error: 'User not found' }); return; }

    const diskPath = await forkRepoDisk(template.diskPath ?? '', newOwner.username, name);

    const newRepo = await prisma.repository.create({
      data: {
        name,
        description: description ?? template.description,
        visibility: visibility ?? 'PUBLIC',
        ownerId: req.user!.userId,
        diskPath,
      },
    });

    await recalculateHealth(newRepo.id);
    res.status(201).json({ repo: newRepo });
  } catch (err) {
    console.error('Template repo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/repos/:username/:repo/languages — Language breakdown
router.get('/:username/:repo/languages', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName } = req.params;
    const repo = await getRepoOrFail(res, username, repoName, req.user?.userId);
    if (!repo) return;

    const diskPath = (repo as { diskPath?: string }).diskPath ?? getRepoDiskPath(username, repoName);
    const files = await getRepoFileListing(diskPath);
    const languages = detectLanguages(files);

    res.json({ languages });
  } catch (err) {
    console.error('Languages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/repos/explore — Public repo discovery
router.get('/explore', async (req, res) => {
  try {
    const sort = (req.query.sort as string) ?? 'updated';
    const search = (req.query.q as string) ?? '';
    const topic = (req.query.topic as string) ?? '';

    const repos = await prisma.repository.findMany({
      where: {
        visibility: 'PUBLIC',
        ...(search ? { OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ]} : {}),
      },
      include: {
        owner: { select: { username: true, avatarUrl: true } },
        topics: { select: { topic: true } },
        _count: { select: { stars: true, forks: true } },
      },
      orderBy: sort === 'stars' ? { stars: { _count: 'desc' } }
             : sort === 'forks' ? { forks: { _count: 'desc' } }
             : { updatedAt: 'desc' },
      take: 30,
    });

    res.json({ repos });
  } catch (err) {
    console.error('Explore repos error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
