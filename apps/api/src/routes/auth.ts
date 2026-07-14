import { Router } from 'express';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

// POST /api/auth/register
// Register endpoint is now handled by /signup
// This route is kept for backward compatibility but redirects to signup
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body as { email: string; password: string; username: string };

    if (!email || !password || !username) {
      res.status(400).json({ error: 'Email, password, and username are required' });
      return;
    }

    if (!/^[a-zA-Z0-9_-]{3,39}$/.test(username)) {
      res.status(400).json({ error: 'Username must be 3–39 chars, letters/numbers/hyphens/underscores only' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      res.status(400).json({ error: 'Username already taken' });
      return;
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({ email, password });

    if (authError || !authData.user) {
      res.status(400).json({ error: authError?.message ?? 'Failed to create account' });
      return;
    }

    // Create corresponding user profile in our DB
    await prisma.user.create({
      data: {
        id: authData.user.id,
        username,
        email,
        displayName: username,
      },
    });

    res.status(201).json({
      message: 'Account created. Please check your email to confirm your address.',
      user: { id: authData.user.id, email, username },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: authData.user.id } });
    if (!dbUser) {
      res.status(401).json({ error: 'User profile not found' });
      return;
    }

    const has2FA = await prisma.twoFactorSecret.findUnique({
      where: { userId: dbUser.id, verified: true },
    });

    res.json({
      session: authData.session,
      user: {
        id: dbUser.id,
        username: dbUser.username,
        displayName: dbUser.displayName,
        avatarUrl: dbUser.avatarUrl,
      },
      requires2FA: !!has2FA,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const authHeader = req.headers.authorization!;
    const token = authHeader.substring(7);
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin.auth.admin.signOut(token);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/oauth-callback — create local profile after OAuth sign-in
router.post('/oauth-callback', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.substring(7);
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    if (!user.email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    let dbUser = await prisma.user.findUnique({ where: { id: user.id } });

    if (!dbUser) {
      let username = user.email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
      if (!username || username.length < 3) username = `user${Math.random().toString(36).slice(2, 7)}`;
      if (username.length > 39) username = username.slice(0, 39);

      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        username = `${username.slice(0, 34)}_${Math.random().toString(36).slice(2, 7)}`;
      }

      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          username,
          displayName: user.user_metadata?.full_name ?? user.email.split('@')[0],
          avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
        },
      });
    }

    res.json({
      user: {
        id: dbUser.id,
        username: dbUser.username,
        displayName: dbUser.displayName,
        avatarUrl: dbUser.avatarUrl,
        bio: dbUser.bio,
        location: dbUser.location,
        website: dbUser.website,
        company: dbUser.company,
      },
    });
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/session
router.get('/session', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      user: {
        id: dbUser.id,
        username: dbUser.username,
        displayName: dbUser.displayName,
        avatarUrl: dbUser.avatarUrl,
        bio: dbUser.bio,
        location: dbUser.location,
        website: dbUser.website,
        company: dbUser.company,
      },
    });
  } catch (err) {
    console.error('Session error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body as { email: string };
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.WEB_URL ?? 'http://localhost:5173'}/auth/reset-password`,
    });
    res.json({ message: 'If an account exists, a reset email has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { password } = req.body as { password: string };
    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user!.userId, { password });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
