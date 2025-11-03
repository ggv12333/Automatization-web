# 🚀 Deployment Options for AutoDock Vina Platform

This document outlines different ways to deploy your AutoDock Vina automation platform without rebuilding the Docker image.

---

## 📦 Option 1: Docker Hub (Recommended)

**Best for:** Sharing with others, deploying to cloud, easy distribution

### **Advantages:**
- ✅ Free for public repositories
- ✅ Automatic image builds from GitHub
- ✅ Easy to pull and run anywhere
- ✅ Version tagging support
- ✅ Integrates with CI/CD pipelines

### **Setup Steps:**

#### **1. Create Docker Hub Account**
- Go to https://hub.docker.com
- Sign up for free account

#### **2. Login to Docker Hub**
```bash
docker login
# Enter your Docker Hub username and password
```

#### **3. Tag Your Image**
```bash
# Format: docker tag LOCAL_IMAGE DOCKERHUB_USERNAME/REPO_NAME:TAG
docker tag automatizacion-app:latest YOUR_USERNAME/autodock-vina:latest

# Example:
docker tag automatizacion-app:latest johndoe/autodock-vina:latest
```

#### **4. Push to Docker Hub**
```bash
docker push YOUR_USERNAME/autodock-vina:latest

# This uploads your image to Docker Hub (may take 5-10 minutes)
```

#### **5. Deploy Anywhere**
```bash
# On any machine with Docker:
docker pull YOUR_USERNAME/autodock-vina:latest
docker run -d --name autodock-vina -p 8080:8080 YOUR_USERNAME/autodock-vina:latest
```

### **Version Tagging:**
```bash
# Tag with version numbers
docker tag automatizacion-app:latest YOUR_USERNAME/autodock-vina:v1.0.0
docker tag automatizacion-app:latest YOUR_USERNAME/autodock-vina:latest

# Push both tags
docker push YOUR_USERNAME/autodock-vina:v1.0.0
docker push YOUR_USERNAME/autodock-vina:latest
```

---

## 💾 Option 2: Save/Load Docker Image

**Best for:** Local backups, offline deployment, no internet access

### **Advantages:**
- ✅ No internet required after saving
- ✅ Complete image backup
- ✅ Fast local transfer
- ✅ No external dependencies

### **Disadvantages:**
- ❌ Large file size (~2-3 GB)
- ❌ Manual transfer required
- ❌ No version control

### **Steps:**

#### **1. Save Image to File**
```bash
# Save to .tar file
docker save automatizacion-app:latest -o autodock-vina.tar

# Check file size
ls -lh autodock-vina.tar
# Expected: ~2-3 GB
```

#### **2. Compress (Optional)**
```bash
# Compress to save space
gzip autodock-vina.tar
# Creates: autodock-vina.tar.gz (~1-1.5 GB)
```

#### **3. Transfer to Target Machine**
```bash
# Using USB drive
cp autodock-vina.tar.gz /Volumes/USB_DRIVE/

# Using SCP (secure copy over network)
scp autodock-vina.tar.gz user@remote-server:/home/user/

# Using cloud storage (Dropbox, Google Drive, etc.)
# Upload manually through web interface
```

#### **4. Load on Target Machine**
```bash
# If compressed, decompress first
gunzip autodock-vina.tar.gz

# Load the image
docker load -i autodock-vina.tar

# Verify it loaded
docker images | grep autodock

# Run the container
docker run -d --name autodock-vina -p 8080:8080 automatizacion-app:latest
```

---

## ☁️ Option 3: Cloud Container Registries

**Best for:** Enterprise deployments, private images, cloud platforms

### **AWS ECR (Elastic Container Registry)**

```bash
# 1. Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# 2. Create repository
aws ecr create-repository --repository-name autodock-vina --region us-east-1

# 3. Tag image
docker tag automatizacion-app:latest \
  YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/autodock-vina:latest

# 4. Push to ECR
docker push YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/autodock-vina:latest

# 5. Pull and run
docker pull YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/autodock-vina:latest
docker run -d -p 8080:8080 YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/autodock-vina:latest
```

### **Google Container Registry (GCR)**

```bash
# 1. Configure Docker for GCR
gcloud auth configure-docker

# 2. Tag image
docker tag automatizacion-app:latest gcr.io/YOUR_PROJECT_ID/autodock-vina:latest

# 3. Push to GCR
docker push gcr.io/YOUR_PROJECT_ID/autodock-vina:latest

# 4. Pull and run
docker pull gcr.io/YOUR_PROJECT_ID/autodock-vina:latest
docker run -d -p 8080:8080 gcr.io/YOUR_PROJECT_ID/autodock-vina:latest
```

### **Azure Container Registry (ACR)**

