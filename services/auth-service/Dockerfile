# Auth Service Dockerfile
# Phase 2 - Authentication

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create keys directory
RUN mkdir -p /app/keys

# Set environment
ENV NODE_ENV=production

# Expose port (if needed)
EXPOSE 3001

# Start service
CMD ["node", "dist/index.js"]
