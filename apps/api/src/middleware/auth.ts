import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    username: string;
  };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  const user = await verifyToken(token);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = user;
  next();
}

export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = await verifyToken(token);
    if (user) {
      req.user = user;
    }
  }
  
  next();
}
