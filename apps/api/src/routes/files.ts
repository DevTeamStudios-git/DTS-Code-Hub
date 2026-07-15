import { Router } from 'express';
import { extname } from 'path';
import { optionalAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import {
  getRepoDiskPath,
  getDirectoryListing,
  getFileContent,
  getFileBlame,
  searchInRepository,
  getLastCommitForPaths,
} from '../lib/gitEngine.js';

const router = Router({ mergeParams: true });

// ── Helpers ───────────────────────────────────────────────────────────────

const BINARY_EXTENSIONS = new Set([
  '.png','.jpg','.jpeg','.gif','.webp','.avif','.ico','.bmp','.tiff',
  '.svg', // treat as text/image
  '.pdf','.zip','.tar','.gz','.rar','.7z','.exe','.bin','.dll','.so',
  '.woff','.woff2','.ttf','.eot','.otf',
  '.mp4','.mov','.avi','.mp3','.wav','.ogg',
]);

const IMAGE_EXTENSIONS = new Set([
  '.png','.jpg','.jpeg','.gif','.webp','.avif','.ico','.bmp','.tiff','.svg',
]);

function isImageExt(ext: string) { return IMAGE_EXTENSIONS.has(ext.toLowerCase()); }
function isBinaryExt(ext: string) { return BINARY_EXTENSIONS.has(ext.toLowerCase()); }

function imageMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif',
    '.ico': 'image/x-icon', '.bmp': 'image/bmp', '.tiff': 'image/tiff',
    '.svg': 'image/svg+xml',
  };
  return map[ext.toLowerCase()] ?? 'application/octet-stream';
}

async function getRepoDisk(username: string, repoName: string, requesterId?: string) {
  const owner = await prisma.user.findUnique({ where: { username } });
  if (!owner) return null;
  const repo = await prisma.repository.findUnique({
    where: { ownerId_name: { ownerId: owner.id, name: repoName } },
  });
  if (!repo) return null;
  if (repo.visibility === 'PRIVATE' && repo.ownerId !== requesterId) return null;
  return { diskPath: repo.diskPath ?? getRepoDiskPath(username, repoName), repo };
}

// ── GET /api/repos/:username/:repo/tree/:branch[/*path] ──────────────────
router.get('/tree/:branch', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName, branch } = req.params;
    const subPath = (req.params as Record<string, string>)['0'] ?? '';

    const result = await getRepoDisk(username, repoName, req.user?.userId);
    if (!result) { res.status(404).json({ error: 'Repository not found' }); return; }

    const { entries, lastCommit } = await getDirectoryListing(result.diskPath, branch, subPath);

    // Get last commit per entry (batched)
    const paths = entries.map(e => e.path);
    const commitMap = await getLastCommitForPaths(result.diskPath, branch, paths);

    const enriched = entries.map(e => ({ ...e, lastCommit: commitMap[e.path] ?? null }));

    res.json({
      path: subPath,
      branch,
      entries: enriched,
      dirLastCommit: lastCommit,
    });
  } catch (err) {
    console.error('Tree listing error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Also handle nested path: /tree/:branch/*
router.get('/tree/:branch/*', optionalAuth, async (req: AuthRequest, res) => {
  const { username, repo: repoName, branch } = req.params;
  const subPath = (req.params as Record<string, string>)['0'] ?? '';

  const result = await getRepoDisk(username, repoName, req.user?.userId);
  if (!result) { res.status(404).json({ error: 'Repository not found' }); return; }

  const { entries, lastCommit } = await getDirectoryListing(result.diskPath, branch, subPath);
  const commitMap = await getLastCommitForPaths(result.diskPath, branch, entries.map(e => e.path));
  const enriched  = entries.map(e => ({ ...e, lastCommit: commitMap[e.path] ?? null }));

  res.json({ path: subPath, branch, entries: enriched, dirLastCommit: lastCommit });
});

// ── GET /api/repos/:username/:repo/blob/:branch/* ────────────────────────
router.get('/blob/:branch/*', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName, branch } = req.params;
    const filePath = (req.params as Record<string, string>)['0'] ?? '';
    if (!filePath) { res.status(400).json({ error: 'File path required' }); return; }

    const result = await getRepoDisk(username, repoName, req.user?.userId);
    if (!result) { res.status(404).json({ error: 'Repository not found' }); return; }

    const file = await getFileContent(result.diskPath, branch, filePath);
    if (!file) { res.status(404).json({ error: 'File not found' }); return; }

    const ext = extname(filePath).toLowerCase();
    const isImage  = isImageExt(ext);
    const isBinary = isBinaryExt(ext) && !isImage;

    if (isImage) {
      res.json({
        path: filePath,
        branch,
        type: 'image',
        mimeType: imageMimeType(ext),
        base64: file.content.toString('base64'),
        size: file.size,
        sha: file.sha,
      });
      return;
    }

    if (isBinary) {
      res.json({
        path: filePath,
        branch,
        type: 'binary',
        size: file.size,
        sha: file.sha,
        content: null,
      });
      return;
    }

    // Text file
    const content = file.content.toString('utf8');
    const lines   = content.split('\n').length;
    const isMarkdown = ['.md', '.mdx', '.markdown'].includes(ext);

    res.json({
      path: filePath,
      branch,
      type: isMarkdown ? 'markdown' : 'text',
      content,
      lines,
      size: file.size,
      sha: file.sha,
      ext,
    });
  } catch (err) {
    console.error('Blob error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/repos/:username/:repo/raw/:branch/* ─────────────────────────
router.get('/raw/:branch/*', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName, branch } = req.params;
    const filePath = (req.params as Record<string, string>)['0'] ?? '';

    const result = await getRepoDisk(username, repoName, req.user?.userId);
    if (!result) { res.status(404).send('Not found'); return; }

    const file = await getFileContent(result.diskPath, branch, filePath);
    if (!file) { res.status(404).send('Not found'); return; }

    const ext      = extname(filePath).toLowerCase();
    const mimeType = isImageExt(ext) ? imageMimeType(ext) : 'text/plain; charset=utf-8';

    res.set('Content-Type', mimeType);
    res.set('Content-Disposition', `inline; filename="${filePath.split('/').pop()}"`);
    res.set('Content-Length', String(file.size));
    res.send(file.content);
  } catch (err) {
    console.error('Raw file error:', err);
    res.status(500).send('Internal server error');
  }
});

