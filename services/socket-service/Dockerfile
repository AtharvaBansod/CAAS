# Socket Service Dockerfile
# Phase 4.5.z - Updated for compliance-client package and enhanced functionality

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
WORKDIR /services/socket-service
COPY services/socket-service/package*.json ./
COPY services/socket-service/tsconfig.json ./

# Install dependencies (now ../../packages/compliance-client will resolve correctly)
RUN npm install

# Copy source code
COPY services/socket-service/src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

RUN apk add --no-cache dumb-init

# Create proper directory structure
WORKDIR /

# Copy built compliance-client package
COPY --from=package-builder /app/packages/compliance-client ./packages/compliance-client

# Copy service files
WORKDIR /services/socket-service
COPY services/socket-service/package*.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy built files from builder
COPY --from=builder /services/socket-service/dist ./dist

# Set environment
ENV NODE_ENV=production

USER node
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --spider -q http://localhost:3001/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
