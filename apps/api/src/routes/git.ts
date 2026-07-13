import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { getRepoDiskPath } from '../lib/gitEngine.js';
import { authenticateGitRequest, hasScope, requireGitAuth } from '../lib/gitAuth.js';
import prisma from '../lib/prisma.js';

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────

async function resolveRepo(username: string, repoName: string) {
  const owner = await prisma.user.findUnique({ where: { username } });
  if (!owner) return null;
  const repo = await prisma.repository.findUnique({
    where: { ownerId_name: { ownerId: owner.id, name: repoName } },
  });
  return repo;
}

function sendPacketLine(res: Response, msg: string): void {
  const len = msg.length + 4;
  res.write(len.toString(16).padStart(4, '0') + msg);
}

function noCache(res: Response): void {
  res.set('Cache-Control', 'no-cache, max-age=0, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', 'Fri, 01 Jan 1980 00:00:00 GMT');
}

// ── Smart HTTP: Info Refs ──────────────────────────────────────────────────
// GET /:username/:repo.git/info/refs?service=git-{upload,receive}-pack
router.get('/:username/:repo.git/info/refs', async (req: Request, res: Response) => {
  try {
    const { username, repo: repoName } = req.params;
    const service = req.query.service as string;

    if (!service || !['git-upload-pack', 'git-receive-pack'].includes(service)) {
      res.status(400).send('Invalid service');
      return;
    }

    const repo = await resolveRepo(username, repoName.replace(/\.git$/, ''));
    if (!repo) { res.status(404).send('Not found'); return; }

    const isPush = service === 'git-receive-pack';

    // Auth check
    if (repo.visibility === 'PRIVATE' || isPush) {
      const authUser = await authenticateGitRequest(req);
      if (!authUser) { requireGitAuth(res); return; }
      if (repo.ownerId !== authUser.userId) { res.status(403).send('Forbidden'); return; }
      if (isPush && !hasScope(authUser, 'repo:write')) { res.status(403).send('Token lacks repo:write scope'); return; }
    }

    const diskPath = repo.diskPath ?? getRepoDiskPath(username, repoName.replace(/\.git$/, ''));
    if (!existsSync(diskPath)) { res.status(404).send('Repository not initialized'); return; }

    noCache(res);
    res.set('Content-Type', `application/x-${service}-advertisement`);
    res.status(200);

    // Write pkt-line header
    sendPacketLine(res, `# service=${service}\n`);
    res.write('0000'); // flush

    // Spawn git backend
    const cmd = service === 'git-upload-pack' ? 'git-upload-pack' : 'git-receive-pack';
    const proc = spawn(cmd, ['--stateless-rpc', '--advertise-refs', diskPath], {
      env: { ...process.env, GIT_HTTP_EXPORT_ALL: '1' },
    });

    proc.stdout.pipe(res);
    proc.stderr.on('data', (d: Buffer) => console.error(`[git-info-refs] ${d}`));
    proc.on('error', (err) => { console.error('[git-info-refs] spawn error:', err); res.end(); });
    proc.on('close', () => res.end());
  } catch (err) {
    console.error('Git info/refs error:', err);
    res.status(500).send('Internal error');
  }
});

// ── Smart HTTP: git-upload-pack (fetch/clone) ──────────────────────────────
// POST /:username/:repo.git/git-upload-pack
router.post('/:username/:repo.git/git-upload-pack', async (req: Request, res: Response) => {
  try {
    const { username, repo: repoName } = req.params;

    const repo = await resolveRepo(username, repoName.replace(/\.git$/, ''));
    if (!repo) { res.status(404).send('Not found'); return; }

    if (repo.visibility === 'PRIVATE') {
      const authUser = await authenticateGitRequest(req);
      if (!authUser) { requireGitAuth(res); return; }
      if (repo.ownerId !== authUser.userId) { res.status(403).send('Forbidden'); return; }
    }

    const diskPath = repo.diskPath ?? getRepoDiskPath(username, repoName.replace(/\.git$/, ''));
    if (!existsSync(diskPath)) { res.status(404).send('Repository not initialized'); return; }

    noCache(res);
    res.set('Content-Type', 'application/x-git-upload-pack-result');
    res.status(200);

    const proc = spawn('git-upload-pack', ['--stateless-rpc', diskPath], {
      env: { ...process.env, GIT_HTTP_EXPORT_ALL: '1' },
    });

    req.pipe(proc.stdin);
    proc.stdout.pipe(res);
    proc.stderr.on('data', (d: Buffer) => console.error(`[git-upload-pack] ${d}`));
    proc.on('error', (err) => { console.error('[git-upload-pack] spawn error:', err); res.end(); });
    proc.on('close', () => res.end());
  } catch (err) {
    console.error('Git upload-pack error:', err);
    res.status(500).send('Internal error');
  }
});

// ── Smart HTTP: git-receive-pack (push) ───────────────────────────────────
// POST /:username/:repo.git/git-receive-pack
router.post('/:username/:repo.git/git-receive-pack', async (req: Request, res: Response) => {
  try {
    const { username, repo: repoName } = req.params;

    const repo = await resolveRepo(username, repoName.replace(/\.git$/, ''));
    if (!repo) { res.status(404).send('Not found'); return; }

    // Push always requires auth
    const authUser = await authenticateGitRequest(req);
    if (!authUser) { requireGitAuth(res); return; }
    if (repo.ownerId !== authUser.userId) { res.status(403).send('Forbidden'); return; }
    if (!hasScope(authUser, 'repo:write')) { res.status(403).send('Token lacks repo:write scope'); return; }

    if (repo.isArchived) {
      res.status(403).send('Repository is archived and read-only');
      return;
    }

    // Check branch protection
    const protectedBranches = await prisma.branchProtection.findMany({
      where: { repositoryId: repo.id, restrictPushes: true },
    });

    const diskPath = repo.diskPath ?? getRepoDiskPath(username, repoName.replace(/\.git$/, ''));
    if (!existsSync(diskPath)) { res.status(404).send('Repository not initialized'); return; }

    noCache(res);
    res.set('Content-Type', 'application/x-git-receive-pack-result');
    res.status(200);

    const proc = spawn('git-receive-pack', ['--stateless-rpc', diskPath], {
      env: {
        ...process.env,
        GIT_HTTP_EXPORT_ALL: '1',
        // Pass protected branches as env for post-receive hook (Phase 10)
        DTS_PROTECTED_BRANCHES: protectedBranches.map((b: { branch: string }) => b.branch).join(','),
      },
    });

    req.pipe(proc.stdin);
    proc.stdout.pipe(res);
    proc.stderr.on('data', (d: Buffer) => console.error(`[git-receive-pack] ${d}`));
    proc.on('error', (err) => { console.error('[git-receive-pack] spawn error:', err); res.end(); });

    proc.on('close', async () => {
      res.end();
      // Record contribution on successful push
      try {
        await prisma.contribution.create({
          data: {
            userId: authUser.userId,
            repositoryId: repo.id,
            contributionType: 'commit',
            contributionDate: new Date(),
          },
        });
        await prisma.repository.update({
          where: { id: repo.id },
          data: { updatedAt: new Date() },
        });
      } catch { /* non-fatal */ }
    });
  } catch (err) {
    console.error('Git receive-pack error:', err);
    res.status(500).send('Internal error');
  }
});

export default router;
