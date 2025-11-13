/**
 * Custom error classes for better error handling
 * Provides specific error types with appropriate HTTP status codes
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400 Bad Request)
 */
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Authentication error (401 Unauthorized)
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403 Forbidden)
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error (404 Not Found)
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * File validation error (400 Bad Request)
 */
export class FileValidationError extends AppError {
  constructor(message, filename = null) {
    super(message, 400);
    this.name = 'FileValidationError';
    this.filename = filename;
  }
}

/**
 * Rate limit error (429 Too Many Requests)
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfter = null) {
    super(message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * External service error (502 Bad Gateway)
 */
export class ExternalServiceError extends AppError {
  constructor(service, message = 'External service error') {
    super(`${service}: ${message}`, 502);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

/**
 * Docking process error (500 Internal Server Error)
 */
export class DockingError extends AppError {
  constructor(message, details = null) {
    super(message, 500);
    this.name = 'DockingError';
    this.details = details;
  }
}

/**
 * Configuration error (500 Internal Server Error)
 */
export class ConfigurationError extends AppError {
  constructor(message) {
    super(message, 500, false);
    this.name = 'ConfigurationError';
  }
}

/**
 * Check if error is operational (safe to send to client)
 * @param {Error} error - Error to check
 * @returns {boolean}
 */
export function isOperationalError(error) {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Format error for client response
 * @param {Error} error - Error to format
 * @param {boolean} includeStack - Whether to include stack trace (dev only)
 * @returns {object} - Formatted error object
 */
export function formatErrorResponse(error, includeStack = false) {
  const response = {
    error: {
      message: error.message || 'An unexpected error occurred',
      name: error.name || 'Error',
      timestamp: error.timestamp || new Date().toISOString()
    }
  };

  // Add status code if available
  if (error.statusCode) {
    response.error.statusCode = error.statusCode;
  }

  // Add details if available
  if (error.details) {
    response.error.details = error.details;
  }

  // Add retry information for rate limit errors
  if (error.retryAfter) {
    response.error.retryAfter = error.retryAfter;
  }

  // Add stack trace in development
  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
}
