import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/contributions/:username?year=2026
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);

    const contributions = await prisma.contribution.findMany({
      where: {
        userId: user.id,
        contributionDate: { gte: startDate, lte: endDate },
      },
      select: { contributionDate: true, contributionType: true },
    });

    // Aggregate by date
    const byDate: Record<string, number> = {};
    for (const c of contributions) {
      const dateStr = c.contributionDate.toISOString().split('T')[0];
      byDate[dateStr] = (byDate[dateStr] ?? 0) + 1;
    }

    const totalContributions = contributions.length;
    const streak = computeStreak(byDate);

    res.json({ contributions: byDate, totalContributions, streak, year });
  } catch (err) {
    console.error('Get contributions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/contributions — record a contribution (internal use)
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { repositoryId, contributionType } = req.body as {
      repositoryId?: string;
      contributionType: string;
    };

    const validTypes = ['commit', 'pr', 'issue', 'review', 'comment'];
    if (!validTypes.includes(contributionType)) {
      res.status(400).json({ error: 'Invalid contribution type' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.contribution.create({
      data: {
        userId: req.user!.userId,
        repositoryId: repositoryId ?? null,
        contributionType,
        contributionDate: today,
      },
    });

    res.status(201).json({ message: 'Contribution recorded' });
  } catch (err) {
    console.error('Record contribution error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function computeStreak(byDate: Record<string, number>): { current: number; longest: number } {
  const today = new Date();
  let current = 0;
  let longest = 0;
  let temp = 0;

  // Build sorted date list for longest streak
  const allDates = Object.keys(byDate).sort();
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) {
      temp = 1;
    } else {
      const prev = new Date(allDates[i - 1]);
      const curr = new Date(allDates[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      temp = diff === 1 ? temp + 1 : 1;
    }
    longest = Math.max(longest, temp);
  }

  // Current streak (working backwards from today)
  for (let d = 0; d < 365; d++) {
    const check = new Date(today);
    check.setDate(today.getDate() - d);
    const dateStr = check.toISOString().split('T')[0];
    if (byDate[dateStr]) {
      current++;
    } else if (d > 0) {
      break;
    }
  }

  return { current, longest };
}

export default router;
