import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend Express Request type to include session
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
  }
}

// Generate CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// CSRF middleware
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for GET requests and health checks
  if (req.method === 'GET' || req.path === '/api/health' || req.path === '/api/csrf-token') {
    return next();
  }

  // Get token from various sources
  const tokenFromHeader = req.headers['x-csrf-token'] as string;
  const tokenFromBody = req.body?._csrf;
  const tokenFromQuery = req.query._csrf as string;
  
  const providedToken = tokenFromHeader || tokenFromBody || tokenFromQuery;
  const sessionToken = req.session?.csrfToken;

  // Validate token
  if (!providedToken || !sessionToken || providedToken !== sessionToken) {
    return res.status(403).json({
      error: 'CSRF token validation failed',
      message: 'Invalid or missing CSRF token'
    });
  }

  next();
}

// Endpoint to get CSRF token
export function getCSRFToken(req: Request, res: Response): void {
  if (!req.session) {
    return res.status(500).json({ error: 'Session not initialized' });
  }

  // Generate new token if not exists
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCSRFToken();
  }

  res.json({ csrfToken: req.session.csrfToken });
}
