import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Custom validation error handler middleware
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : undefined,
        message: err.msg,
        value: err.type === 'field' ? err.value : undefined
      }))
    });
  }
  next();
};

// BIN parameter validation
export const binParam = param('bin')
  .isLength({ min: 6, max: 16 })
  .withMessage('BIN must be between 6 and 16 digits')
  .isNumeric()
  .withMessage('BIN must contain only numbers')
  .trim()
  .escape();

// Card generation validation chain
export const generateCardsValidation = [
  body('bin')
    .isLength({ min: 6, max: 8 })
    .withMessage('BIN must be between 6 and 8 digits')
    .isNumeric()
    .withMessage('BIN must contain only numbers')
    .trim()
    .escape(),
  
  body('month')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 2, max: 2 })
    .withMessage('Month must be 2 digits')
    .isNumeric()
    .withMessage('Month must be numeric')
    .custom((value) => {
      if (value) {
        const monthNum = parseInt(value);
        return monthNum >= 1 && monthNum <= 12;
      }
      return true;
    })
    .withMessage('Month must be between 01 and 12')
    .trim()
    .escape(),
  
  body('year')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 4, max: 4 })
    .withMessage('Year must be 4 digits')
    .isNumeric()
    .withMessage('Year must be numeric')
    .custom((value) => {
      if (value) {
        const yearNum = parseInt(value);
        return yearNum >= 2024 && yearNum <= 2050;
      }
      return true;
    })
    .withMessage('Year must be between 2024 and 2050')
    .trim()
    .escape(),
  
  body('ccv2')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 3, max: 4 })
    .withMessage('CCV must be 3 or 4 digits')
    .isNumeric()
    .withMessage('CCV must be numeric')
    .trim()
    .escape(),
  
  body('quantity')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Quantity must be between 1 and 1000')
    .toInt(),
  
  body('seed')
    .optional({ nullable: true })
    .isInt()
    .withMessage('Seed must be an integer')
    .toInt()
];

// Sanitize all string inputs in request body
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        // Remove any HTML tags and trim whitespace
        req.body[key] = req.body[key].replace(/<[^>]*>/g, '').trim();
      }
    }
  }
  next();
};

// Sanitize all string inputs in request params
export const sanitizeParams = (req: Request, res: Response, next: NextFunction) => {
  if (req.params && typeof req.params === 'object') {
    for (const key in req.params) {
      if (typeof req.params[key] === 'string') {
        // Remove any HTML tags and trim whitespace
        req.params[key] = req.params[key].replace(/<[^>]*>/g, '').trim();
      }
    }
  }
  next();
};
