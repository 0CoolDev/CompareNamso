import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

// Initialize Redis client
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redis = new Redis(redisUrl);

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  maxTokens: 100,        // Maximum tokens in the bucket (100 requests)
  refillRate: 100,       // Tokens refilled per hour
  windowMs: 3600000,     // 1 hour in milliseconds
};

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

// Helper function to get client IP (handles Cloudflare and nginx proxy)
function getClientIp(req: Request): string {
  // Priority order for IP detection:
  // 1. Cloudflare connecting IP (passed by nginx as X-Real-IP)
  // 2. X-Forwarded-For (also set by nginx from Cloudflare)
  // 3. X-Real-IP header
  // 4. Socket remote address
  
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp;
  }
  
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (forwarded as string).split(',');
    return ips[0].trim();
  }
  
  // Fall back to socket IP
  return req.socket.remoteAddress || 'unknown';
}

// Token bucket implementation
async function getTokenBucket(key: string): Promise<TokenBucket> {
  const data = await redis.get(key);
  
  if (!data) {
    // Initialize new bucket with full tokens
    return {
      tokens: RATE_LIMIT_CONFIG.maxTokens,
      lastRefill: Date.now(),
    };
  }
  
  try {
    return JSON.parse(data);
  } catch (e) {
    // If parse fails, reset bucket
    return {
      tokens: RATE_LIMIT_CONFIG.maxTokens,
      lastRefill: Date.now(),
    };
  }
}

// Refill tokens based on elapsed time
function refillTokens(bucket: TokenBucket): TokenBucket {
  const now = Date.now();
  const timePassed = now - bucket.lastRefill;
  
  // Calculate tokens to add based on time passed
  const tokensToAdd = Math.floor(
    (timePassed / RATE_LIMIT_CONFIG.windowMs) * RATE_LIMIT_CONFIG.refillRate
  );
  
  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(
      bucket.tokens + tokensToAdd,
      RATE_LIMIT_CONFIG.maxTokens
    );
    bucket.lastRefill = now;
  }
  
  return bucket;
}

// Rate limiting middleware
export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Skip rate limiting for health checks
    if (req.path === '/api/health' || req.path === '/health') {
      return next();
    }
    
    const clientIp = getClientIp(req);
    const key = `rate_limit:${clientIp}`;
    
    // Get current bucket state
    let bucket = await getTokenBucket(key);
    
    // Refill tokens based on elapsed time
    bucket = refillTokens(bucket);
    
    // Check if request can proceed
    if (bucket.tokens > 0) {
      // Consume a token
      bucket.tokens--;
      
      // Save updated bucket state with TTL of 2 hours
      await redis.set(
        key,
        JSON.stringify(bucket),
        'EX',
        7200 // 2 hours TTL to clean up old entries
      );
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', RATE_LIMIT_CONFIG.maxTokens.toString());
      res.setHeader('X-RateLimit-Remaining', bucket.tokens.toString());
      res.setHeader(
        'X-RateLimit-Reset',
        new Date(bucket.lastRefill + RATE_LIMIT_CONFIG.windowMs).toISOString()
      );
      
      next();
    } else {
      // Rate limit exceeded
      const resetTime = new Date(
        bucket.lastRefill + RATE_LIMIT_CONFIG.windowMs
      );
      
      res.setHeader('X-RateLimit-Limit', RATE_LIMIT_CONFIG.maxTokens.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', resetTime.toISOString());
      res.setHeader('Retry-After', Math.ceil(RATE_LIMIT_CONFIG.windowMs / 1000).toString());
      
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: resetTime.toISOString(),
      });
    }
  } catch (error) {
    // Log error but don't block requests if Redis is down
    console.error('Rate limiting error:', error);
    
    // Fail open for better availability when Redis is unavailable
    next();
  }
}

// Health check for Redis connection
export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    console.log('✅ Redis connection successful');
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    return false;
  }
}

// Cleanup function for graceful shutdown
export async function closeRedisConnection(): Promise<void> {
  await redis.quit();
  console.log('Redis connection closed');
}
