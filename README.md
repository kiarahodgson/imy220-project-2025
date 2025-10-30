<div align="center">
  <img src="mergelogo.png" alt="Merge Logo" width="200"/>
  
  # 🪄 **Merge**
  ### IMY220 Project — 2025  
  _Project Management & Version Control Website_
</div>

---

## Overview
Welcome to **Merge** — a project management and version control website built as part of the IMY220 module (2025).  
This guide explains how to build and run the app using Docker across different operating systems.

---

## Run the App with Docker

### 
1️⃣ Build the Docker image
```bash
docker build -t merge-app .

2️⃣ Run the container
Replace '...' with your MongoDB Atlas connection string (ATLAS_URI) if necessary.

macOS / Linux (bash/zsh) (what I was using)
docker run --rm -p 8081:3000 -e ATLAS_URI='...' -v "$(pwd)/backend/uploads:/app/backend/uploads" --name merge-app merge-app

Windows PowerShell
docker run --rm -p 8081:3000 -e ATLAS_URI='...' -v "${PWD}\backend\uploads:/app/backend/uploads" --name merge-app merge-app

Windows CMD
docker run --rm -p 8081:3000 -e ATLAS_URI="..." -v "%cd%\backend\uploads:/app/backend/uploads" --name merge-app merge-app

🌐 Access the App
Once the container is running, open your browser and navigate to:
http://localhost:8081 ```

---

Notes
Ensure Docker Desktop is running before executing the commands.
The backend/uploads directory is mounted as a persistent volume for file uploads.

