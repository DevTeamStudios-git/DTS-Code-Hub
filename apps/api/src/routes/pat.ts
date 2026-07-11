import { Router } from 'express';
import { randomBytes, createHash } from 'crypto';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

const VALID_SCOPES = ['repo', 'repo:read', 'repo:write', 'user', 'user:read', 'issues', 'pull_requests'];

function generateToken(): { raw: string; hash: string } {
  const raw = 'dch_' + randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

// GET /api/pat
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tokens = await prisma.personalAccessToken.findMany({
      where: { userId: req.user!.userId },
      select: {
        id: true, name: true, scopes: true,
        expiresAt: true, lastUsedAt: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ tokens });
  } catch (err) {
    console.error('List PAT error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/pat
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, scopes, expiresInDays } = req.body as {
      name: string;
      scopes: string[];
      expiresInDays?: number;
    };

    if (!name) {
      res.status(400).json({ error: 'Token name is required' });
      return;
    }

    const invalidScopes = (scopes ?? []).filter((s: string) => !VALID_SCOPES.includes(s));
    if (invalidScopes.length > 0) {
      res.status(400).json({ error: `Invalid scopes: ${invalidScopes.join(', ')}` });
      return;
    }

    const { raw, hash } = generateToken();
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const token = await prisma.personalAccessToken.create({
      data: {
        userId: req.user!.userId,
        name,
        tokenHash: hash,
        scopes: scopes ?? [],
        expiresAt,
      },
      select: {
        id: true, name: true, scopes: true,
        expiresAt: true, createdAt: true,
      },
    });

    // Return raw token only once — not stored
    res.status(201).json({ token: { ...token, rawToken: raw } });
  } catch (err) {
    console.error('Create PAT error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/pat/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const token = await prisma.personalAccessToken.findUnique({ where: { id: req.params.id } });

    if (!token || token.userId !== req.user!.userId) {
      res.status(404).json({ error: 'Token not found' });
      return;
    }

    await prisma.personalAccessToken.delete({ where: { id: req.params.id } });
    res.json({ message: 'Token revoked' });
  } catch (err) {
    console.error('Delete PAT error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
