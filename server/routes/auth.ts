import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { logoutSession, rotateSession } from '../middleware/session';
import { refreshCSRFToken } from '../middleware/csrf';

const router = Router();

// Login schema with enhanced validation
const loginSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
});

// Mock user database (in production, use proper database with bcrypt for passwords)
const users = new Map([
  ['admin', { 
    id: '1', 
    username: 'admin', 
    passwordHash: crypto.createHash('sha256').update('admin123').digest('hex'),
    role: 'admin'
  }],
]);

// Track failed login attempts (in production, use Redis or database)
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

// Login endpoint with enhanced security
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Check for too many failed attempts from this IP/user combo
    const identifier = `${req.ip}:${req.body.username || 'unknown'}`;
    const attempts = failedAttempts.get(identifier);
    
    if (attempts && attempts.count >= 5) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
      const lockoutTime = 15 * 60 * 1000; // 15 minutes
      
      if (timeSinceLastAttempt < lockoutTime) {
        const remainingTime = Math.ceil((lockoutTime - timeSinceLastAttempt) / 1000);
        return res.status(429).json({ 
          error: 'Too many failed login attempts',
          message: `Account locked. Please try again in ${remainingTime} seconds.`,
          retryAfter: remainingTime
        });
      } else {
        // Reset attempts after lockout period
        failedAttempts.delete(identifier);
      }
    }
    
    // Validate input
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: validationResult.error.errors 
      });
    }
    
    const { username, password } = validationResult.data;
    
    // Find user
    const user = users.get(username);
    if (!user) {
      // Track failed attempt
      const current = failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
      failedAttempts.set(identifier, {
        count: current.count + 1,
        lastAttempt: Date.now()
      });
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password (use bcrypt in production)
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (passwordHash !== user.passwordHash) {
      // Track failed attempt
      const current = failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
      failedAttempts.set(identifier, {
        count: current.count + 1,
        lastAttempt: Date.now()
      });
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Clear failed attempts on successful login
    failedAttempts.delete(identifier);
    
    // Rotate session ID on login (prevent session fixation)
    await rotateSession(req);
    
    // Set session data
    req.session.userId = user.id;
    req.session.lastActivity = Date.now();
    
    // Refresh CSRF token after login
    refreshCSRFToken(req, res, () => {
      // Save session
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session after login:', err);
          return res.status(500).json({ error: 'Session error' });
        }
        
        res.json({ 
          success: true, 
          message: 'Login successful',
          user: { 
            id: user.id, 
            username: user.username,
            role: user.role
          },
          csrfToken: req.session.csrfToken // Send new CSRF token
        });
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', async (req: Request, res: Response) => {
  try {
    await logoutSession(req);
    
    // Clear cookie
    res.clearCookie('cardgenius.sid');
    
    res.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Error during logout' });
  }
});

// Session check endpoint
router.get('/session', (req: Request, res: Response) => {
  if (req.session && req.session.userId) {
    const user = Array.from(users.values()).find(u => u.id === req.session.userId);
    
    res.json({ 
      authenticated: true, 
      userId: req.session.userId,
      username: user?.username,
      role: user?.role,
      sessionId: req.sessionID,
      expires: new Date(Date.now() + (req.session.cookie.maxAge || 0))
    });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// Password reset endpoint (placeholder)
router.post('/forgot-password', async (req: Request, res: Response) => {
  // In production, implement proper password reset with email verification
  res.json({ 
    message: 'Password reset functionality not yet implemented',
    info: 'In production, this would send a reset email'
  });
});

// Clean up old failed attempts periodically
setInterval(() => {
  const now = Date.now();
  const lockoutTime = 15 * 60 * 1000; // 15 minutes
  
  for (const [key, value] of failedAttempts.entries()) {
    if (now - value.lastAttempt > lockoutTime) {
      failedAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

export default router;
