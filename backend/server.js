import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import swaggerUi from "swagger-ui-express";
import dockingRoutes from "./routes/docking.js";
import downloadRoutes from "./routes/download.js";
import logger from "./utils/logger.js";
import {
  apiLimiter,
  requestIdMiddleware,
  requestLoggerMiddleware,
  validateContentType,
  sanitizeBody,
  securityHeaders,
  errorHandler,
  notFoundHandler
} from "./middleware/security.js";

logger.info("🟢 Starting server...");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Swagger documentation with graceful fallback
let swaggerDocument;
try {
  const swaggerRaw = readFileSync(path.join(__dirname, "../swagger.json"), "utf8");
  swaggerDocument = JSON.parse(swaggerRaw);
} catch (err) {
  logger.warn('Could not load swagger.json; using fallback minimal swagger document', { error: err && err.message });
  swaggerDocument = {
    openapi: "3.0.0",
    info: { title: "API (swagger.json missing)", version: "0.0.0" },
    paths: {}
  };
}

const app = express();

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware (must be first)
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

// Helmet for security headers (with custom CSP)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for frontend
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false // Allow loading resources
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:8080', 'http://127.0.0.1:8080'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Compression middleware (should be early in the chain)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // Compression level (0-9, 6 is default)
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Additional security middleware
app.use(validateContentType);
app.use(sanitizeBody);
app.use(securityHeaders);

// Rate limiting for API routes
app.use('/docking', apiLimiter);

// API Documentation (Swagger UI)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "AutoDock Vina API Docs"
}));

// Servir frontend como archivos estáticos
app.use(express.static(path.join(__dirname, "../frontend")));

// Rutas de API
app.use("/docking", dockingRoutes);
app.use("/download", downloadRoutes);

// NOTE: Removed direct static serving of /uploads for security
// Files are now served through controlled /download routes with validation

// Health check endpoint (for monitoring)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: {
      node_version: process.version,
      python_path: process.env.PYTHON_PATH || "not set",
      vina_path: process.env.VINA_PATH || "not set"
    },
    requestId: req.id
  });
});

// Readiness check endpoint (for container orchestration)
app.get("/readiness", (req, res) => {
  // Check if critical dependencies are available
  const checks = {
    server: true,
    timestamp: new Date().toISOString()
  };

  // You can add more checks here (database, external services, etc.)
  const isReady = Object.values(checks).every(check => check === true);

  if (isReady) {
    res.status(200).json({
      status: "ready",
      checks,
      requestId: req.id
    });
  } else {
    res.status(503).json({
      status: "not ready",
      checks,
      requestId: req.id
    });
  }
});

// Ruta raíz para index.html (fallback)
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "../frontend/index.html");
  logger.debug(`📄 Sirviendo index.html desde: ${indexPath}`, { requestId: req.id });
  res.sendFile(indexPath);
});

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Puerto dinámico para Cloud Run
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";  // Escuchar en todas las interfaces para Docker

logger.info("⚙️  Configuring routes...");
logger.info(`📁 Frontend path: ${path.join(__dirname, "../frontend")}`);
logger.info(`📁 Uploads path: ${path.join(__dirname, "uploads")}`);

app.listen(PORT, HOST, () => {
  logger.info(`✅ Server running at http://${HOST}:${PORT}`);
  logger.info(`🌐 Access from your browser: http://localhost:${PORT}`);
  logger.info(`🔒 Security features enabled: CORS, Rate Limiting, Helmet, Input Validation`);
});