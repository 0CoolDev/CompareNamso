import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Custom key generator to handle proxied requests
const getClientIdentifier = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? 
    (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim()) : 
    req.socket.remoteAddress || 'unknown';
  return ip;
};

// General API rate limiter - 100 requests per 15 minutes per IP
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: getClientIdentifier,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 900)
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

// Strict rate limiter for authentication endpoints - 5 attempts per 15 minutes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window for auth endpoints
  skipSuccessfulRequests: false, // Count successful requests too
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use a combination of IP and username/email for auth endpoints
    const ip = getClientIdentifier(req);
    const identifier = req.body?.email || req.body?.username || '';
    return `${ip}:${identifier}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Too many failed login attempts. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 900)
    });
  }
});

// Webhook rate limiter - 50 requests per minute
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many webhook requests',
      message: 'Webhook rate limit exceeded. Please slow down.',
      retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 60)
    });
  }
});

// Create card rate limiter - stricter limits for card generation
export const cardGenerationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 card generation requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many card generation requests',
      message: 'Card generation rate limit exceeded. Please wait before generating more cards.',
      retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 60)
    });
  }
});

// Health check functions for compatibility
export async function checkRedisConnection(): Promise<boolean> {
  console.log('✅ Rate limiting configured with express-rate-limit (in-memory store)');
  return true;
}

export async function closeRedisConnection(): Promise<void> {
  console.log('Rate limiter using in-memory store - no external connections to close');
}

// Export type extensions for TypeScript
declare module 'express' {
  interface Request {
    rateLimit?: {
      limit: number;
      current: number;
      remaining: number;
      resetTime: number;
    };
  }
}
