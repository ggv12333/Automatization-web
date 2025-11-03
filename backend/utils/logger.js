/**
 * Structured logging with Winston
 * Provides consistent logging format and levels
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
    let log = `${timestamp} [${level}]`;
    
    if (requestId) {
      log += ` [${requestId}]`;
    }
    
    log += `: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// JSON format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
    level: isProduction ? 'info' : 'debug'
  })
);

// File transports (only in production or if LOG_TO_FILE is set)
if (isProduction || process.env.LOG_TO_FILE === 'true') {
  const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');
  
  // Error log
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  );
  
  // Combined log
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transports,
  // Don't exit on error
  exitOnError: false
});

/**
 * Create a child logger with request context
 * @param {string} requestId - Unique request identifier
 * @returns {winston.Logger} - Child logger with request ID
 */
export function createRequestLogger(requestId) {
  return logger.child({ requestId });
}

/**
 * Log security events
 * @param {string} event - Security event type
 * @param {object} details - Event details
 */
export function logSecurityEvent(event, details) {
  logger.warn('SECURITY_EVENT', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log performance metrics
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in milliseconds
 * @param {object} metadata - Additional metadata
 */
export function logPerformance(operation, duration, metadata = {}) {
  logger.info('PERFORMANCE', {
    operation,
    duration_ms: duration,
    ...metadata
  });
}

export default logger;

