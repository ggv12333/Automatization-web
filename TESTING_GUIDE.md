# 🧪 Testing Guide

## Overview

This project uses **Jest** for unit and integration testing, providing comprehensive test coverage for validators, file handling, and API endpoints.

## Running Tests

### Install Dependencies (if not already installed)
```bash
cd backend
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode (for development)
```bash
npm run test:watch
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/` directory.
Open `coverage/lcov-report/index.html` in your browser to view detailed coverage.

---

## Test Structure

```
backend/
├── __tests__/
│   ├── utils/
│   │   ├── validators.test.js      # Unit tests for input validation
│   │   └── fileValidator.test.js   # Unit tests for file validation
│   └── integration/
│       ├── download.test.js        # Integration tests for download routes
│       └── docking.test.js         # Integration tests for docking routes
```

---

## Test Coverage

### Unit Tests

#### `validators.test.js` (20 tests)
Tests for input validation utilities:
- ✅ PDB code validation (valid/invalid formats)
- ✅ Filename sanitization (path traversal, special chars)
- ✅ File extension validation
- ✅ Docking configuration validation
- ✅ Mode validation

#### `fileValidator.test.js` (13 tests)
Tests for file validation utilities:
- ✅ Extension list retrieval
- ✅ File size limits
- ✅ Molecular file format detection (PDBQT, PDB, SDF, MOL2)
- ✅ Binary vs text file detection

### Integration Tests

#### `download.test.js` (7 tests)
Tests for download endpoints:
- ✅ Session ID validation
- ✅ Path traversal prevention
- ✅ File existence checks
- ✅ Security headers
- ✅ Error responses

#### `docking.test.js` (10 tests)
Tests for docking endpoints:
- ✅ Progress polling with invalid session
- ✅ PDB code validation
- ✅ Configuration validation
- ✅ Security measures
- ✅ Error handling

---

## Writing New Tests

### Unit Test Example

```javascript
// backend/__tests__/utils/myutil.test.js
import { myFunction } from '../../utils/myutil.js';

describe('MyUtil', () => {
  describe('myFunction', () => {
    test('should handle valid input', () => {
      const result = myFunction('valid');
      expect(result).toBe(true);
    });

    test('should reject invalid input', () => {
      const result = myFunction('invalid');
      expect(result).toBe(false);
    });
  });
});
```

### Integration Test Example

```javascript
// backend/__tests__/integration/myroute.test.js
import request from 'supertest';
import express from 'express';
import myRoutes from '../../routes/myroute.js';

const app = express();
app.use('/api', myRoutes);

describe('My Route', () => {
  test('GET /api/endpoint should return 200', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

---

## Test Configuration

### `jest.config.json`
```json
{
  "testEnvironment": "node",
  "extensionsToTreatAsEsm": [".js"],
  "testMatch": [
    "**/__tests__/**/*.test.js",
    "**/?(*.)+(spec|test).js"
  ],
  "collectCoverageFrom": [
    "backend/**/*.js",
    "!backend/node_modules/**",
    "!backend/**/*.test.js"
  ]
}
```

---

## Continuous Integration

### GitHub Actions (Recommended)
Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm install
      - run: cd backend && npm test
      - run: cd backend && npm run test:coverage
```

---

## Coverage Goals

| Category | Current | Target |
|----------|---------|--------|
| **Statements** | TBD | 80% |
| **Branches** | TBD | 75% |
| **Functions** | TBD | 80% |
| **Lines** | TBD | 80% |

---

## Common Test Commands

```bash
# Run specific test file
npm test validators.test.js

# Run tests matching pattern
npm test -- --testNamePattern="PDB code"

# Run tests for a specific file with coverage
npm test -- --coverage validators.test.js

# Update snapshots (if using snapshots)
npm test -- -u

# Run tests in verbose mode
npm test -- --verbose

# Run tests with debugging
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## Debugging Tests

### VS Code Configuration
Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/backend/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--no-cache",
    "${file}"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

---

## Best Practices

1. **Write Tests First** (TDD)
   - Define expected behavior
   - Write failing test
   - Implement feature
   - Verify test passes

2. **Test Edge Cases**
   - Empty values
   - Null/undefined
   - Very large inputs
   - Special characters

3. **Keep Tests Independent**
   - Each test should run in isolation
   - Don't rely on test execution order
   - Clean up after tests

4. **Use Descriptive Names**
   - `should reject invalid PDB codes`
   - `should sanitize filename with path traversal`

5. **Mock External Dependencies**
   - Database calls
   - File system operations
   - External APIs

6. **Aim for High Coverage**
   - But don't sacrifice quality for numbers
   - Focus on critical paths
   - Test error conditions

---

## Troubleshooting

### Tests Not Running
```bash
# Clear Jest cache
npm test -- --clearCache

# Check Jest version
npm list jest

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### ESM Module Errors
```bash
# Use NODE_OPTIONS for ESM support
NODE_OPTIONS=--experimental-vm-modules npm test
```

### Coverage Not Generating
```bash
# Check jest.config.json has correct paths
# Ensure collectCoverageFrom is set

# Try running with explicit coverage
npm test -- --coverage --collectCoverageFrom="backend/**/*.js"
```

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass: `npm test`
3. Check coverage: `npm run test:coverage`
4. Aim for >70% coverage on new code

---

**Happy Testing! 🧪**
