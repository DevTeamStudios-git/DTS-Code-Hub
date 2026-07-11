import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/users/:username — public profile
router.get('/:username', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        location: true,
        website: true,
        company: true,
        profileReadme: true,
        createdAt: true,
        _count: {
          select: {
            repositories: true,
            followers: true,
            following: true,
            stars: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isFollowing = req.user
      ? await prisma.follow.findUnique({
          where: {
            followerId_followingId: { followerId: req.user.userId, followingId: user.id },
          },
        })
      : null;

    res.json({ user: { ...user, isFollowing: !!isFollowing } });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/me — update own profile
router.put('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { displayName, bio, location, website, company, language } = req.body as {
      displayName?: string;
      bio?: string;
      location?: string;
      website?: string;
      company?: string;
      language?: string;
    };

    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(website !== undefined && { website }),
        ...(company !== undefined && { company }),
        ...(language !== undefined && { language }),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        location: true,
        website: true,
        company: true,
        language: true,
      },
    });

    res.json({ user: updated });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/me/avatar — upload avatar to Supabase Storage
router.post('/me/avatar', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { base64, contentType } = req.body as { base64: string; contentType: string };

    if (!base64 || !contentType) {
      res.status(400).json({ error: 'base64 and contentType are required' });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      res.status(400).json({ error: 'Invalid image type' });
      return;
    }

    const buffer = Buffer.from(base64, 'base64');
    const filePath = `avatars/${req.user!.userId}/avatar`;
    const supabaseAdmin = getSupabaseAdmin();

    const { error: uploadError } = await supabaseAdmin.storage
      .from('user-assets')
      .upload(filePath, buffer, { contentType, upsert: true });

    if (uploadError) {
      res.status(500).json({ error: uploadError.message });
      return;
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('user-assets')
      .getPublicUrl(filePath);

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { avatarUrl: urlData.publicUrl },
    });

    res.json({ avatarUrl: urlData.publicUrl });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/me/readme
router.get('/me/readme', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { profileReadme: true },
    });
    res.json({ readme: user?.profileReadme ?? '' });
  } catch (err) {
    console.error('Get readme error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/me/readme
router.put('/me/readme', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body as { content: string };
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { profileReadme: content },
    });
    res.json({ message: 'README updated' });
  } catch (err) {
    console.error('Update readme error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:username/repos
router.get('/:username/repos', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isOwner = req.user?.userId === user.id;

    const repos = await prisma.repository.findMany({
      where: {
        ownerId: user.id,
        ...(isOwner ? {} : { visibility: 'PUBLIC' }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { stars: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ repos });
  } catch (err) {
    console.error('Get repos error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/:username/follow
router.post('/:username/follow', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username } = req.params;
    const target = await prisma.user.findUnique({ where: { username } });
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (target.id === req.user!.userId) {
      res.status(400).json({ error: 'Cannot follow yourself' });
      return;
    }

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: req.user!.userId, followingId: target.id } },
      create: { followerId: req.user!.userId, followingId: target.id },
      update: {},
    });

    res.json({ message: 'Following' });
  } catch (err) {
    console.error('Follow error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:username/follow
router.delete('/:username/follow', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username } = req.params;
    const target = await prisma.user.findUnique({ where: { username } });
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await prisma.follow.deleteMany({
      where: { followerId: req.user!.userId, followingId: target.id },
    });

    res.json({ message: 'Unfollowed' });
  } catch (err) {
    console.error('Unfollow error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
