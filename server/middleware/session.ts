import session from 'express-session';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Generate or use existing session secret
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Session configuration with enhanced security
export const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiry on activity
  cookie: {
    secure: process.env.NODE_ENV === 'production' || process.env.USE_HTTPS === 'true', // Force HTTPS in production
    httpOnly: true, // Prevent XSS attacks
    sameSite: 'strict', // Enhanced CSRF protection
    maxAge: 30 * 60 * 1000, // 30 minutes
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined, // Set if behind proxy
  },
  name: 'cardgenius.sid', // Custom session name (not default)
  genid: () => {
    // Generate cryptographically secure session IDs
    return crypto.randomBytes(32).toString('hex');
  }
});

// Session validation middleware
export const validateSession = (req: Request, res: Response, next: NextFunction) => {
  // Skip validation for public endpoints
  const publicPaths = [
    '/api/health',
    '/api/csrf-token',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password'
  ];

  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

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
  
  // Check if user is authenticated for protected routes
  if (req.path.startsWith('/api/') && !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  next();
};

// Session rotation on login - regenerate session ID to prevent fixation attacks
export const rotateSession = (req: Request): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tempSession = { ...req.session };
    
    req.session.regenerate((err) => {
      if (err) {
        console.error('Error regenerating session:', err);
        reject(err);
      } else {
        // Restore session data after regeneration
        Object.assign(req.session, tempSession);
        // Update session metadata
        req.session.lastActivity = Date.now();
        req.session.rotatedAt = Date.now();
        
        // Save the session
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Error saving regenerated session:', saveErr);
            reject(saveErr);
          } else {
            resolve();
          }
        });
      }
    });
  });
};

// Session logout helper
export const logoutSession = (req: Request): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!req.session) {
      resolve();
      return;
    }
    
    // Clear session data
    req.session.userId = undefined;
    req.session.csrfToken = undefined;
    
    // Destroy the session
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

// Session regeneration helper (for login) - deprecated, use rotateSession instead
export const regenerateSession = (req: Request): Promise<void> => {
  console.warn('regenerateSession is deprecated, use rotateSession instead');
  return rotateSession(req);
};

// Placeholder for session store cleanup (using MemoryStore)
export async function closeSessionRedis(): Promise<void> {
  console.log('Using MemoryStore - no external connections to close');
}

// Session security headers middleware
export const sessionSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Add cache control headers for authenticated responses
  if (req.session && req.session.userId) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
};

// Extend Express Session interface to include custom properties
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    lastActivity?: number;
    csrfToken?: string;
    rotatedAt?: number;
    loginAttempts?: number;
    lastLoginAttempt?: number;
  }
}
