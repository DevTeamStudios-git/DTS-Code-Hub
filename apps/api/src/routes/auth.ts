import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { createToken } from '../lib/auth';

const router = Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
    });
    
    if (authError) {
      return res.status(400).json({ error: authError.message });
    }
    
    if (!authData.user) {
      return res.status(400).json({ error: 'Failed to create user' });
    }
    
    // Create JWT token
    const token = await createToken({
      userId: authData.user.id,
      email: authData.user.email!,
      username,
    });
    
    res.status(201).json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username,
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
    
    // In a real implementation, you would fetch the username from your database
    // For now, we'll use email as username placeholder
    const token = await createToken({
      userId: authData.user.id,
      email: authData.user.email!,
      username: authData.user.email!.split('@')[0],
    });
    
    res.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username: authData.user.email!.split('@')[0],
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
