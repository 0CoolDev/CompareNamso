import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend Express Request type to include session
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
    csrfTokenCreatedAt?: number;
  }
}

// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_MAX_AGE = 2 * 60 * 60 * 1000; // 2 hours

// List of paths to exclude from CSRF protection
const CSRF_EXEMPT_PATHS = [
  '/api/health',
  '/api/csrf-token',
  '/api/webhook', // Webhooks typically can't send CSRF tokens
];

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Validate CSRF token format
 */
function isValidTokenFormat(token: string): boolean {
  return typeof token === 'string' && 
         token.length === CSRF_TOKEN_LENGTH * 2 && 
         /^[a-f0-9]+$/.test(token);
}

/**
 * CSRF protection middleware
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for GET/HEAD/OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for exempt paths
  if (CSRF_EXEMPT_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Get token from various sources
  const tokenFromHeader = req.headers['x-csrf-token'] as string;
  const tokenFromBody = req.body?._csrf;
  const tokenFromQuery = req.query._csrf as string;
  
  const providedToken = tokenFromHeader || tokenFromBody || tokenFromQuery;
  const sessionToken = req.session?.csrfToken;
  const tokenCreatedAt = req.session?.csrfTokenCreatedAt;

  // Check if session exists
  if (!req.session) {
    return res.status(403).json({
      error: 'CSRF validation failed',
      message: 'Session not initialized',
      code: 'NO_SESSION'
    });
  }

  // Check if token exists
  if (!sessionToken) {
    return res.status(403).json({
      error: 'CSRF validation failed',
      message: 'No CSRF token in session',
      code: 'NO_TOKEN_IN_SESSION'
    });
  }

  // Check token age
  if (tokenCreatedAt && Date.now() - tokenCreatedAt > CSRF_TOKEN_MAX_AGE) {
    // Token expired, generate new one
    req.session.csrfToken = generateCSRFToken();
    req.session.csrfTokenCreatedAt = Date.now();
    
    return res.status(403).json({
      error: 'CSRF validation failed',
      message: 'CSRF token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Validate provided token
  if (!providedToken) {
    res.setHeader('X-CSRF-Error', 'missing');
    return res.status(403).json({
      error: 'CSRF validation failed',
      message: 'Missing CSRF token',
      code: 'MISSING_TOKEN'
    });
  }

  // Validate token format
  if (!isValidTokenFormat(providedToken)) {
    res.setHeader('X-CSRF-Error', 'invalid-format');
    return res.status(403).json({
      error: 'CSRF validation failed',
      message: 'Invalid CSRF token format',
      code: 'INVALID_FORMAT'
    });
  }

  // Constant-time comparison to prevent timing attacks
  const providedBuffer = Buffer.from(providedToken);
  const sessionBuffer = Buffer.from(sessionToken);
  
  if (providedBuffer.length !== sessionBuffer.length || 
      !crypto.timingSafeEqual(providedBuffer, sessionBuffer)) {
    res.setHeader('X-CSRF-Error', 'mismatch');
    return res.status(403).json({
      error: 'CSRF validation failed',
      message: 'Invalid CSRF token',
      code: 'TOKEN_MISMATCH'
    });
  }

  // Token is valid, continue
  next();
}

/**
 * Endpoint to get CSRF token
 */
export function getCSRFToken(req: Request, res: Response): void {
  if (!req.session) {
    return res.status(500).json({ 
      error: 'Session not initialized',
      message: 'Unable to generate CSRF token without session'
    });
  }

  // Generate new token if not exists or expired
  const tokenAge = req.session.csrfTokenCreatedAt ? 
    Date.now() - req.session.csrfTokenCreatedAt : 
    CSRF_TOKEN_MAX_AGE + 1;

  if (!req.session.csrfToken || tokenAge > CSRF_TOKEN_MAX_AGE) {
    req.session.csrfToken = generateCSRFToken();
    req.session.csrfTokenCreatedAt = Date.now();
    
    // Save session to ensure token is persisted
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session with CSRF token:', err);
      }
    });
  }

  // Set cache control headers to prevent caching of CSRF token
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  res.json({ 
    csrfToken: req.session.csrfToken,
    expiresIn: CSRF_TOKEN_MAX_AGE - (Date.now() - (req.session.csrfTokenCreatedAt || Date.now()))
  });
}

/**
 * Middleware to refresh CSRF token after successful authentication
 */
export function refreshCSRFToken(req: Request, res: Response, next: NextFunction): void {
  if (!req.session) {
    return next();
  }

  // Generate new CSRF token
  req.session.csrfToken = generateCSRFToken();
  req.session.csrfTokenCreatedAt = Date.now();

  // Save session
  req.session.save((err) => {
    if (err) {
      console.error('Error refreshing CSRF token:', err);
    }
  });

  next();
}
