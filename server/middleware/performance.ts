import type { Request, Response, NextFunction } from 'express';
const compression = require('compression');
const express = require('express');
const path = require('path');

// Compression middleware with brotli support
export const compressionMiddleware = compression({
  // Enable brotli compression when supported
  filter: (req: Request, res: Response) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Fallback to standard filter function
    return compression.filter(req, res);
  },
  // Set compression level (1-9, higher = better compression but slower)
  level: 6,
  // Threshold for compression (1kb)
  threshold: 1024,
  // Memory level (1-9, higher = more memory but faster)
  memLevel: 8,
  // Strategy for compression
  strategy: 0, // Default strategy
});

// Static file serving with aggressive caching for hashed assets
export const staticMiddleware = (distPath: string) => {
  return express.static(path.join(distPath, 'public'), {
    // Enable strong ETags
    etag: true,
    // Set cache control headers
    setHeaders: (res: Response, filePath: string) => {
      // Check if file has hash in name (e.g., main.abc123.js)
      const hasHash = /\.[a-f0-9]{8,}\.(js|css|jpg|jpeg|png|gif|svg|webp|woff|woff2|ttf|eot)$/i.test(filePath);
      
      if (hasHash) {
        // Immutable cache for hashed assets (1 year)
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (/\.(html|json|xml|txt)$/i.test(filePath)) {
        // No cache for HTML and data files
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        // Short cache for other assets (1 hour)
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }

      // Add security headers for all static files
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // CORS headers for fonts and images
      if (/\.(woff|woff2|ttf|eot|svg|jpg|jpeg|png|gif|webp)$/i.test(filePath)) {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
    },
    // Enable last modified headers
    lastModified: true,
    // Redirect to trailing slash
    redirect: false,
    // Don't serve dotfiles
    dotfiles: 'deny',
    // Serve index.html for directories
    index: 'index.html',
  });
};

// Performance monitoring middleware
export const performanceMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log response time
  res.on('finish', () => {
    const duration = Date.now() - start;
    const method = req.method;
    const url = req.originalUrl;
    const status = res.statusCode;
    
    // Log slow requests (> 1000ms)
    if (duration > 1000) {
      console.warn(`[SLOW REQUEST] ${method} ${url} - ${status} - ${duration}ms`);
    }
    
    // Add Server-Timing header for performance debugging
    res.setHeader('Server-Timing', `total;dur=${duration}`);
  });
  
  next();
};

// Preload important resources
export const resourceHints = (req: Request, res: Response, next: NextFunction) => {
  // Only add hints for HTML responses
  if (req.path === '/' || req.path.endsWith('.html')) {
    // Preconnect to important origins
    res.setHeader('Link', [
      '<https://fonts.googleapis.com>; rel=preconnect',
      '<https://fonts.gstatic.com>; rel=preconnect; crossorigin',
      // Add more preconnect hints as needed
    ].join(', '));
  }
  next();
};
