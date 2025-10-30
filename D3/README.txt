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

GitHub repository link:
https://github.com/kiarahodgson/imy220-project-2025

Mongo ATLAS_URI:
mongodb+srv://kiara220:220projectpassword@imy220.rfpry.mongodb.net/?retryWrites=true&w=majority&appName=IMY220