/**
 * Unit tests for fileValidator.js
 */

import {
  getAllowedExtensions,
  getMaxFileSize,
  isTextBasedMolecularFile
} from '../../utils/fileValidator.js';

describe('File Validator', () => {
  describe('getAllowedExtensions', () => {
    test('should return extensions for config files', () => {
      const extensions = getAllowedExtensions('config');
      expect(extensions).toEqual(['.txt', '.conf', '.cfg']);
    });

    test('should return extensions for receptor files', () => {
      const extensions = getAllowedExtensions('receptor');
      expect(extensions).toEqual(['.pdbqt', '.pdb']);
    });

    test('should return extensions for ligand files', () => {
      const extensions = getAllowedExtensions('ligand');
      expect(extensions).toContain('.pdbqt');
      expect(extensions).toContain('.pdb');
      expect(extensions).toContain('.sdf');
      expect(extensions).toContain('.mol2');
    });

    test('should return extensions for advanced ligands', () => {
      const extensions = getAllowedExtensions('advanced_ligand');
      expect(extensions).toContain('.pdbqt');
      expect(extensions).toContain('.sdf');
      expect(extensions).toContain('.mol2');
      expect(extensions).toContain('.smi');
      expect(extensions).toContain('.smiles');
    });

    test('should return default extensions for unknown type', () => {
      const extensions = getAllowedExtensions('unknown');
      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions.length).toBeGreaterThan(0);
    });

    test('should handle missing type', () => {
      const extensions = getAllowedExtensions();
      expect(Array.isArray(extensions)).toBe(true);
    });
  });

  describe('getMaxFileSize', () => {
    test('should return correct size for config files', () => {
      const size = getMaxFileSize('config');
      expect(size).toBe(1 * 1024 * 1024); // 1 MB
    });

    test('should return correct size for receptor files', () => {
      const size = getMaxFileSize('receptor');
      expect(size).toBe(100 * 1024 * 1024); // 100 MB
    });

    test('should return correct size for ligand files', () => {
      const size = getMaxFileSize('ligand');
      expect(size).toBe(50 * 1024 * 1024); // 50 MB
    });

    test('should return default size for unknown type', () => {
      const size = getMaxFileSize('unknown');
      expect(size).toBe(100 * 1024 * 1024); // 100 MB default
    });

    test('should handle missing type', () => {
      const size = getMaxFileSize();
      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('isTextBasedMolecularFile', () => {
    test('should identify PDBQT content', () => {
      const content = 'ATOM      1  N   ALA A   1      10.000  20.000  30.000  1.00  0.00    -0.302 N';
      expect(isTextBasedMolecularFile(content)).toBe(true);
    });

    test('should identify PDB content', () => {
      const content = 'HEADER    PROTEIN                                 01-JAN-00   1ABC';
      expect(isTextBasedMolecularFile(content)).toBe(true);
    });

    test('should identify SDF content', () => {
      const content = '\n  Structure\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END';
      expect(isTextBasedMolecularFile(content)).toBe(true);
    });

    test('should identify MOL2 content', () => {
      const content = '@<TRIPOS>MOLECULE\nLigand\n10 9 0 0 0';
      expect(isTextBasedMolecularFile(content)).toBe(true);
    });

    test('should identify configuration files', () => {
      const content = 'receptor = protein.pdbqt\nligand = ligand.pdbqt';
      expect(isTextBasedMolecularFile(content)).toBe(true);
    });

    test('should reject binary content', () => {
      const binaryContent = '\x00\x01\x02\x03\x04\x05';
      expect(isTextBasedMolecularFile(binaryContent)).toBe(false);
    });

    test('should reject random text', () => {
      const content = 'This is just random text without molecular data markers';
      expect(isTextBasedMolecularFile(content)).toBe(false);
    });

    test('should handle empty content', () => {
      expect(isTextBasedMolecularFile('')).toBe(false);
    });

    test('should handle non-string input', () => {
      expect(isTextBasedMolecularFile(null)).toBe(false);
      expect(isTextBasedMolecularFile(undefined)).toBe(false);
      expect(isTextBasedMolecularFile(123)).toBe(false);
    });
  });
});
