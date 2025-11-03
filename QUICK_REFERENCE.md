# ⚡ Quick Reference Guide

Essential commands for managing your AutoDock Vina platform.

---

## 🐳 Docker Commands

### **Build & Run**
```bash
# Build image (first time or after code changes)
docker build -t automatizacion-app .

# Run container
docker run -d --name autodock-vina -p 8080:8080 automatizacion-app:latest

# Run with volume (persist results)
docker run -d --name autodock-vina -p 8080:8080 \
  -v $(pwd)/results:/tmp/workdir/resultados \
  automatizacion-app:latest
```

### **Manage Containers**
```bash
# Start stopped container
docker start autodock-vina

# Stop running container
docker stop autodock-vina

# Restart container
docker restart autodock-vina

# Remove container
docker rm autodock-vina

# Force remove running container
docker rm -f autodock-vina
```

### **View Logs**
```bash
# View all logs
docker logs autodock-vina

# Follow logs in real-time
docker logs -f autodock-vina

# View last 50 lines
docker logs --tail 50 autodock-vina

# View logs with timestamps
docker logs -t autodock-vina
```

### **Inspect Container**
```bash
# List running containers
docker ps

# List all containers
docker ps -a

# View container details
docker inspect autodock-vina

# Execute command in container
docker exec -it autodock-vina bash

# View container resource usage
docker stats autodock-vina
```

---

## 📦 Docker Hub Deployment

### **Push to Docker Hub**
```bash
# Login
docker login

# Tag image
docker tag automatizacion-app:latest YOUR_USERNAME/autodock-vina:latest

# Push to Docker Hub
docker push YOUR_USERNAME/autodock-vina:latest
```

### **Pull from Docker Hub**
```bash
# Pull image
docker pull YOUR_USERNAME/autodock-vina:latest

# Run pulled image
docker run -d --name autodock-vina -p 8080:8080 YOUR_USERNAME/autodock-vina:latest
```

---

## 💾 Save/Load Image

### **Save Image**
```bash
# Save to file
docker save automatizacion-app:latest -o autodock-vina.tar

# Save and compress
docker save automatizacion-app:latest | gzip > autodock-vina.tar.gz
```

### **Load Image**
```bash
# Load from file
docker load -i autodock-vina.tar

# Load from compressed file
gunzip -c autodock-vina.tar.gz | docker load
```

---

## 🔧 Git Commands

### **Initial Setup**
```bash
# Initialize repository
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git push -u origin main
```

### **Daily Workflow**
```bash
# Check status
git status

# Add changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest changes
git pull
```

### **View History**
```bash
# View commit history
git log --oneline

# View changes
git diff

# View specific file history
git log --follow filename
```

---

## 🌐 Access Application

### **Local Development**
```
http://localhost:8080
```

### **Health Check**
```bash
curl http://localhost:8080/health
```

### **API Endpoints**
```bash
# Start docking (use form-data)
POST http://localhost:8080/docking/run

# Get progress
GET http://localhost:8080/docking/progress/:sessionId

# Download results
POST http://localhost:8080/docking/download
```

---

## 🧹 Cleanup Commands

### **Remove Containers**
```bash
# Remove stopped containers
docker container prune

# Remove all containers
docker rm -f $(docker ps -aq)
```

### **Remove Images**
```bash
# Remove unused images
docker image prune

# Remove all images
docker rmi $(docker images -q)

# Remove specific image
docker rmi automatizacion-app:latest
```

### **Remove Everything**
```bash
# Remove all unused Docker resources
docker system prune -a

# Remove volumes too
docker system prune -a --volumes
```

---

## 🔍 Troubleshooting

### **Container Won't Start**
```bash
# Check logs
docker logs autodock-vina

# Check if port is in use
lsof -i :8080

# Kill process using port
kill -9 $(lsof -t -i:8080)
```

### **Out of Disk Space**
```bash
# Check Docker disk usage
docker system df

# Clean up
docker system prune -a --volumes
```

### **Image Build Fails**
```bash
# Clear build cache
docker builder prune

# Build with no cache
docker build --no-cache -t automatizacion-app .
```

### **Can't Connect to Container**
```bash
# Check if container is running
docker ps

# Check container IP
docker inspect autodock-vina | grep IPAddress

# Check port mapping
docker port autodock-vina
```

---

## 📊 Monitoring

### **Resource Usage**
```bash
# Real-time stats
docker stats

# Specific container
docker stats autodock-vina

# One-time snapshot
docker stats --no-stream
```

### **Disk Usage**
```bash
# Docker disk usage
docker system df

# Detailed breakdown
docker system df -v
```

---

## 🚀 Production Deployment

### **Run with Auto-Restart**
```bash
docker run -d \
  --name autodock-vina \
  --restart unless-stopped \
  -p 8080:8080 \
  automatizacion-app:latest
```

### **Run with Resource Limits**
```bash
docker run -d \
  --name autodock-vina \
  --restart unless-stopped \
  -p 8080:8080 \
  --memory="4g" \
  --cpus="2" \
  automatizacion-app:latest
```

### **Run with Environment Variables**
```bash
docker run -d \
  --name autodock-vina \
  --restart unless-stopped \
  -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  automatizacion-app:latest
```

---

## 📝 Common Workflows

### **Update Code and Redeploy**
```bash
# 1. Stop and remove old container
docker stop autodock-vina
docker rm autodock-vina

# 2. Rebuild image
docker build -t automatizacion-app .

# 3. Run new container
docker run -d --name autodock-vina -p 8080:8080 automatizacion-app:latest

# 4. Verify it's running
docker ps
docker logs -f autodock-vina
```

### **Backup and Restore**
```bash
# Backup image
docker save automatizacion-app:latest -o backup.tar

# Backup results (if using volumes)
docker cp autodock-vina:/tmp/workdir/resultados ./backup-results

# Restore image
docker load -i backup.tar

# Restore results
docker cp ./backup-results autodock-vina:/tmp/workdir/resultados
```

### **Deploy to New Server**
```bash
# On old server: Save image
docker save automatizacion-app:latest | gzip > autodock-vina.tar.gz

# Transfer to new server
scp autodock-vina.tar.gz user@new-server:/home/user/

# On new server: Load and run
gunzip -c autodock-vina.tar.gz | docker load
docker run -d --name autodock-vina -p 8080:8080 automatizacion-app:latest
```

---

## 🎯 Quick Tips

- **Always check logs first** when troubleshooting: `docker logs autodock-vina`
- **Use `docker ps -a`** to see stopped containers
- **Tag images with versions**: `docker tag app:latest app:v1.0.0`
- **Clean up regularly**: `docker system prune` to free space
- **Use `.dockerignore`** to exclude files from builds
- **Test locally** before pushing to production
- **Keep backups** of important images and data

---

## 📞 Need Help?

- **Docker Docs**: https://docs.docker.com
- **Git Docs**: https://git-scm.com/doc
- **GitHub Guides**: https://guides.github.com
- **Stack Overflow**: https://stackoverflow.com

---

**💡 Pro Tip:** Bookmark this file for quick reference!

