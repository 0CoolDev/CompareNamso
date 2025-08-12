import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { rateLimitMiddleware, checkRedisConnection, closeRedisConnection } from "./middleware/rateLimit";
import { sessionMiddleware, validateSession, closeSessionRedis } from "./middleware/session";
import { csrfProtection, getCSRFToken } from "./middleware/csrf";
import { globalErrorHandler } from "./middleware/errorHandler";

const app = express();

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Adjust for your needs
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware (must be before CSRF)
app.use(sessionMiddleware);
\n// Session validation middleware - validates and refreshes sessions
app.use(validateSession);

// Apply rate limiting middleware globally
app.use(rateLimitMiddleware);

// CSRF token endpoint (before CSRF protection middleware)
app.get('/api/csrf-token', getCSRFToken);

// Apply CSRF protection to all routes except GET and specific endpoints
app.use(csrfProtection);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Check Redis connection on startup
  await checkRedisConnection();

  const server = await registerRoutes(app);

  // Enhanced error handling middleware
  app.use(globalErrorHandler);

  // Setup Vite or static serving
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Server configuration
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    log(`${signal} signal received: closing HTTP server and Redis connections`);
    server.close(() => {
      log('HTTP server closed');
    });
    await closeRedisConnection();
    await closeSessionRedis();
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();