```bash
# 1. Login to ACR
az acr login --name YOUR_REGISTRY_NAME

# 2. Tag image
docker tag automatizacion-app:latest YOUR_REGISTRY_NAME.azurecr.io/autodock-vina:latest

# 3. Push to ACR
docker push YOUR_REGISTRY_NAME.azurecr.io/autodock-vina:latest

# 4. Pull and run
docker pull YOUR_REGISTRY_NAME.azurecr.io/autodock-vina:latest
docker run -d -p 8080:8080 YOUR_REGISTRY_NAME.azurecr.io/autodock-vina:latest
```

---

## 🔄 Option 4: GitHub Container Registry (GHCR)

**Best for:** Open source projects, GitHub integration, free for public repos

```bash
# 1. Create Personal Access Token
# Go to: GitHub → Settings → Developer settings → Personal access tokens
# Scopes: write:packages, read:packages, delete:packages

# 2. Login to GHCR
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# 3. Tag image
docker tag automatizacion-app:latest ghcr.io/YOUR_GITHUB_USERNAME/autodock-vina:latest

# 4. Push to GHCR
docker push ghcr.io/YOUR_GITHUB_USERNAME/autodock-vina:latest

# 5. Pull and run (public images)
docker pull ghcr.io/YOUR_GITHUB_USERNAME/autodock-vina:latest
docker run -d -p 8080:8080 ghcr.io/YOUR_GITHUB_USERNAME/autodock-vina:latest
```

---

## 🎯 Comparison Table

| Method | Cost | Speed | Ease of Use | Best For |
|--------|------|-------|-------------|----------|
| **Docker Hub** | Free (public) | Fast | ⭐⭐⭐⭐⭐ | General use, sharing |
| **Save/Load** | Free | Medium | ⭐⭐⭐⭐ | Local backup, offline |
| **AWS ECR** | Paid | Fast | ⭐⭐⭐ | AWS deployments |
| **Google GCR** | Paid | Fast | ⭐⭐⭐ | GCP deployments |
| **Azure ACR** | Paid | Fast | ⭐⭐⭐ | Azure deployments |
| **GitHub GHCR** | Free (public) | Fast | ⭐⭐⭐⭐ | GitHub projects |

---

## 📋 Recommended Workflow

### **For Development:**
```bash
# Keep image locally
docker images

# Start/stop container as needed
docker start autodock-vina
docker stop autodock-vina
docker restart autodock-vina
```

### **For Production:**
```bash
# 1. Push to Docker Hub
docker tag automatizacion-app:latest YOUR_USERNAME/autodock-vina:v1.0.0
docker push YOUR_USERNAME/autodock-vina:v1.0.0

# 2. On production server
docker pull YOUR_USERNAME/autodock-vina:v1.0.0
docker run -d \
  --name autodock-vina \
  --restart unless-stopped \
  -p 8080:8080 \
  -v /data/results:/tmp/workdir/resultados \
  YOUR_USERNAME/autodock-vina:v1.0.0
```

### **For Sharing:**
```bash
# Share Docker Hub link
echo "docker pull YOUR_USERNAME/autodock-vina:latest"
echo "docker run -d -p 8080:8080 YOUR_USERNAME/autodock-vina:latest"
```

---

## 🛠️ Useful Commands

### **Managing Images:**
```bash
# List all images
docker images

# Remove old images
docker rmi IMAGE_ID

# Remove unused images
docker image prune -a

# Check image size
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

### **Managing Containers:**
```bash
# List running containers
docker ps

# List all containers
docker ps -a

# Stop all containers
docker stop $(docker ps -q)

# Remove all stopped containers
docker container prune

# View container logs
docker logs autodock-vina

# Follow logs in real-time
docker logs -f autodock-vina

# Execute command in running container
docker exec -it autodock-vina bash
```

### **Managing Registries:**
```bash
# List Docker Hub repositories
docker search YOUR_USERNAME

# View image tags on Docker Hub
# Visit: https://hub.docker.com/r/YOUR_USERNAME/autodock-vina/tags

# Delete image from Docker Hub
# Use Docker Hub web interface
```

---

## 🎓 Next Steps

1. **Choose your deployment method** (Docker Hub recommended)
2. **Push your image** to the registry
3. **Test pulling and running** on another machine
4. **Document the deployment** in your README
5. **Set up automated builds** (optional)

---

## 📚 Additional Resources

- **Docker Hub**: https://hub.docker.com
- **Docker Documentation**: https://docs.docker.com
- **AWS ECR**: https://aws.amazon.com/ecr/
- **Google GCR**: https://cloud.google.com/container-registry
- **Azure ACR**: https://azure.microsoft.com/en-us/services/container-registry/
- **GitHub GHCR**: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry

---

**🎉 Your application is now ready for deployment!**

