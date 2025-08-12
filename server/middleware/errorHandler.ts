import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  status?: number;
  statusCode?: number;
  errors?: any[];
}

export const globalErrorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error for debugging
  console.error('Error:', err);

  // Default error status and message
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || undefined;

  // Handle validation errors
  if (status === 400 && errors) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors
    });
  }

  // Handle other client errors
  if (status >= 400 && status < 500) {
    return res.status(status).json({
      message: message
    });
  }

  // Handle server errors (don't expose internal details)
  if (status >= 500) {
    return res.status(status).json({
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : message
    });
  }

  // Default response
  res.status(status).json({ message });
};
