# Multi-stage build for crypto service
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
WORKDIR /services/crypto-service
COPY services/crypto-service/package*.json ./
COPY services/crypto-service/tsconfig.json ./

# Install dependencies (now ../../packages/compliance-client will resolve correctly)
RUN npm install

# Copy source code
COPY services/crypto-service/src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create proper directory structure
WORKDIR /

# Copy built compliance-client package
COPY --from=package-builder /app/packages/compliance-client ./packages/compliance-client

# Copy service files
WORKDIR /services/crypto-service
COPY services/crypto-service/package*.json ./
RUN npm install --only=production

# Copy built files from builder
COPY --from=builder /services/crypto-service/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Fix permissions
RUN chown -R nodejs:nodejs /services /packages

USER nodejs

# Expose port
EXPOSE 3009

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3009/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service with dumb-init
CMD ["dumb-init", "node", "dist/src/server.js"]
