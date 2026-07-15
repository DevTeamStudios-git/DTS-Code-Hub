import { Router } from 'express';
import simpleGit from 'simple-git';
import { existsSync } from 'fs';
import { optionalAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { getRepoDiskPath } from '../lib/gitEngine.js';

const router = Router({ mergeParams: true });

// ── GET /api/repos/:username/:repo/compare/:base...:head ─────────────────
// Also supports :base...:head (three-dot) and :base..:head (two-dot)
router.get('/*', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { username, repo: repoName } = req.params;
    const refs = (req.params as Record<string, string>)['0'] ?? '';

    // Parse base...head or base..head
    const threeMatch = refs.match(/^(.+?)\.{3}(.+)$/);
    const twoMatch   = refs.match(/^(.+?)\.{2}(.+)$/);
    const parsed     = threeMatch ?? twoMatch;

    if (!parsed) {
      res.status(400).json({ error: 'Invalid compare format. Use base...head or base..head' });
      return;
    }

    const [, base, head] = parsed;
    const isThreeDot = !!threeMatch;

    const owner = await prisma.user.findUnique({ where: { username } });
    if (!owner) { res.status(404).json({ error: 'User not found' }); return; }

    const repo = await prisma.repository.findUnique({
      where: { ownerId_name: { ownerId: owner.id, name: repoName } },
    });
    if (!repo) { res.status(404).json({ error: 'Repository not found' }); return; }
    if (repo.visibility === 'PRIVATE' && repo.ownerId !== req.user?.userId) {
      res.status(404).json({ error: 'Repository not found' }); return;
    }

    const diskPath = repo.diskPath ?? getRepoDiskPath(username, repoName);
    if (!existsSync(diskPath)) { res.json({ base, head, commits: [], diff: '' }); return; }

    const git = simpleGit(diskPath);

    // Commits between refs
    const logRaw = await git.raw([
      'log',
      isThreeDot ? `${base}...${head}` : `${base}..${head}`,
      '--format=%H|%an|%ae|%aI|%s',
    ]).catch(() => '');

    const commits = logRaw.trim().split('\n').filter(Boolean).map(line => {
      const [sha, author, email, date, message] = line.split('|');
      return { sha, shortSha: sha?.slice(0, 7), author, email, date, message };
    });

    // Diff
    let diffRaw = '';
    try {
      const diffRef = isThreeDot ? `${base}...${head}` : `${base}..${head}`;
      diffRaw = await git.raw(['diff', '--unified=3', diffRef]);
      if (diffRaw.length > 1_000_000) {
        diffRaw = diffRaw.slice(0, 1_000_000) + '\n... diff truncated ...';
      }
    } catch { /* incompatible refs */ }

    // Parse diff
    const files = parseDiff(diffRaw);

    // Stat
    const statRaw = await git.raw([
      'diff', '--stat',
      isThreeDot ? `${base}...${head}` : `${base}..${head}`,
    ]).catch(() => '');

    res.json({
      base,
      head,
      commits,
      files,
      stat: statRaw.trim(),
      totalAdditions: files.reduce((s, f) => s + f.additions, 0),
      totalDeletions: files.reduce((s, f) => s + f.deletions, 0),
    });
  } catch (err) {
    console.error('Compare error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Diff parser (same as in commits.ts) ──────────────────────────────────

interface DiffFile {
  oldPath: string;
  newPath: string;
  status: 'added' | 'deleted' | 'modified' | 'renamed' | 'unknown';
  additions: number;
  deletions: number;
  hunks: Array<{ header: string; lines: Array<{ type: string; content: string; oldLineNo: number | null; newLineNo: number | null }> }>;
}

function parseDiff(raw: string): DiffFile[] {
  const files: DiffFile[] = [];
  const blocks = raw.split(/^diff --git /m).filter(Boolean);

  for (const block of blocks) {
    const lines = block.split('\n');
    const [, pathA, pathB] = lines[0]?.match(/a\/(.+?) b\/(.+)/) ?? [];

    let status: DiffFile['status'] = 'modified';
    for (const l of lines.slice(1, 6)) {
      if (l.startsWith('new file'))    { status = 'added';   break; }
      if (l.startsWith('deleted file')){ status = 'deleted'; break; }
      if (l.startsWith('rename'))      { status = 'renamed'; break; }
    }

    const hunks: DiffFile['hunks'] = [];
    let cur: DiffFile['hunks'][number] | null = null;
    let oldLine = 0, newLine = 0, additions = 0, deletions = 0;

    for (const l of lines) {
      if (l.startsWith('@@')) {
        const m = l.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        oldLine = parseInt(m?.[1] ?? '1', 10);
        newLine = parseInt(m?.[2] ?? '1', 10);
        cur = { header: l, lines: [] };
        hunks.push(cur);
      } else if (cur) {
        if (l.startsWith('+') && !l.startsWith('+++')) {
          cur.lines.push({ type: 'add', content: l.slice(1), oldLineNo: null, newLineNo: newLine++ });
          additions++;
        } else if (l.startsWith('-') && !l.startsWith('---')) {
          cur.lines.push({ type: 'del', content: l.slice(1), oldLineNo: oldLine++, newLineNo: null });
          deletions++;
        } else if (l.startsWith(' ')) {
          cur.lines.push({ type: 'context', content: l.slice(1), oldLineNo: oldLine++, newLineNo: newLine++ });
        }
      }
    }

    files.push({ oldPath: pathA ?? '', newPath: pathB ?? '', status, additions, deletions, hunks });
  }

  return files;
}

export default router;
