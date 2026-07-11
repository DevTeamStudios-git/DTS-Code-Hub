import { Router } from 'express';
import { createHash } from 'crypto';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

function computeSSHFingerprint(keyText: string): string {
  // Extract the base64 part of the SSH public key
  const parts = keyText.trim().split(' ');
  if (parts.length < 2) throw new Error('Invalid SSH key format');
  const keyData = Buffer.from(parts[1], 'base64');
  return 'SHA256:' + createHash('sha256').update(keyData).digest('base64').replace(/=+$/, '');
}

function validateSSHKey(keyText: string): boolean {
  const validPrefixes = [
    'ssh-rsa', 'ssh-dss', 'ssh-ed25519',
    'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521',
    'sk-ssh-ed25519@openssh.com', 'sk-ecdsa-sha2-nistp256@openssh.com',
  ];
  const trimmed = keyText.trim();
  return validPrefixes.some(p => trimmed.startsWith(p));
}

// GET /api/ssh-keys
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const keys = await prisma.sSHKey.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ keys });
  } catch (err) {
    console.error('List SSH keys error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/ssh-keys
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, keyText } = req.body as { title: string; keyText: string };

    if (!title || !keyText) {
      res.status(400).json({ error: 'Title and key are required' });
      return;
    }

    if (!validateSSHKey(keyText)) {
      res.status(400).json({ error: 'Invalid SSH public key format' });
      return;
    }

    let fingerprint: string;
    try {
      fingerprint = computeSSHFingerprint(keyText);
    } catch {
      res.status(400).json({ error: 'Could not parse SSH key' });
      return;
    }

    const existing = await prisma.sSHKey.findUnique({ where: { fingerprint } });
    if (existing) {
      res.status(400).json({ error: 'This key is already registered' });
      return;
    }

    const key = await prisma.sSHKey.create({
      data: { userId: req.user!.userId, title, keyText: keyText.trim(), fingerprint },
    });

    res.status(201).json({ key });
  } catch (err) {
    console.error('Add SSH key error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/ssh-keys/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const key = await prisma.sSHKey.findUnique({ where: { id: req.params.id } });

    if (!key || key.userId !== req.user!.userId) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }

    await prisma.sSHKey.delete({ where: { id: req.params.id } });
    res.json({ message: 'SSH key deleted' });
  } catch (err) {
    console.error('Delete SSH key error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
