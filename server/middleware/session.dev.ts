// Development-friendly session configuration
// This file shows how to adjust settings for local development

import session from 'express-session';
import crypto from 'crypto';

// Development session configuration
export const devSessionMiddleware = session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiry on activity
  cookie: {
    secure: false, // Allow HTTP in development
    httpOnly: true, // Still prevent XSS
    sameSite: 'lax', // CSRF protection
    maxAge: 30 * 60 * 1000, // 30 minutes
  },
  name: 'sessionId',
});

// Note: To use this in development, update server/index.ts:
// import { sessionMiddleware } from process.env.NODE_ENV === 'production' 
//   ? './middleware/session' 
//   : './middleware/session.dev';
