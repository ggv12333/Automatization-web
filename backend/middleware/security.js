/**
 * Security middleware
 * Handles rate limiting, request validation, and security headers
 */

import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import logger, { logSecurityEvent } from '../utils/logger.js';

/**
 * Rate limiter for general API requests
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent')
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Stricter rate limiter for file upload endpoints
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: 'Too many upload requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    logSecurityEvent('UPLOAD_RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent')
    });
    res.status(429).json({
      error: 'Too many upload requests, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Rate limiter for download endpoints
 */
export const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 downloads per 15 minutes
  message: 'Too many download requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for progress polling endpoints
 * More permissive since frontend polls every 500ms during active docking
 */
export const progressLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // Limit each IP to 200 progress requests per minute (allows ~3 requests/second)
  message: 'Too many progress requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

/**
 * Rate limiter for docking start endpoint
 * More permissive than upload limiter to allow testing and multiple runs
 */
export const dockingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 docking runs per hour
  message: 'Too many docking requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

/**
 * Add request ID to all requests for tracing
 */
export function requestIdMiddleware(req, res, next) {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
}

/**
 * Log all incoming requests
 */
export function requestLoggerMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration_ms: duration
    });
  });
  
  next();
}

/**
 * Validate Content-Type for POST/PUT requests
 */
export function validateContentType(req, res, next) {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('content-type');
    
    // Allow multipart/form-data for file uploads
    // Allow application/json for JSON requests
    if (contentType && 
        !contentType.includes('multipart/form-data') && 
        !contentType.includes('application/json')) {
      logSecurityEvent('INVALID_CONTENT_TYPE', {
        requestId: req.id,
        contentType,
        path: req.path,
        ip: req.ip
      });
      return res.status(415).json({
        error: 'Unsupported Media Type',
        message: 'Content-Type must be multipart/form-data or application/json'
      });
    }
  }
  
  next();
}

/**
 * Sanitize request body to prevent prototype pollution
 */
export function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    // Remove dangerous properties
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    
    function cleanObject(obj) {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }
      
      for (const key of dangerousKeys) {
        delete obj[key];
      }
      
      // Recursively clean nested objects
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
          obj[key] = cleanObject(obj[key]);
        }
      }
      
      return obj;
    }
    
    req.body = cleanObject(req.body);
  }
  
  next();
}

/**
 * Set security headers
 */
export function securityHeaders(req, res, next) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (adjust as needed)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
  );
  
  next();
}

/**
 * Global error handler
 */
export function errorHandler(err, req, res, next) {
  // Log error
  logger.error('Request error', {
    requestId: req.id,
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.path,
    method: req.method
  });
  
  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: err.message
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: err.message
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected file field',
        message: err.message
      });
    }
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      message: err.message,
      details: err.details
    });
  }
  
  // Custom application errors
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({
      error: {
        message: err.message,
        name: err.name,
        details: err.details,
        timestamp: err.timestamp
      },
      requestId: req.id
    });
  }
  
  // Log non-operational errors (programming errors)
  logger.error('Non-operational error', {
    error: err.message,
    stack: err.stack,
    requestId: req.id
  });
  
  // Default error response
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(statusCode).json({
    error: {
      message: isProduction ? 'Internal server error' : err.message,
      name: err.name || 'Error',
      ...(isProduction ? {} : { stack: err.stack })
    },
    requestId: req.id
  });
}

/**
 * 404 handler
 */
export function notFoundHandler(req, res) {
  logger.warn('Route not found', {
    requestId: req.id,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    requestId: req.id
  });
}

