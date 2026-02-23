# Auth Service Dockerfile
# Phase 4.5.0 - Standalone Auth Service
# Phase 4.5.z - Updated for compliance-client package

FROM node:20-alpine AS package-builder

WORKDIR /app/packages/compliance-client

# Copy and build compliance-client package
COPY packages/compliance-client/package*.json ./
COPY packages/compliance-client/tsconfig.json ./
COPY packages/compliance-client/src ./src

RUN npm install && npm run build

# Service builder stage
FROM node:20-alpine AS builder

# Create proper directory structure
WORKDIR /

# Copy built compliance-client package to proper location
COPY --from=package-builder /app/packages/compliance-client ./packages/compliance-client

# Copy service files
WORKDIR /services/auth-service
COPY services/auth-service/package*.json ./
COPY services/auth-service/tsconfig.json ./

# Install dependencies (now ../../packages/compliance-client will resolve correctly)
RUN npm install

# Copy source code
COPY services/auth-service/src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

# Create proper directory structure
WORKDIR /

# Copy built compliance-client package
COPY --from=package-builder /app/packages/compliance-client ./packages/compliance-client

# Copy service files
WORKDIR /services/auth-service
COPY services/auth-service/package*.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy built files from builder
COPY --from=builder /services/auth-service/dist ./dist

# Create keys directory
RUN mkdir -p /app/keys

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://127.0.0.1:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start service
CMD ["node", "dist/server.js"]
