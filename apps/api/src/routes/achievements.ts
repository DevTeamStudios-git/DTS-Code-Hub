import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/achievements/:username
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const achievements = await prisma.achievement.findMany({
      where: { userId: user.id },
      orderBy: { earnedAt: 'asc' },
    });

    res.json({ achievements });
  } catch (err) {
    console.error('Get achievements error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
