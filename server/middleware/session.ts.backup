import session from 'express-session';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';
import Redis from 'ioredis';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Create Redis client for sessions (separate from rate limiting)
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisClient = new Redis(redisUrl);

// Session configuration with enhanced security
export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiry on activity - ROLLING SESSIONS ENABLED
  cookie: {
    secure: true, // FORCED HTTPS only
    httpOnly: true, // Prevent XSS attacks
    sameSite: 'lax', // CSRF protection with 'lax' as required
    maxAge: 30 * 60 * 1000, // 30 minutes as required
  },
  name: 'sessionId', // Change from default 'connect.sid'
});

// Session validation middleware
export const validateSession = (req: Request, res: Response, next: NextFunction) => {
  // Check if session exists
  if (!req.session) {
    return res.status(401).json({ error: 'No session found' });
  }

  // Check session timestamp (if exists)
  const now = Date.now();
  const lastActivity = req.session.lastActivity as number | undefined;
  
  if (lastActivity) {
    const maxInactivity = 30 * 60 * 1000; // 30 minutes
    if (now - lastActivity > maxInactivity) {
      // Session expired due to inactivity
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying expired session:', err);
        }
      });
      return res.status(401).json({ error: 'Session expired' });
    }
  }

  // Update last activity timestamp
  req.session.lastActivity = now;
  
  // Check if user is authenticated (if userId exists in session)
  if (req.path.startsWith('/api/') && 
      !req.path.includes('/auth/') && 
      !req.path.includes('/csrf-token') &&
      !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  next();
};

// Session logout helper
export const logoutSession = (req: Request): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!req.session) {
      resolve();
      return;
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Session regeneration helper (for login)
export const regenerateSession = (req: Request): Promise<void> => {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        console.error('Error regenerating session:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Close Redis connection for sessions
export async function closeSessionRedis(): Promise<void> {
  await redisClient.quit();
  console.log('Session Redis connection closed');
}

// Extend Express Session interface to include custom properties
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    lastActivity?: number;
    csrfToken?: string;
  }
}
