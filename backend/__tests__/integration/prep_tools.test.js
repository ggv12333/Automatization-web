/**
 * Tests for docking preparer interactions that call external Python tools.
 * We mock child_process.spawn to avoid running real Python binaries.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

// We must set UPLOAD_PATH before importing the route so the module uses our temp dir
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prep-test-'));
process.env.UPLOAD_PATH = tmp;

// Mock child_process.spawn BEFORE importing the route module using Jest's ESM mock helpers
const child_process = jest.createMockFromModule('child_process');

function makeFakeChild(stdoutMessages = [], stderrMessages = [], exitCode = 0) {
  return {
    stdout: { on: (ev, cb) => { if (ev === 'data') { stdoutMessages.forEach(m => cb(Buffer.from(m))); } } },
    stderr: { on: (ev, cb) => { if (ev === 'data') { stderrMessages.forEach(m => cb(Buffer.from(m))); } } },
    on: (ev, cb) => {
      if (ev === 'close') setImmediate(() => cb(exitCode));
    }
  };
}

child_process.spawn = jest.fn((cmd, args) => makeFakeChild([`Simulated stdout for ${cmd} ${args ? args.join(' ') : ''}`], [], 0));

// Use the ESM mock API and dynamically import the modules so the mock is applied
jest.unstable_mockModule('child_process', () => child_process);

let dockingRoutes;
let requestIdMiddleware;

describe('Preprocessing shims and python spawn mocking', () => {
  let app;

  beforeAll(() => {
    app = express();
    // Dynamically import the route and middleware after mocking
    return (async () => {
      const routesMod = await import('../../routes/docking.js');
      const secMod = await import('../../middleware/security.js');
      dockingRoutes = routesMod.default;
      requestIdMiddleware = secMod.requestIdMiddleware;

      app.use(requestIdMiddleware);
      app.use(express.json());
      app.use('/docking', dockingRoutes);
    })();
  });

  afterAll(() => {
    // cleanup temp dir
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch (e) {}
  });

  test('POST /docking/download-pdb should simulate successful preparation', async () => {
    const pdbCode = '1ABC';
    // Create the expected output file that the Python script would produce
    const expected = path.join(tmp, `${pdbCode}_receptor.pdbqt`);
    fs.writeFileSync(expected, 'RECEPTOR PDBQT CONTENT');

    const res = await request(app)
      .post('/docking/download-pdb')
      .send({ pdbCode })
      .expect(200);

    expect(res.body).toHaveProperty('pdbqtFile');
    expect(res.body.pdbqtFile).toContain(`${pdbCode}_receptor.pdbqt`);
  });

  test('POST /docking/prepare-ligands should accept empty payload gracefully', async () => {
    const res = await request(app)
      .post('/docking/prepare-ligands')
      .send({})
      .expect(200);

    expect(res.body).toHaveProperty('success');
  });
});
