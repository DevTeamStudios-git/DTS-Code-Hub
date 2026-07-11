import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

function extractGPGKeyId(publicKey: string): string {
  // Extract key ID from armored GPG key header (simplified)
  const match = publicKey.match(/-----BEGIN PGP PUBLIC KEY BLOCK-----/);
  if (!match) throw new Error('Invalid GPG key format');
  // Generate a pseudo key ID from content hash for display
  const content = publicKey.replace(/\s+/g, '');
  return content.substring(content.length - 16).toUpperCase();
}

function validateGPGKey(publicKey: string): boolean {
  return (
    publicKey.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----') &&
    publicKey.includes('-----END PGP PUBLIC KEY BLOCK-----')
  );
}

// GET /api/gpg-keys
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const keys = await prisma.gPGKey.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ keys });
  } catch (err) {
    console.error('List GPG keys error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/gpg-keys
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { publicKey, keyName } = req.body as { publicKey: string; keyName?: string };

    if (!publicKey) {
      res.status(400).json({ error: 'Public key is required' });
      return;
    }

    if (!validateGPGKey(publicKey)) {
      res.status(400).json({ error: 'Invalid GPG public key format. Must be an ASCII-armored PGP key.' });
      return;
    }

    let keyId: string;
    try {
      keyId = extractGPGKeyId(publicKey);
    } catch {
      res.status(400).json({ error: 'Could not parse GPG key' });
      return;
    }

    const key = await prisma.gPGKey.create({
      data: {
        userId: req.user!.userId,
        keyId,
        publicKey,
        keyName: keyName ?? null,
      },
    });

    res.status(201).json({ key });
  } catch (err) {
    console.error('Add GPG key error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/gpg-keys/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const key = await prisma.gPGKey.findUnique({ where: { id: req.params.id } });

    if (!key || key.userId !== req.user!.userId) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }

    await prisma.gPGKey.delete({ where: { id: req.params.id } });
    res.json({ message: 'GPG key deleted' });
  } catch (err) {
    console.error('Delete GPG key error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
