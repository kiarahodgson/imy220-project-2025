# Frontend build stage 
FROM node:20-alpine AS build-frontend
WORKDIR /app/frontend

# Install deps
COPY frontend/package*.json ./
RUN npm install

# Build
COPY frontend/ ./
RUN npm run build

# Runtime (backend serves frontend) 
FROM node:20-alpine
WORKDIR /app

# Backend deps
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy backend source
COPY backend ./backend

# Copy compiled frontend
COPY --from=build-frontend /app/frontend/dist ./backend/public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "backend/server.js"]
