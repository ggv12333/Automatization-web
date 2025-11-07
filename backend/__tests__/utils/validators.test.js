/**
 * Unit tests for validators.js
 */

import {
  isValidPDBCode,
  sanitizeFilename,
  hasAllowedExtension,
  validateDockingConfig,
  isValidMode,
  sanitizeInteractiveConfig
} from '../../utils/validators.js';

describe('Validators', () => {
  describe('isValidPDBCode', () => {
    test('should accept valid PDB codes', () => {
      expect(isValidPDBCode('1ABC')).toBe(true);
      expect(isValidPDBCode('2XYZ')).toBe(true);
      expect(isValidPDBCode('3a4b')).toBe(true);
      expect(isValidPDBCode('4DEF')).toBe(true);
    });

    test('should reject invalid PDB codes', () => {
      expect(isValidPDBCode('ABC1')).toBe(false); // Doesn't start with digit
      expect(isValidPDBCode('12345')).toBe(false); // Too long
      expect(isValidPDBCode('1AB')).toBe(false); // Too short
      expect(isValidPDBCode('1@BC')).toBe(false); // Special character
      expect(isValidPDBCode('')).toBe(false); // Empty
      expect(isValidPDBCode(null)).toBe(false); // Null
      expect(isValidPDBCode(undefined)).toBe(false); // Undefined
    });

    test('should handle whitespace', () => {
      expect(isValidPDBCode(' 1ABC ')).toBe(true);
      expect(isValidPDBCode('1ABC\n')).toBe(true);
    });
  });

  describe('sanitizeFilename', () => {
    test('should preserve valid filenames', () => {
      expect(sanitizeFilename('protein.pdbqt')).toBe('protein.pdbqt');
      expect(sanitizeFilename('ligand_001.mol2')).toBe('ligand_001.mol2');
      expect(sanitizeFilename('config.txt')).toBe('config.txt');
    });

    test('should remove path components', () => {
      expect(sanitizeFilename('/etc/passwd')).toBe('passwd');
      expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
      expect(sanitizeFilename('../file.txt')).toBe('file.txt');
      expect(sanitizeFilename('path/to/file.txt')).toBe('file.txt');
    });

    test('should remove dangerous characters', () => {
      expect(sanitizeFilename('file\x00name.txt')).toBe('filename.txt');
      expect(sanitizeFilename('file\nname.txt')).toBe('filename.txt');
    });

    test('should remove leading dots', () => {
      expect(sanitizeFilename('.hidden')).toBe('hidden');
      expect(sanitizeFilename('..hidden')).toBe('hidden');
    });

    test('should handle edge cases', () => {
      expect(sanitizeFilename('')).toBe('unnamed_file');
      expect(sanitizeFilename(null)).toBe('unnamed_file');
      expect(sanitizeFilename(undefined)).toBe('unnamed_file');
      expect(sanitizeFilename('....')).toBe('unnamed_file');
    });

    test('should limit length', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized.endsWith('.txt')).toBe(true);
    });
  });

  describe('hasAllowedExtension', () => {
    test('should accept allowed extensions', () => {
      expect(hasAllowedExtension('file.pdbqt', ['.pdbqt', '.pdb'])).toBe(true);
      expect(hasAllowedExtension('file.pdb', ['.pdbqt', '.pdb'])).toBe(true);
      expect(hasAllowedExtension('file.txt', ['.txt', '.conf'])).toBe(true);
    });

    test('should reject disallowed extensions', () => {
      expect(hasAllowedExtension('file.exe', ['.pdbqt', '.pdb'])).toBe(false);
      expect(hasAllowedExtension('file.sh', ['.pdbqt', '.pdb'])).toBe(false);
      expect(hasAllowedExtension('file', ['.pdbqt', '.pdb'])).toBe(false);
    });

    test('should be case insensitive', () => {
      expect(hasAllowedExtension('file.PDBQT', ['.pdbqt'])).toBe(true);
      expect(hasAllowedExtension('file.PDB', ['.pdb'])).toBe(true);
    });

    test('should handle edge cases', () => {
      expect(hasAllowedExtension('', ['.txt'])).toBe(false);
      expect(hasAllowedExtension('file.txt', [])).toBe(false);
      expect(hasAllowedExtension('file.txt', null)).toBe(false);
      expect(hasAllowedExtension(null, ['.txt'])).toBe(false);
    });
  });

  describe('validateDockingConfig', () => {
    const validConfig = {
      center_x: '10.5',
      center_y: '-5.2',
      center_z: '0.0',
      size_x: '20',
      size_y: '20',
      size_z: '20',
      exhaustiveness: '8'
    };

    test('should accept valid configuration', () => {
      const result = validateDockingConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should reject missing required fields', () => {
      const config = { ...validConfig };
      delete config.center_x;
      const result = validateDockingConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: center_x');
    });

    test('should reject invalid numeric values', () => {
      const config = { ...validConfig, center_x: 'invalid' };
      const result = validateDockingConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid numeric value'))).toBe(true);
    });

    test('should reject out of range values', () => {
      const config = { ...validConfig, size_x: '2000' };
      const result = validateDockingConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('out of reasonable range'))).toBe(true);
    });

    test('should reject negative size values', () => {
      const config = { ...validConfig, size_x: '-10' };
      const result = validateDockingConfig(config);
      expect(result.valid).toBe(false);
    });

    test('should validate exhaustiveness', () => {
      const config = { ...validConfig, exhaustiveness: '150' };
      const result = validateDockingConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exhaustiveness'))).toBe(true);
    });
  });

  describe('isValidMode', () => {
    test('should accept valid modes', () => {
      expect(isValidMode('traditional')).toBe(true);
      expect(isValidMode('advanced')).toBe(true);
      expect(isValidMode('wizard')).toBe(true);
    });

    test('should reject invalid modes', () => {
      expect(isValidMode('invalid')).toBe(false);
      expect(isValidMode('')).toBe(false);
      expect(isValidMode(null)).toBe(false);
      expect(isValidMode(undefined)).toBe(false);
    });
  });
});
