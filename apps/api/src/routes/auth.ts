import { Router } from 'express';
import { supabaseAdmin, getSupabase } from '../lib/supabase';
import { createToken, verifyToken } from '../lib/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Register a new user
router.post('/signup', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-30 characters and can only contain letters, numbers, hyphens, and underscores' });
    }
    
    // Check if username is already taken
    const existingProfile = await prisma.profile.findUnique({
      where: { username }
    });

    if (existingProfile) {
      return res.status(400).json({ error: 'Username is already taken' });
    }
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });
    
    if (authError) {
      return res.status(400).json({ error: authError.message });
    }
    
    if (!authData.user) {
      return res.status(400).json({ error: 'Failed to create user' });
    }
    
    // Create profile in database
    const profile = await prisma.profile.create({
      data: {
        id: authData.user.id,
        username,
        displayName: username,
      }
    });
    
    // Create JWT token
    const token = await createToken({
      userId: authData.user.id,
      email: authData.user.email!,
      username: profile.username,
    });
    
    res.status(201).json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username: profile.username,
        displayName: profile.displayName,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!authData.user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Fetch user profile from database
    const profile = await prisma.profile.findUnique({
      where: { id: authData.user.id }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const token = await createToken({
      userId: authData.user.id,
      email: authData.user.email!,
      username: profile.username,
    });
    
    res.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (token) {
      await supabaseAdmin.auth.signOut();
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current session
router.get('/session', async (req, res) => {
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
    
    // Fetch user profile
    const profile = await prisma.profile.findUnique({
      where: { id: payload.userId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json({
      user: {
        id: profile.id,
        email: payload.email,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        company: profile.company,
      }
    });
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OAuth - GitHub
router.post('/oauth/github', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    // This will be implemented when GitHub OAuth is configured in Supabase
    // For now, return a placeholder response
    res.status(501).json({ error: 'GitHub OAuth not yet configured' });
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OAuth - Google
router.post('/oauth/google', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    // This will be implemented when Google OAuth is configured in Supabase
    // For now, return a placeholder response
    res.status(501).json({ error: 'Google OAuth not yet configured' });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OAuth callback handler
router.get('/oauth/callback', async (req, res) => {
  try {
    const { provider, code } = req.query;
    
    if (!provider || !code) {
      return res.status(400).json({ error: 'Provider and code are required' });
    }
    
    // This will be implemented when OAuth providers are configured
    res.status(501).json({ error: 'OAuth callback not yet implemented' });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request password reset
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.APP_URL || 'http://localhost:5173'}/reset-password`,
    });
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Confirm password reset with new password
router.post('/confirm-reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    
    const { error } = await supabaseAdmin.auth.updateUser({
      password
    });
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password confirm error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
