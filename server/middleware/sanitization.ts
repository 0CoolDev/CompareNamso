import { Request, Response, NextFunction } from 'express';
import xss from 'xss-clean';
import * as validators from '../../utils/validators.js';

/**
 * XSS Clean middleware - removes any malicious HTML/JS from user input
 */
export const xssClean = xss();

/**
 * Custom input sanitization middleware
 * Sanitizes all string inputs in request body, params, and query
 */
export const sanitizeInputs = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  // Sanitize params
  if (req.params && typeof req.params === 'object') {
    sanitizeObject(req.params);
  }

  // Sanitize query
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }

  next();
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        obj[key] = validators.sanitizeInput(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        sanitizeObject(obj[key]);
      } else if (Array.isArray(obj[key])) {
        obj[key] = obj[key].map((item: any) => {
          if (typeof item === 'string') {
            return validators.sanitizeInput(item);
          } else if (typeof item === 'object' && item !== null) {
            sanitizeObject(item);
            return item;
          }
          return item;
        });
      }
    }
  }
}

/**
 * BIN validation middleware for routes that accept BIN parameters
 */
export const validateBINParam = (req: Request, res: Response, next: NextFunction) => {
  const bin = req.params.bin || req.body.bin;
  
  if (bin) {
    const validation = validators.validateBIN(bin);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid BIN',
        message: validation.error
      });
    }
    
    // Replace with sanitized version
    if (req.params.bin) {
      req.params.bin = validation.sanitized!;
    }
    if (req.body.bin) {
      req.body.bin = validation.sanitized!;
    }
  }
  
  next();
};

/**
 * Card generation input validation middleware
 */
export const validateCardGeneration = (req: Request, res: Response, next: NextFunction) => {
  const validation = validators.validateCardGenerationInput(req.body);
  
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      errors: validation.errors
    });
  }
  
  // Replace body with sanitized data
  req.body = { ...req.body, ...validation.sanitized };
  
  next();
};

/**
 * SQL injection prevention for database queries
 * This is a basic implementation - use parameterized queries in actual database operations
 */
export const preventSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC|EXECUTE|SCRIPT|JAVASCRIPT)\b)/gi,
    /(--|\||;|\/\*|\*\/|xp_|sp_|0x)/gi,
    /(\bOR\b\s*\d+\s*=\s*\d+|\bAND\b\s*\d+\s*=\s*\d+)/gi
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value !== 'string') return true;
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(value)) {
        return false;
      }
    }
    return true;
  };

  const checkObject = (obj: any): boolean => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (typeof value === 'string') {
          if (!checkValue(value)) return false;
        } else if (typeof value === 'object' && value !== null) {
          if (!checkObject(value)) return false;
        }
      }
    }
    return true;
  };

  // Check all input sources
  const sources = [req.body, req.params, req.query];
  for (const source of sources) {
    if (source && !checkObject(source)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Potentially malicious input detected'
      });
    }
  }

  next();
};

/**
 * File upload validation (if needed in future)
 */
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.files) {
    return next();
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  const files = Array.isArray(req.files) ? req.files : Object.values(req.files);
  
  for (const file of files) {
    if (Array.isArray(file)) {
      for (const f of file) {
        if (!validateFile(f, allowedTypes, maxSize)) {
          return res.status(400).json({
            error: 'Invalid file',
            message: 'File type not allowed or file too large'
          });
        }
      }
    } else {
      if (!validateFile(file, allowedTypes, maxSize)) {
        return res.status(400).json({
          error: 'Invalid file',
          message: 'File type not allowed or file too large'
        });
      }
    }
  }

  next();
};

function validateFile(file: any, allowedTypes: string[], maxSize: number): boolean {
  if (!file) return true;
  
  // Check file type
  if (file.mimetype && !allowedTypes.includes(file.mimetype)) {
    return false;
  }
  
  // Check file size
  if (file.size && file.size > maxSize) {
    return false;
  }
  
  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
  const ext = file.name ? file.name.toLowerCase().match(/\.[^.]*$/)?.[0] : null;
  if (ext && !allowedExtensions.includes(ext)) {
    return false;
  }
  
  return true;
}
