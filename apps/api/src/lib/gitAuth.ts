import { createHash } from 'crypto';
import { Request } from 'express';
import prisma from './prisma.js';

export interface GitAuthUser {
  userId: string;
  username: string;
  scopes: string[];
}

export async function authenticateGitRequest(req: Request): Promise<GitAuthUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) return null;

  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  const colonIdx = decoded.indexOf(':');
  if (colonIdx === -1) return null;

  const username = decoded.slice(0, colonIdx);
  const token    = decoded.slice(colonIdx + 1);
  if (!username || !token) return null;

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true },
  });
  if (!user) return null;

  // Try PAT match first (preferred)
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const pat = await prisma.personalAccessToken.findUnique({
    where: { tokenHash },
    select: { userId: true, scopes: true, expiresAt: true },
  });

  if (pat && pat.userId === user.id) {
    if (pat.expiresAt && new Date() > pat.expiresAt) return null;

    // Update last used timestamp (fire-and-forget)
    void prisma.personalAccessToken.update({
      where: { tokenHash },
      data: { lastUsedAt: new Date() },
    });

    return { userId: user.id, username: user.username, scopes: pat.scopes };
  }

  return null;
}

export function hasScope(user: GitAuthUser, required: string): boolean {
  if (user.scopes.includes('repo')) return true; // full repo access
  return user.scopes.includes(required);
}

export function requireGitAuth(res: import('express').Response): void {
  res.set('WWW-Authenticate', 'Basic realm="DTS Code Hub"');
  res.status(401).send('Authentication required');
}
