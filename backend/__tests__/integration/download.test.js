/**
 * Integration tests for download routes
 */

import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import downloadRoutes from '../../routes/download.js';
import { requestIdMiddleware } from '../../middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create test app
const app = express();
app.use(requestIdMiddleware);
app.use('/download', downloadRoutes);

describe('Download Routes', () => {
  describe('GET /download/results/:sessionId/:filename', () => {
    test('should reject invalid session ID format', async () => {
      const response = await request(app)
        .get('/download/results/invalid-id/file.pdbqt')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid session ID');
    });

    test('should reject path traversal attempts', async () => {
      const sessionId = '12345678-1234-1234-1234-123456789012';
      // Express routing normalizes paths, so ../.. results in 404 (route not found)
      // Test with actual malicious filename that passes routing
      const response = await request(app)
        .get(`/download/results/${sessionId}/..%2F..%2Fetc%2Fpasswd`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid filename');
    });

    test('should return 404 for non-existent file', async () => {
      const sessionId = '12345678-1234-1234-1234-123456789012';
      const response = await request(app)
        .get(`/download/results/${sessionId}/nonexistent.pdbqt`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    test('should include requestId in all responses', async () => {
      const sessionId = '12345678-1234-1234-1234-123456789012';
      const response = await request(app)
        .get(`/download/results/${sessionId}/file.pdbqt`);

      expect(response.body).toHaveProperty('requestId');
    });
  });

  describe('GET /download/results/:sessionId/archive', () => {
    test('should reject invalid session ID format', async () => {
      const response = await request(app)
        .get('/download/results/invalid-id/archive')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid session ID');
    });

    test('should return 404 for non-existent session', async () => {
      const sessionId = '12345678-1234-1234-1234-123456789012';
      const response = await request(app)
        .get(`/download/results/${sessionId}/archive`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Security', () => {
    test('should prevent directory listing attempts', async () => {
      const sessionId = '12345678-1234-1234-1234-123456789012';
      // Testing with . (current directory) which should be rejected
      const response = await request(app)
        .get(`/download/results/${sessionId}/.`);
      
      // Should reject with 400 for invalid filename or 404 if not found
      expect([400, 404]).toContain(response.status);
    });

    test('should sanitize filename with special characters', async () => {
      const sessionId = '12345678-1234-1234-1234-123456789012';
      const response = await request(app)
        .get(`/download/results/${sessionId}/file\x00.pdbqt`);

      // Should either reject or sanitize
      expect([400, 404]).toContain(response.status);
    });
  });
});
