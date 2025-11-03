/**
 * File validation utilities using magic numbers
 * Prevents malicious file uploads by checking actual file content
 */

import { fileTypeFromBuffer } from 'file-type';
import fs from 'fs';

/**
 * Allowed MIME types for molecular files
 * Note: Many molecular formats are text-based and won't have magic numbers
 */
const ALLOWED_MIME_TYPES = new Set([
  'text/plain',
  'application/octet-stream', // Generic binary
  'chemical/x-pdb',
  'chemical/x-mol2',
  'chemical/x-mdl-sdfile'
]);

/**
 * Allowed file extensions for molecular files
 */
const ALLOWED_EXTENSIONS = {
  config: ['.txt', '.conf', '.cfg'],
  receptor: ['.pdbqt', '.pdb'],
  ligand: ['.pdbqt', '.pdb', '.sdf', '.mol2', '.smi', '.smiles'],
  protein: ['.pdb', '.pdbqt'],
  advanced_ligand: ['.pdbqt', '.sdf', '.mol2', '.smi', '.smiles']
};

/**
 * Maximum file sizes (in bytes)
 */
const MAX_FILE_SIZES = {
  config: 1 * 1024 * 1024,      // 1 MB
  receptor: 100 * 1024 * 1024,  // 100 MB
  ligand: 50 * 1024 * 1024,     // 50 MB
  protein: 100 * 1024 * 1024,   // 100 MB
  default: 100 * 1024 * 1024    // 100 MB
};

/**
 * Validate file by checking magic numbers and content
 * @param {string} filePath - Path to file
 * @param {string} fileType - Type of file (config, receptor, ligand, etc.)
 * @returns {Promise<object>} - { valid: boolean, error: string }
 */
export async function validateFile(filePath, fileType = 'default') {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: 'File does not exist' };
    }
    
    // Check file size
    const stats = fs.statSync(filePath);
    const maxSize = MAX_FILE_SIZES[fileType] || MAX_FILE_SIZES.default;
    
    if (stats.size === 0) {
      return { valid: false, error: 'File is empty' };
    }
    
    if (stats.size > maxSize) {
      return { 
        valid: false, 
        error: `File too large: ${(stats.size / 1024 / 1024).toFixed(2)} MB (max: ${(maxSize / 1024 / 1024).toFixed(2)} MB)` 
      };
    }
    
    // Read first few bytes for magic number detection
    const buffer = Buffer.alloc(Math.min(4100, stats.size));
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    
    // Try to detect file type from magic numbers
    const detectedType = await fileTypeFromBuffer(buffer);
    
    // For text-based molecular files, magic number detection won't work
    // So we validate by content structure instead
    if (!detectedType) {
      return await validateTextBasedMolecularFile(filePath, fileType);
    }
    
    // If we detected a type, check if it's allowed
    if (!ALLOWED_MIME_TYPES.has(detectedType.mime)) {
      return { 
        valid: false, 
        error: `Disallowed file type detected: ${detectedType.mime}` 
      };
    }
    
    return { valid: true };
    
  } catch (error) {
    return { valid: false, error: `Validation error: ${error.message}` };
  }
}

/**
 * Validate text-based molecular files by content structure
 * @param {string} filePath - Path to file
 * @param {string} fileType - Type of file
 * @returns {Promise<object>} - { valid: boolean, error: string }
 */
async function validateTextBasedMolecularFile(filePath, fileType) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for null bytes (binary files masquerading as text)
    if (content.includes('\0')) {
      return { valid: false, error: 'File contains null bytes (possible binary file)' };
    }
    
    // Check for executable content
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /<iframe/i,
      /eval\(/i,
      /exec\(/i,
      /system\(/i,
      /__import__/i
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        return { valid: false, error: 'File contains potentially dangerous content' };
      }
    }
    
    // Validate based on file type
    const ext = filePath.toLowerCase().split('.').pop();
    
    if (ext === 'pdbqt' || ext === 'pdb') {
      return validatePDBContent(content);
    } else if (ext === 'sdf') {
      return validateSDFContent(content);
    } else if (ext === 'mol2') {
      return validateMOL2Content(content);
    } else if (ext === 'smi' || ext === 'smiles') {
      return validateSMILESContent(content);
    } else if (ext === 'txt' || ext === 'conf' || ext === 'cfg') {
      return validateConfigContent(content);
    }
    
    // If we can't validate structure, at least it passed basic checks
    return { valid: true };
    
  } catch (error) {
    return { valid: false, error: `Content validation error: ${error.message}` };
  }
}

/**
 * Validate PDB/PDBQT file structure
 */
function validatePDBContent(content) {
  const lines = content.split('\n');
  const hasAtomRecords = lines.some(line => 
    line.startsWith('ATOM') || 
    line.startsWith('HETATM') ||
    line.startsWith('MODEL')
  );
  
  if (!hasAtomRecords) {
    return { valid: false, error: 'Invalid PDB/PDBQT format: no ATOM/HETATM records found' };
  }
  
  return { valid: true };
}

/**
 * Validate SDF file structure
 */
function validateSDFContent(content) {
  // SDF files should have $$$$  delimiter
  if (!content.includes('$$$$') && !content.includes('M  END')) {
    return { valid: false, error: 'Invalid SDF format: missing required delimiters' };
  }
  
  return { valid: true };
}

/**
 * Validate MOL2 file structure
 */
function validateMOL2Content(content) {
  // MOL2 files should have @<TRIPOS> sections
  if (!content.includes('@<TRIPOS>')) {
    return { valid: false, error: 'Invalid MOL2 format: missing @<TRIPOS> sections' };
  }
  
  return { valid: true };
}

/**
 * Validate SMILES content
 */
function validateSMILESContent(content) {
  const lines = content.trim().split('\n');
  
  // SMILES should be relatively short strings with specific characters
  const smilesPattern = /^[A-Za-z0-9@+\-\[\]()=#$:.\/\\%]+(\s+.*)?$/;
  
  for (const line of lines) {
    if (line.trim() && !smilesPattern.test(line.trim())) {
      return { valid: false, error: 'Invalid SMILES format' };
    }
  }
  
  return { valid: true };
}

/**
 * Validate config file content
 */
function validateConfigContent(content) {
  const lines = content.split('\n');
  
  // Config should have key=value pairs
  let hasValidConfig = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    if (trimmed.includes('=')) {
      hasValidConfig = true;
      break;
    }
  }
  
  if (!hasValidConfig) {
    return { valid: false, error: 'Invalid config format: no key=value pairs found' };
  }
  
  return { valid: true };
}

/**
 * Get allowed extensions for a file type
 */
export function getAllowedExtensions(fileType) {
  return ALLOWED_EXTENSIONS[fileType] || [];
}

/**
 * Get max file size for a file type
 */
export function getMaxFileSize(fileType) {
  return MAX_FILE_SIZES[fileType] || MAX_FILE_SIZES.default;
}

