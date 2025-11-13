/**
 * Input validation and sanitization utilities
 * Prevents injection attacks and validates user input
 */

import path from 'path';

/**
 * Validate PDB code format (4 characters: digit followed by 3 alphanumeric)
 * @param {string} pdbCode - The PDB code to validate
 * @returns {boolean} - True if valid
 */
export function isValidPDBCode(pdbCode) {
  if (!pdbCode || typeof pdbCode !== 'string') {
    return false;
  }
  // PDB codes: 4 characters, first is digit, rest are alphanumeric
  const pdbRegex = /^[0-9][A-Z0-9]{3}$/i;
  return pdbRegex.test(pdbCode.trim());
}

/**
 * Sanitize filename to prevent path traversal and injection
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file';
  }
  
  // Remove path components
  let sanitized = path.basename(filename);
  
  // Remove null bytes and other dangerous characters
  sanitized = sanitized.replace(/[\x00-\x1f\x80-\x9f]/g, '');
  
  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');
  
  // Remove leading dots (hidden files)
  sanitized = sanitized.replace(/^\.+/, '');
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    sanitized = name.substring(0, 255 - ext.length) + ext;
  }
  
  // If nothing left, use default
  if (!sanitized || sanitized.length === 0) {
    return 'unnamed_file';
  }
  
  return sanitized;
}

/**
 * Validate file extension against allowed list
 * @param {string} filename - Filename to check
 * @param {string[]} allowedExtensions - Array of allowed extensions (e.g., ['.pdbqt', '.pdb'])
 * @returns {boolean} - True if extension is allowed
 */
export function hasAllowedExtension(filename, allowedExtensions) {
  if (!filename || !allowedExtensions || !Array.isArray(allowedExtensions)) {
    return false;
  }
  
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.map(e => e.toLowerCase()).includes(ext);
}

/**
 * Validate numeric configuration values
 * @param {object} config - Configuration object
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validateDockingConfig(config) {
  const errors = [];
  
  const requiredNumericFields = [
    'center_x', 'center_y', 'center_z',
    'size_x', 'size_y', 'size_z'
  ];
  
  for (const field of requiredNumericFields) {
    const value = config[field];
    if (value === undefined || value === null) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }
    
    const num = parseFloat(value);
    if (isNaN(num) || !isFinite(num)) {
      errors.push(`Invalid numeric value for ${field}: ${value}`);
    }
    
    // Reasonable bounds checking
    if (field.startsWith('size_') && (num <= 0 || num > 1000)) {
      errors.push(`Size value ${field} out of reasonable range (0-1000): ${num}`);
    }
    
    if (field.startsWith('center_') && (num < -10000 || num > 10000)) {
      errors.push(`Center value ${field} out of reasonable range (-10000 to 10000): ${num}`);
    }
  }
  
  // Validate exhaustiveness
  if (config.exhaustiveness !== undefined) {
    const exh = parseInt(config.exhaustiveness);
    if (isNaN(exh) || exh < 1 || exh > 32) {
      errors.push(`exhaustiveness must be an integer between 1 and 32: ${config.exhaustiveness}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate that a path doesn't contain traversal attempts
 * @param {string} filePath - Path to validate
 * @returns {boolean} - True if safe
 */
export function isSafePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }
  
  // Check for path traversal
  const normalized = path.normalize(filePath);
  if (normalized.includes('..')) {
    return false;
  }
  
  // Check for absolute paths (should be relative)
  if (path.isAbsolute(filePath)) {
    return false;
  }
  
  // Check for null bytes
  if (filePath.includes('\0')) {
    return false;
  }
  
  return true;
}

/**
 * Validate mode parameter
 * @param {string} mode - Mode value
 * @returns {boolean} - True if valid
 */
export function isValidMode(mode) {
  const validModes = ['traditional', 'advanced', 'wizard'];
  return validModes.includes(mode);
}

/**
 * Sanitize and validate interactive config from user
 * @param {object} config - Raw config object
 * @returns {object} - { valid: boolean, sanitized: object, errors: string[] }
 */
export function sanitizeInteractiveConfig(config) {
  if (!config || typeof config !== 'object') {
    return { valid: false, sanitized: null, errors: ['Config must be an object'] };
  }
  
  const sanitized = {};
  const errors = [];
  
  // Sanitize numeric fields
  const numericFields = [
    'center_x', 'center_y', 'center_z',
    'size_x', 'size_y', 'size_z', 'exhaustiveness'
  ];
  
  for (const field of numericFields) {
    if (config[field] !== undefined) {
      const num = field === 'exhaustiveness' ? parseInt(config[field]) : parseFloat(config[field]);
      if (!isNaN(num) && isFinite(num)) {
        sanitized[field] = num;
      } else {
        errors.push(`Invalid value for ${field}`);
      }
    }
  }
  
  // Validate the sanitized config
  const validation = validateDockingConfig(sanitized);
  
  return {
    valid: validation.valid && errors.length === 0,
    sanitized,
    errors: [...errors, ...validation.errors]
  };
}

