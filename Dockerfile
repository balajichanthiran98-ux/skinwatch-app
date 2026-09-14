# Production Dockerfile for Google Cloud Run & GCP Container Registry
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package manifests first
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application source code
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Set production environment defaults (Cloud Run automatically injects $PORT)
ENV NODE_ENV=production
ENV PORT=8080

# Expose container port
EXPOSE 8080

# Start SkinWatch server
CMD ["node", "backend/server.js"]
