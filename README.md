<div align="center">
  <img src="mergelogo.png" alt="Merge Logo" width="200"/>
</div>

# imy220-project-2025
# Welcome to Merge - my project management and version control website!

Run docker, then run these from the project root:
docker build -t merge-app .
docker run --rm -p 8081:3000 -e ATLAS_URI='...' -v "$(pwd)/backend/uploads:/app/backend/uploads" --name merge-app merge-app

Windows PowerShell:
  docker run --rm -p 8081:3000 -e ATLAS_URI='...' -v "${PWD}\backend\uploads:/app/backend/uploads" --name merge-app merge-app

Windows CMD:
  docker run --rm -p 8081:3000 -e ATLAS_URI="..." -v "%cd%\backend\uploads:/app/backend/uploads" --name merge-app merge-app

macOS/Linux (bash/zsh):
  docker run --rm -p 8081:3000 -e ATLAS_URI='...' -v "$(pwd)/backend/uploads:/app/backend/uploads" --name merge-app merge-app

Open the app:
http://localhost:8081

