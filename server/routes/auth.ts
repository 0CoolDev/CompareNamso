import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { logoutSession, regenerateSession } from '../middleware/session';

const router = Router();

// Login schema
const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

// Mock user database (in production, use proper database)
const users = new Map([
  ['admin', { 
    id: '1', 
    username: 'admin', 
    passwordHash: crypto.createHash('sha256').update('admin123').digest('hex') 
  }],
]);

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const { username, password } = loginSchema.parse(req.body);
    
    // Find user
    const user = users.get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (passwordHash !== user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Regenerate session on login (prevent session fixation)
    await regenerateSession(req);
    
    // Set session data
    req.session.userId = user.id;
    req.session.lastActivity = Date.now();
    
    res.json({ 
      success: true, 
      message: 'Login successful',
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', async (req: Request, res: Response) => {
  try {
    await logoutSession(req);
    res.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Error during logout' });
  }
});

// Session check endpoint
router.get('/session', (req: Request, res: Response) => {
  if (req.session && req.session.userId) {
    res.json({ 
      authenticated: true, 
      userId: req.session.userId,
      sessionId: req.sessionID,
      expires: new Date(Date.now() + (req.session.cookie.maxAge || 0))
    });
  } else {
    res.json({ authenticated: false });
  }
});

export default router;
