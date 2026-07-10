import { Router } from 'express';
import { verifyToken } from '../lib/auth';
import { PrismaClient } from '@prisma/client';
import { getSupabaseAdmin } from '../lib/supabase';

const router = Router();
const prisma = new PrismaClient();
const supabaseAdmin = getSupabaseAdmin();

// Middleware to verify JWT token
const authenticate = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Get public user profile by username
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const profile = await prisma.profile.findUnique({
      where: { username },
      include: {
        repositories: {
          where: { visibility: 'PUBLIC' },
          orderBy: { createdAt: 'desc' },
          take: 6
        },
        _count: {
          select: {
            repositories: true,
            stars: true,
            followers: true,
            following: true
          }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      location: profile.location,
      website: profile.website,
      company: profile.company,
      createdAt: profile.createdAt,
      repositories: profile.repositories,
      stats: profile._count
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's repositories
router.get('/:username/repos', async (req, res) => {
  try {
    const { username } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const profile = await prisma.profile.findUnique({
      where: { username }
    });

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const repositories = await prisma.repository.findMany({
      where: { 
        ownerId: profile.id,
        visibility: 'PUBLIC'
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });
    
    const total = await prisma.repository.count({
      where: { 
        ownerId: profile.id,
        visibility: 'PUBLIC'
      }
    });
    
    res.json({
      repositories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user repos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update current user profile
router.put('/me', authenticate, async (req: any, res) => {
  try {
    const { displayName, bio, location, website, company } = req.body;
    
    const profile = await prisma.profile.update({
      where: { id: req.user.userId },
      data: {
        displayName,
        bio,
        location,
        website,
        company
      }
    });
    
    res.json({
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      location: profile.location,
      website: profile.website,
      company: profile.company,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload avatar
router.post('/me/avatar', authenticate, async (req: any, res) => {
  try {
    const { avatarData } = req.body; // Base64 encoded image
    
    if (!avatarData) {
      return res.status(400).json({ error: 'Avatar data is required' });
    }
    
    // Upload to Supabase Storage
    const fileName = `${req.user.userId}/avatar.png`;
    const { data, error } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, Buffer.from(avatarData, 'base64'), {
        upsert: true,
        contentType: 'image/png'
      });
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    // Update profile with new avatar URL
    const profile = await prisma.profile.update({
      where: { id: req.user.userId },
      data: { avatarUrl: publicUrl }
    });
    
    res.json({ avatarUrl: profile.avatarUrl });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get profile README
router.get('/me/readme', authenticate, async (req: any, res) => {
  try {
    // For now, return a placeholder
    // In Phase 4, this will be implemented with actual README storage
    res.json({ 
      readme: null,
      message: 'Profile README not yet implemented'
    });
  } catch (error) {
    console.error('Get readme error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile README
router.put('/me/readme', authenticate, async (req: any, res) => {
  try {
    const { readme } = req.body;
    
    // For now, return a placeholder
    // In Phase 4, this will be implemented with actual README storage
    res.status(501).json({ 
      error: 'Profile README not yet implemented'
    });
  } catch (error) {
    console.error('Update readme error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
