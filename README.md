# 🧬 AutoDock Vina - Molecular Docking Automation Platform

A modern web-based automation platform for running AutoDock Vina molecular docking simulations with multiple receptors and ligands. Features a step-by-step wizard interface, real-time progress tracking, and automatic result downloads.

![Status](https://img.shields.io/badge/status-production%20ready-brightgreen)
![Docker](https://img.shields.io/badge/docker-ready-blue)
![Node.js](https://img.shields.io/badge/node.js-v18+-green)
![Python](https://img.shields.io/badge/python-3.12-blue)

---

## 🌟 Features

- **🧙 Step-by-Step Wizard**: Intuitive interface for easy docking setup
- **🚀 Batch Processing**: Process multiple receptors and ligands simultaneously
- **📊 Real-time Progress**: Live progress tracking with protein/ligand status updates
- **⚡ Parallel Execution**: Multi-threaded ligand processing for faster results
- **📦 Automatic Downloads**: Results automatically download when docking completes
- **🎨 Modern UI**: Clean, responsive wizard interface with progress visualization
- **🔄 Session Management**: Track multiple docking sessions independently (2-hour timeout)
- **🔒 Security**: Rate limiting, input validation, file sanitization, and structured logging
- **🔧 Advanced Mode**: Support for PDB download, ligand preparation, and interactive configuration
- **🐳 Docker Ready**: Fully containerized with Miniconda and AutoDock Vina pre-installed
- **📚 API Documentation**: Interactive Swagger/OpenAPI documentation at `/api-docs`
- **✅ Tested**: Comprehensive unit and integration tests with Jest
- **⚡ Optimized**: Gzip compression for faster response times


## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Frontend  │─────▶│   Node.js    │─────▶│  Python Script  │
│  (HTML/JS)  │      │   Backend    │      │  (AutoDock)     │
└─────────────┘      └──────────────┘      └─────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   AutoDock   │
                     │     Vina     │
                     └──────────────┘
```

**Stack:**
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (Wizard Interface)
- **Backend**: Node.js 18+, Express.js 5.x
- **Processing**: Python 3.12, AutoDock Vina 1.2.5
- **Security**: Helmet, CORS, Rate Limiting, Input Validation, File Type Detection
- **Logging**: Winston (structured JSON logging with request IDs)
- **Environment**: Miniconda 24.1.2, Docker
- **Deployment**: Docker, Docker Hub, Cloud platforms (Google Cloud Run ready)

---

## 📋 Prerequisites

### For Local Development:
- Docker Desktop
- 8GB+ RAM recommended
- 10GB+ free disk space

### For Cloud Deployment:
- Google Cloud account with billing enabled
- Google Cloud SDK installed
- Project with Cloud Run API enabled

---

## 🚀 Quick Start

### **Run Locally (Quick Start)**

**Option A: Use the automated script (Easiest)**
```bash
# Clone the repository
git clone https://github.com/ggv12333/Automatization-web.git
cd Automatization-web

# Run the script (it will guide you)
chmod +x run.sh
./run.sh
```

**Option B: Manual setup**
```bash
# Clone the repository
git clone https://github.com/ggv12333/Automatization-web.git
cd Automatization-web

# Install dependencies
cd backend
npm install

# Set environment variables (optional)
export PORT=8080
export PYTHON_PATH=/usr/bin/python3
export VINA_PATH=/usr/local/bin/vina

# Start the server
node server.js

# Access the application
open http://localhost:8080
```

**See [QUICK_START.md](QUICK_START.md) for detailed instructions.**

### **Run with Docker**

```bash
# Build the Docker image
docker build -t automatizacion-vina .

# Run the container
docker run -p 8080:8080 automatizacion-vina

# Access the application
open http://localhost:8080
```

### **Deploy to Google Cloud Run**

```bash
# Login and setup
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Deploy (one command!)
gcloud run deploy automatizacion-vina \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --timeout 3600

# You'll get a URL like: https://automatizacion-vina-xxxxx.run.app
```

**See [DEPLOYMENT_OPTIONS.md](DEPLOYMENT_OPTIONS.md) for detailed deployment instructions.**

---

## 📖 Documentation

- **[README.md](README.md)** - This file (project overview)
- **[DEPLOYMENT_OPTIONS.md](DEPLOYMENT_OPTIONS.md)** - Deployment guide and options
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick reference guide
- **[GITHUB_SETUP.md](GITHUB_SETUP.md)** - GitHub setup instructions

---

## 🎯 Usage

### Traditional Mode

1. **Prepare Your Files**
   - **Configuration Files** (`.txt` format, one per receptor):
     ```
     center_x=102.901
     center_y=114.945
     center_z=115.654
     size_x=18.97
     size_y=18.97
     size_z=18.97
     exhaustiveness=8
     ```
   - **Receptor Files**: `.pdbqt` format (protein structures)
   - **Ligand Files**: `.pdbqt` format (small molecules)

2. **Upload Files**
   - Upload one configuration file per receptor
   - Configuration filename should match receptor filename (e.g., `7E2Y.txt` for `7E2Y.pdbqt`)
   - Upload all ligands you want to dock

3. **Run Docking**
   - Click "Ejecutar Docking"
   - Monitor real-time progress
   - View detailed logs

4. **Download Results**
   - Results automatically download when complete
   - Or click "Descargar Resultados" manually
   - Get a ZIP file with all docking results

### Advanced Mode

The advanced mode supports:
- **PDB Code Download**: Download and prepare PDB structures directly
- **Multiple Ligand Formats**: SMILES, SDF, MOL2, PDBQT
- **Interactive Configuration**: Set docking parameters through the UI
- **Protein Preparation**: Automatic PDB to PDBQT conversion

---

## 📁 Project Structure

```
automatizacion-web/
├── backend/
│   ├── server.js              # Express server entry point
│   ├── routes/
│   │   ├── docking.js         # Docking API endpoints
│   │   └── download.js        # Secure file download routes
│   ├── middleware/
│   │   └── security.js       # Security middleware (rate limiting, validation)
│   ├── utils/
│   │   ├── logger.js          # Winston logging configuration
│   │   ├── validators.js      # Input validation utilities
│   │   └── fileValidator.js  # File type and content validation
│   ├── python/
│   │   ├── Automatizacion2_7.py  # Main Vina automation script
│   │   └── prepare_molecules.py  # PDB download and ligand preparation
│   ├── uploads/               # Upload directory (user files)
│   ├── package.json           # Node.js dependencies
│   └── package-lock.json     # Dependency lock file
├── frontend/
│   ├── index.html             # Main UI
│   ├── script.js              # Frontend JavaScript logic
│   ├── styles.css             # Main styles
│   ├── wizard-styles.css      # Wizard interface styles
│   └── wizard.js              # Wizard functionality
├── test_files/                # Test files for development
│   ├── config.txt
│   ├── ligand.pdbqt
│   └── protein.pdbqt
├── Dockerfile                  # Container definition
├── requirements.txt           # Python dependencies
├── .gitignore                 # Git ignore rules
├── .gcloudignore              # Cloud deployment exclusions
├── README.md                  # This file
├── DEPLOYMENT_OPTIONS.md      # Deployment guide
├── QUICK_REFERENCE.md         # Quick reference
└── GITHUB_SETUP.md            # GitHub setup instructions
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `HOST` | `0.0.0.0` | Server host (0.0.0.0 for Docker) |
| `PYTHON_PATH` | `/usr/bin/python3` | Python interpreter path |
| `VINA_PATH` | `/usr/local/bin/vina` | AutoDock Vina executable path |
| `UPLOAD_PATH` | `backend/uploads` | File upload directory |
| `WORKDIR` | `/tmp/workdir` | Working directory for docking |
| `NODE_ENV` | `development` | Environment mode (production/development) |
| `ALLOWED_ORIGINS` | `http://localhost:8080` | CORS allowed origins (comma-separated) |
| `LOG_LEVEL` | `info` | Logging level (error/warn/info/debug) |
| `LOG_TO_FILE` | `false` | Enable file logging (true/false) |

### Cloud Run Settings

- **Memory**: 4Gi (adjustable: 2Gi - 8Gi)
- **CPU**: 2 (adjustable: 1 - 8)
- **Timeout**: 3600s (1 hour max)
- **Concurrency**: 1 (one request per instance)
- **Max Instances**: 10 (adjustable)

---

## 🧪 API Endpoints

### `POST /docking/run`
Start a docking job
- **Body**: FormData with files (traditional mode) or advanced mode files
- **Mode**: `traditional` or `advanced`
- **Returns**: `{ sessionId, results_dir, message }`

### `GET /docking/progress/:sessionId`
Get progress for a docking session
- **Params**: `sessionId` (UUID)
- **Returns**: Progress data with logs, statistics, and current status

### `POST /docking/download`
Download results as ZIP
- **Body**: `{ results_dir }`
- **Returns**: ZIP file with all results

### `POST /docking/download-pdb`
Download and prepare a PDB structure
- **Body**: `{ pdbCode }` (4-character PDB code)
- **Returns**: `{ success, message, pdbqtFile }`

### `POST /docking/prepare-ligands`
Prepare ligands from various formats
- **Body**: FormData with ligand files (SMILES, SDF, MOL2, PDBQT)
- **Returns**: `{ success, message }`

### `GET /download/results/:sessionId/:filename`
Download a specific result file
- **Params**: `sessionId` (UUID), `filename`
- **Returns**: File download

### `GET /health`
Health check endpoint
- **Returns**: Server status, uptime, and environment info

### `GET /readiness`
Readiness check endpoint (for container orchestration)
- **Returns**: Ready status and health checks

---

## 📊 Performance

### Local Development
- **Startup**: <1 second
- **Docking**: Varies by exhaustiveness and ligand count
- **Memory**: ~500MB - 2GB depending on workload

### Docker
- **Build**: 15-20 minutes (first time, includes Miniconda and AutoDock Vina)
- **Startup**: 5-10 seconds
- **Image Size**: ~2-3 GB

### Google Cloud Run
- **Cold Start**: 10-30 seconds
- **Warm Start**: <1 second
- **Auto-scaling**: 0 to max-instances
- **Cost**: ~$3-5/month for moderate usage

---

## 🔒 Security Features

- **Rate Limiting**: Per-endpoint rate limits (API, upload, download, progress)
- **File Validation**: Magic number detection and content validation
- **Input Sanitization**: All user inputs are sanitized and validated
- **Path Traversal Protection**: Secure file path validation
- **CORS**: Configurable CORS policies
- **Security Headers**: Helmet.js for HTTP security headers
- **Structured Logging**: Request ID tracking and security event logging
- **File Type Validation**: Extension and content-based validation
- **Request ID Tracking**: Unique ID per request for debugging

---

## 🐛 Troubleshooting

### Build Issues
```bash
# Increase Docker memory (Docker Desktop → Settings → Resources)
# Minimum: 4GB RAM, 2 CPUs

# Clear Docker cache
docker system prune -a
```

### Deployment Issues
```bash
# Check logs
gcloud run services logs read automatizacion-vina --region us-central1

# Common fixes:
# - Increase memory: --memory 8Gi
# - Increase timeout: --timeout 3600
# - Check billing is enabled
```

### Runtime Issues
- **Out of memory**: Increase `--memory` or reduce parallel workers
- **Timeout**: Reduce exhaustiveness or split into smaller batches
- **File not found**: Check file paths and permissions
- **CORS errors**: Check `ALLOWED_ORIGINS` environment variable

### API Issues
- **Rate limit exceeded**: Wait before making more requests
- **Invalid file type**: Check file extensions and content
- **Session not found**: Session may have expired (30-minute timeout)

---

## 💰 Cost Optimization

- **Scale to Zero**: Set `--min-instances 0` (default)
- **Right-size Resources**: Start with 2Gi/1CPU, adjust as needed
- **Clean Up**: Delete old container images
- **Monitor Usage**: Use Cloud Monitoring to track costs
- **Request Caching**: Use rate limiting to prevent abuse

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/ggv12333/Automatization-web.git
cd Automatization-web

# Install backend dependencies
cd backend
npm install

# Install Python dependencies (if needed)
pip install -r ../requirements.txt

# Start development server
node server.js
```

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **AutoDock Vina**: Developed by the Scripps Research Institute
- **Miniconda**: Package management by Anaconda, Inc.
- **Google Cloud**: Cloud infrastructure
- **Express.js**: Web framework
- **Winston**: Logging library

---

## 📞 Support

- **Repository**: https://github.com/ggv12333/Automatization-web
- **Issues**: Open a GitHub issue for bug reports or feature requests
- **Cloud Run Docs**: https://cloud.google.com/run/docs

---

## 🗺️ Roadmap

- [x] Basic docking automation
- [x] Real-time progress tracking
- [x] Advanced mode with PDB download
- [x] Security features (rate limiting, validation)
- [x] Docker support
- [ ] Authentication/authorization
- [ ] Persistent storage (Cloud Storage)
- [ ] Job queue for better concurrency
- [ ] Admin dashboard
- [ ] Email notifications
- [ ] Support for other docking tools
- [ ] API documentation (OpenAPI/Swagger)

---

**Built with ❤️ for molecular docking automation**
