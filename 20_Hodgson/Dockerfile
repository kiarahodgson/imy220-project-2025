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
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app/backend

# Backend deps
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend source
COPY backend ./

# Copy compiled frontend
COPY --from=build-frontend /app/frontend/dist ./public

EXPOSE 3000

CMD ["node", "server.js"]

