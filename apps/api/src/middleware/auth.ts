import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../lib/supabase.js';
import prisma from '../lib/prisma.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    username: string;
  };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { username: true },
    });

    req.user = {
      userId: user.id,
      email: user.email!,
      username: dbUser?.username ?? '',
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

      if (!error && user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { username: true },
        });
        req.user = {
          userId: user.id,
          email: user.email!,
          username: dbUser?.username ?? '',
        };
      }
    } catch {
      // silently skip — optional auth
    }
  }

  next();
}
