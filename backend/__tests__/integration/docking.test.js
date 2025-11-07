/**
 * Integration tests for docking routes (non-file upload tests)
 */

import request from 'supertest';
import express from 'express';
import dockingRoutes from '../../routes/docking.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/docking', dockingRoutes);

describe('Docking Routes', () => {
  describe('GET /docking/progress/:sessionId', () => {
    test('should reject invalid session ID format', async () => {
      const response = await request(app)
        .get('/docking/progress/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid session ID');
    });

    test('should return 404 for non-existent session', async () => {
      const sessionId = '12345678-1234-1234-1234-123456789012';
      const response = await request(app)
        .get(`/docking/progress/${sessionId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    test('should include requestId in all responses', async () => {
      const response = await request(app)
        .get('/docking/progress/invalid-id');

      expect(response.body).toHaveProperty('requestId');
    });
  });

  describe('POST /docking/download-pdb', () => {
    test('should reject invalid PDB code', async () => {
      const response = await request(app)
        .post('/docking/download-pdb')
        .send({ pdbCode: 'INVALID' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject missing PDB code', async () => {
      const response = await request(app)
        .post('/docking/download-pdb')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject non-alphanumeric PDB codes', async () => {
      const response = await request(app)
        .post('/docking/download-pdb')
        .send({ pdbCode: '1@BC' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /docking/validate-config', () => {
    const validConfig = {
      center_x: '10.5',
      center_y: '-5.2',
      center_z: '0.0',
      size_x: '20',
      size_y: '20',
      size_z: '20',
      exhaustiveness: '8'
    };

    test('should accept valid configuration', async () => {
      const response = await request(app)
        .post('/docking/validate-config')
        .send(validConfig)
        .expect(200);

      expect(response.body).toHaveProperty('valid', true);
    });

    test('should reject missing required fields', async () => {
      const config = { ...validConfig };
      delete config.center_x;

      const response = await request(app)
        .post('/docking/validate-config')
        .send(config)
        .expect(400);

      expect(response.body).toHaveProperty('valid', false);
      expect(response.body).toHaveProperty('errors');
    });

    test('should reject invalid numeric values', async () => {
      const config = { ...validConfig, center_x: 'invalid' };

      const response = await request(app)
        .post('/docking/validate-config')
        .send(config)
        .expect(400);

      expect(response.body).toHaveProperty('valid', false);
    });

    test('should reject out of range values', async () => {
      const config = { ...validConfig, size_x: '2000' };

      const response = await request(app)
        .post('/docking/validate-config')
        .send(config)
        .expect(400);

      expect(response.body).toHaveProperty('valid', false);
    });
  });

  describe('Security Headers', () => {
    test('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/docking/progress/12345678-1234-1234-1234-123456789012');

      expect(response.headers).toHaveProperty('x-request-id');
    });
  });
});
