import express from "express";
import multer from "multer";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import archiver from "archiver";
import logger, { logSecurityEvent } from "../utils/logger.js";
import { uploadLimiter, downloadLimiter, apiLimiter, progressLimiter, dockingLimiter } from "../middleware/security.js";
import {
  isValidPDBCode,
  sanitizeFilename,
  hasAllowedExtension,
  validateDockingConfig,
  isValidMode,
  sanitizeInteractiveConfig
} from "../utils/validators.js";
import {
  validateFile,
  getAllowedExtensions,
  getMaxFileSize
} from "../utils/fileValidator.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global map to store progress for each session (with automatic cleanup)
const progressMap = new Map();

// Cleanup old progress entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of progressMap.entries()) {
    // Remove entries older than 30 minutes
    if (data.createdAt && (now - data.createdAt) > 30 * 60 * 1000) {
      progressMap.delete(sessionId);
      logger.debug(`Cleaned up old progress entry: ${sessionId}`);
    }
  }
}, 10 * 60 * 1000);

// Configuración de multer para subir archivos
const uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, "../uploads");
fs.mkdirSync(uploadPath, { recursive: true });

// File filter for multer
const fileFilter = (req, file, cb) => {
  const fieldName = file.fieldname;
  let allowedExtensions = [];

  // Determine allowed extensions based on field name
  if (fieldName === 'config' || fieldName === 'configAdvanced' || fieldName === 'configMultiple') {
    allowedExtensions = getAllowedExtensions('config');
  } else if (fieldName === 'receptor' || fieldName === 'receptorPdb' || fieldName === 'receptorPdbqt') {
    allowedExtensions = getAllowedExtensions('receptor');
  } else if (fieldName.startsWith('ligand')) {
    allowedExtensions = getAllowedExtensions('advanced_ligand');
  } else {
    allowedExtensions = getAllowedExtensions('ligand');
  }

  // Check extension
  if (!hasAllowedExtension(file.originalname, allowedExtensions)) {
    logSecurityEvent('INVALID_FILE_EXTENSION', {
      filename: file.originalname,
      fieldname: file.fieldname,
      ip: req.ip
    });
    return cb(new Error(`Invalid file type for ${fieldName}. Allowed: ${allowedExtensions.join(', ')}`), false);
  }

  cb(null, true);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Use UUID + sanitized original name to prevent collisions and path traversal
    const sanitized = sanitizeFilename(file.originalname);
    const ext = path.extname(sanitized);
    const nameWithoutExt = path.basename(sanitized, ext);
    const uniqueName = `${uuidv4()}_${nameWithoutExt}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max
    files: 100 // Max 100 files per request
  }
});

// Helper function to parse key=value config format
function parseConfigFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const config = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue; // Skip empty lines and comments

    const [key, value] = trimmed.split('=').map(s => s.trim());
    if (key && value) {
      config[key] = value;
    }
  }

  return config;
}

// ==================== NEW ROUTES FOR ADVANCED MODE ====================

// Route to download and prepare PDB
router.post("/download-pdb", uploadLimiter, async (req, res) => {
  const { pdbCode } = req.body;

  // Validate PDB code format
  if (!isValidPDBCode(pdbCode)) {
    logSecurityEvent('INVALID_PDB_CODE', {
      pdbCode,
      ip: req.ip,
      requestId: req.id
    });
    return res.status(400).json({
      error: "Invalid PDB code format. Must be 4 characters: digit followed by 3 alphanumeric characters.",
      requestId: req.id
    });
  }

  const pythonPath = process.env.PYTHON_PATH || "/usr/bin/python3";
  const preparePath = path.join(__dirname, "../python/prepare_molecules.py");

  try {
    logger.info(`📥 Downloading PDB: ${pdbCode}`, { requestId: req.id });

    // Sanitize PDB code (already validated, but extra safety)
    const sanitizedPdbCode = pdbCode.trim().toUpperCase();

    // Call Python script to download and prepare PDB with timeout
    const child = spawn(pythonPath, [preparePath, "download-pdb", sanitizedPdbCode, uploadPath]);

    let output = "";
    let error = "";
    let timeoutHandle;

    // Set timeout for subprocess (5 minutes)
    const TIMEOUT_MS = 5 * 60 * 1000;
    timeoutHandle = setTimeout(() => {
      child.kill('SIGTERM');
      logger.error('PDB download timeout', { pdbCode: sanitizedPdbCode, requestId: req.id });
    }, TIMEOUT_MS);

    child.stdout.on("data", (data) => {
      output += data.toString();
      logger.debug(`[PDB Download] ${data.toString()}`, { requestId: req.id });
    });

    child.stderr.on("data", (data) => {
      error += data.toString();
      logger.error(`[PDB Download Error] ${data.toString()}`, { requestId: req.id });
    });

    child.on("close", (code) => {
      clearTimeout(timeoutHandle);

      if (code === 0) {
        const pdbqtFile = path.join(uploadPath, `${sanitizedPdbCode}_receptor.pdbqt`);
        logger.info(`PDB download successful: ${sanitizedPdbCode}`, { requestId: req.id });
        res.json({
          success: true,
          message: `PDB ${sanitizedPdbCode} downloaded and prepared`,
          pdbqtFile: pdbqtFile,
          requestId: req.id
        });
      } else {
        logger.error(`PDB download failed: ${sanitizedPdbCode}`, { code, error, requestId: req.id });
        res.status(500).json({
          error: `Failed to download PDB`,
          requestId: req.id
        });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeoutHandle);
      logger.error('PDB download process error', { error: err.message, requestId: req.id });
      res.status(500).json({
        error: 'Failed to start download process',
        requestId: req.id
      });
    });

  } catch (err) {
    logger.error("Error in download-pdb:", { error: err.message, requestId: req.id });
    res.status(500).json({
      error: 'Internal server error',
      requestId: req.id
    });
  }
});

// Route to prepare ligands from various formats
router.post("/prepare-ligands", uploadLimiter, upload.fields([
  { name: "ligandSmiles" },
  { name: "ligandSdf" },
  { name: "ligandMol2" },
  { name: "ligandPdbqt" }
]), async (req, res) => {
  const pythonPath = process.env.PYTHON_PATH || "/usr/bin/python3";
  const preparePath = path.join(__dirname, "../python/prepare_molecules.py");

  try {
    logger.info("🔧 Preparing ligands from various formats", { requestId: req.id });

    const ligandFiles = {
      smiles: req.files.ligandSmiles?.map(f => f.path) || [],
      sdf: req.files.ligandSdf?.map(f => f.path) || [],
      mol2: req.files.ligandMol2?.map(f => f.path) || [],
      pdbqt: req.files.ligandPdbqt?.map(f => f.path) || []
    };

    // Validate all uploaded files
    const allLigandFiles = [
      ...ligandFiles.smiles,
      ...ligandFiles.sdf,
      ...ligandFiles.mol2,
      ...ligandFiles.pdbqt
    ];

    for (const filePath of allLigandFiles) {
      const validation = await validateFile(filePath, 'ligand');
      if (!validation.valid) {
        logger.warn('Ligand file validation failed', {
          file: path.basename(filePath),
          error: validation.error,
          requestId: req.id
        });
        cleanupFiles(allLigandFiles);
        return res.status(400).json({
          error: `File validation failed: ${validation.error}`,
          file: path.basename(filePath),
          requestId: req.id
        });
      }
    }

    // Call Python script to prepare ligands with timeout
    const child = spawn(pythonPath, [
      preparePath,
      "prepare-ligands",
      JSON.stringify(ligandFiles),
      uploadPath
    ]);

    let output = "";
    let error = "";
    let timeoutHandle;

    // Set timeout for subprocess (10 minutes)
    const TIMEOUT_MS = 10 * 60 * 1000;
    timeoutHandle = setTimeout(() => {
      child.kill('SIGTERM');
      logger.error('Ligand preparation timeout', { requestId: req.id });
    }, TIMEOUT_MS);

    child.stdout.on("data", (data) => {
      output += data.toString();
      logger.debug(`[Ligand Prep] ${data.toString()}`, { requestId: req.id });
    });

    child.stderr.on("data", (data) => {
      error += data.toString();
      logger.error(`[Ligand Prep Error] ${data.toString()}`, { requestId: req.id });
    });

    child.on("close", (code) => {
      clearTimeout(timeoutHandle);

      if (code === 0) {
        logger.info("Ligands prepared successfully", { requestId: req.id });
        res.json({
          success: true,
          message: "Ligands prepared successfully",
          requestId: req.id
        });
      } else {
        logger.error("Failed to prepare ligands", { code, error, requestId: req.id });
        res.status(500).json({
          error: `Failed to prepare ligands`,
          requestId: req.id
        });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeoutHandle);
      logger.error('Ligand preparation process error', { error: err.message, requestId: req.id });
      res.status(500).json({
        error: 'Failed to start preparation process',
        requestId: req.id
      });
    });

  } catch (err) {
    logger.error("Error in prepare-ligands route:", { error: err.message, requestId: req.id });
    res.status(500).json({
      error: 'Internal server error',
      requestId: req.id
    });
  }
});

// Ruta POST para ejecutar docking (soporta modo tradicional y avanzado)
router.post("/run", dockingLimiter, upload.fields([
  // Proteins
  { name: "receptorPdb" },
  { name: "receptorPdbqt" },
  // Ligands
  { name: "ligandSmiles" },
  { name: "ligandSdf" },
  { name: "ligandMol2" },
  { name: "ligandPdbqt" },
  // Configs
  { name: "configAdvanced" },
  { name: "configMultiple" }
]), async (req, res) => {

  const mode = 'advanced'; // Only advanced mode now

  // Validate mode
  if (!isValidMode(mode)) {
    logSecurityEvent('INVALID_MODE', {
      mode,
      ip: req.ip,
      requestId: req.id
    });
    return res.status(400).json({
      error: "Invalid mode. Must be 'traditional' or 'advanced'",
      requestId: req.id
    });
  }

  logger.info(`🔄 Docking mode: ${mode}`, { requestId: req.id });

  // Traditional mode files
  const configFiles = req.files.config?.map(f => f.path) || [];
  const receptorFiles = req.files.receptor?.map(f => f.path) || [];
  const ligandFiles = req.files.ligandos?.map(f => f.path) || [];

  // Advanced mode files
  const receptorPdbFiles = req.files.receptorPdb?.map(f => f.path) || [];
  const receptorPdbqtFiles = req.files.receptorPdbqt?.map(f => f.path) || [];
  const ligandSmilesFiles = req.files.ligandSmiles?.map(f => f.path) || [];
  const ligandSdfFiles = req.files.ligandSdf?.map(f => f.path) || [];
  const ligandMol2Files = req.files.ligandMol2?.map(f => f.path) || [];
  const ligandPdbqtFiles = req.files.ligandPdbqt?.map(f => f.path) || [];
  const configAdvancedFiles = req.files.configAdvanced?.map(f => f.path) || [];
  const configMultipleFiles = req.files.configMultiple?.map(f => f.path) || [];

  logger.info("📤 Archivos recibidos:", {
    requestId: req.id,
    traditional: {
      configs: configFiles.length,
      receptors: receptorFiles.length,
      ligands: ligandFiles.length
    },
    advanced: {
      receptorPdb: receptorPdbFiles.length,
      receptorPdbqt: receptorPdbqtFiles.length,
      ligandSmiles: ligandSmilesFiles.length,
      ligandSdf: ligandSdfFiles.length,
      ligandMol2: ligandMol2Files.length,
      ligandPdbqt: ligandPdbqtFiles.length,
      configAdvanced: configAdvancedFiles.length,
      configMultiple: configMultipleFiles.length
    }
  });

  // Validate uploaded files
  const allFiles = [
    ...configFiles, ...receptorFiles, ...ligandFiles,
    ...receptorPdbFiles, ...receptorPdbqtFiles,
    ...ligandSmilesFiles, ...ligandSdfFiles, ...ligandMol2Files, ...ligandPdbqtFiles,
    ...configAdvancedFiles, ...configMultipleFiles
  ];

  // Validate file content (async validation)
  for (const filePath of allFiles) {
    const fileType = determineFileType(filePath, req.files);
    const validation = await validateFile(filePath, fileType);
    if (!validation.valid) {
      logger.warn('File validation failed', {
        file: path.basename(filePath),
        error: validation.error,
        requestId: req.id
      });
      // Clean up uploaded files
      cleanupFiles(allFiles);
      return res.status(400).json({
        error: `File validation failed: ${validation.error}`,
        file: path.basename(filePath),
        requestId: req.id
      });
    }
  }

  // Validate based on mode
  if (mode === 'traditional') {
    if (!configFiles.length) {
      cleanupFiles(allFiles);
      return res.status(400).json({
        error: "❌ No configuration files uploaded. Please upload at least one configuration file.",
        requestId: req.id
      });
    }

    if (!receptorFiles.length) {
      cleanupFiles(allFiles);
      return res.status(400).json({
        error: "❌ No receptor files uploaded. Please upload at least one receptor file.",
        requestId: req.id
      });
    }

    if (!ligandFiles.length) {
      cleanupFiles(allFiles);
      return res.status(400).json({
        error: "❌ No ligand files uploaded. Please upload at least one ligand file.",
        requestId: req.id
      });
    }

    // Validar que el número de configs coincida con el número de receptores
    if (configFiles.length !== receptorFiles.length) {
      cleanupFiles(allFiles);
      return res.status(400).json({
        error: `Number of configurations (${configFiles.length}) does not match number of receptors (${receptorFiles.length}). There must be one config per receptor.`,
        requestId: req.id
      });
    }
  } else if (mode === 'advanced') {
    // Validate advanced mode
    const hasProteins = receptorPdbFiles.length > 0 || receptorPdbqtFiles.length > 0 || req.body.pdbCode;
    const hasLigands = ligandSmilesFiles.length > 0 || ligandSdfFiles.length > 0 ||
                       ligandMol2Files.length > 0 || ligandPdbqtFiles.length > 0;
    const hasConfig = configAdvancedFiles.length > 0 || configMultipleFiles.length > 0 || req.body.interactiveConfig;

    if (!hasProteins) {
      cleanupFiles(allFiles);
      return res.status(400).json({
        error: "❌ You must provide at least one protein (PDB code, PDB file, or PDBQT file)",
        requestId: req.id
      });
    }

    if (!hasLigands) {
      cleanupFiles(allFiles);
      return res.status(400).json({
        error: "❌ You must provide at least one ligand (SMILES, SDF, MOL2, or PDBQT file)",
        requestId: req.id
      });
    }

    if (!hasConfig) {
      cleanupFiles(allFiles);
      return res.status(400).json({
        error: "❌ You must provide configuration (file or interactive menu)",
        requestId: req.id
      });
    }

    // Validate PDB code if provided
    if (req.body.pdbCode && !isValidPDBCode(req.body.pdbCode)) {
      cleanupFiles(allFiles);
      logSecurityEvent('INVALID_PDB_CODE', {
        pdbCode: req.body.pdbCode,
        ip: req.ip,
        requestId: req.id
      });
      return res.status(400).json({
        error: "Invalid PDB code format",
        requestId: req.id
      });
    }
  }

  // Crear directorio temporal único
  const WORKDIR = path.join(process.env.WORKDIR || "/tmp/workdir", uuidv4());
  const OUTPUT_BASE = path.join(WORKDIR, "resultados");
  fs.mkdirSync(OUTPUT_BASE, { recursive: true });

  // ==================== ADVANCED MODE: Prepare files ====================
  if (mode === 'advanced') {
    logger.info("🔧 Advanced Mode: Preparing molecules...", { requestId: req.id });

    const pythonPath = process.env.PYTHON_PATH || "/usr/bin/python3";
    const preparePath = path.join(__dirname, "../python/prepare_molecules.py");

    // Prepare proteins
    if (req.body.pdbCode) {
      logger.info(`📥 Downloading PDB: ${req.body.pdbCode}`, { requestId: req.id });
      // PDB download will be handled by prepare_molecules.py
    }

    // Prepare ligands from various formats
    const ligandPrep = {
      smiles: ligandSmilesFiles,
      sdf: ligandSdfFiles,
      mol2: ligandMol2Files
    };

    // For now, we'll copy PDBQT files directly
    // Format conversion will happen in next phase
    logger.debug("📋 Note: Format conversion will be implemented in next phase", { requestId: req.id });
  }

  // Leer todas las configuraciones (soporta formato key=value)
  const configMap = {}; // Map de nombre de receptor -> config
  try {
    // For advanced mode with interactive config
    if (mode === 'advanced' && req.body.interactiveConfig) {
      const interactiveConfig = JSON.parse(req.body.interactiveConfig);
      configMap['interactive'] = interactiveConfig;
      logger.debug(`✅ Interactive config loaded`, { requestId: req.id });
    }

    // For traditional mode or advanced mode with config file
    for (let i = 0; i < configFiles.length; i++) {
      const configPath = configFiles[i];
      const configName = path.basename(configPath, path.extname(configPath));

      let configData;
      try {
        // Intentar parsear como JSON primero
        configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      } catch {
        // Si falla, parsear como key=value
        configData = parseConfigFile(configPath);
      }

      configMap[configName] = configData;
      logger.debug(`✅ Config leída: ${path.basename(configPath)}`, { requestId: req.id });
    }

    // For advanced mode with config file (single config for all proteins)
    for (let i = 0; i < configAdvancedFiles.length; i++) {
      const configPath = configAdvancedFiles[i];
      const configName = path.basename(configPath, path.extname(configPath));

      let configData;
      try {
        configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      } catch {
        configData = parseConfigFile(configPath);
      }

      configMap[configName] = configData;
      logger.debug(`✅ Advanced config leída: ${path.basename(configPath)}`, { requestId: req.id });
    }

    // For advanced mode with multiple configs (per-protein configs)
    for (let i = 0; i < configMultipleFiles.length; i++) {
      const configPath = configMultipleFiles[i];
      const configName = path.basename(configPath, path.extname(configPath));

      let configData;
      try {
        configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      } catch {
        configData = parseConfigFile(configPath);
      }

      configMap[configName] = configData;
      logger.debug(`✅ Per-protein config leída: ${path.basename(configPath)}`, { requestId: req.id });
    }
  } catch (err) {
    return res.status(400).json({ error: "Error reading configuration files", details: err.message });
  }

  // Crear carpeta de ligandos dentro del WORKDIR
  const ligandsDir = path.join(WORKDIR, "ligands");
  fs.mkdirSync(ligandsDir, { recursive: true });

  // Copy ligand files to the folder inside WORKDIR
  logger.info(`📂 Copying ligands to: ${ligandsDir}`, { requestId: req.id });

  // Traditional mode ligands
  for (const file of ligandFiles) {
    const basename = path.basename(file);
    const dest = path.join(ligandsDir, basename);
    logger.debug(`Copying ligand: ${file} → ${dest}`, { requestId: req.id });
    try {
      if (!fs.existsSync(file)) {
        logger.warn(`⚠️  File does not exist: ${file}`, { requestId: req.id });
        continue;
      }
      fs.copyFileSync(file, dest);
      logger.debug(`✅ Copied ligand: ${basename}`, { requestId: req.id });
    } catch (err) {
      logger.error(`❌ Error copying ligand ${file} → ${dest}`, { error: err.message, requestId: req.id });
    }
  }

  // Advanced mode ligands (PDBQT files only for now)
  for (const file of ligandPdbqtFiles) {
    const basename = path.basename(file);
    const dest = path.join(ligandsDir, basename);
    logger.debug(`Copying advanced ligand: ${file} → ${dest}`, { requestId: req.id });
    try {
      if (!fs.existsSync(file)) {
        logger.warn(`⚠️  File does not exist: ${file}`, { requestId: req.id });
        continue;
      }
      fs.copyFileSync(file, dest);
      logger.debug(`✅ Copied advanced ligand: ${basename}`, { requestId: req.id });
    } catch (err) {
      logger.error(`❌ Error copying advanced ligand ${file} → ${dest}`, { error: err.message, requestId: req.id });
    }
  }

  // Verificar que se copiaron correctamente
  const ligandDirFiles = fs.readdirSync(ligandsDir);
  logger.debug(`📁 Archivos en ${ligandsDir}:`, { files: ligandDirFiles, requestId: req.id });
  const copied = ligandDirFiles.filter(f => f.endsWith(".pdbqt"));
  logger.info("✅ Ligandos copiados:", { count: copied.length, requestId: req.id });
  if (!copied.length) {
    cleanupFiles(allFiles);
    return res.status(400).json({
      error: "Ligand files were not copied correctly. Files found: " + ligandDirFiles.join(", "),
      requestId: req.id
    });
  }

  // Copy receptor files to WORKDIR
  logger.info(`📂 Copying receptors to: ${WORKDIR}`, { requestId: req.id });
  const copiedReceptors = [];

  // Traditional mode receptors
  for (const file of receptorFiles) {
    const basename = path.basename(file);
    const dest = path.join(WORKDIR, basename);
    logger.debug(`Copying receptor: ${file} → ${dest}`, { requestId: req.id });
    try {
      if (!fs.existsSync(file)) {
        logger.warn(`⚠️  File does not exist: ${file}`, { requestId: req.id });
        continue;
      }
      fs.copyFileSync(file, dest);
      copiedReceptors.push(dest);
      logger.debug(`✅ Copied receptor: ${basename}`, { requestId: req.id });
    } catch (err) {
      logger.error(`❌ Error copying receptor ${file} → ${dest}`, { error: err.message, requestId: req.id });
    }
  }

  // Advanced mode receptors (PDBQT files only for now)
  for (const file of receptorPdbqtFiles) {
    const basename = path.basename(file);
    const dest = path.join(WORKDIR, basename);
    logger.debug(`Copying advanced receptor: ${file} → ${dest}`, { requestId: req.id });
    try {
      if (!fs.existsSync(file)) {
        logger.warn(`⚠️  File does not exist: ${file}`, { requestId: req.id });
        continue;
      }
      fs.copyFileSync(file, dest);
      copiedReceptors.push(dest);
      logger.debug(`✅ Copied advanced receptor: ${basename}`, { requestId: req.id });
    } catch (err) {
      logger.error(`❌ Error copying advanced receptor ${file} → ${dest}`, { error: err.message, requestId: req.id });
    }
  }

  if (!copiedReceptors.length) {
    return res.status(400).json({ error: "Receptor files were not copied correctly" });
  }

  // Construir array de configuraciones para Python (matching por nombre de archivo)
  const pythonConfigs = copiedReceptors.map((receptorPath) => {
    const receptorName = path.basename(receptorPath, path.extname(receptorPath));

    // Buscar config que coincida con el nombre del receptor
    let userConfig = configMap[receptorName];

    // Si no encuentra coincidencia exacta, usar la primera config disponible
    if (!userConfig) {
      const firstConfigKey = Object.keys(configMap)[0];
      userConfig = configMap[firstConfigKey];
      logger.warn(`⚠️  No se encontró config para ${receptorName}, usando: ${firstConfigKey}`, { requestId: req.id });
    }

    return {
      receptor: path.resolve(receptorPath),
      ligand_dir: ligandsDir,
      output_base: OUTPUT_BASE,
      center_x: userConfig.center_x,
      center_y: userConfig.center_y,
      center_z: userConfig.center_z,
      size_x: userConfig.size_x,
      size_y: userConfig.size_y,
      size_z: userConfig.size_z,
      exhaustiveness: userConfig.exhaustiveness || 8
    };
  });

  const pythonScript = path.join(__dirname, "../python/Automatizacion2_7.py");
  const pythonPath = process.env.PYTHON_PATH || "/usr/bin/python3";

  logger.info(`Usando Python en: ${pythonPath}`, { requestId: req.id });
  logger.info(`Procesando ${pythonConfigs.length} receptor(es)...`, { requestId: req.id });
  pythonConfigs.forEach((config, idx) => {
    logger.debug(`[${idx + 1}] ${path.basename(config.receptor)}`, { requestId: req.id });
  });

  // Create a session ID for this docking run
  const sessionId = uuidv4();
  const progressData = {
    sessionId,
    status: 'running',
    logs: [],
    currentProtein: '',
    currentLigand: '',
    proteinsProcessed: 0,
    totalProteins: pythonConfigs.length,
    ligandsProcessed: 0,
    totalLigands: ligandFiles.length,
    results_dir: OUTPUT_BASE,
    createdAt: Date.now()
  };
  progressMap.set(sessionId, progressData);

  const args = [pythonScript, JSON.stringify(pythonConfigs)];

  const child = spawn(pythonPath, args);

  let outputData = "";
  let errorData = "";

  // Send response immediately with sessionId (non-blocking)
  logger.info(`📊 Enviando respuesta con sessionId: ${sessionId}`, { sessionId, requestId: req.id });
  res.json({
    message: "Docking iniciado",
    sessionId: sessionId,
    results_dir: OUTPUT_BASE
  });

  // Handle stdout in background
  child.stdout.on("data", data => {
    const lines = data.toString().split('\n');

    for (const line of lines) {
      const message = line.trim();
      if (!message) continue;

      outputData += message + "\n";
      logger.debug(`[PYTHON]: ${message}`, { sessionId, requestId: req.id });

      // Helper function to strip UUID prefix from names
      const stripUUID = (name) => {
        // Remove UUID prefix pattern: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx_"
        return name.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i, '');
      };

      // Parse progress messages
      if (message.includes("🔬")) {
        // Extract protein and ligand info: "🔬 [ProteinName] Processing ligand: LigandName"
        const match = message.match(/🔬 \[([^\]]+)\] Processing ligand: (.+)/);
        if (match) {
          progressData.currentProtein = stripUUID(match[1]);
          progressData.currentLigand = stripUUID(match[2]);
        }
      } else if (message.includes("✅") && message.includes("completado")) {
        // Extract completion info: "✅ [ProteinName] [X/Y] LigandName completado"
        const match = message.match(/✅ \[([^\]]+)\] \[(\d+)\/(\d+)\]/);
        if (match) {
          progressData.currentProtein = stripUUID(match[1]);
          progressData.ligandsProcessed = parseInt(match[2]);
        }
      } else if (message.includes("Processing:")) {
        // Extract protein being processed: "[X/Y] Processing: ProteinName"
        // NOTE: This message appears BEFORE the protein is actually processed
        // So we DON'T update proteinsProcessed here, only currentProtein
        const match = message.match(/\[(\d+)\/(\d+)\] Processing: (.+)/);
        if (match) {
          progressData.currentProtein = stripUUID(match[3]);
          // Don't update proteinsProcessed here - it's updated in "Process completed"
        }
      } else if (message.includes("Process completed")) {
        // Extract completion: "[X/Y] Process completed! Results in: ..."
        // This message appears AFTER all ligands for this protein are processed
        const match = message.match(/\[(\d+)\/(\d+)\] Process completed/);
        if (match) {
          const completedProteins = parseInt(match[1]);
          const totalProteins = parseInt(match[2]);
          progressData.proteinsProcessed = completedProteins;

          logger.info(`✅ Protein ${completedProteins}/${totalProteins} completed`, { sessionId, completedProteins, totalProteins, requestId: req.id });

          // Mark as completed ONLY when all proteins are done
          if (completedProteins === totalProteins) {
            logger.info(`🎉 All proteins completed! (${completedProteins}/${totalProteins})`, { sessionId, requestId: req.id });
            progressData.status = 'completed';
          }
        }
      }

      progressData.logs.push({
        timestamp: new Date().toISOString(),
        message: message
      });
    }
  });

  child.stderr.on("data", data => {
    const errorMsg = data.toString().trim();
    if (!errorMsg) return;

    errorData += errorMsg + "\n";
    logger.error(`[ERROR PYTHON]: ${errorMsg}`, { sessionId, requestId: req.id });
    progressData.logs.push({
      timestamp: new Date().toISOString(),
      message: `ERROR: ${errorMsg}`,
      type: 'error'
    });
  });

  child.on("close", code => {
    logger.info(`🚀 Proceso Python finalizado con código ${code}`, { sessionId, exitCode: code, requestId: req.id });

    // Only set status if it hasn't been set already by progress parsing
    // This handles the case where the process exits before we parse the final messages
    if (progressData.status === 'running') {
      if (code === 0) {
        // If process exited successfully but status is still 'running',
        // check if all proteins were processed
        if (progressData.proteinsProcessed === progressData.totalProteins) {
          progressData.status = 'completed';
        } else {
          // Process exited but not all proteins were processed - this is an error
          logger.warn(`⚠️ Process exited but only ${progressData.proteinsProcessed}/${progressData.totalProteins} proteins completed`, { sessionId, proteinsProcessed: progressData.proteinsProcessed, totalProteins: progressData.totalProteins, requestId: req.id });
          progressData.status = 'error';
        }
      } else {
        logger.error(`Python process exited with error code ${code}`, { sessionId, exitCode: code, requestId: req.id });
        progressData.status = 'error';
      }
    }

    // Keep progress data for 5 minutes then clean up
    setTimeout(() => progressMap.delete(sessionId), 5 * 60 * 1000);
  });
});

// Ruta para obtener el progreso de un docking en ejecución
router.get("/progress/:sessionId", progressLimiter, (req, res) => {
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

  const progress = progressMap.get(sessionId);

  logger.debug(`📊 Solicitud de progreso para sessionId: ${sessionId}`, {
    requestId: req.id,
    found: !!progress
  });

  if (!progress) {
    return res.status(404).json({
      error: "Session not found",
      requestId: req.id
    });
  }

  res.json({
    ...progress,
    requestId: req.id
  });
});

// Ruta para descargar resultados en un ZIP
router.post("/download", downloadLimiter, (req, res) => {
  const resultsDir = req.body.results_dir;

  logger.info(`📥 Download request received`, {
    requestId: req.id,
    results_dir: resultsDir,
    ip: req.ip
  });

  if (!resultsDir) {
    logger.error('❌ No results_dir provided', { requestId: req.id });
    return res.status(400).json({
      error: "results_dir not provided",
      requestId: req.id
    });
  }

  // Validate path to prevent directory traversal
  const normalizedPath = path.normalize(resultsDir);
  const workdir = process.env.WORKDIR || "/tmp/workdir";
  const normalizedWorkdir = path.normalize(workdir);

  logger.info(`🔍 Path validation`, {
    requestId: req.id,
    normalizedPath,
    normalizedWorkdir,
    startsWithWorkdir: normalizedPath.startsWith(normalizedWorkdir)
  });

  if (!normalizedPath.startsWith(normalizedWorkdir)) {
    logSecurityEvent('PATH_TRAVERSAL_ATTEMPT', {
      attemptedPath: resultsDir,
      ip: req.ip,
      requestId: req.id
    });
    logger.error('❌ Path traversal attempt detected', { requestId: req.id });
    return res.status(403).json({
      error: "Access denied",
      requestId: req.id
    });
  }

  // Validate that the path exists
  if (!fs.existsSync(resultsDir)) {
    logger.error('❌ Results directory not found', {
      requestId: req.id,
      resultsDir,
      exists: false
    });
    return res.status(404).json({
      error: "Results directory not found",
      requestId: req.id
    });
  }

  logger.info('✅ Results directory found', {
    requestId: req.id,
    resultsDir
  });

  const zipPath = path.join(resultsDir, "resultados.zip");

  logger.info('📦 Creating ZIP file', {
    requestId: req.id,
    zipPath
  });

  // Crear stream para ZIP
  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    const zipSize = archive.pointer();
    logger.info(`✅ ZIP created successfully`, {
      requestId: req.id,
      zipPath,
      size: zipSize,
      sizeFormatted: `${(zipSize / 1024).toFixed(2)} KB`
    });

    logger.info('📤 Sending ZIP file to client', { requestId: req.id });
    res.download(zipPath, "resultados.zip", (err) => {
      if (err) {
        logger.error("❌ Error downloading ZIP:", { error: err.message, requestId: req.id });
      } else {
        logger.info('✅ ZIP sent successfully', { requestId: req.id });
      }
      // Eliminar zip después de enviar
      fs.unlink(zipPath, (err) => {
        if (err) {
          logger.error("❌ Error deleting temporary ZIP:", { error: err.message, requestId: req.id });
        } else {
          logger.info('🗑️ Temporary ZIP deleted', { requestId: req.id });
        }
      });
    });
  });

  archive.on("error", (err) => {
    logger.error("❌ Error creating ZIP:", { error: err.message, requestId: req.id });
    res.status(500).json({
      error: "Error creating ZIP",
      requestId: req.id
    });
  });

  logger.info('🗜️ Archiving directory', {
    requestId: req.id,
    directory: resultsDir
  });

  archive.pipe(output);
  archive.directory(resultsDir, false);
  archive.finalize();
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Determine file type based on field name
 */
function determineFileType(filePath, filesObject) {
  for (const [fieldName, files] of Object.entries(filesObject)) {
    if (files && files.some(f => f.path === filePath)) {
      if (fieldName === 'config' || fieldName === 'configAdvanced' || fieldName === 'configMultiple') {
        return 'config';
      } else if (fieldName === 'receptor' || fieldName.startsWith('receptorPdb')) {
        return 'receptor';
      } else if (fieldName.startsWith('ligand')) {
        return 'ligand';
      }
    }
  }
  return 'default';
}

/**
 * Clean up uploaded files
 */
function cleanupFiles(filePaths) {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug(`Cleaned up file: ${filePath}`);
      }
    } catch (error) {
      logger.error(`Failed to cleanup file: ${filePath}`, { error: error.message });
    }
  }
}

/**
 * Spawn process with timeout
 */
function spawnWithTimeout(command, args, timeoutMs = 60 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      reject(new Error(`Process timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (!timedOut) {
        resolve({ code, stdout, stderr });
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      if (!timedOut) {
        reject(error);
      }
    });
  });
}

export default router;