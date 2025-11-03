# 🧬 AutoDock Vina - Molecular Docking Automation Platform

A modern web-based automation platform for running AutoDock Vina molecular docking simulations with multiple receptors and ligands. Features a step-by-step wizard interface, real-time progress tracking, and automatic result downloads.

![Status](https://img.shields.io/badge/status-production%20ready-brightgreen)
![Docker](https://img.shields.io/badge/docker-ready-blue)
![Node.js](https://img.shields.io/badge/node.js-v18+-green)
![Python](https://img.shields.io/badge/python-3.12-blue)

---

## 🌟 Features

- **🧙 Step-by-Step Wizard**: Intuitive 4-step interface for easy docking setup
- **🚀 Batch Processing**: Process multiple receptors and ligands simultaneously
- **📊 Real-time Progress**: Live progress tracking with protein/ligand status updates
- **⚡ Parallel Execution**: Multi-threaded ligand processing for faster results
- **📦 Automatic Downloads**: Results automatically download when docking completes
- **🎨 Modern UI**: Clean, responsive wizard interface with progress visualization
- **🔄 Session Management**: Track multiple docking sessions independently
- **🔒 Security**: Rate limiting, input validation, file sanitization, and structured logging
- **🐳 Docker Ready**: Fully containerized with Miniconda and AutoDock Vina pre-installed

---

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
- **Backend**: Node.js 18+, Express.js
- **Processing**: Python 3.12, AutoDock Vina 1.2.5
- **Security**: Helmet, CORS, Rate Limiting, Input Validation
- **Logging**: Winston (structured JSON logging)
- **Environment**: Miniconda 24.1.2, Docker
- **Deployment**: Docker, Docker Hub, Cloud platforms

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

### **Run Locally**

```bash
# Clone the repository
git clone <your-repo-url>
cd automatizacion-web

# Run with Docker
chmod +x run_local.sh
./run_local.sh

# Access the application
open http://localhost:8080
```

### **Deploy to Google Cloud**

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

**See [QUICK_START.md](QUICK_START.md) for detailed instructions.**

---

## 📖 Documentation

- **[QUICK_START.md](QUICK_START.md)** - Get up and running in 5 minutes
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- **[CODE_REVIEW.md](CODE_REVIEW.md)** - Code quality assessment

---

## 🎯 Usage

### 1. **Prepare Your Files**

**Configuration Files** (`.txt` format):
```
center_x=102.901
center_y=114.945
center_z=115.654
size_x=18.97
size_y=18.97
size_z=18.97
exhaustiveness=8
```

**Receptor Files**: `.pdbqt` format (protein structures)

**Ligand Files**: `.pdbqt` format (small molecules)

### 2. **Upload Files**

- Upload one configuration file per receptor
- Configuration filename should match receptor filename (e.g., `7E2Y.txt` for `7E2Y.pdbqt`)
- Upload all ligands you want to dock

### 3. **Run Docking**

- Click "Ejecutar Docking"
- Monitor real-time progress
- View detailed logs

### 4. **Download Results**

- Click "Descargar Resultados"
- Get a ZIP file with all docking results
- Includes CSV summary and individual PDBQT files

---

## 📁 Project Structure

```
automatizacion-web/
├── backend/
│   ├── server.js              # Express server
│   ├── routes/
│   │   └── docking.js         # API endpoints
│   ├── python/
│   │   └── Automatizacion2_7.py  # Vina automation
│   └── package.json           # Node dependencies
├── frontend/
│   ├── index.html             # Main UI
│   └── styles.css             # Styling
├── dockerfile                 # Container definition
├── requirements.txt           # Python dependencies
├── run_local.sh              # Local testing script
├── .gcloudignore             # Cloud deployment exclusions
└── cloudbuild.yaml           # Automated deployment config
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `PYTHON_PATH` | `/opt/conda/envs/vina/bin/python` | Python interpreter |
| `VINA_PATH` | `/opt/conda/envs/vina/bin/vina` | AutoDock Vina executable |
| `UPLOAD_PATH` | `/tmp/uploads` | File upload directory |
| `WORKDIR` | `/tmp/workdir` | Working directory |

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
- **Body**: FormData with `config`, `receptor`, `ligandos` files
- **Returns**: `{ sessionId, results_dir }`

### `GET /docking/progress/:sessionId`
Get progress for a session
- **Returns**: Progress data with logs and statistics

### `POST /docking/download`
Download results as ZIP
- **Body**: `{ results_dir }`
- **Returns**: ZIP file

### `GET /health`
Health check endpoint
- **Returns**: Server status and environment info

---

## 📊 Performance

### Local (Docker)
- **Build**: 15-20 minutes (first time)
- **Startup**: 5-10 seconds
- **Docking**: Varies by exhaustiveness and ligand count

### Google Cloud Run
- **Cold Start**: 10-30 seconds
- **Warm Start**: <1 second
- **Auto-scaling**: 0 to max-instances
- **Cost**: ~$3-5/month for moderate usage

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

---

## 🔒 Security Considerations

For production deployments:

1. **Authentication**: Remove `--allow-unauthenticated` flag
2. **File Validation**: Validate file types and sizes
3. **Rate Limiting**: Implement request throttling
4. **Input Sanitization**: Validate all user inputs
5. **HTTPS**: Enabled by default on Cloud Run
6. **Secrets**: Use Secret Manager for sensitive data

---

## 💰 Cost Optimization

- **Scale to Zero**: Set `--min-instances 0`
- **Right-size Resources**: Start with 2Gi/1CPU, adjust as needed
- **Clean Up**: Delete old container images
- **Monitor Usage**: Use Cloud Monitoring to track costs

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **AutoDock Vina**: Developed by the Scripps Research Institute
- **Miniconda**: Package management by Anaconda, Inc.
- **Google Cloud**: Cloud infrastructure

---

## 📞 Support

- **Issues**: Open a GitHub issue
- **Documentation**: See `/docs` folder
- **Cloud Run Docs**: https://cloud.google.com/run/docs

---

## 🗺️ Roadmap

- [ ] Add authentication/authorization
- [ ] Implement persistent storage (Cloud Storage)
- [ ] Add job queue for better concurrency
- [ ] Create admin dashboard
- [ ] Add email notifications
- [ ] Support for other docking tools

---

**Built with ❤️ for molecular docking automation**

