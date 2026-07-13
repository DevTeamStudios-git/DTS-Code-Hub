import { Router } from 'express';
import simpleGit from 'simple-git';
import { existsSync } from 'fs';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { getRepoDiskPath } from '../lib/gitEngine.js';

const router = Router({ mergeParams: true });

// ── Helpers ──────────────────────────────────────────────────────────────

async function resolveRepoDiskPath(
  username: string,
  repoName: string,
  requesterId?: string,
): Promise<{ diskPath: string; repoId: string; ownerId: string } | null> {
  const owner = await prisma.user.findUnique({ where: { username } });
  if (!owner) return null;
  const repo = await prisma.repository.findUnique({
    where: { ownerId_name: { ownerId: owner.id, name: repoName } },
  });
  if (!repo) return null;
  if (repo.visibility === 'PRIVATE' && repo.ownerId !== requesterId) return null;
  return {
    diskPath: repo.diskPath ?? getRepoDiskPath(username, repoName),
    repoId: repo.id,
    ownerId: repo.ownerId,
  };
}

// ── GET /api/repos/:username/:repo/commits/:branch ───────────────────────
router.get('/:branch', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName, branch } = req.params;
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);

    const result = await resolveRepoDiskPath(username, repoName, req.user?.userId);
    if (!result) { res.status(404).json({ error: 'Repository not found' }); return; }
    if (!existsSync(result.diskPath)) { res.json({ commits: [], total: 0 }); return; }

    const git = simpleGit(result.diskPath);

    // Verify branch exists
    const branches = await git.branch(['-a']).catch(() => null);
    if (!branches) { res.json({ commits: [], total: 0 }); return; }

    const branchExists =
      branches.all.includes(branch) ||
      branches.all.includes(`remotes/origin/${branch}`);
    if (!branchExists) { res.status(404).json({ error: 'Branch not found' }); return; }

    // Total count
    let total = 0;
    try {
      const countRaw = await git.raw(['rev-list', '--count', branch]);
      total = parseInt(countRaw.trim(), 10) || 0;
    } catch { /* empty repo */ }

    if (total === 0) { res.json({ commits: [], total: 0 }); return; }

    // Paginated log
    const skip = (page - 1) * limit;
    const logResult = await git.log([
      branch,
      `--skip=${skip}`,
      `-n`, `${limit}`,
      '--format=%H|%an|%ae|%aI|%s|%P',
    ]);

    const commits = logResult.all.map(c => ({
      sha:       c.hash,
      shortSha:  c.hash.slice(0, 7),
      author:    c.author_name,
      email:     c.author_email,
      date:      c.date,
      message:   c.message,
      parents:   (c as unknown as { diff?: { files: unknown[] } }).diff?.files ?? [],
    }));

    // Also parse raw to get parent SHAs
    const rawLines = await git.raw([
      'log', branch,
      `--skip=${skip}`,
      `-n`, `${limit}`,
      '--format=%H|%an|%ae|%aI|%s|%P',
    ]);

    const enriched = rawLines.trim().split('\n').filter(Boolean).map(line => {
      const [sha, author, email, date, message, parents] = line.split('|');
      return {
        sha,
        shortSha: sha?.slice(0, 7),
        author,
        email,
        date,
        message,
        parents: parents ? parents.split(' ').filter(Boolean) : [],
        isMerge: (parents?.split(' ').filter(Boolean).length ?? 0) > 1,
      };
    });

    void commits; // use enriched version below
    res.json({ commits: enriched, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('List commits error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/repos/:username/:repo/commit/:sha ───────────────────────────
router.get('/commit/:sha', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName, sha } = req.params;

    const result = await resolveRepoDiskPath(username, repoName, req.user?.userId);
    if (!result) { res.status(404).json({ error: 'Repository not found' }); return; }
    if (!existsSync(result.diskPath)) { res.status(404).json({ error: 'No commits yet' }); return; }

    const git = simpleGit(result.diskPath);

    // Commit metadata
    const metaRaw = await git.raw(['show', '--no-patch', '--format=%H|%an|%ae|%aI|%s|%b|%P', sha]);
    const metaLine = metaRaw.trim().split('\n')[0];
    if (!metaLine) { res.status(404).json({ error: 'Commit not found' }); return; }

    const [fullSha, author, email, date, subject, body, parents] = metaLine.split('|');

    // Diff stat
    const statRaw = await git.raw(['show', '--stat', '--format=', sha]);

    // Full diff (limit to 500KB)
    let diffRaw = '';
    try {
      diffRaw = await git.raw(['show', '--format=', '--unified=3', sha]);
      if (diffRaw.length > 500_000) diffRaw = diffRaw.slice(0, 500_000) + '\n... diff truncated ...';
    } catch { /* binary or empty */ }

    // Parse diff into file hunks
    const files = parseDiff(diffRaw);

    res.json({
      commit: {
        sha: fullSha,
        shortSha: fullSha?.slice(0, 7),
        author,
        email,
        date,
        message: subject,
        body: body?.trim() || null,
        parents: parents ? parents.split(' ').filter(Boolean) : [],
        isMerge: (parents?.split(' ').filter(Boolean).length ?? 0) > 1,
        stat: statRaw.trim(),
      },
      files,
    });
  } catch (err) {
    console.error('Get commit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/repos/:username/:repo/cherry-pick ──────────────────────────
router.post('/cherry-pick', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName } = req.params;
    const { sha, targetBranch } = req.body as { sha: string; targetBranch: string };

    if (!sha || !targetBranch) {
      res.status(400).json({ error: 'sha and targetBranch are required' }); return;
    }

    const result = await resolveRepoDiskPath(username, repoName, req.user?.userId);
    if (!result) { res.status(404).json({ error: 'Repository not found' }); return; }
    if (result.ownerId !== req.user!.userId) { res.status(403).json({ error: 'Forbidden' }); return; }

    // Check branch protection
    const owner = await prisma.user.findUnique({ where: { username } });
    const repo  = owner ? await prisma.repository.findUnique({
      where: { ownerId_name: { ownerId: owner.id, name: repoName } },
    }) : null;

    if (repo) {
      const protection = await prisma.branchProtection.findUnique({
        where: { repositoryId_branch: { repositoryId: repo.id, branch: targetBranch } },
      });
      if (protection?.requirePullRequest) {
        res.status(403).json({ error: `Branch "${targetBranch}" requires a pull request — direct push not allowed` });
        return;
      }
    }

    if (!existsSync(result.diskPath)) { res.status(400).json({ error: 'Repository has no commits' }); return; }

    const git = simpleGit(result.diskPath);
    await git.addConfig('user.name', username);
    await git.addConfig('user.email', `${username}@dts-code-hub.local`);

    // Cherry-pick in bare repo using worktree
    const { mkdtemp } = await import('fs/promises');
    const { tmpdir } = await import('os');
    const { rm } = await import('fs/promises');
    const workDir = await mkdtemp(`${tmpdir()}/dts-cp-`);

    try {
      const workGit = simpleGit();
      await workGit.clone(result.diskPath, workDir, ['--branch', targetBranch]);
      const wg = simpleGit(workDir);
      await wg.addConfig('user.name', username);
      await wg.addConfig('user.email', `${username}@dts-code-hub.local`);
      await wg.raw(['cherry-pick', sha]);
      await wg.push('origin', targetBranch);

      // Record contribution
      await prisma.contribution.create({
        data: { userId: req.user!.userId, repositoryId: result.repoId, contributionType: 'commit', contributionDate: new Date() },
      });

      res.json({ message: `Commit ${sha.slice(0, 7)} cherry-picked onto ${targetBranch}` });
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Cherry-pick failed';
    if (msg.includes('conflict') || msg.includes('CONFLICT')) {
      res.status(409).json({ error: 'Cherry-pick has conflicts — resolve manually via CLI' });
    } else {
      console.error('Cherry-pick error:', err);
      res.status(500).json({ error: msg });
    }
  }
});

// ── POST /api/repos/:username/:repo/revert ───────────────────────────────
router.post('/revert', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName } = req.params;
    const { sha, targetBranch } = req.body as { sha: string; targetBranch: string };

    if (!sha || !targetBranch) {
      res.status(400).json({ error: 'sha and targetBranch are required' }); return;
    }

    const result = await resolveRepoDiskPath(username, repoName, req.user?.userId);
    if (!result) { res.status(404).json({ error: 'Repository not found' }); return; }
    if (result.ownerId !== req.user!.userId) { res.status(403).json({ error: 'Forbidden' }); return; }

    const owner = await prisma.user.findUnique({ where: { username } });
    const repo  = owner ? await prisma.repository.findUnique({
      where: { ownerId_name: { ownerId: owner.id, name: repoName } },
    }) : null;

    if (repo) {
      const protection = await prisma.branchProtection.findUnique({
        where: { repositoryId_branch: { repositoryId: repo.id, branch: targetBranch } },
      });
      if (protection?.requirePullRequest) {
        res.status(403).json({ error: `Branch "${targetBranch}" requires a pull request` }); return;
      }
    }

    if (!existsSync(result.diskPath)) { res.status(400).json({ error: 'Repository has no commits' }); return; }

    const { mkdtemp } = await import('fs/promises');
    const { tmpdir } = await import('os');
    const { rm } = await import('fs/promises');
    const workDir = await mkdtemp(`${tmpdir()}/dts-revert-`);

    try {
      const workGit = simpleGit();
      await workGit.clone(result.diskPath, workDir, ['--branch', targetBranch]);
      const wg = simpleGit(workDir);
      await wg.addConfig('user.name', username);
      await wg.addConfig('user.email', `${username}@dts-code-hub.local`);
      await wg.raw(['revert', '--no-edit', sha]);
      await wg.push('origin', targetBranch);

      await prisma.contribution.create({
        data: { userId: req.user!.userId, repositoryId: result.repoId, contributionType: 'commit', contributionDate: new Date() },
      });

      res.json({ message: `Commit ${sha.slice(0, 7)} reverted on ${targetBranch}` });
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Revert failed';
    if (msg.includes('conflict') || msg.includes('CONFLICT')) {
      res.status(409).json({ error: 'Revert has conflicts — resolve manually via CLI' });
    } else {
      console.error('Revert error:', err);
      res.status(500).json({ error: msg });
    }
  }
});

