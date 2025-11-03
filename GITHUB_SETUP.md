# 📚 GitHub Setup Guide

This guide will help you upload your AutoDock Vina project to GitHub.

---

## 📋 Prerequisites

1. **Git installed** on your computer
   ```bash
   # Check if Git is installed
   git --version
   
   # If not installed, download from: https://git-scm.com/downloads
   ```

2. **GitHub account**
   - Create one at https://github.com if you don't have one

---

## 🚀 Step-by-Step Instructions

### **Step 1: Initialize Git Repository**

Open your terminal in the project directory and run:

```bash
# Navigate to your project directory
cd /Users/gaelgarcia/Desktop/automatizacion-web

# Initialize Git repository
git init

# Check status (see what files will be tracked)
git status
```

---

### **Step 2: Create GitHub Repository**

1. Go to https://github.com
2. Click the **"+"** icon in the top right
3. Select **"New repository"**
4. Fill in the details:
   - **Repository name**: `autodock-vina-automation` (or your preferred name)
   - **Description**: `Web-based automation platform for AutoDock Vina molecular docking`
   - **Visibility**: 
     - ✅ **Public** (recommended - free, shareable, good for portfolio)
     - 🔒 **Private** (if you want to keep it private)
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

---

### **Step 3: Add Files to Git**

```bash
# Add all files (respecting .gitignore)
git add .

# Check what will be committed
git status

# You should see files like:
# - backend/
# - frontend/
# - Dockerfile
# - README.md
# - requirements.txt
# etc.

# You should NOT see:
# - node_modules/
# - backend/uploads/
# - *.log files
# - .DS_Store
```

---

### **Step 4: Create First Commit**

```bash
# Commit the files
git commit -m "Initial commit: AutoDock Vina automation platform with wizard interface"

# This creates a snapshot of your project
```

---

### **Step 5: Connect to GitHub**

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name:

```bash
# Add GitHub as remote repository
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Verify the remote was added
git remote -v
```

**Example:**
```bash
git remote add origin https://github.com/johndoe/autodock-vina-automation.git
```

---

### **Step 6: Push to GitHub**

```bash
# Push your code to GitHub
git push -u origin main

# If you get an error about 'master' vs 'main', try:
git branch -M main
git push -u origin main
```

**You'll be prompted for your GitHub credentials:**
- **Username**: Your GitHub username
- **Password**: Use a **Personal Access Token** (not your password)

---

### **Step 7: Create Personal Access Token (if needed)**

If GitHub asks for a password and rejects it, you need a Personal Access Token:

1. Go to https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: `AutoDock Vina Project`
4. Select scopes:
   - ✅ `repo` (full control of private repositories)
5. Click **"Generate token"**
6. **COPY THE TOKEN** (you won't see it again!)
7. Use this token as your password when pushing

---

### **Step 8: Verify Upload**

1. Go to your GitHub repository URL: `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME`
2. You should see all your files!
3. Check that sensitive files are NOT there:
   - ❌ No `node_modules/`
   - ❌ No `.env` files
   - ❌ No upload directories with user data

---

## 🔄 Making Future Changes

After the initial setup, updating your code is easy:

```bash
# 1. Make changes to your code
# (edit files, add features, fix bugs, etc.)

# 2. Check what changed
git status

# 3. Add the changes
git add .

# 4. Commit with a descriptive message
git commit -m "Fix: Progress bar now reaches 100% only when all ligands are processed"

# 5. Push to GitHub
git push
```

---

## 📝 Good Commit Message Examples

```bash
# Feature additions
git commit -m "Add: Step-by-step wizard interface for docking setup"
git commit -m "Add: Real-time progress tracking with protein/ligand status"

# Bug fixes
git commit -m "Fix: Progress bar timing issue with concurrent ligand processing"
git commit -m "Fix: Rate limiting preventing progress polling"

# Improvements
git commit -m "Improve: Automatic download triggers immediately at 100%"
git commit -m "Improve: Enhanced error logging with stack traces"

# Documentation
git commit -m "Docs: Update README with wizard interface instructions"
git commit -m "Docs: Add GitHub setup guide"
```

---

## 🌿 Working with Branches (Optional but Recommended)

Branches let you work on features without affecting the main code:

```bash
# Create a new branch for a feature
git checkout -b feature/add-authentication

# Make changes, commit them
git add .
git commit -m "Add: User authentication system"

# Push the branch to GitHub
git push -u origin feature/add-authentication

# On GitHub, create a Pull Request to merge into main
# After merging, switch back to main and pull changes
git checkout main
git pull
```

---

## 🔗 Connecting to Docker Hub (Bonus)

After uploading to GitHub, you can also push your Docker image:

```bash
# 1. Login to Docker Hub
docker login

# 2. Tag your image
docker tag automatizacion-app:latest YOUR_DOCKERHUB_USERNAME/autodock-vina:latest

# 3. Push to Docker Hub
docker push YOUR_DOCKERHUB_USERNAME/autodock-vina:latest

# Now anyone can run your app with:
# docker pull YOUR_DOCKERHUB_USERNAME/autodock-vina:latest
# docker run -d -p 8080:8080 YOUR_DOCKERHUB_USERNAME/autodock-vina:latest
```

---

## 🎯 Next Steps

After uploading to GitHub:

1. **Add a LICENSE file** (MIT, Apache, GPL, etc.)
2. **Add GitHub Actions** for automated testing/deployment
3. **Create a CHANGELOG.md** to track versions
4. **Add badges** to README (build status, version, etc.)
5. **Enable GitHub Pages** for documentation
6. **Set up branch protection** rules

---

## ❓ Troubleshooting

### **Problem: "Permission denied (publickey)"**
**Solution:** Use HTTPS instead of SSH, or set up SSH keys:
```bash
# Use HTTPS (easier)
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

### **Problem: "Large files detected"**
**Solution:** GitHub has a 100MB file size limit. Check your .gitignore:
```bash
# Find large files
find . -type f -size +50M

# Add them to .gitignore if they shouldn't be tracked
```

### **Problem: "node_modules/ was uploaded"**
**Solution:** Remove it and update .gitignore:
```bash
# Remove from Git (but keep locally)
git rm -r --cached node_modules/

# Make sure .gitignore has:
# node_modules/

# Commit the change
git commit -m "Remove node_modules from repository"
git push
```

### **Problem: "Merge conflicts"**
**Solution:** Pull changes first, resolve conflicts, then push:
```bash
git pull origin main
# Fix conflicts in files
git add .
git commit -m "Resolve merge conflicts"
git push
```

---

## 📚 Useful Git Commands

```bash
# View commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all local changes
git reset --hard HEAD

# View differences
git diff

# Create .gitignore for specific files
echo "myfile.txt" >> .gitignore

# Remove file from Git but keep locally
git rm --cached filename

# Clone your repository to another machine
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

---

## 🎓 Learning Resources

- **Git Basics**: https://git-scm.com/book/en/v2
- **GitHub Guides**: https://guides.github.com/
- **Interactive Tutorial**: https://learngitbranching.js.org/
- **Git Cheat Sheet**: https://education.github.com/git-cheat-sheet-education.pdf

---

**🎉 Congratulations! Your project is now on GitHub!**

Your repository URL will be: `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME`