// ── GET /api/repos/:username/:repo/blame/:branch/* ───────────────────────
router.get('/blame/:branch/*', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName, branch } = req.params;
    const filePath = (req.params as Record<string, string>)['0'] ?? '';

    const result = await getRepoDisk(username, repoName, req.user?.userId);
    if (!result) { res.status(404).json({ error: 'Repository not found' }); return; }

    const blame = await getFileBlame(result.diskPath, branch, filePath);
    if (!blame.length) { res.status(404).json({ error: 'File not found or binary' }); return; }

    res.json({ path: filePath, branch, blame });
  } catch (err) {
    console.error('Blame error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/repos/:username/:repo/search?q=...&branch=... ───────────────
router.get('/search', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName } = req.params;
    const query  = (req.query.q  as string ?? '').trim();
    const branch = (req.query.branch as string) ?? 'main';

    if (!query || query.length < 2) {
      res.status(400).json({ error: 'Query must be at least 2 characters' }); return;
    }

    const result = await getRepoDisk(username, repoName, req.user?.userId);
    if (!result) { res.status(404).json({ error: 'Repository not found' }); return; }

    const matches = await searchInRepository(result.diskPath, branch, query);
    res.json({ query, branch, matches });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

// ── PUT /api/repos/:username/:repo/edit/:branch/* ────────────────────────
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest as EditAuthRequest } from '../middleware/auth.js';
import { writeFileAndCommit } from '../lib/gitEngine.js';

router.put('/edit/:branch/*', authMiddleware, async (req: EditAuthRequest, res) => {
  try {
    const { username, repo: repoName, branch } = req.params;
    const filePath = (req.params as Record<string, string>)['0'] ?? '';
    const { content, message } = req.body as { content: string; message: string };

    if (!filePath)  { res.status(400).json({ error: 'File path required' }); return; }
    if (!message?.trim()) { res.status(400).json({ error: 'Commit message required' }); return; }
    if (content === undefined || content === null) {
      res.status(400).json({ error: 'Content required' }); return;
    }

    const result = await getRepoDisk(username, repoName, req.user!.userId);
    if (!result) { res.status(404).json({ error: 'Repository not found' }); return; }
    if (result.repo.ownerId !== req.user!.userId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    if (result.repo.isArchived) {
      res.status(400).json({ error: 'Repository is archived' }); return;
    }

    // Check branch protection
    const protection = await prisma.branchProtection.findUnique({
      where: { repositoryId_branch: { repositoryId: result.repo.id, branch } },
    });
    if (protection?.requirePullRequest) {
      res.status(403).json({ error: `Branch "${branch}" requires a pull request — edit via CLI or open a PR` });
      return;
    }

    const commitSha = await writeFileAndCommit(
      result.diskPath, branch, filePath,
      content, message.trim(),
      req.user!.username,
    );

    // Record contribution
    await prisma.contribution.create({
      data: {
        userId: req.user!.userId,
        repositoryId: result.repo.id,
        contributionType: 'commit',
        contributionDate: new Date(),
      },
    });

    await prisma.repository.update({
      where: { id: result.repo.id },
      data: { updatedAt: new Date() },
    });

    res.json({ commitSha, message: message.trim(), file: filePath });
  } catch (err) {
    console.error('Edit file error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
  }
});