// ── Diff parser helper ────────────────────────────────────────────────────

interface DiffFile {
  oldPath: string;
  newPath: string;
  status: 'added' | 'deleted' | 'modified' | 'renamed' | 'unknown';
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

interface DiffLine {
  type: 'context' | 'add' | 'del';
  content: string;
  oldLineNo: number | null;
  newLineNo: number | null;
}

function parseDiff(raw: string): DiffFile[] {
  const files: DiffFile[] = [];
  const fileBlocks = raw.split(/^diff --git /m).filter(Boolean);

  for (const block of fileBlocks) {
    const lines = block.split('\n');
    const headerLine = lines[0] ?? '';
    const [, pathA, pathB] = headerLine.match(/a\/(.+?) b\/(.+)/) ?? [];

    let status: DiffFile['status'] = 'modified';
    let oldPath = pathA ?? '';
    let newPath = pathB ?? '';

    for (const line of lines.slice(1, 6)) {
      if (line.startsWith('new file')) { status = 'added'; oldPath = '/dev/null'; break; }
      if (line.startsWith('deleted file')) { status = 'deleted'; newPath = '/dev/null'; break; }
      if (line.startsWith('rename')) { status = 'renamed'; break; }
    }

    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;
    let oldLine = 0;
    let newLine = 0;
    let additions = 0;
    let deletions = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        oldLine = parseInt(match?.[1] ?? '1', 10);
        newLine = parseInt(match?.[2] ?? '1', 10);
        currentHunk = { header: line, lines: [] };
        hunks.push(currentHunk);
        continue;
      }
      if (!currentHunk) continue;
      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentHunk.lines.push({ type: 'add', content: line.slice(1), oldLineNo: null, newLineNo: newLine++ });
        additions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentHunk.lines.push({ type: 'del', content: line.slice(1), oldLineNo: oldLine++, newLineNo: null });
        deletions++;
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({ type: 'context', content: line.slice(1), oldLineNo: oldLine++, newLineNo: newLine++ });
      }
    }

    files.push({ oldPath, newPath, status, additions, deletions, hunks });
  }

  return files;
}

export default router;
