/**
 * Secure file download routes
 * Replaces direct static serving of uploads folder
 */

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import logger, { logSecurityEvent } from "../utils/logger.js";
import { downloadLimiter } from "../middleware/security.js";
import { isSafePath } from "../utils/validators.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, "../uploads");
const workdir = process.env.WORKDIR || "/tmp/workdir";

/**
 * Download a specific result file
 * Validates path to prevent directory traversal
 */
router.get("/results/:sessionId/:filename", downloadLimiter, async (req, res) => {
  try {
    const { sessionId, filename } = req.params;
    
    // Validate session ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      logSecurityEvent('INVALID_SESSION_ID', {
        sessionId,
        ip: req.ip,
        requestId: req.id
      });
      return res.status(400).json({ 
        error: 'Invalid session ID format',
        requestId: req.id
      });
    }
    
    // Validate filename (no path traversal)
    if (!isSafePath(filename)) {
      logSecurityEvent('PATH_TRAVERSAL_ATTEMPT', {
        filename,
        sessionId,
        ip: req.ip,
        requestId: req.id
      });
      return res.status(400).json({ 
        error: 'Invalid filename',
        requestId: req.id
      });
    }
    
    // Construct safe file path
    const filePath = path.join(workdir, sessionId, "resultados", filename);
    
    // Verify file is within allowed directory
    const normalizedPath = path.normalize(filePath);
    const normalizedWorkdir = path.normalize(workdir);
    if (!normalizedPath.startsWith(normalizedWorkdir)) {
      logSecurityEvent('PATH_TRAVERSAL_ATTEMPT', {
        attemptedPath: filePath,
        ip: req.ip,
        requestId: req.id
      });
      return res.status(403).json({ 
        error: 'Access denied',
        requestId: req.id
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.warn('File not found', { filePath, requestId: req.id });
      return res.status(404).json({ 
        error: 'File not found',
        requestId: req.id
      });
    }
    
    // Check if it's a file (not directory)
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      logSecurityEvent('DIRECTORY_DOWNLOAD_ATTEMPT', {
        path: filePath,
        ip: req.ip,
        requestId: req.id
      });
      return res.status(400).json({ 
        error: 'Invalid file',
        requestId: req.id
      });
    }
    
    // Log download
    logger.info('File download', {
      sessionId,
      filename,
      size: stats.size,
      ip: req.ip,
      requestId: req.id
    });
    
    // Send file
    res.download(filePath, filename, (err) => {
      if (err) {
        logger.error('Download error', { 
          error: err.message, 
          filePath, 
          requestId: req.id 
        });
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Download failed',
            requestId: req.id
          });
        }
      }
    });
    
  } catch (error) {
    logger.error('Download route error', { 
      error: error.message, 
      requestId: req.id 
    });
    res.status(500).json({ 
      error: 'Internal server error',
      requestId: req.id
    });
  }
});

/**
 * Download results archive for a session
 */
router.get("/results/:sessionId/archive", downloadLimiter, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Validate session ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      logSecurityEvent('INVALID_SESSION_ID', {
        sessionId,
        ip: req.ip,
        requestId: req.id
      });
      return res.status(400).json({ 
        error: 'Invalid session ID format',
        requestId: req.id
      });
    }
    
    const resultsDir = path.join(workdir, sessionId, "resultados");
    
    // Check if directory exists
    if (!fs.existsSync(resultsDir)) {
      return res.status(404).json({ 
        error: 'Results not found',
        requestId: req.id
      });
    }
    
    // Create archive (implementation depends on archiver library)
    const archivePath = path.join(workdir, sessionId, `results_${sessionId}.zip`);
    
    logger.info('Archive download', {
      sessionId,
      ip: req.ip,
      requestId: req.id
    });
    
    // Send archive
    res.download(archivePath, `results_${sessionId}.zip`, (err) => {
      if (err) {
        logger.error('Archive download error', { 
          error: err.message, 
          requestId: req.id 
        });
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Download failed',
            requestId: req.id
          });
        }
      }
    });
    
  } catch (error) {
    logger.error('Archive download error', { 
      error: error.message, 
      requestId: req.id 
    });
    res.status(500).json({ 
      error: 'Internal server error',
      requestId: req.id
    });
  }
});

export default router;

